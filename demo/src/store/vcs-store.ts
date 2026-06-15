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
  FulfillmentAllocation,
  AllocationBlock,
  ProjectedLineItem,
  MergePreview,
} from "@/lib/vcs/types";
import {
  BranchType,
  SquashType,
  DeltaActionType,
  PaymentStrategyType,
  AllocationType,
  TimeBlockType,
  ItemStatus,
  NoteAttachmentScope,
  RepoContextType,
  CatalogItemType,
  FilterProperty,
  FilterOperator,
  MutationType,
} from "@/lib/vcs/types";
import type { ResolvedChargeRule } from "@/lib/pos/financials";
import { evaluateBusinessRules, type RenderedCheck } from "@/lib/pos/evaluate";
import {
  OrderContext,
  OrderType,
  PaymentUpdateMode,
  ConfigUpdateMode,
  SplitQtyType,
} from "@/lib/pos/types";
import { generateAllocationId, generateLineId } from "@/lib/vcs/id";
import { generateDraftBranchName } from "@/lib/pos/id";
import {
  getPaymentAllocDisplayName,
  getAssignmentAllocDisplayName,
  generateSplitCorrelationId,
} from "@/lib/pos/utils";
import { projectState } from "@/lib/vcs/reducer";
import { toast } from "sonner";
import { PAYMENT_METHODS } from "@/lib/pos/ui-utils";

// ─── Storage Key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "vcs-repo";
const CONTEXT_ID_PREFIX = "pos-session-";

function generateContextId(): string {
  return `${CONTEXT_ID_PREFIX}${Date.now()}`;
}

// POS helpers are now located in the dedicated POS library.

export interface IconConfig {
  id: string;
  type: string;
  label: string;
  icon: string;
  color: string;
}

// ─── Module-Level Helpers ───────────────────────────────────────────────────

function buildCloneDeltas(
  projItem: ProjectedLineItem,
  newParentId: string | null,
  parentScaledQty: number,
  deltas: Delta[],
  options?: { overrideRootQty?: number; rootAllocations?: string[] },
) {
  const newLineId = generateLineId();
  let rawQty =
    newParentId && parentScaledQty > 0
      ? projItem.qty / parentScaledQty
      : projItem.qty;

  if (options?.overrideRootQty !== undefined) {
    rawQty = options.overrideRootQty;
  }

  let allocations = newParentId ? [] : [...projItem.allocations];
  if (!newParentId && options?.rootAllocations) {
    allocations = options.rootAllocations;
  }

  deltas.push({
    action: DeltaActionType.AddItem,
    lineId: newLineId,
    parentLineId: newParentId,
    sku: projItem.sku,
    qty: rawQty,
    inlineQty: projItem.inlineQty,
    allocations,
    selectedModifierState: projItem.selectedModifierState,
  });

  for (const child of projItem.children) {
    if (child.status !== ItemStatus.Canceled) {
      buildCloneDeltas(child, newLineId, projItem.qty, deltas);
    }
  }
}

function isSystemBranch(branch: string | string[]): boolean {
  const branches = Array.isArray(branch) ? branch : [branch];
  return branches.some((b) => b.trim() === "system");
}

function snapQty(qty: number, increment: number): number {
  if (qty <= 0) return 0;
  let snapped = Math.floor(qty / increment) * increment;
  if (snapped <= 0) snapped = increment;
  return Math.round(snapped * 1000) / 1000;
}

function isMainQtyLocked(
  catalogEntry: CatalogItemEntry | undefined,
  targetQty?: number,
): boolean {
  if (!catalogEntry?.inlineQtyMainQtyLocked) return false;
  if (targetQty === 0) return false;
  return true;
}

// ─── Create Default Repo ──────────────────────────────────────────────────────

function createFreshRepo(orderContext?: OrderContext): VCSRepo {
  return {
    contextType: RepoContextType.Cart,
    contextId: generateContextId(),
    orderContext,
    preferences: {},
    log: [],
    branches: { main: { headHash: null } },
    activeBranch: "main",
  };
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface VCSStore {
  // State
  engine: VCSEngine;
  projectedState: RenderedCheck;
  chargeRules: ResolvedChargeRule[];
  viewingHash: string | null; // null = follow HEAD
  catalog: Record<string, CatalogItemEntry>;
  catalogLoaded: boolean;
  iconConfigs: Record<string, IconConfig>;

  // Order Init State
  isInitialized: boolean;
  orderContext: OrderContext | null;
  defaultPaymentMethod: string; // from POS config
  preferences: Record<string, unknown>;

  // Default Allocation IDs (shared across items)
  defaultAssignmentAllocId: string | null;
  defaultPaymentAllocId: string | null;
  activePaymentConfigId: string | null;
  activeFulfillmentConfigId: string | null;

  // Computed
  headHash: () => string | null;
  activeBranch: () => string;
  commitLog: () => VCSCommit[];

  // Actions — Catalog
  loadCatalog: (items: CatalogItemEntry[]) => void;
  setChargeRules: (rules: ResolvedChargeRule[]) => void;
  loadIconConfigs: (configs: IconConfig[]) => void;

  // Actions — Guests
  guests: () => Array<{ id: string; name: string }>;
  addGuest: (name: string) => string;
  updateGuest: (id: string, name: string) => void;
  hideGuest: (id: string) => void;

  // Actions — Order Init/Reset
  initRepo: (orderContext: OrderContext, defaultPaymentMethod: string) => void;
  resetOrder: () => void;
  updateOrderType: (newType: OrderType, newTypeLabel: string) => void;
  updateOrderContext: (context: Partial<OrderContext>) => void;
  updatePreferences: (prefs: Partial<Record<string, unknown>>) => void;

  // Actions — Default Allocations
  /**
   * Create the initial default allocation pair (assignment + payment).
   * Called once when the order is initialized.
   */
  initDefaultAllocations: (customerName: string, paymentMethod: string) => void;

  /**
   * Create a guest-specific set of payment allocations using the current global default
   * payment method as the payer. Does NOT change the global default payer or config.
   *
   * The allocation IDs are prefixed with the sanitized guest name so they are identifiable.
   * Returns the correlationId (group-{sanitizedName}-{method}) for the active method's group.
   */
  addGuestPaymentAllocation: (guestIdOrName: string) => string;

  /**
   * Add an item using the default shared allocations.
   * No new allocations are declared — the item references the default IDs.
   */
  addItemWithDefaults: (
    sku: string,
    qty: number,
    assigneeIdOrName?: string,
  ) => void;

  /**
   * Switch the default payment method.
   * @param mode "change-existing" — batch-swaps all items using the current default payment alloc
   *             "new-only" — creates a new default payment alloc, future items use it
   */
  changeDefaultPayment: (newMethod: string, mode: ConfigUpdateMode) => void;

  addGroupNote: (lineIds: string[], text: string) => void;
  removeGroupNote: (lineIds: string[], noteId: string) => void;
  cleanupStaleNotes: (noteIds: string[]) => void;
  attachNoteToOrder: (noteId: string, attached: boolean) => void;

  /**
   * Switch the default payment configuration.
   * @param newConfigId The allocationId (single) or correlationId (split) of the target configuration.
   * @param mode "change-existing" — batch-swaps all items using the old configuration to the new one.
   *             "new-only" — updates the pointer so future items use the new config.
   */
  selectPaymentConfig: (newConfigId: string, mode: ConfigUpdateMode) => void;

  /**
   * Switch the default fulfillment configuration.
   */
  selectFulfillmentConfig: (
    newConfigId: string,
    mode: ConfigUpdateMode,
  ) => void;

  /**
   * Create a table-wide split payment configuration.
   * Returns the generated correlationId.
   */
  createTableSplitConfig: (
    splits: Array<{
      entity: string;
      strategyType: PaymentStrategyType;
      value: number;
      method?: string | null;
    }>,
    method?: string | null,
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
      strategyType: PaymentStrategyType;
      value: number; // decimal for percentage (e.g. 0.6), absolute value for fixed, 0 for remaining
      method?: string | null;
    }>,
    mode?: PaymentUpdateMode,
  ) => void;

  /**
   * Reassign an item to a different guest (new assignment allocation).
   */
  reassignItem: (lineId: string, newAssigneeIdOrName: string) => void;

  /**
   * Update the fulfillment allocation of an item (when it is fulfilled).
   */
  updateFulfillmentAllocation: (
    lineId: string,
    timeType: TimeBlockType,
    calculatedAt: string | null,
    customMethod?: string,
    customDestLabel?: string,
    customDestId?: string | null,
  ) => void;

  /**
   * Switch an individual item's payment method (creates a new payment alloc just for this item).
   * Removes any existing split/custom payment and replaces with a single new payment.
   */
  switchItemPayment: (
    lineId: string,
    newMethod: string,
    payerIdOrName: string,
    mode?: PaymentUpdateMode,
  ) => void;

  /**
   * Reset an item's payment back to the current default payment allocation.
   * Removes any split allocations, reverts to the shared default.
   */
  resetItemPaymentToDefault: (lineId: string) => void;

  /**
   * Update an allocation's configuration directly.
   * Commits a declare_allocation delta with updated values.
   */
  updateAllocation: (
    allocId: string,
    updatedFields: Partial<AllocationBlock>,
  ) => void;

  /**
   * Group an item's assignment allocation with an existing target assignment allocation ID.
   */
  groupItemAllocation: (
    lineId: string,
    targetAllocId: string,
    allocType: AllocationType.Assignment,
  ) => void;

  /**
   * Group an item's payment allocations with an existing payment configuration (reusing single allocation ID or correlation ID).
   */
  groupItemPaymentConfig: (lineId: string, targetId: string) => void;

  // Actions — Core VCS (legacy, still used for mimic)
  commitDeltas: (deltas: Delta[], authorId?: string) => VCSCommit;
  addModifier: (
    parentLineId: string,
    modifierSku: string,
    selectedModifierState?: string,
  ) => void;
  swapComboChoice: (
    oldLineId: string,
    parentLineId: string,
    newSku: string,
    modifierSku?: string,
    retainModifiers?: boolean,
  ) => void;
  removeItem: (lineId: string) => void;
  modifyItemQty: (lineId: string, beforeQty: number, afterQty: number) => void;
  modifyItemInlineQty: (
    lineId: string,
    beforeInlineQty: number,
    afterInlineQty: number,
  ) => void;
  duplicateItem: (lineId: string) => string | undefined;
  modifyItemSku: (lineId: string, beforeSku: string, afterSku: string) => void;
  modifyModifierState: (
    lineId: string,
    beforeState?: string,
    afterState?: string,
  ) => void;
  mimicOrder: (
    sourceAssignee: string,
    targetAssignee: string,
    targetPayer: string,
    paymentMethod: string,
  ) => void;

  // Actions — Bulk Operations
  duplicateItems: (lineIds: string[]) => string[];
  duplicateAndReassignItems: (
    lineIds: string[],
    targetGuestIdOrName: string,
  ) => string[];
  removeItems: (lineIds: string[]) => void;
  modifyItemsQty: (lineIds: string[], change: number) => void;
  setItemsQty: (lineIds: string[], targetQty: number) => void;
  mergeItems: (lineIds: string[]) => void;
  breakItems: (lineIds: string[]) => string[];
  combineItems: (requests: { comboSku: string; qty: number; assignments: any[] }[]) => string[];
  splitItemsQty: (
    lineIds: string[],
    type: SplitQtyType,
    value: number,
  ) => string[];
  splitItemsIntoIncrements: (lineIds: string[], splitQty: number) => string[];
  reassignItems: (lineIds: string[], newAssigneeIdOrName: string) => void;
  groupItemsPaymentConfig: (lineIds: string[], targetId: string) => void;
  groupItemsFulfillmentConfig: (lineIds: string[], targetId: string) => void;
  addGroupModifier: (
    parentLineIds: string[],
    modifierSku: string,
    selectedModifierState?: string,
  ) => void;
  removeGroupModifier: (parentLineIds: string[], modifierSku: string) => void;

  // Actions — Branching
  createBranch: (name: string, fromCommitHash?: string | null) => void;
  checkoutBranch: (name: string) => void;
  viewRevision: (hash: string | null) => void; // null = HEAD
  setMainActiveBranch: (name: string) => void;
  mainActiveBranch: () => string;
  updateBranchConfig: (
    name: string,
    config: { type?: BranchType; label?: string },
  ) => void;
  renameBranch: (oldName: string, newName: string) => void;

  // Actions — Merge
  previewMerge: (
    sourceBranches: string[],
    targetBranch: string,
  ) => MergePreview;
  commitMerge: (
    sourceBranches: string[],
    targetBranch: string,
    resolutionDeltas: Delta[],
  ) => void;

  // Actions — History Management
  /**
   * Squash all pending commits from `fromHash` (inclusive) up to HEAD into
   * a single replacement commit. Confirmed commits are untouchable.
   */
  squashPendingCommits: (fromHash: string, type: SquashType) => void;
  /**
   * Reset the active branch HEAD to `targetHash`, discarding all pending
   * commits after it. Confirmed commits cannot be discarded.
   */
  resetToCommit: (targetHash: string) => void;

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
    projectedState: evaluateBusinessRules(engine.projectCurrent(), [], {}),
    chargeRules: [],
    viewingHash: null,
    catalog: {},
    catalogLoaded: false,
    iconConfigs: {},

    // ─── Order Init State ────────────────────────────────────────────────────
    isInitialized: false,
    orderContext: null,
    defaultPaymentMethod: "cash",
    preferences: {},

    // ─── Default Allocation IDs ─────────────────────────────────────────────
    defaultAssignmentAllocId: null,
    defaultPaymentAllocId: null,
    activePaymentConfigId: null,
    activeFulfillmentConfigId: null,

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
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          catalogMap,
        ),
      });
    },

    setChargeRules: (rules) => {
      const store = get();
      set({
        chargeRules: rules,
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          rules,
          store.catalog,
        ),
      });
    },

    loadIconConfigs: (configs) => {
      const map: Record<string, IconConfig> = {};
      for (const c of configs) {
        map[c.id] = c;
      }
      set({ iconConfigs: map });
    },

    // ─── Order Init/Reset ───────────────────────────────────────────────────

    initRepo: (orderContext: OrderContext, rawDefaultPaymentMethod: string) => {
      let defaultPaymentMethod = rawDefaultPaymentMethod.toLowerCase();
      if (!PAYMENT_METHODS.includes(defaultPaymentMethod)) {
        defaultPaymentMethod = PAYMENT_METHODS[0] || "cash";
      }
      if (orderContext && orderContext.orderType) {
        const matchedEnum = Object.values(OrderType).find(
          (val) =>
            val.toLowerCase().replace(/[^a-z0-9]/g, "") ===
            orderContext.orderType.toLowerCase().replace(/[^a-z0-9]/g, ""),
        );
        if (matchedEnum) {
          orderContext.orderType = matchedEnum;
        }
      }
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
        type: AllocationType.Assignment,
        entity: customerName,
      };

      const deltas: Delta[] = [
        {
          action: DeltaActionType.DeclareAllocation,
          allocation: assignmentAlloc,
        },
      ];

      const paymentMethods = PAYMENT_METHODS;
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
          type: AllocationType.Payment,
          payer: customerName,
          method: m,
          paymentStrategy: {
            strategyType: PaymentStrategyType.Percentage,
            value: 1.0,
          },
          timeOfPayment: {
            type: TimeBlockType.Immediate,
            calculatedAt: new Date().toISOString(),
          },
        };

        deltas.push({
          action: DeltaActionType.DeclareAllocation,
          allocation: paymentAlloc,
        });
      }

      // Default fulfillment allocations for each order type
      const fulfillmentMethods = Object.values(OrderType);
      const activeFulfillmentGroupId = `group-default-${(
        orderContext.orderType || OrderType.WalkIn
      ).toLowerCase()}`;

      for (const method of fulfillmentMethods) {
        const fulAllocId = generateAllocationId(
          `default-fulfillment-${method.toLowerCase()}`,
        );
        const correlationId = `group-default-${method.toLowerCase()}`;

        let destLabel = "Guest";
        let destId: string | null = null;

        if (method === OrderType.WalkIn) {
          destLabel = orderContext.tableConfigId
            ? `Table ${orderContext.tableConfigId}`
            : orderContext.customerFields?.name || "Guest";
          destId = orderContext.tableConfigId || null;
        } else if (method === OrderType.Pickup) {
          destLabel = orderContext.customerFields?.name || "Guest";
        } else if (method === OrderType.Delivery) {
          destLabel =
            orderContext.customerFields?.address ||
            orderContext.customerFields?.name ||
            "Guest Address";
        }

        const defaultFulfillment: FulfillmentAllocation = {
          allocationId: fulAllocId,
          correlationId,
          type: AllocationType.Fulfillment,
          method,
          time: {
            type: TimeBlockType.Immediate,
            calculatedAt: null,
          },
          fulfillmentMetadata: {
            destinationLabel: destLabel,
            destinationId: destId,
          },
        };

        deltas.push({
          action: DeltaActionType.DeclareAllocation,
          allocation: defaultFulfillment,
        });
      }

      newEngine.commitSystem(deltas, "system-init");

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
        projectedState: evaluateBusinessRules(
          newEngine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
        viewingHash: null,
        isInitialized: true,
        orderContext,
        defaultPaymentMethod,
        defaultAssignmentAllocId: assignAllocId,
        defaultPaymentAllocId: mainPayAllocId,
        activePaymentConfigId: activePayGroupId,
        activeFulfillmentConfigId: activeFulfillmentGroupId,
      });
      get().persist();

      // Fetch charge rules from backend for the new repo
      fetch("/api/charge-rules")
        .then((res) => res.json())
        .then((data) => {
          if (data.rules) {
            get().setChargeRules(data.rules);
          }
        })
        .catch((err) => console.error("Failed to fetch charge rules:", err));
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
        projectedState: evaluateBusinessRules(
          newEngine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
        viewingHash: null,
        isInitialized: false,
        orderContext: null,
        defaultPaymentMethod: "cash",
        preferences: {},
        defaultAssignmentAllocId: null,
        defaultPaymentAllocId: null,
        activePaymentConfigId: null,
        activeFulfillmentConfigId: null,
      });
    },

    updateOrderType: (newType: OrderType, newTypeLabel: string) => {
      const store = get();
      if (!store.orderContext) return;
      const updatedContext = {
        ...store.orderContext,
        orderType: newType,
        orderTypeLabel: newTypeLabel,
      };

      const repo = store.engine.getRepo();
      repo.orderContext = updatedContext;

      set({
        orderContext: updatedContext,
      });
      store.persist();
    },

    updateOrderContext: (context: Partial<OrderContext>) => {
      const store = get();
      if (!store.orderContext) return;
      const updatedContext = {
        ...store.orderContext,
        ...context,
      };

      const repo = store.engine.getRepo();
      repo.orderContext = updatedContext;

      set({
        orderContext: updatedContext,
      });
      store.persist();
    },

    updatePreferences: (prefs: Partial<Record<string, unknown>>) => {
      const store = get();
      const updatedPreferences = {
        ...store.preferences,
        ...prefs,
      };

      const repo = store.engine.getRepo();
      repo.preferences = updatedPreferences;

      set({
        preferences: updatedPreferences,
      });
      store.persist();
    },

    // ─── Guests ─────────────────────────────────────────────────────────────

    guests: () => {
      const state = get().projectedState;
      const guestsList: Array<{ id: string; name: string }> = [];
      for (const alloc of Object.values(state.allocations)) {
        if (alloc.type === AllocationType.Assignment && !alloc.hidden) {
          if (alloc.allocationId.startsWith("alloc-assign-")) {
            continue;
          }
          guestsList.push({ id: alloc.allocationId, name: alloc.entity });
        }
      }
      return guestsList;
    },

    addGuest: (name: string) => {
      const store = get();
      const allocId = generateAllocationId("guest");
      const assignmentAlloc: AssignmentAllocation = {
        allocationId: allocId,
        type: AllocationType.Assignment,
        entity: name,
      };
      const paymentMethods = PAYMENT_METHODS;
      const sanitized =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "guest";
      const deltas: Delta[] = [
        {
          action: DeltaActionType.DeclareAllocation,
          allocation: assignmentAlloc,
        },
      ];
      for (const m of paymentMethods) {
        const correlationId = `group-${sanitized}-${m}`;
        const payAllocId = generateAllocationId(`${sanitized}-pay-${m}`);
        const paymentAlloc: PaymentAllocation = {
          allocationId: payAllocId,
          correlationId,
          type: AllocationType.Payment,
          payer: name,
          method: m,
          paymentStrategy: {
            strategyType: PaymentStrategyType.Percentage,
            value: 1.0,
          },
          timeOfPayment: {
            type: TimeBlockType.Immediate,
            calculatedAt: new Date().toISOString(),
          },
        };
        deltas.push({
          action: DeltaActionType.DeclareAllocation,
          allocation: paymentAlloc,
        });
      }
      store.engine.commitSystem(deltas, "pos-ui");
      set({
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
      return allocId;
    },

    updateGuest: (id: string, name: string) => {
      const store = get();
      const alloc = store.projectedState.allocations[id];
      if (alloc && alloc.type === AllocationType.Assignment) {
        const updatedAlloc: AssignmentAllocation = {
          ...alloc,
          entity: name,
        };
        store.engine.commitSystem([
          {
            action: DeltaActionType.DeclareAllocation,
            allocation: updatedAlloc,
          },
        ]);
        set({
          projectedState: evaluateBusinessRules(
            store.engine.projectCurrent(),
            store.chargeRules,
            store.catalog,
          ),
        });
        store.persist();
      }
    },

    hideGuest: (id: string) => {
      const store = get();
      const alloc = store.projectedState.allocations[id];
      if (alloc && alloc.type === AllocationType.Assignment) {
        const updatedAlloc: AssignmentAllocation = { ...alloc, hidden: true };
        store.engine.commitSystem([
          {
            action: DeltaActionType.DeclareAllocation,
            allocation: updatedAlloc,
          },
        ]);
        set({
          projectedState: evaluateBusinessRules(
            store.engine.projectCurrent(),
            store.chargeRules,
            store.catalog,
          ),
        });
        store.persist();
      }
    },

    // ─── Default Allocations ────────────────────────────────────────────────

    initDefaultAllocations: (customerName: string, paymentMethod: string) => {
      // This is called internally by initRepo — no need for external use
      void customerName;
      void paymentMethod;
    },

    addGuestPaymentAllocation: (guestIdOrName: string) => {
      const store = get();
      const state = store.projectedState;
      let guestName = guestIdOrName;

      const alloc = state.allocations[guestIdOrName];
      if (alloc && alloc.type === AllocationType.Assignment) {
        guestName = alloc.entity;
      }

      // Sanitize guest name to a safe prefix (lowercase, alphanumeric + dash)
      const sanitized =
        guestName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "guest";

      const paymentMethods = PAYMENT_METHODS;
      const activeMethod = store.defaultPaymentMethod;
      let activeCorrelationId = "";

      const deltas: Delta[] = [];
      for (const m of paymentMethods) {
        const correlationId = `group-${sanitized}-${m}`;
        if (m === activeMethod) {
          activeCorrelationId = correlationId;
        }
        const payAllocId = generateAllocationId(`${sanitized}-pay-${m}`);
        const paymentAlloc: PaymentAllocation = {
          allocationId: payAllocId,
          correlationId,
          type: AllocationType.Payment,
          payer: guestName,
          method: m,
          paymentStrategy: {
            strategyType: PaymentStrategyType.Percentage,
            value: 1.0,
          },
          timeOfPayment: {
            type: TimeBlockType.Immediate,
            calculatedAt: new Date().toISOString(),
          },
        };
        deltas.push({
          action: DeltaActionType.DeclareAllocation,
          allocation: paymentAlloc,
        });
      }

      store.engine.commitSystem(deltas, "system-guest");
      set({
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
      return activeCorrelationId;
    },

    addItemWithDefaults: (sku, qty, assigneeIdOrName) => {
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

      if (assigneeIdOrName) {
        const targetAlloc = state.allocations[assigneeIdOrName];
        if (targetAlloc && targetAlloc.type === AllocationType.Assignment) {
          assignId = assigneeIdOrName;
        } else {
          const defaultName =
            store.orderContext?.customerFields.name || "Guest";
          if (assigneeIdOrName !== defaultName) {
            const existingByName = Object.values(state.allocations).find(
              (a) =>
                a.type === AllocationType.Assignment &&
                (a as AssignmentAllocation).entity === assigneeIdOrName,
            );
            if (existingByName) {
              assignId = existingByName.allocationId;
            } else {
              const newAssignId = generateAllocationId("assign");
              const newAssignAlloc: AssignmentAllocation = {
                allocationId: newAssignId,
                type: AllocationType.Assignment,
                entity: assigneeIdOrName,
              };
              store.engine.commitSystem(
                [
                  {
                    action: DeltaActionType.DeclareAllocation,
                    allocation: newAssignAlloc,
                  },
                ],
                "pos-ui",
              );
              assignId = newAssignId;
            }
          }
        }
      }

      // Find all allocations that match the activePaymentConfigId (either allocationId or correlationId)
      const payAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation =>
          a.type === AllocationType.Payment &&
          (a.allocationId === configId ||
            (a.correlationId !== null && a.correlationId === configId)),
      );
      const payIds = payAllocs.map((a) => a.allocationId);

      // Find fulfillment allocation matching activeFulfillmentConfigId
      let fulfillmentIds: string[] = [];
      let activeFulfillmentId = store.activeFulfillmentConfigId;
      if (!activeFulfillmentId) {
        const fallbackFul = Object.values(state.allocations).find(
          (a) => a.type === AllocationType.Fulfillment,
        );
        if (fallbackFul) {
          activeFulfillmentId = fallbackFul.allocationId;
        }
      }

      if (activeFulfillmentId) {
        const fulAllocs = Object.values(state.allocations).filter(
          (a): a is FulfillmentAllocation =>
            a.type === AllocationType.Fulfillment &&
            (a.allocationId === activeFulfillmentId ||
              (a.correlationId !== null &&
                a.correlationId === activeFulfillmentId)),
        );
        fulfillmentIds = fulAllocs.map((a) => a.allocationId);
      }

      const targetAllocations = [assignId, ...payIds, ...fulfillmentIds];

      const parentLineId = generateLineId();
      deltas.push({
        action: DeltaActionType.AddItem,
        lineId: parentLineId,
        parentLineId: null,
        sku,
        qty,
        allocations: targetAllocations,
      });

      const injectDefaults = (itemSku: string, itemLineId: string) => {
        const entry = store.catalog[itemSku];
        if (!entry) return;

        // Auto-inject default size modifier if catalog entry has an applied size group
        if (entry.appliedSizeGroup) {
          const defaultSku = entry.appliedSizeGroup.defaultSku;
          const childId = generateLineId();
          deltas.push({
            action: DeltaActionType.AddItem,
            lineId: childId,
            parentLineId: itemLineId,
            sku: defaultSku,
            qty: 1,
            allocations: [],
          });
          injectDefaults(defaultSku, childId);
        }

        // Auto-inject default choice for each unique combo slot
        if (entry.comboChoices && entry.comboChoices.length > 0) {
          const seenSlots = new Set<string>();
          for (const choice of entry.comboChoices) {
            if (!seenSlots.has(choice.slotSku)) {
              seenSlots.add(choice.slotSku);
              const childId = generateLineId();
              deltas.push({
                action: DeltaActionType.AddItem,
                lineId: childId,
                parentLineId: itemLineId,
                sku: choice.optionSku,
                qty: 1,
                allocations: [],
              });
              injectDefaults(choice.optionSku, childId);
            }
          }
        }
      };

      injectDefaults(sku, parentLineId);

      store.commitDeltas(deltas, "pos-ui");
    },

    changeDefaultPayment: (newMethod: string, mode: ConfigUpdateMode) => {
      get().selectPaymentConfig(`group-default-${newMethod}`, mode);
    },

    addGroupNote: (lineIds, text) => {
      const store = get();
      const noteId = `note-${generateAllocationId()}`;

      store.engine.commitSystem(
        [
          {
            action: DeltaActionType.DeclareAllocation,
            allocation: {
              allocationId: noteId,
              type: AllocationType.Note,
              text: text.trim(),
            },
          },
        ],
        "pos-ui",
      );

      const deltas: Delta[] = [];
      for (const lineId of lineIds) {
        const item = store.projectedState.items[lineId];
        if (item) {
          const before = item.allocations || [];
          const after = [...before.filter((id) => id !== noteId), noteId];
          deltas.push({
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: before,
            afterAllocations: after,
          });
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      } else {
        set({
          projectedState: evaluateBusinessRules(
            store.engine.projectCurrent(),
            store.chargeRules,
            store.catalog,
          ),
        });
        store.persist();
      }
    },

    removeGroupNote: (lineIds, noteId) => {
      const store = get();
      const deltas: Delta[] = [];

      for (const lineId of lineIds) {
        const item = store.projectedState.items[lineId];
        if (item) {
          const before = item.allocations || [];
          const after = before.filter((id) => id !== noteId);
          deltas.push({
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: before,
            afterAllocations: after,
          });
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
    },

    cleanupStaleNotes: (noteIds) => {
      const store = get();
      const deltas: Delta[] = noteIds.map((noteId) => ({
        action: DeltaActionType.UndeclareAllocation,
        allocationId: noteId,
      }));
      if (deltas.length > 0) {
        store.engine.commitSystem(deltas, "pos-ui");
        set({
          projectedState: evaluateBusinessRules(
            store.engine.projectCurrent(),
            store.chargeRules,
            store.catalog,
          ),
        });
        store.persist();
        toast.success("Stale notes cleared successfully");
      }
    },

    attachNoteToOrder: (noteId, attached) => {
      const store = get();
      const currentAlloc = store.projectedState.allocations[noteId];
      if (!currentAlloc || currentAlloc.type !== AllocationType.Note) return;

      const updatedAlloc = {
        ...currentAlloc,
        attachedTo: attached ? NoteAttachmentScope.Order : null,
      };

      store.engine.commitSystem(
        [
          {
            action: DeltaActionType.UndeclareAllocation,
            allocationId: noteId,
          },
          {
            action: DeltaActionType.DeclareAllocation,
            allocation: updatedAlloc,
          },
        ],
        "pos-ui",
      );

      const deltas: Delta[] = [];
      if (attached) {
        const activeItems = Object.values(store.projectedState.items);
        for (const item of activeItems) {
          if (item.allocations.includes(noteId)) {
            deltas.push({
              action: DeltaActionType.ModifyItemAllocations,
              lineId: item.lineId,
              beforeAllocations: item.allocations,
              afterAllocations: item.allocations.filter((id) => id !== noteId),
            });
          }
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      } else {
        set({
          projectedState: evaluateBusinessRules(
            store.engine.projectCurrent(),
            store.chargeRules,
            store.catalog,
          ),
        });
        store.persist();
      }
      toast.success(
        attached ? "Note attached to order" : "Note detached from order",
      );
    },

    selectPaymentConfig: (newConfigId: string, mode: ConfigUpdateMode) => {
      const store = get();
      const currentConfigId = store.activePaymentConfigId;
      if (!currentConfigId) return;

      const state = store.projectedState;

      // Get allocations of the old config
      const oldPayAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation =>
          a.type === AllocationType.Payment &&
          (a.allocationId === currentConfigId ||
            (a.correlationId !== null && a.correlationId === currentConfigId)),
      );
      const oldPayIds = oldPayAllocs.map((a) => a.allocationId);

      // Get allocations of the new config
      const newPayAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation =>
          a.type === AllocationType.Payment &&
          (a.allocationId === newConfigId ||
            (a.correlationId !== null && a.correlationId === newConfigId)),
      );
      const newPayIds = newPayAllocs.map((a) => a.allocationId);

      if (mode === ConfigUpdateMode.ChangeExisting) {
        const itemsToSwap = Object.values(state.items).filter((item) =>
          item.allocations.some((id) => oldPayIds.includes(id)),
        );

        const deltas: Delta[] = [];
        for (const item of itemsToSwap) {
          const nonOldAllocations = item.allocations.filter(
            (id) => !oldPayIds.includes(id),
          );
          const afterAllocations = [...nonOldAllocations, ...newPayIds];

          deltas.push({
            action: DeltaActionType.ModifyItemAllocations,
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

    selectFulfillmentConfig: (newConfigId: string, mode: ConfigUpdateMode) => {
      const store = get();
      let currentConfigId = store.activeFulfillmentConfigId;
      const state = store.projectedState;

      if (!currentConfigId) {
        const fallbackFul = Object.values(state.allocations).find(
          (a) => a.type === AllocationType.Fulfillment,
        );
        if (fallbackFul) {
          currentConfigId = fallbackFul.allocationId;
        }
      }

      if (currentConfigId && mode === ConfigUpdateMode.ChangeExisting) {
        // Get allocations of the old config
        const oldFulAllocs = Object.values(state.allocations).filter(
          (a): a is FulfillmentAllocation =>
            a.type === AllocationType.Fulfillment &&
            (a.allocationId === currentConfigId ||
              (a.correlationId !== null &&
                a.correlationId === currentConfigId)),
        );
        const oldFulIds = oldFulAllocs.map((a) => a.allocationId);

        // Get allocations of the new config
        const newFulAllocs = Object.values(state.allocations).filter(
          (a): a is FulfillmentAllocation =>
            a.type === AllocationType.Fulfillment &&
            (a.allocationId === newConfigId ||
              (a.correlationId !== null && a.correlationId === newConfigId)),
        );
        const newFulIds = newFulAllocs.map((a) => a.allocationId);

        const itemsToSwap = Object.values(state.items).filter((item) =>
          item.allocations.some((id) => oldFulIds.includes(id)),
        );

        const deltas: Delta[] = [];
        for (const item of itemsToSwap) {
          const nonOldAllocations = item.allocations.filter(
            (id) => !oldFulIds.includes(id),
          );
          const afterAllocations = [...nonOldAllocations, ...newFulIds];

          deltas.push({
            action: DeltaActionType.ModifyItemAllocations,
            lineId: item.lineId,
            beforeAllocations: item.allocations,
            afterAllocations,
          });
        }

        if (deltas.length > 0) {
          store.commitDeltas(deltas, "pos-ui");
        }
      }

      set({
        activeFulfillmentConfigId: newConfigId,
      });
      get().persist();
    },

    createTableSplitConfig: (
      splits: Array<{
        entity: string;
        strategyType: PaymentStrategyType;
        value: number;
        method?: string | null;
      }>,
      method: string | null = null,
    ) => {
      const store = get();
      const state = store.projectedState;
      const customerName = store.orderContext?.customerFields.name || "Guest";

      const resolvedSplits = splits.map((s) => {
        let entityName = s.entity;
        const alloc = state.allocations[s.entity];
        if (alloc && alloc.type === AllocationType.Assignment) {
          entityName = alloc.entity;
        }
        return { ...s, entity: entityName };
      });

      // Check if we need to auto-add a remaining allocator
      const hasRemaining = resolvedSplits.some(
        (s) => s.strategyType === PaymentStrategyType.Remaining,
      );
      const totalPct = resolvedSplits
        .filter((s) => s.strategyType === PaymentStrategyType.Percentage)
        .reduce((sum, s) => sum + s.value, 0);
      const hasFixed = resolvedSplits.some(
        (s) =>
          s.strategyType === PaymentStrategyType.FixedItem ||
          s.strategyType === PaymentStrategyType.FixedGlobal,
      );

      const finalSplits = [...resolvedSplits];
      if (!hasRemaining && (totalPct < 0.999 || hasFixed)) {
        let remEntity = customerName;
        let suffix = 2;
        while (finalSplits.some((s) => s.entity === remEntity)) {
          remEntity = `${customerName} ${suffix}`;
          suffix++;
        }
        finalSplits.push({
          entity: remEntity,
          strategyType: PaymentStrategyType.Remaining,
          value: 0,
        });
      }

      const correlationId =
        generateSplitCorrelationId(
          finalSplits.map((s) => ({
            entity: s.entity,
            percentage:
              s.strategyType === PaymentStrategyType.Percentage
                ? Math.round(s.value * 100)
                : 0,
          })),
        ) + `-${Date.now().toString().slice(-4)}`;

      const newPayAllocs: PaymentAllocation[] = finalSplits.map((split) => ({
        allocationId: generateAllocationId("split-pay"),
        type: AllocationType.Payment,
        payer: split.entity,
        method: split.method || method,
        paymentStrategy: {
          strategyType: split.strategyType,
          value:
            split.strategyType === PaymentStrategyType.Remaining
              ? null
              : split.value,
        },
        timeOfPayment: {
          type: TimeBlockType.Immediate,
          calculatedAt: new Date().toISOString(),
        },
        correlationId,
      }));

      const deltas: Delta[] = newPayAllocs.map((a) => ({
        action: DeltaActionType.DeclareAllocation,
        allocation: a,
      }));

      store.engine.commitSystem(deltas, "pos-ui");
      set({
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
      return correlationId;
    },

    splitItemPayment: (
      lineId: string,
      splits: Array<{
        entity: string;
        strategyType: PaymentStrategyType;
        value: number;
        method?: string | null;
      }>,
      mode: PaymentUpdateMode = PaymentUpdateMode.Group,
    ) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      const customerName = store.orderContext?.customerFields.name || "Guest";

      const resolvedSplits = splits.map((s) => {
        let entityName = s.entity;
        const alloc = state.allocations[s.entity];
        if (alloc && alloc.type === AllocationType.Assignment) {
          entityName = alloc.entity;
        }
        return { ...s, entity: entityName };
      });

      // Check if we need to auto-add a remaining allocator
      const hasRemaining = resolvedSplits.some(
        (s) => s.strategyType === PaymentStrategyType.Remaining,
      );
      const totalPct = resolvedSplits
        .filter((s) => s.strategyType === PaymentStrategyType.Percentage)
        .reduce((sum, s) => sum + s.value, 0);
      const hasFixed = resolvedSplits.some(
        (s) =>
          s.strategyType === PaymentStrategyType.FixedItem ||
          s.strategyType === PaymentStrategyType.FixedGlobal,
      );

      const finalSplits = [...resolvedSplits];
      if (!hasRemaining && (totalPct < 0.999 || hasFixed)) {
        let remEntity = customerName;
        let suffix = 2;
        while (finalSplits.some((s) => s.entity === remEntity)) {
          remEntity = `${customerName} ${suffix}`;
          suffix++;
        }
        finalSplits.push({
          entity: remEntity,
          strategyType: PaymentStrategyType.Remaining,
          value: 0,
        });
      }

      // Check if this item is already on a custom split correlation ID (to edit the group ID in place)
      const currentPayAllocs = item.allocations
        .map((id) => state.allocations[id])
        .filter(
          (a) => a?.type === AllocationType.Payment,
        ) as PaymentAllocation[];

      const existingCorrelationId = currentPayAllocs.find(
        (a) => a.correlationId && !a.correlationId.startsWith("group-default-"),
      )?.correlationId;

      const correlationId =
        generateSplitCorrelationId(
          finalSplits.map((s) => ({
            entity: s.entity,
            percentage:
              s.strategyType === PaymentStrategyType.Percentage
                ? Math.round(s.value * 100)
                : 0,
          })),
        ) + `-${Date.now().toString().slice(-4)}`;

      // Create new payment allocations
      const newPayAllocs: PaymentAllocation[] = finalSplits.map((split) => ({
        allocationId: generateAllocationId("split-pay"),
        type: AllocationType.Payment,
        payer: split.entity,
        method: split.method || null,
        paymentStrategy: {
          strategyType: split.strategyType,
          value:
            split.strategyType === PaymentStrategyType.Remaining
              ? null
              : split.value,
        },
        timeOfPayment: {
          type: TimeBlockType.Immediate,
          calculatedAt: new Date().toISOString(),
        },
        correlationId,
      }));

      // Find all payment allocation IDs in the old group
      const oldPayIds = existingCorrelationId
        ? Object.values(state.allocations)
            .filter(
              (a): a is PaymentAllocation =>
                a.type === AllocationType.Payment &&
                a.correlationId === existingCorrelationId,
            )
            .map((a) => a.allocationId)
        : currentPayAllocs.map((a) => a.allocationId);

      // Find items to update based on the mode
      const itemsToUpdate =
        mode === PaymentUpdateMode.Group
          ? Object.values(state.items).filter((i) =>
              i.allocations.some((id) => oldPayIds.includes(id)),
            )
          : [item];

      store.engine.commitSystem(
        newPayAllocs.map((a) => ({
          action: DeltaActionType.DeclareAllocation,
          allocation: a,
        })),
        "pos-ui",
      );

      const deltas: Delta[] = [];
      for (const i of itemsToUpdate) {
        const nonOldAllocations = i.allocations.filter(
          (id) => !oldPayIds.includes(id),
        );
        const afterAllocations = [
          ...nonOldAllocations,
          ...newPayAllocs.map((a) => a.allocationId),
        ];

        deltas.push({
          action: DeltaActionType.ModifyItemAllocations,
          lineId: i.lineId,
          beforeAllocations: i.allocations,
          afterAllocations,
        });
      }

      store.commitDeltas(deltas, "pos-ui");

      if (
        existingCorrelationId &&
        store.activePaymentConfigId === existingCorrelationId
      ) {
        set({ activePaymentConfigId: correlationId });
        store.persist();
      }
    },

    reassignItem: (lineId: string, newAssigneeIdOrName: string) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      let targetAssignId = newAssigneeIdOrName;
      const targetAlloc = state.allocations[newAssigneeIdOrName];

      if (!targetAlloc || targetAlloc.type !== AllocationType.Assignment) {
        const existingByName = Object.values(state.allocations).find(
          (a) =>
            a.type === AllocationType.Assignment &&
            (a as AssignmentAllocation).entity === newAssigneeIdOrName,
        );
        if (existingByName) {
          targetAssignId = existingByName.allocationId;
        } else {
          targetAssignId = generateAllocationId("assign");
          const newAssignAlloc: AssignmentAllocation = {
            allocationId: targetAssignId,
            type: AllocationType.Assignment,
            entity: newAssigneeIdOrName,
          };
          store.engine.commitSystem(
            [
              {
                action: DeltaActionType.DeclareAllocation,
                allocation: newAssignAlloc,
              },
            ],
            "pos-ui",
          );
        }
      }

      // Find current assignment alloc
      const currentAssignAllocId = item.allocations.find(
        (id) => state.allocations[id]?.type === AllocationType.Assignment,
      );

      const newAllocations = item.allocations.map((id) =>
        id === currentAssignAllocId ? targetAssignId : id,
      );

      store.commitDeltas(
        [
          {
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui",
      );
    },

    updateFulfillmentAllocation: (
      lineId: string,
      timeType: TimeBlockType,
      calculatedAt: string | null,
      customMethod?: string,
      customDestLabel?: string,
      customDestId?: string | null,
    ) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      const orderContext = store.orderContext;
      const method = customMethod || orderContext?.orderType || "dine_in";
      const destinationLabel =
        customDestLabel !== undefined
          ? customDestLabel
          : orderContext?.tableConfigId
            ? `Table ${orderContext.tableConfigId}`
            : "Guest";
      const destinationId =
        customDestId !== undefined
          ? customDestId
          : orderContext?.tableConfigId || null;

      // Find current fulfillment alloc
      const currentFulAllocId = item.allocations.find(
        (id) => state.allocations[id]?.type === AllocationType.Fulfillment,
      );

      // Create new fulfillment allocation
      const newFulAllocId = generateAllocationId("fulfillment");
      const newFulAlloc: FulfillmentAllocation = {
        allocationId: newFulAllocId,
        type: AllocationType.Fulfillment,
        method,
        time: {
          type: timeType,
          calculatedAt,
        },
        fulfillmentMetadata: {
          destinationLabel,
          destinationId,
        },
      };

      let newAllocations: string[];
      if (currentFulAllocId) {
        // Replace current fulfillment allocation
        newAllocations = item.allocations.map((id) =>
          id === currentFulAllocId ? newFulAllocId : id,
        );
      } else {
        // Append new fulfillment allocation
        newAllocations = [...item.allocations, newFulAllocId];
      }

      store.engine.commitSystem(
        [
          {
            action: DeltaActionType.DeclareAllocation,
            allocation: newFulAlloc,
          },
        ],
        "pos-ui",
      );
      store.commitDeltas(
        [
          {
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui",
      );
    },

    switchItemPayment: (
      lineId: string,
      newMethod: string,
      payerIdOrName: string,
      mode: PaymentUpdateMode = PaymentUpdateMode.Item,
    ) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      let payer = payerIdOrName;
      const targetAlloc = state.allocations[payerIdOrName];
      if (targetAlloc && targetAlloc.type === AllocationType.Assignment) {
        payer = targetAlloc.entity;
      }

      // Create a new payment allocation with the specified method
      const newPayAllocId = generateAllocationId("item-pay");
      const newPaymentAlloc: PaymentAllocation = {
        allocationId: newPayAllocId,
        type: AllocationType.Payment,
        payer,
        method: newMethod,
        paymentStrategy: {
          strategyType: PaymentStrategyType.Percentage,
          value: 1.0,
        },
        timeOfPayment: {
          type: TimeBlockType.Immediate,
          calculatedAt: new Date().toISOString(),
        },
      };

      // Find old payment group
      const currentPayAllocs = item.allocations
        .map((id) => state.allocations[id])
        .filter(
          (a) => a?.type === AllocationType.Payment,
        ) as PaymentAllocation[];

      const existingCorrelationId = currentPayAllocs.find(
        (a) => a.correlationId,
      )?.correlationId;
      const oldPayIds = existingCorrelationId
        ? Object.values(state.allocations)
            .filter(
              (a): a is PaymentAllocation =>
                a.type === AllocationType.Payment &&
                a.correlationId === existingCorrelationId,
            )
            .map((a) => a.allocationId)
        : currentPayAllocs.map((a) => a.allocationId);

      const itemsToUpdate =
        mode === PaymentUpdateMode.Group
          ? Object.values(state.items).filter((i) =>
              i.allocations.some((id) => oldPayIds.includes(id)),
            )
          : [item];

      store.engine.commitSystem(
        [
          {
            action: DeltaActionType.DeclareAllocation,
            allocation: newPaymentAlloc,
          },
        ],
        "pos-ui",
      );

      const deltas: Delta[] = [];
      for (const i of itemsToUpdate) {
        const nonPaymentAllocs = i.allocations.filter(
          (id) => !oldPayIds.includes(id),
        );
        const newAllocations = [...nonPaymentAllocs, newPayAllocId];
        deltas.push({
          action: DeltaActionType.ModifyItemAllocations,
          lineId: i.lineId,
          beforeAllocations: i.allocations,
          afterAllocations: newAllocations,
        });
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    resetItemPaymentToDefault: (lineId: string) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      const defaultPayId = store.defaultPaymentAllocId;
      if (!item || !defaultPayId) return;

      // Remove all payment allocations and replace with default
      const nonPaymentAllocs = item.allocations.filter(
        (id) => state.allocations[id]?.type !== AllocationType.Payment,
      );

      const newAllocations = [...nonPaymentAllocs, defaultPayId];

      store.commitDeltas(
        [
          {
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui",
      );
    },

    updateAllocation: (
      allocId: string,
      updatedFields: Partial<AllocationBlock>,
    ) => {
      const store = get();
      const currentAlloc = store.projectedState.allocations[allocId];
      if (!currentAlloc) return;

      const updatedAlloc = {
        ...currentAlloc,
        ...updatedFields,
        allocationId: allocId, // keep ID identical
      } as AllocationBlock;

      store.engine.commitSystem(
        [
          {
            action: DeltaActionType.DeclareAllocation,
            allocation: updatedAlloc,
          },
        ],
        "pos-ui",
      );
      set({
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
    },

    groupItemAllocation: (
      lineId: string,
      targetAllocId: string,
      allocType: AllocationType.Assignment,
    ) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      // Find current allocation ID of the target type on this item
      const currentAllocId = item.allocations.find(
        (id) => state.allocations[id]?.type === allocType,
      );

      const newAllocations = item.allocations.map((id) =>
        id === currentAllocId ? targetAllocId : id,
      );

      store.commitDeltas(
        [
          {
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui",
      );
    },

    groupItemPaymentConfig: (lineId: string, targetId: string) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return;

      // Find all payment allocations in the projected state
      const allPayAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation => a.type === AllocationType.Payment,
      );

      // Check if targetId matches any correlationId
      const splitAllocs = allPayAllocs.filter(
        (a) => a.correlationId === targetId,
      );

      let targetAllocIds: string[] = [];
      if (splitAllocs.length > 0) {
        targetAllocIds = splitAllocs.map((a) => a.allocationId);
      } else {
        targetAllocIds = [targetId];
      }

      // Filter out current payment allocations from this item
      const nonPaymentAllocs = item.allocations.filter(
        (id) => state.allocations[id]?.type !== AllocationType.Payment,
      );

      // Append target payment allocation IDs
      const newAllocations = [...nonPaymentAllocs, ...targetAllocIds];

      store.commitDeltas(
        [
          {
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          },
        ],
        "pos-ui",
      );
    },

    // ─── Core VCS ──────────────────────────────────────────────────────────

    commitDeltas: (deltas, authorId = "pos-ui") => {
      const store = get();
      const activeBranch = store.engine.getActiveBranch();
      const mainBranch = store.engine.getMainActiveBranch();

      if (isSystemBranch(activeBranch)) {
        toast.error("Cannot modify line items directly on the system branch.");
        return store.engine.getLog()[0]; // Return HEAD
      }

      const activeHead = store.engine.getHeadHash(activeBranch);
      const mainHead = store.engine.getHeadHash(mainBranch);

      const isMain = activeBranch === mainBranch;
      const isMergedToMain =
        !isMain &&
        activeHead &&
        mainHead &&
        activeHead !== mainHead &&
        store.engine.isAncestorOf(activeHead, mainHead);

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
          toast.info(
            `Automatically moved to new draft branch "${draftBranchName}" to protect main.`,
          );
        } else {
          toast.info(
            `Automatically moved to new draft branch "${draftBranchName}" because "${activeBranch}" is already merged.`,
          );
        }
      }

      const commit = store.engine.commit(deltas, authorId);
      set({
        viewingHash: null, // Reset to HEAD after new commit
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
      return commit;
    },

    addModifier: (parentLineId, modifierSku, selectedModifierState) => {
      const store = get();
      const state = store.projectedState;
      const parent = state.items[parentLineId];

      if (parent) {
        const parentEntry = store.catalog[parent.sku];
        const modConfig = parentEntry?.modifierConfigs?.find(
          (c) => c.modifierSku === modifierSku,
        );

        if (!modConfig?.allowDuplicates) {
          const hasMod = parent.children.some((c) => c.sku === modifierSku);
          if (hasMod) {
            toast.error("Duplicate modifier not allowed.");
            return;
          }
        }
      }

      store.commitDeltas(
        [
          {
            action: DeltaActionType.AddItem,
            lineId: generateLineId(),
            parentLineId,
            sku: modifierSku,
            qty: 1,
            allocations: [],
            selectedModifierState,
          },
        ],
        "pos-ui",
      );
    },

    swapComboChoice: (
      oldLineId,
      parentLineId,
      newSku,
      modifierSku,
      retainModifiers,
    ) => {
      const store = get();
      const state = store.projectedState;
      const oldItem = state.items[oldLineId];
      if (!oldItem) return;

      const deltas: Delta[] = [];

      // 1. Remove the old choice
      deltas.push({
        action: DeltaActionType.RemoveItem,
        lineId: oldLineId,
        qty: oldItem.qty,
      });

      // 2. Add the new choice child
      const childId = generateLineId();
      deltas.push({
        action: DeltaActionType.AddItem,
        lineId: childId,
        parentLineId,
        sku: newSku,
        qty: oldItem.qty,
        allocations: [],
      });

      // 3. Recursively inject defaults for the new child SKU
      const injectDefaults = (
        itemSku: string,
        itemLineId: string,
        customSizeSku?: string,
      ) => {
        const entry = store.catalog[itemSku];
        if (!entry) return;

        // Auto-inject default size modifier if catalog entry has an applied size group
        if (entry.appliedSizeGroup) {
          const sizeSku = customSizeSku || entry.appliedSizeGroup.defaultSku;
          const newId = generateLineId();
          deltas.push({
            action: DeltaActionType.AddItem,
            lineId: newId,
            parentLineId: itemLineId,
            sku: sizeSku,
            qty: 1,
            allocations: [],
          });
          injectDefaults(sizeSku, newId);
        }

        // Auto-inject default choice for each unique combo slot
        if (entry.comboChoices && entry.comboChoices.length > 0) {
          const seenSlots = new Set<string>();
          for (const choice of entry.comboChoices) {
            if (!seenSlots.has(choice.slotSku)) {
              seenSlots.add(choice.slotSku);
              const newId = generateLineId();
              deltas.push({
                action: DeltaActionType.AddItem,
                lineId: newId,
                parentLineId: itemLineId,
                sku: choice.optionSku,
                qty: 1,
                allocations: [],
              });
              injectDefaults(choice.optionSku, newId);
            }
          }
        }
      };

      injectDefaults(newSku, childId, modifierSku);

      // 4. Retain compatible general modifiers if selected
      if (retainModifiers && oldItem.children && oldItem.children.length > 0) {
        const newEntry = store.catalog[newSku];
        for (const child of oldItem.children) {
          const childEntry = store.catalog[child.sku];
          if (
            childEntry &&
            childEntry.type === CatalogItemType.Modifier &&
            childEntry.category !== "size"
          ) {
            // Check if new item supports this modifier
            const isSupported = newEntry?.allowedModifiers?.includes(child.sku);
            if (isSupported) {
              const modId = generateLineId();
              deltas.push({
                action: DeltaActionType.AddItem,
                lineId: modId,
                parentLineId: childId,
                sku: child.sku,
                qty: child.qty,
                allocations: [],
                selectedModifierState: child.selectedModifierState,
              });
            }
          }
        }
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    removeItem: (lineId) => {
      const state = get().projectedState;
      const item = state.items[lineId];
      const qty = item?.qty ?? 1;
      get().commitDeltas(
        [{ action: DeltaActionType.RemoveItem, lineId, qty }],
        "pos-ui",
      );
    },

    modifyItemQty: (lineId, beforeQty, afterQty) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];

      if (item) {
        const catalogEntry = store.catalog[item.sku];
        if (isMainQtyLocked(catalogEntry, afterQty)) {
          toast.error("Main quantity is locked for this item.");
          return;
        }

        const increment = catalogEntry?.mainQtyIncrement ?? 1;
        
        const finalQty = snapQty(afterQty, increment);

        if (finalQty <= 0) {
          toast.error("Quantity cannot be zero.");
          return;
        }

        if (
          item.status === ItemStatus.Confirmed &&
          finalQty > beforeQty
        ) {
          const change = finalQty - beforeQty;
          const deltas: Delta[] = [];

          buildCloneDeltas(item, null, 1, deltas, { overrideRootQty: change });
          store.commitDeltas(deltas, "pos-ui");
        } else if (finalQty !== beforeQty) {
          get().commitDeltas(
            [
              {
                action: DeltaActionType.ModifyQty,
                lineId,
                beforeQty,
                afterQty: finalQty,
              },
            ],
            "pos-ui",
          );
        }
      }
    },

    modifyItemInlineQty: (lineId, beforeInlineQty, afterInlineQty) => {
      if (afterInlineQty <= 0) {
        toast.error("Measurement cannot be zero.");
        return;
      }
      get().commitDeltas(
        [
          {
            action: DeltaActionType.ModifyInlineQty,
            lineId,
            beforeInlineQty,
            afterInlineQty,
          },
        ],
        "pos-ui",
      );
    },

    duplicateItem: (lineId) => {
      const store = get();
      const state = store.projectedState;
      const item = state.items[lineId];
      if (!item) return undefined;

      const deltas: Delta[] = [];

      buildCloneDeltas(item, null, 1, deltas);
      store.commitDeltas(deltas, "pos-ui");
      const addRootDelta = deltas.find(
        (d) => d.action === DeltaActionType.AddItem && d.parentLineId === null,
      ) as any;
      return addRootDelta?.lineId;
    },

    duplicateItems: (lineIds) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];
      const newLineIds: string[] = [];

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const cloneDeltas: Delta[] = [];
          buildCloneDeltas(item, null, 1, cloneDeltas);
          const addRootDelta = cloneDeltas.find(
            (d) =>
              d.action === DeltaActionType.AddItem && d.parentLineId === null,
          ) as any;
          if (addRootDelta) newLineIds.push(addRootDelta.lineId);
          deltas.push(...cloneDeltas);
        }
      }

      if (deltas.length > 0) store.commitDeltas(deltas, "pos-ui");
      return newLineIds;
    },

    duplicateAndReassignItems: (lineIds, targetGuestIdOrName) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];
      const newLineIds: string[] = [];

      let targetAssignId = targetGuestIdOrName;
      const targetAlloc = state.allocations[targetGuestIdOrName];

      if (!targetAlloc || targetAlloc.type !== AllocationType.Assignment) {
        const existingByName = Object.values(state.allocations).find(
          (a) =>
            a.type === AllocationType.Assignment &&
            (a as AssignmentAllocation).entity === targetGuestIdOrName,
        );
        if (existingByName) {
          targetAssignId = existingByName.allocationId;
        } else {
          targetAssignId = generateAllocationId("assign");
          const newAssignAlloc: AssignmentAllocation = {
            allocationId: targetAssignId,
            type: AllocationType.Assignment,
            entity: targetGuestIdOrName,
          };
          store.engine.commitSystem(
            [
              {
                action: DeltaActionType.DeclareAllocation,
                allocation: newAssignAlloc,
              },
            ],
            "pos-ui",
          );
        }
      }

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const currentAssignAllocId = item.allocations.find(
            (id) => state.allocations[id]?.type === AllocationType.Assignment,
          );
          const rootAllocations = currentAssignAllocId
            ? item.allocations.map((id) =>
                id === currentAssignAllocId ? targetAssignId : id,
              )
            : [...item.allocations, targetAssignId];

          const cloneDeltas: Delta[] = [];
          buildCloneDeltas(item, null, 1, cloneDeltas, { rootAllocations });
          const addRootDelta = cloneDeltas.find(
            (d) =>
              d.action === DeltaActionType.AddItem && d.parentLineId === null,
          ) as any;
          if (addRootDelta) newLineIds.push(addRootDelta.lineId);
          deltas.push(...cloneDeltas);
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      } else {
        set({
          projectedState: evaluateBusinessRules(
            store.engine.projectCurrent(),
            store.chargeRules,
            store.catalog,
          ),
        });
        store.persist();
      }
      return newLineIds;
    },

    removeItems: (lineIds) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          deltas.push({
            action: DeltaActionType.RemoveItem,
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
      let lockedSkipped = false;
      let zeroSkipped = false;

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const catalogEntry = store.catalog[item.sku];
          const increment = catalogEntry?.mainQtyIncrement ?? 1;

          const targetQty = snapQty(item.qty + change, increment);

          if (isMainQtyLocked(catalogEntry, targetQty)) {
            lockedSkipped = true;
            continue;
          }

          if (targetQty <= 0) {
            zeroSkipped = true;
            continue;
          } else if (
            item.status === ItemStatus.Confirmed &&
            targetQty > item.qty
          ) {
            const changeDiff = targetQty - item.qty;
            buildCloneDeltas(item, null, 1, deltas, {
              overrideRootQty: changeDiff,
            });
          } else if (targetQty !== item.qty) {
            deltas.push({
              action: DeltaActionType.ModifyQty,
              lineId,
              beforeQty: item.qty,
              afterQty: targetQty,
            });
          }
        }
      }

      if (lockedSkipped) {
        toast.error("Some items were skipped because their main quantity is locked.");
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
    },

    setItemsQty: (lineIds, targetQty) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];
      let lockedSkipped = false;
      let zeroSkipped = false;

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const catalogEntry = store.catalog[item.sku];
          const increment = catalogEntry?.mainQtyIncrement ?? 1;
          
          const finalQty = snapQty(targetQty, increment);

          if (isMainQtyLocked(catalogEntry, finalQty)) {
            lockedSkipped = true;
            continue;
          }

          if (finalQty <= 0) {
            zeroSkipped = true;
            continue;
          } else if (
            item.status === ItemStatus.Confirmed &&
            finalQty > item.qty
          ) {
            const changeDiff = finalQty - item.qty;
            buildCloneDeltas(item, null, 1, deltas, {
              overrideRootQty: changeDiff,
            });
          } else if (finalQty !== item.qty) {
            deltas.push({
              action: DeltaActionType.ModifyQty,
              lineId,
              beforeQty: item.qty,
              afterQty: finalQty,
            });
          }
        }
      }

      if (lockedSkipped) {
        toast.error("Some items were skipped because their main quantity is locked.");
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
    },

    mergeItems: (lineIds) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];
      let lockedSkipped = false;

      const getSignature = (item: ProjectedLineItem): string => {
        const childrenSig = item.children
          .filter((c) => c.status !== ItemStatus.Canceled)
          .map((c) => getSignature(c))
          .sort()
          .join("|");
        const allocSig = [...item.allocations].sort().join(",");
        return `${item.sku}::${item.inlineQty}::${item.selectedModifierState}::${allocSig}::${childrenSig}`;
      };

      const groups = new Map<string, ProjectedLineItem[]>();
      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item && item.status !== ItemStatus.Canceled) {
          const sig = getSignature(item);
          if (!groups.has(sig)) groups.set(sig, []);
          groups.get(sig)!.push(item);
        }
      }

      for (const group of groups.values()) {
        if (group.length < 2) continue;

        const survivor = group[0];
        const catalogEntry = store.catalog[survivor.sku];

        if (isMainQtyLocked(catalogEntry)) {
          lockedSkipped = true;
          continue;
        }

        let sumQty = 0;
        for (let i = 1; i < group.length; i++) {
          const mergee = group[i];
          sumQty += mergee.qty;
          deltas.push({
            action: DeltaActionType.RemoveItem,
            lineId: mergee.lineId,
            qty: mergee.qty,
          });
        }

        const increment = catalogEntry?.mainQtyIncrement ?? 1;
        const targetQty = snapQty(survivor.qty + sumQty, increment);

        if (
          survivor.status === ItemStatus.Confirmed &&
          targetQty > survivor.qty
        ) {
          const changeDiff = targetQty - survivor.qty;
          buildCloneDeltas(survivor, null, 1, deltas, {
            overrideRootQty: changeDiff,
          });
        } else if (targetQty !== survivor.qty) {
          deltas.push({
            action: DeltaActionType.ModifyQty,
            lineId: survivor.lineId,
            beforeQty: survivor.qty,
            afterQty: targetQty,
          });
        }
      }

      if (lockedSkipped) {
        toast.error("Some items could not be merged because their main quantity is locked.");
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
    },

    breakItems: (lineIds) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];
      const newLineIds: string[] = [];

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (!item || item.status === ItemStatus.Canceled) continue;

        const entry = store.catalog[item.sku];
        if (!entry || !entry.comboChoices || entry.comboChoices.length === 0) continue;

        let broken = false;
        for (const child of item.children) {
          if (child.status === ItemStatus.Canceled) continue;
          const childEntry = store.catalog[child.sku];
          // Only break out full items (sides/entrees), leaving modifiers/sizes alone
          if (childEntry && childEntry.type === CatalogItemType.Item) {
            const cloneDeltas: Delta[] = [];
            buildCloneDeltas(child, null, 1, cloneDeltas, {
              overrideRootQty: child.qty,
              rootAllocations: item.allocations,
            });
            const addRootDelta = cloneDeltas.find(
              (d) => d.action === DeltaActionType.AddItem && d.parentLineId === null,
            ) as Extract<Delta, { action: DeltaActionType.AddItem }>;
            if (addRootDelta) newLineIds.push(addRootDelta.lineId);
            deltas.push(...cloneDeltas);
            broken = true;
          }
        }

        if (broken) {
          deltas.push({
            action: DeltaActionType.RemoveItem,
            lineId,
            qty: item.qty,
          });
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
      return newLineIds;
    },

    combineItems: (requests) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];
      const newLineIds: string[] = [];
      const consumption = new Map<string, number>();

      for (const req of requests) {
        const firstUnit = req.assignments[0]?.unit;
        const allocations = firstUnit?.item.allocations || [];

        const comboLineId = generateLineId();
        deltas.push({
          action: DeltaActionType.AddItem,
          lineId: comboLineId,
          parentLineId: null,
          sku: req.comboSku,
          qty: req.qty,
          allocations: [...allocations],
        });
        newLineIds.push(comboLineId);

        for (const slot of req.assignments) {
          const unitItem = slot.unit.item;
          const neededQty = slot.reqQty;
          
          buildCloneDeltas(unitItem, comboLineId, unitItem.qty, deltas, {
            overrideRootQty: neededQty,
          });
          
          const totalConsumption = req.qty * neededQty;
          consumption.set(unitItem.lineId, (consumption.get(unitItem.lineId) || 0) + totalConsumption);
        }
      }

      for (const [lineId, consumedQty] of consumption.entries()) {
        const item = state.items[lineId];
        if (item) {
          if (consumedQty >= item.qty - 0.0001) {
            deltas.push({ action: DeltaActionType.RemoveItem, lineId, qty: item.qty });
          } else {
            deltas.push({ action: DeltaActionType.ModifyQty, lineId, beforeQty: item.qty, afterQty: Math.round((item.qty - consumedQty) * 1000) / 1000 });
          }
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
      return newLineIds;
    },

    splitItemsQty: (lineIds, type, value) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];
      const newLineIds: string[] = [];
      let lockedSkipped = false;

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const catalogEntry = store.catalog[item.sku];

          if (isMainQtyLocked(catalogEntry)) {
            lockedSkipped = true;
            continue;
          }

          const increment = catalogEntry?.mainQtyIncrement ?? 1;

          let splitQty = 0;
          if (type === SplitQtyType.Amount) {
            splitQty = Math.min(item.qty, value);
          } else {
            splitQty = item.qty * (value / 100);
          }

          if (splitQty > 0) {
            splitQty = snapQty(splitQty, increment);
            splitQty = Math.min(item.qty, splitQty);
          }

          if (splitQty > 0) {
            const remQty = item.qty - splitQty;
            const cloneDeltas: Delta[] = [];
            buildCloneDeltas(item, null, 1, cloneDeltas, {
              overrideRootQty: splitQty,
            });

            if (cloneDeltas.length > 0) {
              const addedRootDelta = cloneDeltas[0] as Extract<
                Delta,
                { action: DeltaActionType.AddItem }
              >;
              newLineIds.push(addedRootDelta.lineId);
              deltas.push(...cloneDeltas);
            }

            if (remQty <= 0) {
              deltas.push({
                action: DeltaActionType.RemoveItem,
                lineId,
                qty: item.qty,
              });
            } else {
              deltas.push({
                action: DeltaActionType.ModifyQty,
                lineId,
                beforeQty: item.qty,
                afterQty: Math.round(remQty * 1000) / 1000,
              });
            }
          }
        }
      }

      if (lockedSkipped) {
        toast.error("Some items were skipped because their main quantity is locked.");
      }
      if (zeroSkipped) {
        toast.error("Quantity cannot be zero.");
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
      return newLineIds;
    },

    splitItemsIntoIncrements: (lineIds, splitQty) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];
      const newLineIds: string[] = [];
      let lockedSkipped = false;

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item && item.qty > splitQty && splitQty > 0) {
          const catalogEntry = store.catalog[item.sku];

          if (isMainQtyLocked(catalogEntry)) {
            lockedSkipped = true;
            continue;
          }
          
          let remainingQty = item.qty;
          const pieces: number[] = [];
          while (remainingQty > 0.0001) { // Floating point mitigation
            if (remainingQty >= splitQty) {
              pieces.push(splitQty);
              remainingQty -= splitQty;
            } else {
              pieces.push(Math.round(remainingQty * 1000) / 1000);
              remainingQty = 0;
            }
          }

          if (pieces.length > 1) {
            deltas.push({
              action: DeltaActionType.ModifyQty,
              lineId,
              beforeQty: item.qty,
              afterQty: pieces[0],
            });

            for (let i = 1; i < pieces.length; i++) {
              const cloneDeltas: Delta[] = [];
              buildCloneDeltas(item, null, 1, cloneDeltas, {
                overrideRootQty: pieces[i],
              });
              if (cloneDeltas.length > 0) {
                const addedRootDelta = cloneDeltas[0] as Extract<
                  Delta,
                  { action: DeltaActionType.AddItem }
                >;
                newLineIds.push(addedRootDelta.lineId);
                deltas.push(...cloneDeltas);
              }
            }
          }
        }
      }

      if (lockedSkipped) {
        toast.error("Some items were skipped because their main quantity is locked.");
      }
      if (zeroSkipped) {
        toast.error("Quantity cannot be zero.");
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
      return newLineIds;
    },

    reassignItems: (lineIds, newAssigneeIdOrName) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      let targetAssignId = newAssigneeIdOrName;
      const targetAlloc = state.allocations[newAssigneeIdOrName];

      if (!targetAlloc || targetAlloc.type !== AllocationType.Assignment) {
        const existingByName = Object.values(state.allocations).find(
          (a) =>
            a.type === AllocationType.Assignment &&
            (a as AssignmentAllocation).entity === newAssigneeIdOrName,
        );
        if (existingByName) {
          targetAssignId = existingByName.allocationId;
        } else {
          targetAssignId = generateAllocationId("assign");
          const newAssignAlloc: AssignmentAllocation = {
            allocationId: targetAssignId,
            type: AllocationType.Assignment,
            entity: newAssigneeIdOrName,
          };
          store.engine.commitSystem(
            [
              {
                action: DeltaActionType.DeclareAllocation,
                allocation: newAssignAlloc,
              },
            ],
            "pos-ui",
          );
        }
      }

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const currentAssignAllocId = item.allocations.find(
            (id) => state.allocations[id]?.type === AllocationType.Assignment,
          );

          const newAllocations = item.allocations.map((id) =>
            id === currentAssignAllocId ? targetAssignId : id,
          );

          deltas.push({
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          });
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      } else {
        set({
          projectedState: evaluateBusinessRules(
            store.engine.projectCurrent(),
            store.chargeRules,
            store.catalog,
          ),
        });
        store.persist();
      }
    },

    groupItemsPaymentConfig: (lineIds, targetId) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      const allPayAllocs = Object.values(state.allocations).filter(
        (a): a is PaymentAllocation => a.type === AllocationType.Payment,
      );

      const splitAllocs = allPayAllocs.filter(
        (a) => a.correlationId === targetId,
      );

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
            (id) => state.allocations[id]?.type !== AllocationType.Payment,
          );
          const newAllocations = [...nonPaymentAllocs, ...targetAllocIds];

          deltas.push({
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          });
        }
      }

      store.commitDeltas(deltas, "pos-ui");
    },

    groupItemsFulfillmentConfig: (lineIds, targetId) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      const allFulAllocs = Object.values(state.allocations).filter(
        (a): a is FulfillmentAllocation =>
          a.type === AllocationType.Fulfillment,
      );

      const matchedAllocs = allFulAllocs.filter(
        (a) => a.correlationId === targetId,
      );

      let targetAllocIds: string[] = [];
      if (matchedAllocs.length > 0) {
        targetAllocIds = matchedAllocs.map((a) => a.allocationId);
      } else {
        targetAllocIds = [targetId];
      }

      for (const lineId of lineIds) {
        const item = state.items[lineId];
        if (item) {
          const nonFulfillmentAllocs = item.allocations.filter(
            (id) => state.allocations[id]?.type !== AllocationType.Fulfillment,
          );
          const newAllocations = [...nonFulfillmentAllocs, ...targetAllocIds];

          deltas.push({
            action: DeltaActionType.ModifyItemAllocations,
            lineId,
            beforeAllocations: item.allocations,
            afterAllocations: newAllocations,
          });
        }
      }

      if (deltas.length > 0) {
        store.commitDeltas(deltas, "pos-ui");
      }
    },

    addGroupModifier: (parentLineIds, modifierSku, selectedModifierState) => {
      const store = get();
      const state = store.projectedState;
      const deltas: Delta[] = [];

      for (const parentLineId of parentLineIds) {
        const parent = state.items[parentLineId];
        if (parent) {
          const parentEntry = store.catalog[parent.sku];
          const modConfig = parentEntry?.modifierConfigs?.find(
            (c) => c.modifierSku === modifierSku,
          );

          let skip = false;
          if (!modConfig?.allowDuplicates) {
            skip = parent.children.some((c) => c.sku === modifierSku);
          }

          if (!skip) {
            deltas.push({
              action: DeltaActionType.AddItem,
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
          const childWithSku = parent.children.find(
            (c) => c.sku === modifierSku,
          );
          if (childWithSku) {
            deltas.push({
              action: DeltaActionType.RemoveItem,
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
            action: DeltaActionType.ModifySku,
            lineId,
            beforeSku,
            afterSku,
          },
        ],
        "pos-ui",
      );
    },

    modifyModifierState: (lineId, beforeState, afterState) => {
      get().commitDeltas(
        [
          {
            action: DeltaActionType.ModifyModifierState,
            lineId,
            beforeState,
            afterState,
          },
        ],
        "pos-ui",
      );
    },

    mimicOrder: (
      sourceAssigneeIdOrName,
      targetAssigneeIdOrName,
      targetPayerIdOrName,
      paymentMethod,
    ) => {
      const store = get();
      const state = store.projectedState;
      const headHash = store.engine.getHeadHash();
      if (!headHash) return;

      let sourceAssignee = sourceAssigneeIdOrName;
      let targetAssignee = targetAssigneeIdOrName;
      let targetPayer = targetPayerIdOrName;

      const sourceAlloc = state.allocations[sourceAssigneeIdOrName];
      if (sourceAlloc && sourceAlloc.type === AllocationType.Assignment)
        sourceAssignee = sourceAlloc.entity;

      const targetAlloc = state.allocations[targetAssigneeIdOrName];
      if (targetAlloc && targetAlloc.type === AllocationType.Assignment)
        targetAssignee = targetAlloc.entity;

      const payerAlloc = state.allocations[targetPayerIdOrName];
      if (payerAlloc && payerAlloc.type === AllocationType.Assignment)
        targetPayer = payerAlloc.entity;

      const assignAllocId = generateAllocationId("assign");
      const payAllocId = generateAllocationId("pay");

      const assignmentAlloc: AssignmentAllocation = {
        allocationId: assignAllocId,
        type: AllocationType.Assignment,
        entity: targetAssignee,
      };

      const paymentAlloc: PaymentAllocation = {
        allocationId: payAllocId,
        type: AllocationType.Payment,
        payer: targetPayer,
        method: paymentMethod,
        paymentStrategy: {
          strategyType: PaymentStrategyType.Percentage,
          value: 1.0,
        },
        timeOfPayment: {
          type: TimeBlockType.Immediate,
          calculatedAt: new Date().toISOString(),
        },
      };

      store.engine.commitSystem(
        [
          {
            action: DeltaActionType.DeclareAllocation,
            allocation: assignmentAlloc,
          },
          {
            action: DeltaActionType.DeclareAllocation,
            allocation: paymentAlloc,
          },
        ],
        "ai-agent",
      );

      store.commitDeltas(
        [
          {
            action: DeltaActionType.BatchByFilter,
            baseRevisionId: headHash,
            filters: [
              {
                property: FilterProperty.Assignee,
                operator: FilterOperator.Equals,
                value: sourceAssignee,
              },
            ],
            templateMutation: {
              mutationType: MutationType.BatchDuplicateAndReallocate,
              patchAllocations: [assignmentAlloc, paymentAlloc],
            },
          },
        ],
        "ai-agent",
      );
    },

    // ─── Branching ─────────────────────────────────────────────────────────

    createBranch: (name, fromCommitHash) => {
      if (isSystemBranch(name)) {
        toast.error("Cannot use reserved branch name 'system'");
        return;
      }
      const store = get();
      store.engine.createBranch(name, fromCommitHash);
      store.engine.checkout(name);
      set({
        viewingHash: null,
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
    },

    checkoutBranch: (name) => {
      if (isSystemBranch(name)) {
        toast.error("The system branch cannot be checked out.");
        return;
      }
      const store = get();
      store.engine.checkout(name);
      set({
        viewingHash: null,
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
    },

    viewRevision: (hash) => {
      const store = get();
      set({ viewingHash: hash });
      if (hash === null) {
        set({
          projectedState: evaluateBusinessRules(
            store.engine.projectCurrent(),
            store.chargeRules,
            store.catalog,
          ),
        });
      } else {
        set({
          projectedState: evaluateBusinessRules(
            store.engine.projectAt(hash),
            store.chargeRules,
            store.catalog,
          ),
        });
      }
    },

    setMainActiveBranch: (name) => {
      const store = get();
      store.engine.setMainActiveBranch(name);
      set({
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
    },

    updateBranchConfig: (name, config) => {
      const store = get();
      store.engine.updateBranchConfig(name, config);
      set({
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
    },

    renameBranch: (oldName, newName) => {
      if (isSystemBranch([oldName, newName])) {
        toast.error(
          "Cannot rename 'system' branch or use it as a target name.",
        );
        return;
      }
      const store = get();
      store.engine.renameBranch(oldName, newName);
      set({
        projectedState: evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        ),
      });
      store.persist();
    },

    // ─── Merge ─────────────────────────────────────────────────────────────

    previewMerge: (sourceBranches, targetBranch) => {
      if (isSystemBranch([targetBranch, ...sourceBranches])) {
        throw new Error("The system branch cannot be merged.");
      }
      return get().engine.previewMerge(sourceBranches, targetBranch);
    },

    commitMerge: (sourceBranches, targetBranch, resolutionDeltas) => {
      if (isSystemBranch([targetBranch, ...sourceBranches])) {
        toast.error("The system branch cannot be merged.");
        return;
      }
      const store = get();
      store.engine.commitMerge(sourceBranches, targetBranch, resolutionDeltas);
      // If target is the active branch, refresh projected state
      if (store.engine.getActiveBranch() === targetBranch) {
        set({
          viewingHash: null,
          projectedState: evaluateBusinessRules(
            store.engine.projectCurrent(),
            store.chargeRules,
            store.catalog,
          ),
        });
      }
      store.persist();
    },

    // ─── History Management ─────────────────────────────────────────────────

    squashPendingCommits: (fromHash: string, type: SquashType) => {
      const store = get();
      try {
        store.engine.squashPendingCommits(fromHash, type);
        const newProjected = evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        );
        set({ projectedState: newProjected, viewingHash: null });
        store.persist();
      } catch (e) {
        throw e;
      }
    },

    resetToCommit: (targetHash: string) => {
      const store = get();
      try {
        store.engine.resetToCommit(targetHash);
        const newProjected = evaluateBusinessRules(
          store.engine.projectCurrent(),
          store.chargeRules,
          store.catalog,
        );
        set({ projectedState: newProjected, viewingHash: null });
        store.persist();
      } catch (e) {
        throw e;
      }
    },

    snapshotCurrentState: () => {
      void 0;
    }, // removed: use squash-before-merge instead

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
          if (repo.orderContext) {
            const context = repo.orderContext as any;
            if (context.orderType) {
              const matchedEnum = Object.values(OrderType).find(
                (val) =>
                  val.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                  context.orderType.toLowerCase().replace(/[^a-z0-9]/g, ""),
              );
              if (matchedEnum) {
                context.orderType = matchedEnum;
              }
            }
          }
          // If persisted repo has orderContext, consider it initialized
          const hasOrderContext = !!repo.orderContext;

          // Recover default allocation IDs from the commit log
          // The first commit (by "system-init") contains the default allocations
          const initCommit = repo.log.find((c) => c.authorId === "system-init");
          let defaultAssignmentAllocId: string | null = null;
          let defaultPaymentAllocId: string | null = null;
          let defaultPaymentMethod = "cash";
          let activeFulfillmentConfigId: string | null = null;

          if (initCommit) {
            for (const delta of initCommit.deltas) {
              if (delta.action === DeltaActionType.DeclareAllocation) {
                if (delta.allocation.type === AllocationType.Assignment) {
                  defaultAssignmentAllocId = delta.allocation.allocationId;
                } else if (delta.allocation.type === AllocationType.Payment) {
                  defaultPaymentAllocId = delta.allocation.allocationId;
                  defaultPaymentMethod = (
                    (delta.allocation as PaymentAllocation).method || "cash"
                  ).toLowerCase();
                } else if (
                  delta.allocation.type === AllocationType.Fulfillment
                ) {
                  activeFulfillmentConfigId = delta.allocation.allocationId;
                }
              }
            }
          }

          // If no system-init commit (legacy), scan the first commit's declare_allocation deltas
          if (
            !defaultAssignmentAllocId &&
            !defaultPaymentAllocId &&
            repo.log.length > 0
          ) {
            const firstCommit = repo.log[0];
            for (const delta of firstCommit.deltas) {
              if (delta.action === DeltaActionType.DeclareAllocation) {
                if (
                  delta.allocation.type === AllocationType.Assignment &&
                  !defaultAssignmentAllocId
                ) {
                  defaultAssignmentAllocId = delta.allocation.allocationId;
                } else if (
                  delta.allocation.type === AllocationType.Payment &&
                  !defaultPaymentAllocId
                ) {
                  defaultPaymentAllocId = delta.allocation.allocationId;
                  defaultPaymentMethod = (
                    (delta.allocation as PaymentAllocation).method || "cash"
                  ).toLowerCase();
                } else if (
                  delta.allocation.type === AllocationType.Fulfillment &&
                  !activeFulfillmentConfigId
                ) {
                  activeFulfillmentConfigId = delta.allocation.allocationId;
                }
              }
            }
          }

          // Try to recover activePaymentConfigId and activeFulfillmentConfigId from the last item's allocations
          let activePaymentConfigId: string | null =
            `group-default-${defaultPaymentMethod}`;
          const currentProj = newEngine.projectCurrent();
          const items = Object.values(currentProj.items);
          if (items.length > 0) {
            const lastItem = items[items.length - 1];
            const itemPayAllocs = lastItem.allocations
              .map((id) => currentProj.allocations[id])
              .filter(
                (a) => a?.type === AllocationType.Payment,
              ) as PaymentAllocation[];
            if (itemPayAllocs.length > 0) {
              activePaymentConfigId =
                itemPayAllocs[0].correlationId || itemPayAllocs[0].allocationId;
            }

            const itemFulAllocs = lastItem.allocations
              .map((id) => currentProj.allocations[id])
              .filter(
                (a) => a?.type === AllocationType.Fulfillment,
              ) as FulfillmentAllocation[];
            if (itemFulAllocs.length > 0) {
              activeFulfillmentConfigId =
                itemFulAllocs[0].correlationId || itemFulAllocs[0].allocationId;
            }
          }

          set({
            engine: newEngine,
            projectedState: evaluateBusinessRules(
              currentProj,
              store.chargeRules,
              store.catalog,
            ),
            isInitialized: hasOrderContext,
            orderContext: (repo.orderContext as OrderContext) ?? null,
            preferences: repo.preferences || {},
            defaultAssignmentAllocId,
            defaultPaymentAllocId,
            activePaymentConfigId,
            activeFulfillmentConfigId,
            defaultPaymentMethod,
          });

          // Also fetch charge rules upon hydration to reapply taxes
          fetch("/api/charge-rules")
            .then((res) => res.json())
            .then((data) => {
              if (data.rules) {
                get().setChargeRules(data.rules);
              }
            })
            .catch((err) =>
              console.error("Failed to fetch charge rules:", err),
            );
        }
      } catch {
        // Corrupted data — start fresh
      }
    },
  };
});
