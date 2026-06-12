// ─── VCS State Reducer ─────────────────────────────────────────────────────────
// This is the core reduction engine. It takes an append-only commit log and
// a target hash, then projects the full state by replaying deltas.
//
// State is NEVER stored — it's computed on the fly (RAM only).
// Prices and names are NEVER in commits — resolved from catalog at projection time.

import type {
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
  PaymentAllocation,
} from "./types";
import { deriveCloneId, generateAllocationId } from "./id";

// ─── Commit Path Traversal ─────────────────────────────────────────────────────

/**
 * Walk the commit log from targetHash back to root, returning commits
 * in chronological order (root first).
 */
function getCommitPath(log: VCSCommit[], targetHash: string | null): VCSCommit[] {
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
  rule: FilterRule
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
      return !String(value).toLowerCase().includes(String(target).toLowerCase());
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
  allocations: Record<string, AllocationBlock>
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
        if (alloc && alloc.type === "assignment") {
          return (alloc as { entity: string }).entity;
        }
      }
      return undefined;
    }
    case "payer": {
      for (const allocId of item.allocations) {
        const alloc = allocations[allocId];
        if (alloc && alloc.type === "payment") {
          return (alloc as { payer: string }).payer;
        }
      }
      return undefined;
    }
    case "fulfillment_method": {
      for (const allocId of item.allocations) {
        const alloc = allocations[allocId];
        if (alloc && alloc.type === "fulfillment") {
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
  allocations: string[];
  selectedOptions?: string[];
  selectedModifierState?: string;
  resolvedName: string;
  resolvedPrice: number;
}

// ─── The Core Reducer ──────────────────────────────────────────────────────────

/**
 * Project the full state at a given commit hash by replaying the log.
 *
 * This is the mathematical function: S_final = S_0 ⊕ ΣΔ
 *
 * @param log        - The append-only commit log
 * @param targetHash - The commit hash to project (null = empty state)
 * @param catalog    - The trusted product catalog for late-bound resolution
 */
export function projectState(
  log: VCSCommit[],
  targetHash: string | null,
  catalog: Record<string, CatalogItemEntry>
): ProjectedState {
  const items: Record<string, InternalLineItem> = {};
  const allocations: Record<string, AllocationBlock> = {};

  if (!targetHash || log.length === 0) {
    return { items: {}, allocations: {}, financials: { subtotal: 0, personBreakdown: [] } };
  }

  const path = getCommitPath(log, targetHash);

  // Phase 1: Apply all deltas sequentially
  for (const commit of path) {
    for (const delta of commit.deltas) {
      applyDelta(items, allocations, delta, log, catalog);
    }
  }

  // Phase 2: Cascading deletions — remove orphans
  cascadeDelete(items);

  // Phase 3: Late-bound catalog resolution
  resolveCatalog(items, catalog);

  // Phase 4: Build tree structure and compute financials
  return buildProjectedState(items, allocations);
}

// ─── Delta Application ─────────────────────────────────────────────────────────

function applyDelta(
  items: Record<string, InternalLineItem>,
  allocations: Record<string, AllocationBlock>,
  delta: Delta,
  fullLog: VCSCommit[],
  catalog: Record<string, CatalogItemEntry>
): void {
  switch (delta.action) {
    case "declare_allocation":
      allocations[delta.allocation.allocationId] = delta.allocation;
      break;

    case "add_item":
      items[delta.lineId] = {
        lineId: delta.lineId,
        parentLineId: delta.parentLineId,
        sku: delta.sku,
        qty: delta.qty,
        allocations: [...delta.allocations],
        selectedModifierState: delta.selectedModifierState,
        resolvedName: "",
        resolvedPrice: 0,
      };
      break;

    case "remove_item": {
      const item = items[delta.lineId];
      if (item) {
        item.qty -= delta.qty;
        if (item.qty <= 0) {
          delete items[delta.lineId];
        }
      }
      break;
    }

    case "modify_item_allocations": {
      const item = items[delta.lineId];
      if (item) {
        // Verify before_allocations matches current state (optimistic check)
        const beforeMatch =
          JSON.stringify([...item.allocations].sort()) ===
          JSON.stringify([...delta.beforeAllocations].sort());
        if (beforeMatch) {
          item.allocations = [...delta.afterAllocations];
        }
      }
      break;
    }

    case "modify_sku": {
      const item = items[delta.lineId];
      if (item && item.sku === delta.beforeSku) {
        item.sku = delta.afterSku;
      }
      break;
    }

    case "batch_by_filter":
      applyBatchByFilter(items, allocations, delta, fullLog, catalog);
      break;
  }
}

// ─── Batch Operations ──────────────────────────────────────────────────────────

function applyBatchByFilter(
  items: Record<string, InternalLineItem>,
  allocations: Record<string, AllocationBlock>,
  delta: Extract<Delta, { action: "batch_by_filter" }>,
  fullLog: VCSCommit[],
  catalog: Record<string, CatalogItemEntry>
): void {
  // Project state at the base_revision_id for deterministic filtering
  const baseState = projectState(fullLog, delta.baseRevisionId, catalog);
  const baseItems = Object.values(baseState.items);

  // Find matching items
  const matchingItems = baseItems.filter((item) => {
    return delta.filters.every((rule) => {
      const value = resolveFilterValue(
        item as unknown as InternalLineItem,
        rule.property,
        baseState.allocations
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
        delta.baseRevisionId
      );
      break;

    case "batch_modify_allocations":
      applyBatchModifyAllocations(
        items,
        allocations,
        matchingItems,
        delta.templateMutation
      );
      break;

    case "batch_remove_items":
      applyBatchRemoveItems(items, matchingItems);
      break;

    case "batch_modify_sku":
      applyBatchModifySku(items, matchingItems, delta.templateMutation);
      break;
  }
}

function applyBatchDuplicate(
  items: Record<string, InternalLineItem>,
  allocations: Record<string, AllocationBlock>,
  matchingItems: ProjectedLineItem[],
  template: BatchDuplicateAndReallocate,
  baseRevisionId: string
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
      allocations: template.patchAllocations.map((a) => a.allocationId),
      resolvedName: "",
      resolvedPrice: 0,
    };

    // Also clone children (modifiers, sides)
    cloneChildren(items, item, newLineId, template.patchAllocations);
  }
}

function cloneChildren(
  items: Record<string, InternalLineItem>,
  parent: ProjectedLineItem,
  newParentLineId: string,
  newAllocations: AllocationBlock[]
): void {
  for (const child of parent.children) {
    const newChildId = `${child.lineId}-clone-${newParentLineId.substring(0, 8)}`;
    items[newChildId] = {
      lineId: newChildId,
      parentLineId: newParentLineId,
      sku: child.sku,
      qty: child.qty,
      allocations: newAllocations.map((a) => a.allocationId),
      resolvedName: "",
      resolvedPrice: 0,
    };
    // Recurse for nested children
    cloneChildren(items, child, newChildId, newAllocations);
  }
}

function applyBatchModifyAllocations(
  items: Record<string, InternalLineItem>,
  allocations: Record<string, AllocationBlock>,
  matchingItems: ProjectedLineItem[],
  template: BatchModifyAllocations
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
          return template.patchAllocation.allocationId;
        }
        return allocId;
      });
    }
  }
}

function applyBatchRemoveItems(
  items: Record<string, InternalLineItem>,
  matchingItems: ProjectedLineItem[]
): void {
  for (const item of matchingItems) {
    delete items[item.lineId];
  }
}

function applyBatchModifySku(
  items: Record<string, InternalLineItem>,
  matchingItems: ProjectedLineItem[],
  template: BatchModifySku
): void {
  for (const item of matchingItems) {
    const internal = items[item.lineId];
    if (internal) {
      internal.sku = template.afterSku;
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
  catalog: Record<string, CatalogItemEntry>
): void {
  // Pass 1: Resolve basic catalog info and modifier states for all items
  for (const lineId of Object.keys(items)) {
    const item = items[lineId];
    const entry = catalog[item.sku];
    if (entry) {
      item.resolvedName = entry.name;
      item.resolvedPrice = entry.basePrice;

      // Resolve modifier states (e.g. NO onions, EXTRA cheese)
      if (item.selectedModifierState) {
        const foundState = entry.allowedStates?.find(
          (s) => s.state === item.selectedModifierState
        );
        if (foundState) {
          if (foundState.priceOverride !== null && foundState.priceOverride !== undefined) {
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
      const children = Object.values(items).filter((c) => c.parentLineId === lineId);
      
      // Find if any child is a size modifier belonging to this item's appliedSizeGroup
      const sizeChild = children.find((c) => {
        const childEntry = catalog[c.sku];
        return childEntry && childEntry.sizeGroupId === parentEntry.appliedSizeGroupId;
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
  allocations: Record<string, AllocationBlock>
): ProjectedState {
  // Build tree structure
  const itemMap: Record<string, ProjectedLineItem> = {};
  const roots: ProjectedLineItem[] = [];

  for (const item of Object.values(items)) {
    itemMap[item.lineId] = {
      lineId: item.lineId,
      parentLineId: item.parentLineId,
      sku: item.sku,
      name: item.resolvedName,
      basePrice: item.resolvedPrice,
      qty: item.qty,
      totalPrice: item.resolvedPrice * item.qty,
      allocations: item.allocations,
      selectedModifierState: item.selectedModifierState,
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

  const flatItems: Record<string, ProjectedLineItem> = {};
  for (const item of Object.values(itemMap)) {
    flatItems[item.lineId] = item;
  }

  // Compute financials — only count root items (children are modifiers/sides)
  let subtotal = 0;

  // Initialize personMap with ALL unique assignees and payers present in allocations
  const people = new Set<string>();
  for (const alloc of Object.values(allocations)) {
    if (alloc.type === "assignment" && alloc.entity) {
      people.add(alloc.entity);
    } else if (alloc.type === "payment" && alloc.payer) {
      people.add(alloc.payer);
    }
  }

  const personMap = new Map<string, { subtotal: number; items: string[]; paymentMethod: string | null }>();
  for (const person of people) {
    personMap.set(person, { subtotal: 0, items: [], paymentMethod: null });
  }

  for (const root of roots) {
    const lineTotal = sumTree(root);
    subtotal += lineTotal;

    const assignee = getAssignee(root, allocations) || "Guest";
    // Ensure assignee is in the map
    if (assignee !== "Guest" && !personMap.has(assignee)) {
      personMap.set(assignee, { subtotal: 0, items: [], paymentMethod: null });
    }

    const paymentAllocs = root.allocations
      .map(id => allocations[id])
      .filter((a): a is PaymentAllocation => a?.type === "payment");

    if (paymentAllocs.length === 0) {
      // No payment allocations: assignee pays the full amount
      const pData = personMap.get(assignee) || { subtotal: 0, items: [], paymentMethod: null };
      pData.subtotal += lineTotal;
      pData.items.push(root.lineId);
      const defaultPaymentMethod = getPaymentMethod(root, allocations);
      if (defaultPaymentMethod) {
        pData.paymentMethod = defaultPaymentMethod;
      }
      personMap.set(assignee, pData);
    } else {
      let remaining = lineTotal;
      const allocatedAmounts = new Map<string, number>();

      // 1. Fixed payment strategies
      const fixedAllocs = paymentAllocs.filter(a => a.paymentStrategy?.strategyType === "fixed");
      for (const alloc of fixedAllocs) {
        const val = alloc.paymentStrategy.value ?? 0;
        const amt = Math.min(remaining, val);
        allocatedAmounts.set(alloc.allocationId, amt);
        remaining -= amt;
      }

      // 2. Percentage payment strategies
      const pctAllocs = paymentAllocs.filter(a => a.paymentStrategy?.strategyType === "percentage");
      for (const alloc of pctAllocs) {
        const val = alloc.paymentStrategy.value ?? 1.0;
        const amt = Math.min(remaining, lineTotal * val);
        allocatedAmounts.set(alloc.allocationId, (allocatedAmounts.get(alloc.allocationId) || 0) + amt);
        remaining -= amt;
      }

      // 3. Remaining payment strategies
      const remAllocs = paymentAllocs.filter(a => a.paymentStrategy?.strategyType === "remaining");
      if (remAllocs.length > 0) {
        const share = remaining / remAllocs.length;
        for (const alloc of remAllocs) {
          allocatedAmounts.set(alloc.allocationId, (allocatedAmounts.get(alloc.allocationId) || 0) + share);
        }
        remaining = 0;
      }

      // 4. Default leftover fallback
      if (remaining > 0) {
        // Assign leftover to the first payment allocation
        const firstId = paymentAllocs[0].allocationId;
        allocatedAmounts.set(firstId, (allocatedAmounts.get(firstId) || 0) + remaining);
      }

      // Attribute allocated amounts to the respective payers
      for (const [allocId, amount] of allocatedAmounts.entries()) {
        const alloc = allocations[allocId] as PaymentAllocation;
        if (alloc) {
          const payer = alloc.payer || assignee;
          const pData = personMap.get(payer) || { subtotal: 0, items: [], paymentMethod: null };
          pData.subtotal += amount;
          if (!pData.items.includes(root.lineId)) {
            pData.items.push(root.lineId);
          }
          if (alloc.method) {
            pData.paymentMethod = alloc.method;
          }
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
      personBreakdown: Array.from(personMap.entries()).map(([person, data]) => ({
        person,
        subtotal: Math.round(data.subtotal * 100) / 100,
        items: data.items,
        paymentMethod: data.paymentMethod,
      })),
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

function getAssignee(
  item: ProjectedLineItem,
  allocations: Record<string, AllocationBlock>
): string | null {
  for (const allocId of item.allocations) {
    const alloc = allocations[allocId];
    if (alloc && alloc.type === "assignment") {
      return (alloc as { entity: string }).entity;
    }
  }
  return null;
}

function getPaymentMethod(
  item: ProjectedLineItem,
  allocations: Record<string, AllocationBlock>
): string | null {
  for (const allocId of item.allocations) {
    const alloc = allocations[allocId];
    if (alloc && alloc.type === "payment") {
      return (alloc as { method: string | null }).method;
    }
  }
  return null;
}