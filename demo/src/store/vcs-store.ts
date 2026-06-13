// ─── VCS Zustand Store ─────────────────────────────────────────────────────
// This is the bridge between the VCSEngine and the React UI.
// The UI never calls the engine directly — it uses this store.
// The store persists the repo to localStorage for offline survival.

import { create } from "zustand";
import { VCSEngine } from "@/lib/vcs/engine";
import type {
  VCSCommit,
  VCSRepo,
  ProjectedState,
  CatalogItemEntry,
  Delta,
  AssignmentAllocation,
  PaymentAllocation,
  AllocationBlock,
  ProjectedLineItem,
  MergePreview,
} from "@/lib/vcs/types";
import type { OrderContext } from "@/lib/pos/types";
import { generateAllocationId, generateLineId } from "@/lib/vcs/id";
import { generateDraftBranchName } from "@/lib/pos/id";
import {
  getPaymentAllocDisplayName,
  getAssignmentAllocDisplayName,
  generateSplitCorrelationId,
} from "@/lib/pos/utils";
import { projectState } from "@/lib/vcs/reducer";
import { toast } from "sonner";

// ─── Storage Key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "vcs-repo";
const CONTEXT_ID_PREFIX = "pos-session-";

function generateContextId(): string {
  return `${CONTEXT_ID_PREFIX}${Date.now()}`;
}

// POS helpers are now located in the dedicated POS library.

// ─── Create Default Repo ──────────────────────────────────────────────────────

function createFreshRepo(orderContext?: OrderContext): VCSRepo {
  return {
    contextType: "cart",
    contextId: generateContextId(),
    orderContext,
    log: [],
    branches: { main: { headHash: null } },
    activeBranch: "main",
  };
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface VCSStore {
  // State
  engine: VCSEngine;
  projectedState: ProjectedState;
  viewingHash: string | null; // null = follow HEAD
  catalog: Record<string, CatalogItemEntry>;
  catalogLoaded: boolean;

  // Order Init State
  isInitialized: boolean;
  orderContext: OrderContext | null;
  defaultPaymentMethod: string; // from POS config

  // Default Allocation IDs (shared across items)
  defaultAssignmentAllocId: string | null;
  defaultPaymentAllocId: string | null;
  activePaymentConfigId: string | null;

  // Computed
  headHash: () => string | null;
  activeBranch: () => string;
  commitLog: () => VCSCommit[];

  // Actions — Catalog
  loadCatalog: (items: CatalogItemEntry[]) => void;

  // Actions — Order Init/Reset
  initRepo: (orderContext: OrderContext, defaultPaymentMethod: string) => void;
  resetOrder: () => void;

  // Actions — Default Allocations
  /**
   * Create the initial default allocation pair (assignment + payment).
   * Called once when the order is initialized.
   */
  initDefaultAllocations: (customerName: string, paymentMethod: string) => void;

  /**
   * Add an item using the default shared allocations.
   * No new allocations are declared — the item references the default IDs.
   */
  addItemWithDefaults: (
    sku: string,
    qty: number,
    assigneeName?: string
  ) => void;

  /**
   * Switch the default payment method.
   * @param mode "change-existing" — batch-swaps all items using the current default payment alloc
   *             "new-only" — creates a new default payment alloc, future items use it
   */
  changeDefaultPayment: (newMethod: string, mode: "change-existing" | "new-only") => void;

  /**
   * Switch the default payment configuration.
   * @param newConfigId The allocationId (single) or correlationId (split) of the target configuration.
   * @param mode "change-existing" — batch-swaps all items using the old configuration to the new one.
   *             "new-only" — updates the pointer so future items use the new config.
   */
  selectPaymentConfig: (newConfigId: string, mode: "change-existing" | "new-only") => void;

  /**
   * Create a table-wide split payment configuration.
   * Returns the generated correlationId.
   */
  createTableSplitConfig: (
    splits: Array<{
      entity: string;
      strategyType: "percentage" | "fixed" | "remaining";
      value: number;
    }>,
    method?: string | null
  ) => string;

  /**
   * Split an item's single payment into multiple payment allocations.
   * Creates new correlated payment allocs and replaces the item's payment reference.
   * @param lineId — the item to split
   * @param splits — array of { entity, percentage } (must sum to 100)
   */
  splitItemPayment: (
    lineId: string,
    splits: Array<{
      entity: string;
      strategyType: "percentage" | "fixed" | "remaining";
      value: number; // decimal for percentage (e.g. 0.6), absolute value for fixed, 0 for remaining
    }>
  ) => void;

  /**
   * Reassign an item to a different guest (new assignment allocation).
   */
  reassignItem: (lineId: string, newAssignee: string) => void;

  /**
   * Switch an individual item's payment method (creates a new payment alloc just for this item).
   * Removes any existing split/custom payment and replaces with a single new payment.
   */
  switchItemPayment: (lineId: string, newMethod: string, payer: string) => void;

  /**
   * Reset an item's payment back to the current default payment allocation.
   * Removes any split allocations, reverts to the shared default.
   */
  resetItemPaymentToDefault: (lineId: string) => void;

  /**
   * Update an allocation's configuration directly.
   * Commits a declare_allocation delta with updated values.
   */
  updateAllocation: (allocId: string, updatedFields: Partial<AllocationBlock>) => void;

  /**
   * Group an item's assignment allocation with an existing target assignment allocation ID.
   */
  groupItemAllocation: (lineId: string, targetAllocId: string, allocType: "assignment") => void;

  /**
   * Group an item's payment allocations with an existing payment configuration (reusing single allocation ID or correlation ID).
   */
  groupItemPaymentConfig: (lineId: string, targetId: string) => void;

  // Actions — Core VCS (legacy, still used for mimic)
  commitDeltas: (deltas: Delta[], authorId?: string) => VCSCommit;
  addModifier: (parentLineId: string, modifierSku: string, selectedModifierState?: string) => void;
  removeItem: (lineId: string) => void;
  modifyItemQty: (lineId: string, beforeQty: number, afterQty: number) => void;
  duplicateItem: (lineId: string) => void;
  modifyItemSku: (lineId: string, beforeSku: string, afterSku: string) => void;
  modifyModifierState: (lineId: string, beforeState?: string, afterState?: string) => void;
  mimicOrder: (sourceAssignee: string, targetAssignee: string, targetPayer: string, paymentMethod: string) => void;

  // Actions — Bulk Operations
  duplicateItems: (lineIds: string[]) => void;
  duplicateAndReassignItems: (lineIds: string[], targetGuest: string) => void;
  removeItems: (lineIds: string[]) => void;
  modifyItemsQty: (lineIds: string[], change: number) => void;
  setItemsQty: (lineIds: string[], targetQty: number) => void;
  reassignItems: (lineIds: string[], newAssignee: string) => void;
  groupItemsPaymentConfig: (lineIds: string[], targetId: string) => void;
  addGroupModifier: (parentLineIds: string[], modifierSku: string, selectedModifierState?: string) => void;
  removeGroupModifier: (parentLineIds: string[], modifierSku: string) => void;

  // Actions — Branching
  createBranch: (name: string, fromCommitHash?: string | null) => void;
  checkoutBranch: (name: string) => void;
  viewRevision: (hash: string | null) => void; // null = HEAD
  setMainActiveBranch: (name: string) => void;
  mainActiveBranch: () => string;
  updateBranchConfig: (name: string, config: { type?: "parallel" | "hypothetical"; label?: string }) => void;
  renameBranch: (oldName: string, newName: string) => void;

  // Actions — Merge
  previewMerge: (sourceBranches: string[], targetBranch: string) => MergePreview;
  commitMerge: (sourceBranches: string[], targetBranch: string, resolutionDeltas: Delta[]) => void;

  // Actions — Persistence
  persist: () => void;
  hydrate: () => void;
}

// ─── Create Store ─────────────────────────────────────────────────────────────

export const useVCSStore = create<VCSStore>((set, get) => {
  const repo = createFreshRepo();
  const engine = new VCSEngine(repo);

  return {
    engine,
    projectedState: engine.projectCurrent(),
    viewingHash: null,
    catalog: {},
    catalogLoaded: false,

    // ─── Order Init State ────────────────────────────────────────────────────
    isInitialized: false,
    orderContext: null,
    defaultPaymentMethod: "cash",

    // ─── Default Allocation IDs ─────────────────────────────────────────────
    defaultAssignmentAllocId: null,
    defaultPaymentAllocId: null,
    activePaymentConfigId: null,

    // ─── Computed ──────────────────────────────────────────────────────────

    headHash: () => {
      const store = get();
      return store.engine.getHeadHash();
    },

    activeBranch: () => {
      return get().engine.getActiveBranch();
    },

    mainActiveBranch: () => {
      return get().engine.getMainActiveBranch();
    },

    commitLog: () => {
      return get().engine.getLog();
    },

    // ─── Catalog ───────────────────────────────────────────────────────────

    loadCatalog: (items: CatalogItemEntry[]) => {
      const store = get();
      store.engine.setCatalog(items);
      const catalogMap: Record<string, CatalogItemEntry> = {};
      for (const item of items) {
        catalogMap[item.sku] = item;
      }
      set({
        catalog: catalogMap,
        catalogLoaded: true,
        projectedState: store.engine.projectCurrent(),
      });
    },

    // ─── Order Init/Reset ───────────────────────────────────────────────────

    initRepo: (orderContext: OrderContext, defaultPaymentMethod: string) => {
      const repo = createFreshRepo(orderContext);
      const newEngine = new VCSEngine(repo);
      // Restore catalog if already loaded
      const store = get();
      if (store.catalogLoaded) {
        newEngine.setCatalog(Object.values(store.catalog));
      }
      // Auto-create the default allocations
      const customerName = orderContext.customerFields.name || "Guest";
      const assignAllocId = generateAllocationId("default-assign");

      const assignmentAlloc: AssignmentAllocation = {
        allocationId: assignAllocId,
        type: "assignment",
        entity: customerName,
      };

      const deltas: Delta[] = [
        { action: "declare_allocation", allocation: assignmentAlloc },
      ];

      const paymentMethods = ["cash", "visa", "mastercard", "amex"];
      const activePayGroupId = `group-default-${defaultPaymentMethod}`;
      let mainPayAllocId = "";

      for (const m of paymentMethods) {
        const payAllocId = generateAllocationId(`default-pay-${m}`);
        const correlationId = `group-default-${m}`;
        if (m === defaultPaymentMethod) {
          mainPayAllocId = payAllocId;
        }

        const paymentAlloc: PaymentAllocation = {
          allocationId: payAllocId,
          correlationId,
          type: "payment",
          payer: customerName,
          method: m,
          paymentStrategy: { strategyType: "percentage", value: 1.0 },
          timeOfPayment: { type: "immediate", calculatedAt: new Date().toISOString() },
        };

        deltas.push({ action: "declare_allocation", allocation: paymentAlloc });
      }

      newEngine.commit(deltas, "system-init");

      // POS work happens on a draft branch created from confirmed main state.
      const serverName = orderContext.serverName || "Tom";
      let draftBranchName = generateDraftBranchName(serverName);
      let suffix = 2;
      while (newEngine.getRepo().branches[draftBranchName]) {
        draftBranchName = `${generateDraftBranchName(serverName)}-${suffix}`;
        suffix += 1;
      }
      newEngine.createBranch(draftBranchName, "main");
      newEngine.checkout(draftBranchName);

      set({
        engine: newEngine,
        projectedState: newEngine.projectCurrent(),
        viewingHash: null,
        isInitialized: true,
        orderContext,
        defaultPaymentMethod,
        defaultAssignmentAllocId: assignAllocId,
        defaultPaymentAllocId: mainPayAllocId,
        activePaymentConfigId: activePayGroupId,
      });
      get().persist();
    },

    resetOrder: () => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
      const repo = createFreshRepo();
      const newEngine = new VCSEngine(repo);
      const store = get();
      if (store.catalogLoaded) {
        newEngine.setCatalog(Object.values(store.catalog));
      }
      set({
        engine: newEngine,
        projectedState: newEngine.projectCurrent(),
        viewingHash: null,
        isInitialized: false,
        orderContext: null,
        defaultPaymentMethod: "cash",
        defaultAssignmentAllocId: null,
        defaultPaymentAllocId: null,
        activePaymentConfigId: null,
      });
    },

    // ─── Default Allocations ────────────────────────────────────────────────

    initDefaultAllocations: (customerName: string, paymentMethod: string) => {
      // This is called internally by initRepo — no need for external use
      void customerName;
      void paymentMethod;
    },

    addItemWithDefaults: (sku, qty, assigneeName) => {
      const store = get();
      const defaultAssignId = store.defaultAssignmentAllocId;
      const configId = store.activePaymentConfigId;

      if (!defaultAssignId || !configId) {
        console.error("Cannot add item: default allocations not initialized");
        return;
      }

      const state = store.projectedState;
      let assignId = defaultAssignId;
      const deltas: Delta[] = [];

      const customerName = store.orderContext?.customerFields.name || "Guest";
      if (assigneeName && assigneeName !== customerName) {
        // Find existing assignment allocation for this guest name
        const existingAssign = Object.values(state.allocations).find(
          (a) => a.type === "assignment" && (a as AssignmentAllocation).entity === assigneeName
        );
        if (existingAssign) {
          assignId = existingAssign.allocationId;
        } else {
          const newAssignId = generateAllocationId("assign");
          const newAssignAlloc: AssignmentAllocation = {
            allocationId: newAssignId,
            type: "assignment",
            entity: assigneeName,
          };
          deltas.push({ action: "declare_allocation", allocation: newAssignAlloc });
          assignId = newAssignId;
        }
      }

      // Find all allocations that match the activePaymentConfigId (either allocationId or correlationId)
      const payAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation =>
          a.type === "payment" &&
          (a.allocationId === configId || (a.correlationId !== null && a.correlationId === configId))
      );
      const payIds = payAllocs.map((a) => a.allocationId);

      const targetAllocations = [assignId, ...payIds];

      const parentLineId = generateLineId();
      deltas.push({
        action: "add_item",
        lineId: parentLineId,
        parentLineId: null,
        sku,
        qty,
        allocations: targetAllocations,
      });

      // Auto-inject default size modifier if catalog entry has an applied size group
      const catalogEntry = store.catalog[sku];
      if (catalogEntry && catalogEntry.appliedSizeGroup) {
        const defaultSku = catalogEntry.appliedSizeGroup.defaultSku;
        deltas.push({
          action: "add_item",
          lineId: generateLineId(),
          parentLineId: parentLineId,
          sku: defaultSku,
          qty: 1,
          allocations: [],
        });
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    changeDefaultPayment: (newMethod: string, mode: "change-existing" | "new-only") => {
      get().selectPaymentConfig(`group-default-${newMethod}`, mode);
    },

    selectPaymentConfig: (newConfigId: string, mode: "change-existing" | "new-only") => {
      const store = get();
      const currentConfigId = store.activePaymentConfigId;
      if (!currentConfigId) return;

      const state = store.projectedState;

      // Get allocations of the old config
      const oldPayAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation =>
          a.type === "payment" &&
          (a.allocationId === currentConfigId || (a.correlationId !== null && a.correlationId === currentConfigId))
      );
      const oldPayIds = oldPayAllocs.map((a) => a.allocationId);

      // Get allocations of the new config
      const newPayAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation =>
          a.type === "payment" &&
          (a.allocationId === newConfigId || (a.correlationId !== null && a.correlationId === newConfigId))
      );
      const newPayIds = newPayAllocs.map((a) => a.allocationId);

      if (mode === "change-existing") {
        const itemsToSwap = Object.values(state.items).filter((item) =>
          item.allocations.some((id) => oldPayIds.includes(id))
        );

        const deltas: Delta[] = [];
        for (const item of itemsToSwap) {
          const nonOldAllocations = item.allocations.filter((id) => !oldPayIds.includes(id));
          const afterAllocations = [...nonOldAllocations, ...newPayIds];

          deltas.push({
            action: "modify_item_allocations",
            lineId: item.lineId,
            beforeAllocations: item.allocations,
            afterAllocations,
          });
        }

        if (deltas.length > 0) {
          store.commitDeltas(deltas, "pos-ui");
        }
      }

      if (newPayAllocs.length === 1) {
        set({
          defaultPaymentMethod: newPayAllocs[0].method || "cash",
        });
      }

      set({
        activePaymentConfigId: newConfigId,
      });
      get().persist();
    },

    createTableSplitConfig: (
      splits: Array<{
        entity: string;
        strategyType: "percentage" | "fixed" | "remaining";
        value: number;
      }>,
      method: string | null = null
    ) => {
      const store = get();
      const customerName = store.orderContext?.customerFields.name || "Guest";

      // Check if we need to auto-add a remaining allocator
      const hasRemaining = splits.some((s) => s.strategyType === "remaining");
      const totalPct = splits.filter((s) => s.strategyType === "percentage").reduce((sum, s) => sum + s.value, 0);
      const hasFixed = splits.some((s) => s.strategyType === "fixed");

      const finalSplits = [...splits];
      if (!hasRemaining && (totalPct < 0.999 || hasFixed)) {
        finalSplits.push({
          entity: customerName,
          strategyType: "remaining",
          value: 0,
        });
      }

      const correlationId = generateSplitCorrelationId(
        finalSplits.map((s) => ({
          entity: s.entity,
          percentage: s.strategyType === "percentage" ? Math.round(s.value * 100) : 0,
        }))
      );

      const newPayAllocs: PaymentAllocation[] = finalSplits.map((split) => ({
        allocationId: generateAllocationId("split-pay"),
        type: "payment" as const,
        payer: split.entity,
        method: method,
        paymentStrategy: {
          strategyType: split.strategyType,
          value: split.strategyType === "remaining" ? null : split.value,
        },
        timeOfPayment: { type: "immediate" as const, calculatedAt: new Date().toISOString() },
        correlationId,
      }));

      const deltas: Delta[] = newPayAllocs.map((a) => ({
        action: "declare_allocation" as const,
        allocation: a,
      }));

      store.commitDeltas(deltas, "pos-ui");
      return correlationId;
    },

    splitItemPayment: (
      lineId: string,
      splits: Array<{
        entity: string;
        strategyType: "percentage" | "fixed" | "remaining";
        value: number;
      }>
    ) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      const customerName = store.orderContext?.customerFields.name || "Guest";

      // Check if we need to auto-add a remaining allocator
      const hasRemaining = splits.some((s) => s.strategyType === "remaining");
      const totalPct = splits.filter((s) => s.strategyType === "percentage").reduce((sum, s) => sum + s.value, 0);
      const hasFixed = splits.some((s) => s.strategyType === "fixed");

      const finalSplits = [...splits];
      if (!hasRemaining && (totalPct < 0.999 || hasFixed)) {
        finalSplits.push({
          entity: customerName,
          strategyType: "remaining",
          value: 0,
        });
      }

      // Check if this item is already on a custom split correlation ID (to edit the group ID in place)
      const currentPayAllocs = item.allocations
        .map((id) => state.allocations[id])
        .filter((a) => a?.type === "payment") as PaymentAllocation[];

      const existingCorrelationId = currentPayAllocs.find(
        (a) => a.correlationId && !a.correlationId.startsWith("group-default-")
      )?.correlationId;

      const correlationId =
        existingCorrelationId ||
        generateSplitCorrelationId(
          finalSplits.map((s) => ({
            entity: s.entity,
            percentage: s.strategyType === "percentage" ? Math.round(s.value * 100) : 0,
          }))
        );

      // Create new payment allocations
      const newPayAllocs: PaymentAllocation[] = finalSplits.map((split) => ({
        allocationId: generateAllocationId("split-pay"),
        type: "payment" as const,
        payer: split.entity,
        method: null,
        paymentStrategy: {
          strategyType: split.strategyType,
          value: split.strategyType === "remaining" ? null : split.value,
        },
        timeOfPayment: { type: "immediate" as const, calculatedAt: new Date().toISOString() },
        correlationId,
      }));

      // Find all payment allocation IDs in the old group
      const oldPayIds = existingCorrelationId
        ? Object.values(state.allocations)
            .filter((a): a is PaymentAllocation => a.type === "payment" && a.correlationId === existingCorrelationId)
            .map((a) => a.allocationId)
        : currentPayAllocs.map((a) => a.allocationId);

      // Find all items referencing these old allocations to update them concurrently
      const itemsToUpdate = Object.values(state.items).filter((i) =>
        i.allocations.some((id) => oldPayIds.includes(id))
      );

      const deltas: Delta[] = [
        ...newPayAllocs.map((a) => ({
          action: "declare_allocation" as const,
          allocation: a,
        })),
      ];

      for (const i of itemsToUpdate) {
        const nonOldAllocations = i.allocations.filter((id) => !oldPayIds.includes(id));
        const afterAllocations = [...nonOldAllocations, ...newPayAllocs.map((a) => a.allocationId)];

        deltas.push({
          action: "modify_item_allocations",
          lineId: i.lineId,
          beforeAllocations: i.allocations,
          afterAllocations,
        });
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    reassignItem: (lineId: string, newAssignee: string) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      // Create a new assignment allocation for the new assignee
      const newAssignAllocId = generateAllocationId("assign");
      const newAssignAlloc: AssignmentAllocation = {
        allocationId: newAssignAllocId,
        type: "assignment",
        entity: newAssignee,
      };

      // Find current assignment alloc
      const currentAssignAllocId = item.allocations.find(
        (id) => state.allocations[id]?.type === "assignment"
      );

      const newAllocations = item.allocations.map((id) =>
        id === currentAssignAllocId ? newAssignAllocId : id
      );

      store.commitDeltas(
        [
          { action: "declare_allocation", allocation: newAssignAlloc },
          {
            action: "modify_item_allocations",
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui"
      );
    },

    switchItemPayment: (lineId: string, newMethod: string, payer: string) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      // Create a new payment allocation with the specified method
      const newPayAllocId = generateAllocationId("item-pay");
      const newPaymentAlloc: PaymentAllocation = {
        allocationId: newPayAllocId,
        type: "payment",
        payer,
        method: newMethod,
        paymentStrategy: { strategyType: "percentage", value: 1.0 },
        timeOfPayment: { type: "immediate", calculatedAt: new Date().toISOString() },
      };

      // Remove all existing payment allocations, add the new one
      const nonPaymentAllocs = item.allocations.filter(
        (id) => state.allocations[id]?.type !== "payment"
      );
      const newAllocations = [...nonPaymentAllocs, newPayAllocId];

      store.commitDeltas(
        [
          { action: "declare_allocation", allocation: newPaymentAlloc },
          {
            action: "modify_item_allocations",
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui"
      );
    },

    resetItemPaymentToDefault: (lineId: string) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      const defaultPayId = store.defaultPaymentAllocId;
      if (!item || !defaultPayId) return;

      // Remove all payment allocations and replace with default
      const nonPaymentAllocs = item.allocations.filter(
        (id) => state.allocations[id]?.type !== "payment"
      );

      const newAllocations = [...nonPaymentAllocs, defaultPayId];

      store.commitDeltas(
        [
          {
            action: "modify_item_allocations",
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui"
      );
    },

    updateAllocation: (allocId: string, updatedFields: Partial<AllocationBlock>) => {
      const store = get();
      const currentAlloc = store.projectedState.allocations[allocId];
      if (!currentAlloc) return;

      const updatedAlloc = {
        ...currentAlloc,
        ...updatedFields,
        allocationId: allocId, // keep ID identical
      } as AllocationBlock;

      store.commitDeltas(
        [{ action: "declare_allocation", allocation: updatedAlloc }],
        "pos-ui"
      );
    },

    groupItemAllocation: (lineId: string, targetAllocId: string, allocType: "assignment") => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      // Find current allocation ID of the target type on this item
      const currentAllocId = item.allocations.find(
        (id) => state.allocations[id]?.type === allocType
      );

      const newAllocations = item.allocations.map((id) =>
        id === currentAllocId ? targetAllocId : id
      );

      store.commitDeltas(
        [
          {
            action: "modify_item_allocations",
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui"
      );
    },

    groupItemPaymentConfig: (lineId: string, targetId: string) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      // Find all payment allocations in the projected state
      const allPayAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation => a.type === "payment"
      );

      // Check if targetId matches any correlationId
      const splitAllocs = allPayAllocs.filter((a) => a.correlationId === targetId);

      let targetAllocIds: string[] = [];
      if (splitAllocs.length > 0) {
        targetAllocIds = splitAllocs.map((a) => a.allocationId);
      } else {
        targetAllocIds = [targetId];
      }

      // Filter out current payment allocations from this item
      const nonPaymentAllocs = item.allocations.filter(
        (id) => state.allocations[id]?.type !== "payment"
      );

      // Append target payment allocation IDs
      const newAllocations = [...nonPaymentAllocs, ...targetAllocIds];

      store.commitDeltas(
        [
          {
            action: "modify_item_allocations",
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui"
      );
    },

    // ─── Core VCS ──────────────────────────────────────────────────────────

    commitDeltas: (deltas, authorId = "pos-ui") => {
      const store = get();
      const activeBranch = store.engine.getActiveBranch();
      const mainBranch = store.engine.getMainActiveBranch();

      const activeHead = store.engine.getHeadHash(activeBranch);
      const mainHead = store.engine.getHeadHash(mainBranch);

      const isMain = activeBranch === mainBranch;
      const isMergedToMain = !isMain && activeHead && mainHead && activeHead !== mainHead && store.engine.isAncestorOf(activeHead, mainHead);

      if (isMain || isMergedToMain) {
        const serverName = store.orderContext?.serverName || "Tom";
        let draftBranchName = generateDraftBranchName(serverName);
        let suffix = 2;
        while (store.engine.getRepo().branches[draftBranchName]) {
          draftBranchName = `${generateDraftBranchName(serverName)}-${suffix}`;
          suffix += 1;
        }
        const fromHash = store.viewingHash || activeBranch;
        store.engine.createBranch(draftBranchName, fromHash);
        store.engine.checkout(draftBranchName);
        if (isMain) {
          toast.info(`Automatically moved to new draft branch "${draftBranchName}" to protect main.`);
        } else {
          toast.info(`Automatically moved to new draft branch "${draftBranchName}" because "${activeBranch}" is already merged.`);
        }
      }

      const commit = store.engine.commit(deltas, authorId);
      set({
        viewingHash: null, // Reset to HEAD after new commit
        projectedState: store.engine.projectCurrent(),
      });
      store.persist();
      return commit;
    },

    addModifier: (parentLineId, modifierSku, selectedModifierState) => {
      get().commitDeltas(
        [
          {
            action: "add_item",
            lineId: generateLineId(),
            parentLineId,
            sku: modifierSku,
            qty: 1,
            allocations: [],
            selectedModifierState,
          },
        ],
        "pos-ui"
      );
    },

    removeItem: (lineId) => {
      const state = get().projectedState;
      const item = state.items[lineId];
      const qty = item?.qty ?? 1;
      get().commitDeltas(
        [{ action: "remove_item", lineId, qty }],
        "pos-ui"
      );
    },

    modifyItemQty: (lineId, beforeQty, afterQty) => {
      get().commitDeltas(
        [
          {
            action: "modify_qty",
            lineId,
            beforeQty,
            afterQty,
          },
        ],
        "pos-ui"
      );
    },

    duplicateItem: (lineId) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      const deltas: Delta[] = [];

      const cloneItem = (projItem: ProjectedLineItem, newParentId: string | null) => {
        const newLineId = generateLineId();
        deltas.push({
          action: "add_item",
          lineId: newLineId,
          parentLineId: newParentId,
          sku: projItem.sku,
          qty: projItem.qty,
          allocations: newParentId ? [] : [...projItem.allocations],
          selectedModifierState: projItem.selectedModifierState,
        });

        for (const child of projItem.children) {
          cloneItem(child, newLineId);
        }
      };

      cloneItem(item, null);
      store.commitDeltas(deltas, "pos-ui");
    },

    duplicateItems: (lineIds) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      const cloneItem = (projItem: ProjectedLineItem, newParentId: string | null) => {
        const newLineId = generateLineId();
        deltas.push({
          action: "add_item",
          lineId: newLineId,
          parentLineId: newParentId,
          sku: projItem.sku,
          qty: projItem.qty,
          allocations: newParentId ? [] : [...projItem.allocations],
          selectedModifierState: projItem.selectedModifierState,
        });

        for (const child of projItem.children) {
          cloneItem(child, newLineId);
        }
      };

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          cloneItem(item, null);
        }
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    duplicateAndReassignItems: (lineIds, targetGuest) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      const newAssignAllocId = generateAllocationId("assign");
      const newAssignAlloc: AssignmentAllocation = {
        allocationId: newAssignAllocId,
        type: "assignment",
        entity: targetGuest,
      };

      deltas.push({ action: "declare_allocation", allocation: newAssignAlloc });

      const cloneItem = (projItem: ProjectedLineItem, newParentId: string | null) => {
        const newLineId = generateLineId();
        
        let targetAllocations: string[] = [];
        if (!newParentId) {
          // For root clones, replace the assignment allocation with the new guest allocation
          const currentAssignAllocId = projItem.allocations.find(
            (id) => state.allocations[id]?.type === "assignment"
          );
          if (currentAssignAllocId) {
            targetAllocations = projItem.allocations.map((id) =>
              id === currentAssignAllocId ? newAssignAllocId : id
            );
          } else {
            targetAllocations = [...projItem.allocations, newAssignAllocId];
          }
        }

        deltas.push({
          action: "add_item",
          lineId: newLineId,
          parentLineId: newParentId,
          sku: projItem.sku,
          qty: projItem.qty,
          allocations: targetAllocations,
          selectedModifierState: projItem.selectedModifierState,
        });

        for (const child of projItem.children) {
          cloneItem(child, newLineId);
        }
      };

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          cloneItem(item, null);
        }
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    removeItems: (lineIds) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          deltas.push({
            action: "remove_item",
            lineId,
            qty: item.qty,
          });
        }
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    modifyItemsQty: (lineIds, change) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const targetQty = item.qty + change;
          if (targetQty <= 0) {
            deltas.push({
              action: "remove_item",
              lineId,
              qty: item.qty,
            });
          } else {
            deltas.push({
              action: "modify_qty",
              lineId,
              beforeQty: item.qty,
              afterQty: targetQty,
            });
          }
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
    },

    setItemsQty: (lineIds, targetQty) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          if (targetQty <= 0) {
            deltas.push({
              action: "remove_item",
              lineId,
              qty: item.qty,
            });
          } else {
            deltas.push({
              action: "modify_qty",
              lineId,
              beforeQty: item.qty,
              afterQty: targetQty,
            });
          }
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
    },

    reassignItems: (lineIds, newAssignee) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      const newAssignAllocId = generateAllocationId("assign");
      const newAssignAlloc: AssignmentAllocation = {
        allocationId: newAssignAllocId,
        type: "assignment",
        entity: newAssignee,
      };

      deltas.push({ action: "declare_allocation", allocation: newAssignAlloc });

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const currentAssignAllocId = item.allocations.find(
            (id) => state.allocations[id]?.type === "assignment"
          );

          const newAllocations = item.allocations.map((id) =>
            id === currentAssignAllocId ? newAssignAllocId : id
          );

          deltas.push({
            action: "modify_item_allocations",
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          });
        }
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    groupItemsPaymentConfig: (lineIds, targetId) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      const allPayAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation => a.type === "payment"
      );

      const splitAllocs = allPayAllocs.filter((a) => a.correlationId === targetId);

      let targetAllocIds: string[] = [];
      if (splitAllocs.length > 0) {
        targetAllocIds = splitAllocs.map((a) => a.allocationId);
      } else {
        targetAllocIds = [targetId];
      }

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const nonPaymentAllocs = item.allocations.filter(
            (id) => state.allocations[id]?.type !== "payment"
          );
          const newAllocations = [...nonPaymentAllocs, ...targetAllocIds];

          deltas.push({
            action: "modify_item_allocations",
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          });
        }
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    addGroupModifier: (parentLineIds, modifierSku, selectedModifierState) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      for (const parentLineId of parentLineIds) {
        const parent = state.items[parentLineId];
        if (parent) {
          const hasMod = parent.children.some((c) => c.sku === modifierSku);
          if (!hasMod) {
            deltas.push({
              action: "add_item",
              lineId: generateLineId(),
              parentLineId,
              sku: modifierSku,
              qty: 1,
              allocations: [],
              selectedModifierState,
            });
          }
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
    },

    removeGroupModifier: (parentLineIds, modifierSku) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      for (const parentLineId of parentLineIds) {
        const parent = state.items[parentLineId];
        if (parent) {
          const childWithSku = parent.children.find((c) => c.sku === modifierSku);
          if (childWithSku) {
            deltas.push({
              action: "remove_item",
              lineId: childWithSku.lineId,
              qty: childWithSku.qty,
            });
          }
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
    },

    modifyItemSku: (lineId, beforeSku, afterSku) => {
      get().commitDeltas(
        [
          {
            action: "modify_sku",
            lineId,
            beforeSku,
            afterSku,
          },
        ],
        "pos-ui"
      );
    },

    modifyModifierState: (lineId, beforeState, afterState) => {
      get().commitDeltas(
        [
          {
            action: "modify_modifier_state",
            lineId,
            beforeState,
            afterState,
          },
        ],
        "pos-ui"
      );
    },

    mimicOrder: (sourceAssignee, targetAssignee, targetPayer, paymentMethod) => {
      const store = get();
      const headHash = store.engine.getHeadHash();
      if (!headHash) return;

      const assignAllocId = generateAllocationId("assign");
      const payAllocId = generateAllocationId("pay");

      const assignmentAlloc: AssignmentAllocation = {
        allocationId: assignAllocId,
        type: "assignment",
        entity: targetAssignee,
      };

      const paymentAlloc: PaymentAllocation = {
        allocationId: payAllocId,
        type: "payment",
        payer: targetPayer,
        method: paymentMethod,
        paymentStrategy: { strategyType: "percentage", value: 1.0 },
        timeOfPayment: { type: "immediate", calculatedAt: new Date().toISOString() },
      };

      store.commitDeltas(
        [
          { action: "declare_allocation", allocation: assignmentAlloc },
          { action: "declare_allocation", allocation: paymentAlloc },
          {
            action: "batch_by_filter",
            baseRevisionId: headHash,
            filters: [
              { property: "assignee", operator: "equals", value: sourceAssignee },
            ],
            templateMutation: {
              mutationType: "batch_duplicate_and_reallocate",
              patchAllocations: [assignmentAlloc, paymentAlloc],
            },
          },
        ],
        "ai-agent"
      );
    },

    // ─── Branching ─────────────────────────────────────────────────────────

    createBranch: (name, fromCommitHash) => {
      const store = get();
      store.engine.createBranch(name, fromCommitHash);
      store.engine.checkout(name);
      set({
        viewingHash: null,
        projectedState: store.engine.projectCurrent(),
      });
      store.persist();
    },

    checkoutBranch: (name) => {
      const store = get();
      store.engine.checkout(name);
      set({
        viewingHash: null,
        projectedState: store.engine.projectCurrent(),
      });
      store.persist();
    },

    viewRevision: (hash) => {
      const store = get();
      set({ viewingHash: hash });
      if (hash === null) {
        set({ projectedState: store.engine.projectCurrent() });
      } else {
        set({ projectedState: store.engine.projectAt(hash) });
      }
    },

    setMainActiveBranch: (name) => {
      const store = get();
      store.engine.setMainActiveBranch(name);
      set({
        projectedState: store.engine.projectCurrent(),
      });
      store.persist();
    },

    updateBranchConfig: (name, config) => {
      const store = get();
      store.engine.updateBranchConfig(name, config);
      set({
        projectedState: store.engine.projectCurrent(),
      });
      store.persist();
    },

    renameBranch: (oldName, newName) => {
      const store = get();
      store.engine.renameBranch(oldName, newName);
      set({
        projectedState: store.engine.projectCurrent(),
      });
      store.persist();
    },

    // ─── Merge ─────────────────────────────────────────────────────────────

    previewMerge: (sourceBranches, targetBranch) => {
      return get().engine.previewMerge(sourceBranches, targetBranch);
    },

    commitMerge: (sourceBranches, targetBranch, resolutionDeltas) => {
      const store = get();
      store.engine.commitMerge(sourceBranches, targetBranch, resolutionDeltas);
      // If target is the active branch, refresh projected state
      if (store.engine.getActiveBranch() === targetBranch) {
        set({
          viewingHash: null,
          projectedState: store.engine.projectCurrent(),
        });
      }
      store.persist();
    },

    // ─── Persistence ───────────────────────────────────────────────────────

    persist: () => {
      if (typeof window === "undefined") return;
      try {
        const repo = get().engine.getRepo();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(repo));
      } catch {
        // localStorage may be full or unavailable
      }
    },

    hydrate: () => {
      if (typeof window === "undefined") return;
      try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (json) {
          const repo = JSON.parse(json) as VCSRepo;
          const newEngine = new VCSEngine(repo);
          const store = get();
          if (store.catalogLoaded) {
            newEngine.setCatalog(Object.values(store.catalog));
          }
          // If persisted repo has orderContext, consider it initialized
          const hasOrderContext = !!repo.orderContext;

          // Recover default allocation IDs from the commit log
          // The first commit (by "system-init") contains the default allocations
          const initCommit = repo.log.find((c) => c.authorId === "system-init");
          let defaultAssignmentAllocId: string | null = null;
          let defaultPaymentAllocId: string | null = null;
          let defaultPaymentMethod = "cash";

          if (initCommit) {
            for (const delta of initCommit.deltas) {
              if (delta.action === "declare_allocation") {
                if (delta.allocation.type === "assignment") {
                  defaultAssignmentAllocId = delta.allocation.allocationId;
                } else if (delta.allocation.type === "payment") {
                  defaultPaymentAllocId = delta.allocation.allocationId;
                  defaultPaymentMethod =
                    (delta.allocation as PaymentAllocation).method || "cash";
                }
              }
            }
          }

          // If no system-init commit (legacy), scan the first commit's declare_allocation deltas
          if (!defaultAssignmentAllocId && !defaultPaymentAllocId && repo.log.length > 0) {
            const firstCommit = repo.log[0];
            for (const delta of firstCommit.deltas) {
              if (delta.action === "declare_allocation") {
                if (delta.allocation.type === "assignment" && !defaultAssignmentAllocId) {
                  defaultAssignmentAllocId = delta.allocation.allocationId;
                } else if (delta.allocation.type === "payment" && !defaultPaymentAllocId) {
                  defaultPaymentAllocId = delta.allocation.allocationId;
                  defaultPaymentMethod =
                    (delta.allocation as PaymentAllocation).method || "cash";
                }
              }
            }
          }

          // Try to recover activePaymentConfigId from the last item's allocations
          let activePaymentConfigId: string | null = `group-default-${defaultPaymentMethod}`;
          const currentProj = newEngine.projectCurrent();
          const items = Object.values(currentProj.items);
          if (items.length > 0) {
            const lastItem = items[items.length - 1];
            const itemPayAllocs = lastItem.allocations
              .map((id) => currentProj.allocations[id])
              .filter((a) => a?.type === "payment") as PaymentAllocation[];
            if (itemPayAllocs.length > 0) {
              activePaymentConfigId = itemPayAllocs[0].correlationId || itemPayAllocs[0].allocationId;
            }
          }

          set({
            engine: newEngine,
            projectedState: currentProj,
            isInitialized: hasOrderContext,
            orderContext: repo.orderContext ?? null,
            defaultAssignmentAllocId,
            defaultPaymentAllocId,
            activePaymentConfigId,
            defaultPaymentMethod,
          });
        }
      } catch {
        // Corrupted data — start fresh
      }
    },
  };
});
