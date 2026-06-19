// ─── VCS State Reducer ─────────────────────────────────────────────────────────
// This is the core reduction engine. It takes an append-only commit log and
// a target hash, then projects the full state by replaying deltas.
//
// State is NEVER stored — it's computed on the fly (RAM only).
// Prices and names are NEVER in commits — resolved from catalog at projection time.

import {
  VCSCommit,
  Delta,
  ProjectedState,
  ProjectedLineItem,
  AllocationBlock,
  CatalogItemEntry,
  FilterRule,
  TemplateMutation,
  BatchDuplicateAndReallocate,
  BatchModifyAllocations,
  BatchRemoveItems,
  BatchModifySku,
  DeltaActionType,
  PaymentAllocation,
  PaymentStrategyType,
  AllocationType,
  ItemStatus,
  PaymentTypeBreakdown,
} from "./types";
import { deriveCloneId, generateAllocationId } from "./id";

// ─── Commit Path Traversal ─────────────────────────────────────────────────────

/**
 * Walk the commit log from targetHash back to root, returning commits
 * in chronological order (root first).
 */
function getCommitPath(
  log: VCSCommit[],
  targetHash: string | null,
): VCSCommit[] {
  if (!targetHash || log.length === 0) return [];

  const hashSet = new Set(log.map((c) => c.commitHash));
  const path: VCSCommit[] = [];
  let current: string | null = targetHash;
  const visited = new Set<string>();

  while (current && hashSet.has(current) && !visited.has(current)) {
    visited.add(current);
    const commit = log.find((c) => c.commitHash === current);
    if (!commit) break;
    path.unshift(commit); // prepend for chronological order
    current = commit.parentHash;
  }

  return path;
}

// ─── Filter Evaluation ─────────────────────────────────────────────────────────

function evaluateFilter(
  value: string | number | undefined,
  rule: FilterRule,
): boolean {
  if (value === undefined) return false;
  const target = rule.value;

  switch (rule.operator) {
    case "equals":
      return String(value) === String(target);
    case "not_equals":
      return String(value) !== String(target);
    case "greater_than":
      return Number(value) > Number(target);
    case "greater_than_or_equal":
      return Number(value) >= Number(target);
    case "less_than":
      return Number(value) < Number(target);
    case "less_than_or_equal":
      return Number(value) <= Number(target);
    case "like":
      return String(value).toLowerCase().includes(String(target).toLowerCase());
    case "not_like":
      return !String(value)
        .toLowerCase()
        .includes(String(target).toLowerCase());
    case "in_set": {
      const set = Array.isArray(target) ? target : [target];
      return set.map(String).includes(String(value));
    }
    case "not_in_set": {
      const set = Array.isArray(target) ? target : [target];
      return !set.map(String).includes(String(value));
    }
    default:
      return false;
  }
}

/** Resolve a filter property against a projected line item + its allocations */
function resolveFilterValue(
  item: InternalLineItem,
  property: string,
  allocations: Record<string, AllocationBlock>,
): string | number | undefined {
  switch (property) {
    case "sku":
      return item.sku;
    case "name":
      return item.resolvedName;
    case "price":
      return item.resolvedPrice;
    case "quantity":
      return item.qty;
    case "assignee": {
      // Check assignment allocations linked to this item
      for (const allocId of item.allocations) {
        const alloc = allocations[allocId];
        if (alloc && alloc.type === AllocationType.Assignment) {
          return (alloc as { entity: string }).entity;
        }
      }
      return undefined;
    }
    case "payer": {
      for (const allocId of item.allocations) {
        const alloc = allocations[allocId];
        if (alloc && alloc.type === AllocationType.Payment) {
          return (alloc as { payer: string }).payer;
        }
      }
      return undefined;
    }
    case "fulfillment_method": {
      for (const allocId of item.allocations) {
        const alloc = allocations[allocId];
        if (alloc && alloc.type === AllocationType.Fulfillment) {
          return (alloc as { method: string }).method;
        }
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

// ─── Internal State (Before Late-Binding) ───────────────────────────────────────

interface InternalLineItem {
  lineId: string;
  parentLineId: string | null;
  sku: string;
  qty: number;
  inlineQty?: number;
  canceledQty: number;
  allocations: string[];
  selectedOptions?: string[];
  selectedModifierState?: string;
  resolvedName: string;
  resolvedPrice: number;
  isConfirmed: boolean;
  hasPendingChanges?: boolean;
}

function isMainQtyLocked(
  catalogEntry: CatalogItemEntry | undefined,
  targetQty?: number,
): boolean {
  if (!catalogEntry?.inlineQtyMainQtyLocked) return false;
  if (targetQty === 0) return false;
  return true;
}

// ─── The Core Reducer ──────────────────────────────────────────────────────────

/**
 * Project the full state at a given commit hash by replaying the log.
 *
 * This is the mathematical function: S_final = S_0 ⊕ ΣΔ
 *
 * @param log        - The append-only commit log
 * @param targetHash - The commit hash to project (null = empty state)
 * @param systemHash - The commit hash of the system branch (null if not available)
 * @param catalog    - The trusted product catalog for late-bound resolution
 * @param confirmedHash - Optional confirmed (locked) head hash
 * @param chargeRules   - Optional resolved charge rules for the active jurisdiction
 */
export function projectState(
  log: VCSCommit[],
  targetHash: string | null,
  systemHash: string | null,
  catalog: Record<string, CatalogItemEntry>,
  confirmedHash?: string | null,
): ProjectedState {
  const items: Record<string, InternalLineItem> = {};
  const allocations: Record<string, AllocationBlock> = {};

  if ((!targetHash && !systemHash) || log.length === 0) {
    return {
      items: {},
      allocations: {},
      financials: {
        subtotal: 0,
        personBreakdown: [],
      },
    };
  }

  // Phase 1: Project System Branch (Config/Actors)
  if (systemHash) {
    const systemPath = getCommitPath(log, systemHash);
    for (const commit of systemPath) {
      for (const delta of commit.deltas) {
        if (
          delta.action === DeltaActionType.DeclareAllocation ||
          delta.action === DeltaActionType.UndeclareAllocation
        ) {
          applyDelta(
            items,
            allocations,
            delta,
            log,
            catalog,
            commit.commitHash,
            new Set(), // system commits don't use confirmation logic
            systemHash,
          );
        }
      }
    }
  }

  // Phase 2: Project Target Branch
  if (targetHash) {
    const confirmedAncestors = new Set<string>();
    if (confirmedHash) {
      const confirmedPath = getCommitPath(log, confirmedHash);
      for (const c of confirmedPath) {
        confirmedAncestors.add(c.commitHash);
      }
    }

    const path = getCommitPath(log, targetHash);
    for (const commit of path) {
      for (const delta of commit.deltas) {
        applyDelta(
          items,
          allocations,
          delta,
          log,
          catalog,
          commit.commitHash,
          confirmedAncestors,
          systemHash,
        );
      }
    }
  }

  // Phase 1.5: Sweep empty pending items
  for (const lineId of Object.keys(items)) {
    const item = items[lineId];
    if (item.qty <= 0 && item.canceledQty <= 0) {
      delete items[lineId];
    }
  }

  // Phase 2: Cascading deletions — remove orphans
  cascadeDelete(items);

  // Phase 3: Late-bound catalog resolution
  resolveCatalog(items, catalog);

  // Phase 4: Build tree structure and compute financials
  return buildProjectedState(items, allocations, catalog);
}

// ─── Delta Application ─────────────────────────────────────────────────────────

function applyDelta(
  items: Record<string, InternalLineItem>,
  allocations: Record<string, AllocationBlock>,
  delta: Delta,
  fullLog: VCSCommit[],
  catalog: Record<string, CatalogItemEntry>,
  commitHash: string,
  confirmedAncestors: Set<string>,
  systemHash: string | null,
): void {
  const isConfirmedDelta = confirmedAncestors.has(commitHash);

  switch (delta.action) {
    case DeltaActionType.DeclareAllocation:
      allocations[delta.allocation.allocationId] = delta.allocation;
      break;

    case DeltaActionType.UndeclareAllocation:
      delete allocations[delta.allocationId];
      break;

    case DeltaActionType.AddItem:
      items[delta.lineId] = {
        lineId: delta.lineId,
        parentLineId: delta.parentLineId,
        sku: delta.sku,
        qty: delta.qty,
        inlineQty: delta.inlineQty ?? 1,
        canceledQty: 0,
        allocations: [...delta.allocations],
        selectedModifierState: delta.selectedModifierState,
        resolvedName: "",
        resolvedPrice: 0,
        isConfirmed: isConfirmedDelta,
        hasPendingChanges: false,
      };
      break;

    case DeltaActionType.RemoveItem: {
      const item = items[delta.lineId];
      if (item) {
        const entry = catalog[item.sku];
        if (isMainQtyLocked(entry, item.qty - delta.qty)) {
          break;
        }

        if (item.isConfirmed) {
          const removeAmount = Math.min(item.qty, delta.qty);
          item.qty -= removeAmount;
          item.canceledQty += removeAmount;
          if (!isConfirmedDelta) item.hasPendingChanges = true;
        } else {
          item.qty -= delta.qty;
        }
      }
      break;
    }

    case DeltaActionType.ModifyItemAllocations: {
      const item = items[delta.lineId];
      if (item) {
        // Verify before_allocations matches current state (optimistic check)
        const beforeMatch =
          JSON.stringify([...item.allocations].sort()) ===
          JSON.stringify([...delta.beforeAllocations].sort());
        if (beforeMatch) {
          item.allocations = [...delta.afterAllocations];
          if (!isConfirmedDelta && item.isConfirmed)
            item.hasPendingChanges = true;
        }
      }
      break;
    }

    case DeltaActionType.ModifySku: {
      const item = items[delta.lineId];
      if (item && item.sku === delta.beforeSku) {
        item.sku = delta.afterSku;
        if (!isConfirmedDelta && item.isConfirmed)
          item.hasPendingChanges = true;
      }
      break;
    }

    case DeltaActionType.ModifyModifierState: {
      const item = items[delta.lineId];
      if (item && item.selectedModifierState === delta.beforeState) {
        item.selectedModifierState = delta.afterState;
        if (!isConfirmedDelta && item.isConfirmed)
          item.hasPendingChanges = true;
      }
      break;
    }

    case DeltaActionType.ModifyQty: {
      const item = items[delta.lineId];
      if (item && item.qty === delta.beforeQty) {
        const entry = catalog[item.sku];
        if (isMainQtyLocked(entry, delta.afterQty)) {
          break;
        }

        if (delta.afterQty <= 0) {
          break;
        }

        if (delta.afterQty < item.qty && item.isConfirmed) {
          item.canceledQty += item.qty - delta.afterQty;
        }
        item.qty = delta.afterQty;
        if (!isConfirmedDelta && item.isConfirmed)
          item.hasPendingChanges = true;
      }
      break;
    }

    case DeltaActionType.ModifyInlineQty: {
      const item = items[delta.lineId];
      if (item) {
        const currentInline = item.inlineQty ?? 1;
        const beforeInline = delta.beforeInlineQty ?? 1;
        if (currentInline === beforeInline) {
          if (delta.afterInlineQty <= 0) {
            break;
          }
          item.inlineQty = delta.afterInlineQty;
          if (!isConfirmedDelta && item.isConfirmed)
            item.hasPendingChanges = true;
        }
      }
      break;
    }

    case DeltaActionType.BatchByFilter:
      applyBatchByFilter(
        items,
        allocations,
        delta,
        fullLog,
        catalog,
        isConfirmedDelta,
        systemHash,
      );
      break;
  }
}

// ─── Batch Operations ──────────────────────────────────────────────────────────

function applyBatchByFilter(
  items: Record<string, InternalLineItem>,
  allocations: Record<string, AllocationBlock>,
  delta: Extract<Delta, { action: DeltaActionType.BatchByFilter }>,
  fullLog: VCSCommit[],
  catalog: Record<string, CatalogItemEntry>,
  isConfirmedDelta: boolean,
  systemHash: string | null,
): void {
  // Project state at the base_revision_id for deterministic filtering
  const baseState = projectState(
    fullLog,
    delta.baseRevisionId,
    systemHash,
    catalog,
    null,
  );
  const baseItems = Object.values(baseState.items);

  // Find matching items
  const matchingItems = baseItems.filter((item) => {
    return delta.filters.every((rule) => {
      const value = resolveFilterValue(
        item as unknown as InternalLineItem,
        rule.property,
        baseState.allocations,
      );
      return evaluateFilter(value, rule);
    });
  });

  // Apply template mutation
  switch (delta.templateMutation.mutationType) {
    case "batch_duplicate_and_reallocate":
      applyBatchDuplicate(
        items,
        allocations,
        matchingItems,
        delta.templateMutation,
        delta.baseRevisionId,
      );
      break;

    case "batch_modify_allocations":
      applyBatchModifyAllocations(
        items,
        allocations,
        matchingItems,
        delta.templateMutation,
        isConfirmedDelta,
      );
      break;

    case "batch_remove_items":
      applyBatchRemoveItems(items, matchingItems, isConfirmedDelta);
      break;

    case "batch_modify_sku":
      applyBatchModifySku(
        items,
        matchingItems,
        delta.templateMutation,
        isConfirmedDelta,
      );
      break;
  }
}

function applyBatchDuplicate(
  items: Record<string, InternalLineItem>,
  allocations: Record<string, AllocationBlock>,
  matchingItems: ProjectedLineItem[],
  template: BatchDuplicateAndReallocate,
  baseRevisionId: string,
): void {
  // Register new allocations
  for (const allocBlock of template.patchAllocations) {
    allocations[allocBlock.allocationId] = allocBlock;
  }

  // Clone matching items with new allocations
  for (const item of matchingItems) {
    const newLineId = deriveCloneId(item.lineId, baseRevisionId);
    items[newLineId] = {
      lineId: newLineId,
      parentLineId: item.parentLineId,
      sku: item.sku,
      qty: item.qty,
      canceledQty: 0,
      allocations: template.patchAllocations.map((a) => a.allocationId),
      resolvedName: "",
      resolvedPrice: 0,
      isConfirmed: false,
    };

    // Also clone children (modifiers, sides)
    cloneChildren(items, item, newLineId, template.patchAllocations);
  }
}

function cloneChildren(
  items: Record<string, InternalLineItem>,
  parent: ProjectedLineItem,
  newParentLineId: string,
  newAllocations: AllocationBlock[],
): void {
  for (const child of parent.children) {
    const newChildId = `${child.lineId}-clone-${newParentLineId.substring(0, 8)}`;
    items[newChildId] = {
      lineId: newChildId,
      parentLineId: newParentLineId,
      sku: child.sku,
      qty: child.qty,
      canceledQty: 0,
      allocations: newAllocations.map((a) => a.allocationId),
      resolvedName: "",
      resolvedPrice: 0,
      isConfirmed: false,
    };
    // Recurse for nested children
    cloneChildren(items, child, newChildId, newAllocations);
  }
}

function applyBatchModifyAllocations(
  items: Record<string, InternalLineItem>,
  allocations: Record<string, AllocationBlock>,
  matchingItems: ProjectedLineItem[],
  template: BatchModifyAllocations,
  isConfirmedDelta: boolean,
): void {
  // Register the patch allocation
  allocations[template.patchAllocation.allocationId] = template.patchAllocation;

  for (const item of matchingItems) {
    const internal = items[item.lineId];
    if (internal) {
      // Replace allocation of the target type
      internal.allocations = internal.allocations.map((allocId) => {
        const alloc = allocations[allocId];
        if (alloc && alloc.type === template.targetAllocationType) {
          if (!isConfirmedDelta && internal.isConfirmed) {
            internal.hasPendingChanges = true;
          }
          return template.patchAllocation.allocationId;
        }
        return allocId;
      });
    }
  }
}

function applyBatchRemoveItems(
  items: Record<string, InternalLineItem>,
  matchingItems: ProjectedLineItem[],
  isConfirmedDelta: boolean,
): void {
  for (const item of matchingItems) {
    const internal = items[item.lineId];
    if (internal) {
      if (internal.isConfirmed) {
        internal.canceledQty += internal.qty;
        internal.qty = 0;
        if (!isConfirmedDelta) internal.hasPendingChanges = true;
      } else {
        internal.qty = 0;
      }
    }
  }
}

function applyBatchModifySku(
  items: Record<string, InternalLineItem>,
  matchingItems: ProjectedLineItem[],
  template: BatchModifySku,
  isConfirmedDelta: boolean,
): void {
  for (const item of matchingItems) {
    const internal = items[item.lineId];
    if (internal) {
      internal.sku = template.afterSku;
      if (!isConfirmedDelta && internal.isConfirmed) {
        internal.hasPendingChanges = true;
      }
    }
  }
}

// ─── Cascading Deletion ────────────────────────────────────────────────────────

/**
 * Remove all orphaned items — items whose parent_line_id references
 * a non-existent item. Iterate until stable.
 *
 * Formal: P_cascade = { v ∈ V | ∃ r ∈ P_0 such that r →* v in G }
 */
function cascadeDelete(items: Record<string, InternalLineItem>): void {
  let stable = false;
  while (!stable) {
    stable = true;
    for (const lineId of Object.keys(items)) {
      const item = items[lineId];
      if (item.parentLineId && !items[item.parentLineId]) {
        delete items[lineId];
        stable = false;
      }
    }
  }
}

// ─── Late-Bound Catalog Resolution ─────────────────────────────────────────────

function resolveCatalog(
  items: Record<string, InternalLineItem>,
  catalog: Record<string, CatalogItemEntry>,
): void {
  // Pass 1: Resolve basic catalog info and modifier states for all items
  for (const lineId of Object.keys(items)) {
    const item = items[lineId];
    if (item.sku === "custom_note") {
      item.resolvedName = item.selectedModifierState
        ? `Note: ${item.selectedModifierState}`
        : "Note";
      item.resolvedPrice = 0;
      continue;
    }
    const entry = catalog[item.sku];
    if (entry) {
      item.resolvedName = entry.name;
      let resolvedPrice = entry.basePrice;
      if (item.parentLineId) {
        const parentItem = items[item.parentLineId];
        if (parentItem) {
          const parentEntry = catalog[parentItem.sku];
          if (parentEntry?.comboChoices) {
            // Case A: Direct child of a combo
            const comboChoice = parentEntry.comboChoices.find(
              (c) => c.optionSku === item.sku && !c.modifierSku,
            );
            if (comboChoice) {
              resolvedPrice = comboChoice.price;
            }
          } else if (parentItem.parentLineId) {
            // Case B: Grandchild modifier of a combo choice
            const grandparentItem = items[parentItem.parentLineId];
            if (grandparentItem) {
              const grandparentEntry = catalog[grandparentItem.sku];
              if (grandparentEntry?.comboChoices) {
                const comboChoice = grandparentEntry.comboChoices.find(
                  (c) =>
                    c.optionSku === parentItem.sku &&
                    c.modifierSku === item.sku,
                );
                if (comboChoice) {
                  resolvedPrice = comboChoice.price;
                }
              }
            }
          }
        }
      }
      item.resolvedPrice = resolvedPrice;

      // Resolve modifier states (e.g. NO onions, EXTRA cheese)
      if (item.selectedModifierState) {
        const foundState = entry.allowedStates?.find(
          (s) => s.state === item.selectedModifierState,
        );
        if (foundState) {
          if (
            foundState.priceOverride !== null &&
            foundState.priceOverride !== undefined
          ) {
            item.resolvedPrice = foundState.priceOverride;
          }
          if (foundState.label) {
            item.resolvedName = foundState.label;
          } else {
            item.resolvedName = `${item.selectedModifierState} ${item.resolvedName}`;
          }
        } else {
          item.resolvedName = `${item.selectedModifierState} ${item.resolvedName}`;
        }
      }
    } else {
      item.resolvedName = `[Unknown: ${item.sku}]`;
      item.resolvedPrice = 0;
    }
  }

  // Pass 2: Adjust parent names and hide size modifiers (set name to "")
  for (const lineId of Object.keys(items)) {
    const item = items[lineId];
    const parentEntry = catalog[item.sku];

    if (parentEntry && parentEntry.appliedSizeGroupId) {
      // Find all children of this item
      const children = Object.values(items).filter(
        (c) => c.parentLineId === lineId,
      );

      // Find if any child is a size modifier belonging to this item's appliedSizeGroup
      const sizeChild = children.find((c) => {
        const childEntry = catalog[c.sku];
        return (
          childEntry &&
          childEntry.sizeGroupId === parentEntry.appliedSizeGroupId
        );
      });

      if (sizeChild) {
        const sizeEntry = catalog[sizeChild.sku];
        if (sizeEntry) {
          // Format parent name, e.g. "Small Fries" or "Large Fountain Soda"
          item.resolvedName = `${sizeEntry.name} ${parentEntry.name}`;

          // Merge size modifier price into parent resolvedPrice
          item.resolvedPrice += sizeChild.resolvedPrice;

          // Clear resolvedName and resolvedPrice of sizeChild so it is hidden and has no price impact as a separate line
          sizeChild.resolvedName = "";
          sizeChild.resolvedPrice = 0;
        }
      }
    }
  }
}

// ─── Build Final Projected State (Tree + Financials) ────────────────────────────

function buildProjectedState(
  items: Record<string, InternalLineItem>,
  allocations: Record<string, AllocationBlock>,
  catalog?: Record<string, CatalogItemEntry>,
): ProjectedState {
  // Build tree structure
  const itemMap: Record<string, ProjectedLineItem> = {};
  const roots: ProjectedLineItem[] = [];

  for (const item of Object.values(items)) {
    let status: ItemStatus = ItemStatus.Pending;
    if (item.qty === 0 && item.canceledQty > 0) {
      status = ItemStatus.Canceled;
    } else if (!item.isConfirmed) {
      status = ItemStatus.Pending;
    } else if (item.hasPendingChanges) {
      status = ItemStatus.Changed;
    } else {
      status = ItemStatus.Confirmed;
    }

    itemMap[item.lineId] = {
      lineId: item.lineId,
      parentLineId: item.parentLineId,
      sku: item.sku,
      name: item.resolvedName,
      basePrice: item.resolvedPrice,
      qty: item.qty,
      inlineQty: item.inlineQty ?? 1,
      canceledQty: item.canceledQty,
      totalPrice: item.resolvedPrice * item.qty * (item.inlineQty ?? 1),
      allocations: item.allocations,
      selectedModifierState: item.selectedModifierState,
      status,
      children: [],
    };
  }

  for (const item of Object.values(itemMap)) {
    if (item.parentLineId && itemMap[item.parentLineId]) {
      itemMap[item.parentLineId].children.push(item);
    } else {
      roots.push(item);
    }
  }

  // Sort children of combo items based on comboChoices order if catalog is provided
  if (catalog) {
    for (const item of Object.values(itemMap)) {
      if (item.children.length > 1) {
        const entry = catalog[item.sku];
        if (entry?.comboChoices && entry.comboChoices.length > 0) {
          // Build unique slot order list
          const slotOrder: string[] = [];
          for (const choice of entry.comboChoices) {
            if (!slotOrder.includes(choice.slotSku)) {
              slotOrder.push(choice.slotSku);
            }
          }

          // Sort children based on their slot's index in slotOrder
          item.children.sort((a, b) => {
            const choiceA = entry.comboChoices!.find(
              (c) => c.optionSku === a.sku,
            );
            const choiceB = entry.comboChoices!.find(
              (c) => c.optionSku === b.sku,
            );

            const slotA = choiceA?.slotSku;
            const slotB = choiceB?.slotSku;

            const indexA = slotA ? slotOrder.indexOf(slotA) : -1;
            const indexB = slotB ? slotOrder.indexOf(slotB) : -1;

            if (indexA !== -1 && indexB !== -1) {
              if (indexA !== indexB) {
                return indexA - indexB;
              }
              return a.lineId.localeCompare(b.lineId);
            }
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            return a.lineId.localeCompare(b.lineId);
          });
        }
      }
    }
  }

  // Scale children quantities recursively based on root parent quantity
  for (const root of roots) {
    scaleTreeQuantities(root);
  }

  const flatItems: Record<string, ProjectedLineItem> = {};
  for (const item of Object.values(itemMap)) {
    flatItems[item.lineId] = item;
  }

  // Compute financials — only count root items (children are modifiers/sides)
  let subtotal = 0;

  // Initialize personMap with ALL unique assignees and payers present in allocations
  const people = new Set<string>();
  for (const alloc of Object.values(allocations)) {
    if (alloc.type === AllocationType.Assignment && alloc.entity) {
      people.add(alloc.entity);
    } else if (alloc.type === AllocationType.Payment && alloc.payer) {
      people.add(alloc.payer);
    }
  }

  const personMap = new Map<
    string,
    {
      subtotal: number;
      items: string[];
      paymentMethod: string | null;
      paymentBreakdown: Map<string, number>;
    }
  >();
  for (const person of people) {
    personMap.set(person, { subtotal: 0, items: [], paymentMethod: null, paymentBreakdown: new Map() });
  }

  const globalFixedBalances = new Map<string, number>();
  for (const alloc of Object.values(allocations)) {
    if (alloc.type === AllocationType.Payment) {
      const payAlloc = alloc as PaymentAllocation;
      if (
        payAlloc.paymentStrategy?.strategyType ===
        PaymentStrategyType.FixedGlobal
      ) {
        globalFixedBalances.set(
          alloc.allocationId,
          payAlloc.paymentStrategy.value ?? 0,
        );
      }
    }
  }

  for (const root of roots) {
    const lineTotal = sumTree(root);
    subtotal += lineTotal;

    const assignee = getAssignee(root, allocations) || "Guest";
    // Ensure assignee is in the map
    if (assignee !== "Guest" && !personMap.has(assignee)) {
      personMap.set(assignee, { subtotal: 0, items: [], paymentMethod: null, paymentBreakdown: new Map() });
    }

    const paymentAllocs = root.allocations
      .map((id) => allocations[id])
      .filter(
        (a): a is PaymentAllocation => a?.type === AllocationType.Payment,
      );

    if (paymentAllocs.length === 0) {
      // No payment allocations: assignee pays the full amount
      const pData = personMap.get(assignee) || {
        subtotal: 0,
        items: [] as string[],
        paymentMethod: null as string | null,
        paymentBreakdown: new Map<string, number>(),
      };
      pData.subtotal += lineTotal;
      pData.items.push(root.lineId);
      const defaultPaymentMethod = getPaymentMethod(root, allocations);
      if (defaultPaymentMethod) {
        pData.paymentMethod = defaultPaymentMethod;
      }
      const pmType = defaultPaymentMethod || "card";
      pData.paymentBreakdown.set(pmType, (pData.paymentBreakdown.get(pmType) || 0) + lineTotal);
      personMap.set(assignee, pData);
    } else {
      let remaining = lineTotal;
      const allocatedAmounts = new Map<string, number>();

      // 1. Fixed payment strategies (item)
      const fixedItemAllocs = paymentAllocs.filter(
        (a) =>
          a.paymentStrategy?.strategyType === PaymentStrategyType.FixedItem ||
          a.paymentStrategy?.strategyType === PaymentStrategyType.Fixed,
      );
      for (const alloc of fixedItemAllocs) {
        const val = alloc.paymentStrategy.value ?? 0;
        const amt = Math.min(remaining, val);
        allocatedAmounts.set(alloc.allocationId, amt);
        remaining -= amt;
      }

      // 1.5 Fixed payment strategies (global)
      const fixedGlobalAllocs = paymentAllocs.filter(
        (a) =>
          a.paymentStrategy?.strategyType === PaymentStrategyType.FixedGlobal,
      );
      for (const alloc of fixedGlobalAllocs) {
        const balance = globalFixedBalances.get(alloc.allocationId) ?? 0;
        if (balance > 0) {
          const amt = Math.min(remaining, balance);
          allocatedAmounts.set(alloc.allocationId, amt);
          globalFixedBalances.set(alloc.allocationId, balance - amt);
          remaining -= amt;
        } else {
          allocatedAmounts.set(alloc.allocationId, 0); // No budget left
        }
      }

      // 2. Percentage payment strategies
      const pctAllocs = paymentAllocs.filter(
        (a) =>
          a.paymentStrategy?.strategyType === PaymentStrategyType.Percentage,
      );
      for (const alloc of pctAllocs) {
        const val = alloc.paymentStrategy.value ?? 1.0;
        const amt = Math.min(remaining, lineTotal * val);
        allocatedAmounts.set(
          alloc.allocationId,
          (allocatedAmounts.get(alloc.allocationId) || 0) + amt,
        );
        remaining -= amt;
      }

      // 3. Remaining payment strategies
      const remAllocs = paymentAllocs.filter(
        (a) =>
          a.paymentStrategy?.strategyType === PaymentStrategyType.Remaining,
      );
      if (remAllocs.length > 0) {
        const share = remaining / remAllocs.length;
        for (const alloc of remAllocs) {
          allocatedAmounts.set(
            alloc.allocationId,
            (allocatedAmounts.get(alloc.allocationId) || 0) + share,
          );
        }
        remaining = 0;
      }

      // 4. Default leftover fallback
      if (remaining > 0) {
        // Assign leftover to the first payment allocation
        const firstId = paymentAllocs[0].allocationId;
        allocatedAmounts.set(
          firstId,
          (allocatedAmounts.get(firstId) || 0) + remaining,
        );
      }

      // Attribute allocated amounts to the respective payers
      for (const [allocId, amount] of allocatedAmounts.entries()) {
        const alloc = allocations[allocId] as PaymentAllocation;
        if (alloc) {
          const payer = alloc.payer || assignee;
          const pData = personMap.get(payer) || {
            subtotal: 0,
            items: [] as string[],
            paymentMethod: null as string | null,
            paymentBreakdown: new Map<string, number>(),
          };
          pData.subtotal += amount;
          if (!pData.items.includes(root.lineId)) {
            pData.items.push(root.lineId);
          }
          if (alloc.method) {
            pData.paymentMethod = alloc.method;
          }
          const pmType = alloc.method || "card";
          pData.paymentBreakdown.set(pmType, (pData.paymentBreakdown.get(pmType) || 0) + amount);
          personMap.set(payer, pData);
        }
      }
    }
  }

  return {
    items: flatItems,
    allocations,
    financials: {
      subtotal: Math.round(subtotal * 100) / 100,
      personBreakdown: Array.from(personMap.entries()).map(
        ([person, data]) => ({
          person,
          subtotal: Math.round(data.subtotal * 100) / 100,
          items: data.items,
          paymentMethod: data.paymentMethod,
          paymentBreakdown: Array.from(data.paymentBreakdown.entries()).map(
            ([method, amt]) => ({
              method,
              amount: Math.round(amt * 100) / 100,
            }),
          ),
        }),
      ),
    },
  };
}

function sumTree(item: ProjectedLineItem): number {
  let total = item.totalPrice;
  for (const child of item.children) {
    total += sumTree(child);
  }
  return total;
}

function scaleTreeQuantities(item: ProjectedLineItem): void {
  for (const child of item.children) {
    const childRawQty = child.qty;
    const childRawCanceled = child.canceledQty;

    const totalRaw = childRawQty + childRawCanceled;
    const totalParent = item.qty + item.canceledQty;
    const totalActive = childRawQty * item.qty;

    child.qty = totalActive;
    child.canceledQty = totalRaw * totalParent - totalActive;
    child.totalPrice = child.basePrice * child.qty * (child.inlineQty ?? 1);

    if (child.qty === 0 && child.canceledQty > 0) {
      child.status = ItemStatus.Canceled;
    }

    scaleTreeQuantities(child);
  }
}

function getAssignee(
  item: ProjectedLineItem,
  allocations: Record<string, AllocationBlock>,
): string | null {
  for (const allocId of item.allocations) {
    const alloc = allocations[allocId];
    if (alloc && alloc.type === AllocationType.Assignment) {
      return (alloc as { entity: string }).entity;
    }
  }
  return null;
}

function getPaymentMethod(
  item: ProjectedLineItem,
  allocations: Record<string, AllocationBlock>,
): string | null {
  for (const allocId of item.allocations) {
    const alloc = allocations[allocId];
    if (alloc && alloc.type === AllocationType.Payment) {
      return (alloc as { method: string | null }).method;
    }
  }
  return null;
}
