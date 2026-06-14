"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useVCSStore } from "@/store/vcs-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitMerge,
  GitBranch,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Zap,
  RefreshCw,
  Eye,
  TriangleAlert,
  User,
  DollarSign,
  Package,
  Lock,
  ChevronDown,
  Clock,
  CreditCard,
  ArrowRight,
  Tag,
  Sparkles,
  ChevronsUpDown,
} from "lucide-react";
import type {
  BranchMap,
  MergePreview,
  MergeConflict,
  Delta,
  ProjectedState,
  ProjectedLineItem,
  AllocationBlock,
  CatalogItemEntry,
  PaymentAllocation,
  FulfillmentAllocation,
} from "@/lib/vcs/types";
import { MergeConflictType, SquashType, DeltaActionType, AllocationType } from "@/lib/vcs/types";
import {
  formatFulfillmentTime,
  getPaymentAllocDisplayName,
  MERGE_SQUASH_DESCRIPTIONS,
} from "@/lib/pos/utils";
import { areDeltasIdentical } from "@/lib/vcs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: BranchMap;
  activeBranch: string;
  /** True when source tip is already an ancestor of the target head (git "Already up to date"). */
  isAlreadyMerged: (sourceBranch: string, targetBranch: string) => boolean;
  onPreview: (sourceBranches: string[], targetBranch: string) => MergePreview;
  onCommit: (
    sourceBranches: string[],
    targetBranch: string,
    resolutionDeltas: Delta[],
  ) => void;
  resolveGuestName?: (idOrName: string) => string;
}

type Step = "select" | "preview" | "done";

// ─── Small Helpers ────────────────────────────────────────────────────────────

function conflictLabel(c: MergeConflict): string {
  switch (c.type) {
    case MergeConflictType.AddAdd:
      return `Same item ID, different content (lineId: ${c.lineId?.slice(0, 8)})`;
    case MergeConflictType.RemoveModifySku:
      return `Item removed vs SKU changed (lineId: ${c.lineId?.slice(0, 8)})`;
    case MergeConflictType.RemoveModifyAlloc:
      return `Item removed vs allocation changed (lineId: ${c.lineId?.slice(0, 8)})`;
    case MergeConflictType.ModifySkuSku:
      return `SKU changed to different values (lineId: ${c.lineId?.slice(0, 8)})`;
    case MergeConflictType.AllocAlloc:
      return `Allocation edited on both branches (id: ${c.allocationId?.slice(0, 8)})`;
    case MergeConflictType.ModifyAllocAlloc:
      return `Allocations changed differently (lineId: ${c.lineId?.slice(0, 8)})`;
  }
}

function deltaDescription(delta: Delta, branch: string): string {
  switch (delta.action) {
    case DeltaActionType.AddItem:
      return `Add item (${delta.sku})`;
    case DeltaActionType.RemoveItem:
      return `Remove item`;
    case DeltaActionType.ModifySku:
      return `SKU → ${delta.afterSku}`;
    case DeltaActionType.ModifyItemAllocations:
      return `Reallocate item`;
    case DeltaActionType.DeclareAllocation:
      return `Update allocation`;
    default:
      return delta.action;
  }
}

function BranchBadge({
  name,
  pointer,
}: {
  name: string;
  pointer: { type?: string; label?: string };
}) {
  const isHypothetical = pointer.type === "hypothetical";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
        isHypothetical
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
          : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
      }`}
    >
      {isHypothetical ? (
        <Lightbulb className="w-2.5 h-2.5" />
      ) : (
        <GitBranch className="w-2.5 h-2.5" />
      )}
      {pointer.label || name}
    </span>
  );
}

// ─── Conflict Card ─────────────────────────────────────────────────────────────

function ConflictCard({
  conflict,
  onChange,
  autoMergedState,
}: {
  conflict: MergeConflict;
  onChange: (id: string, resolution: string) => void;
  autoMergedState?: ProjectedState;
}) {
  const options = [
    { branch: conflict.branchA, delta: conflict.deltaA },
    { branch: conflict.branchB, delta: conflict.deltaB },
  ];

  const isAutoResolved = areDeltasIdentical(
    conflict.deltaA,
    conflict.deltaB,
    autoMergedState,
  );

  return (
    <div
      className={`rounded-xl border-2 p-3 space-y-2.5 transition-colors ${
        conflict.resolution
          ? "border-emerald-400/50 bg-emerald-50/40 dark:bg-emerald-950/10"
          : "border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/10"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
            conflict.resolution ? "text-emerald-500" : "text-amber-500"
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-semibold text-foreground leading-tight">
              {conflictLabel(conflict)}
            </p>
            {isAutoResolved && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0 font-medium py-0"
              >
                Auto-Resolved
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            <code className="font-mono">{conflict.branchA}</code> vs{" "}
            <code className="font-mono">{conflict.branchB}</code>
          </p>
        </div>
        {conflict.resolution && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        )}
      </div>

      <div className="space-y-1.5">
        {options.map(({ branch, delta }) => {
          const isSelected = conflict.resolution === branch;
          return (
            <button
              key={branch}
              type="button"
              onClick={() => onChange(conflict.id, branch)}
              className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                  : "border-border bg-background hover:border-muted-foreground/30 hover:bg-accent/40"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                  isSelected
                    ? "border-emerald-500"
                    : "border-muted-foreground/40"
                }`}
              >
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-[10px] font-semibold font-mono ${isSelected ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}
                >
                  {branch}
                </span>
                <p className="text-[10px] text-foreground/80 truncate">
                  {deltaDescription(delta, branch)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Conflicts Popup Dialog ───────────────────────────────────────────────────

function findItemForConflict(
  conflict: MergeConflict,
  state: ProjectedState | undefined,
): { name: string; sku: string; price: number } | null {
  let lineId = conflict.lineId;

  if (!lineId && conflict.allocationId) {
    // Try to find the item in autoMergedState allocations
    if (state) {
      const matchingItem = Object.values(state.items).find((item) =>
        item.allocations.includes(conflict.allocationId!),
      );
      if (matchingItem) {
        lineId = matchingItem.lineId;
      }
    }
    // Try current store projectedState
    if (!lineId) {
      const activeState = useVCSStore.getState().projectedState;
      const matchingItem = Object.values(activeState.items).find((item) =>
        item.allocations.includes(conflict.allocationId!),
      );
      if (matchingItem) {
        lineId = matchingItem.lineId;
      }
    }
  }

  if (!lineId) return null;

  // 1. Check autoMergedState
  if (state && state.items[lineId]) {
    const item = state.items[lineId];
    return {
      name: item.name,
      sku: item.sku,
      price: item.totalPrice,
    };
  }

  // 2. Check current active state in store
  const activeState = useVCSStore.getState().projectedState;
  if (activeState && activeState.items[lineId]) {
    const item = activeState.items[lineId];
    return {
      name: item.name,
      sku: item.sku,
      price: item.totalPrice,
    };
  }

  // 3. Fallback: scan repository commit log to find the SKU of this lineId
  try {
    const log = useVCSStore.getState().engine.getRepo().log;
    for (const commit of log) {
      for (const delta of commit.deltas) {
        if (delta.action === DeltaActionType.AddItem && delta.lineId === lineId) {
          const sku = delta.sku;
          const catalogEntry = useVCSStore.getState().catalog[sku];
          if (catalogEntry) {
            return {
              name: catalogEntry.name,
              sku: sku,
              price: catalogEntry.basePrice,
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("Error searching log for conflict item:", e);
  }

  return null;
}

function getAllocationBlock(
  id: string,
  state?: ProjectedState,
): AllocationBlock | null {
  if (state?.allocations[id]) {
    return state.allocations[id];
  }
  const storeState = useVCSStore.getState().projectedState;
  if (storeState?.allocations[id]) {
    return storeState.allocations[id];
  }
  return null;
}

function formatAllocationBlock(
  alloc: AllocationBlock,
  initiatedAt: string | undefined,
  allAllocations?: Record<string, AllocationBlock>,
): string {
  if (alloc.type === AllocationType.Assignment) {
    return `Assignee: ${alloc.entity}`;
  }
  if (alloc.type === AllocationType.Payment) {
    const pay = alloc as PaymentAllocation;
    if (allAllocations) {
      return getPaymentAllocDisplayName(pay, allAllocations);
    }
    const methodPart = pay.method ? ` via ${pay.method}` : "";
    const strategy = pay.paymentStrategy;
    let strategyPart = "";
    if (strategy) {
      if (strategy.strategyType === "fixed") {
        strategyPart = ` ($${(strategy.value ?? 0).toFixed(2)})`;
      } else if (strategy.strategyType === "remaining") {
        strategyPart = ` (remaining)`;
      } else {
        const pct = Math.round((strategy.value ?? 1) * 100);
        strategyPart = ` (${pct}%)`;
      }
    }
    return `Pay: ${pay.payer}${methodPart}${strategyPart}`;
  }
  if (alloc.type === AllocationType.Fulfillment) {
    const ful = alloc as FulfillmentAllocation;
    const methodPart = ful.method
      ? `Fulfillment (${ful.method})`
      : AllocationType.Fulfillment;
    const destPart = ful.fulfillmentMetadata?.destinationLabel
      ? ` to ${ful.fulfillmentMetadata.destinationLabel}`
      : "";
    let timePart = "";
    if (ful.time) {
      if (ful.time.type === "immediate") {
        timePart = " (On Confirmation)";
      } else if (ful.time.type === "scheduled" && ful.time.calculatedAt) {
        timePart = ` (Scheduled @ ${formatFulfillmentTime(ful.time.calculatedAt, initiatedAt)})`;
      } else if (ful.time.type === "deferred" && ful.time.calculatedAt) {
        timePart = ` (Deferred @ ${formatFulfillmentTime(ful.time.calculatedAt, initiatedAt)})`;
      }
    }
    return `${methodPart}${destPart}${timePart}`;
  }
  return (alloc as any).type || "";
}

function formatDeltaDetails(
  delta: Delta,
  state: ProjectedState | undefined,
  catalog: Record<string, CatalogItemEntry>,
  initiatedAt: string | undefined,
): React.ReactNode {
  switch (delta.action) {
    case DeltaActionType.AddItem: {
      const name = catalog[delta.sku]?.name || delta.sku;
      return (
        <div className="space-y-1 text-foreground/90">
          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
            Add Item
          </div>
          <div>
            <span className="text-muted-foreground">Item:</span> {name}
          </div>
          <div>
            <span className="text-muted-foreground">Qty:</span> {delta.qty}
          </div>
          {delta.selectedModifierState && (
            <div>
              <span className="text-muted-foreground">Modifier:</span>{" "}
              {delta.selectedModifierState}
            </div>
          )}
          {delta.allocations && delta.allocations.length > 0 && (
            <div>
              <span className="text-muted-foreground">Allocations:</span>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[10px]">
                {delta.allocations.map((id) => {
                  const block = getAllocationBlock(id, state);
                  return (
                    <li key={id}>
                      {block
                        ? formatAllocationBlock(
                            block,
                            initiatedAt,
                            state?.allocations,
                          )
                        : `ID: ${id.slice(0, 8)}`}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      );
    }
    case DeltaActionType.RemoveItem: {
      return (
        <div className="space-y-1 text-foreground/90">
          <div className="font-semibold text-rose-600 dark:text-rose-400">
            Remove Item
          </div>
          <div>
            <span className="text-muted-foreground">Qty:</span> {delta.qty}
          </div>
        </div>
      );
    }
    case DeltaActionType.ModifySku: {
      const beforeName = catalog[delta.beforeSku]?.name || delta.beforeSku;
      const afterName = catalog[delta.afterSku]?.name || delta.afterSku;
      return (
        <div className="space-y-1 text-foreground/90">
          <div className="font-semibold text-amber-600 dark:text-amber-400">
            Modify SKU
          </div>
          <div>
            <span className="text-muted-foreground">Before:</span> {beforeName}
          </div>
          <div>
            <span className="text-muted-foreground">After:</span> {afterName}
          </div>
        </div>
      );
    }
    case DeltaActionType.ModifyQty: {
      return (
        <div className="space-y-1 text-foreground/90">
          <div className="font-semibold text-amber-600 dark:text-amber-400">
            Modify Qty
          </div>
          <div>
            <span className="text-muted-foreground">Before:</span>{" "}
            {delta.beforeQty}
          </div>
          <div>
            <span className="text-muted-foreground">After:</span>{" "}
            {delta.afterQty}
          </div>
        </div>
      );
    }
    case DeltaActionType.ModifyModifierState: {
      return (
        <div className="space-y-1 text-foreground/90">
          <div className="font-semibold text-amber-600 dark:text-amber-400">
            Modify Modifier
          </div>
          <div>
            <span className="text-muted-foreground">Before:</span>{" "}
            {delta.beforeState || "None"}
          </div>
          <div>
            <span className="text-muted-foreground">After:</span>{" "}
            {delta.afterState || "None"}
          </div>
        </div>
      );
    }
    case DeltaActionType.ModifyItemAllocations: {
      return (
        <div className="space-y-1 text-foreground/90">
          <div className="font-semibold text-amber-600 dark:text-amber-400">
            Modify Allocations
          </div>
          {delta.beforeAllocations && delta.beforeAllocations.length > 0 && (
            <div>
              <span className="text-muted-foreground">Before:</span>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[10px]">
                {delta.beforeAllocations.map((id) => {
                  const block = getAllocationBlock(id, state);
                  return (
                    <li key={id}>
                      {block
                        ? formatAllocationBlock(
                            block,
                            initiatedAt,
                            state?.allocations,
                          )
                        : `ID: ${id.slice(0, 8)}`}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {delta.afterAllocations && delta.afterAllocations.length > 0 && (
            <div>
              <span className="text-muted-foreground">After:</span>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[10px]">
                {delta.afterAllocations.map((id) => {
                  const block = getAllocationBlock(id, state);
                  return (
                    <li key={id}>
                      {block
                        ? formatAllocationBlock(
                            block,
                            initiatedAt,
                            state?.allocations,
                          )
                        : `ID: ${id.slice(0, 8)}`}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      );
    }
    case DeltaActionType.DeclareAllocation: {
      return (
        <div className="space-y-1 text-foreground/90">
          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
            Declare Allocation
          </div>
          <div>
            <span className="text-muted-foreground">Details:</span>{" "}
            {formatAllocationBlock(
              delta.allocation,
              initiatedAt,
              state?.allocations,
            )}
          </div>
        </div>
      );
    }
    case DeltaActionType.BatchByFilter: {
      return (
        <div className="space-y-1 text-foreground/90">
          <div className="font-semibold text-purple-600 dark:text-purple-400">
            Batch Action
          </div>
          <div>
            <span className="text-muted-foreground">Type:</span>{" "}
            {delta.templateMutation.mutationType}
          </div>
        </div>
      );
    }
    default:
      return <div className="text-muted-foreground">Unknown action</div>;
  }
}

function renderIncomingChangeBadges(
  delta: Delta,
  state: ProjectedState | undefined,
  catalog: Record<string, CatalogItemEntry>,
  initiatedAt: string | undefined,
): React.ReactNode[] {
  const badges: React.ReactNode[] = [];

  switch (delta.action) {
    case DeltaActionType.AddItem: {
      const name = catalog[delta.sku]?.name || delta.sku;
      badges.push(
        <Badge
          key="add-item"
          variant="secondary"
          className="flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40 text-[10px] py-0.5 px-2"
        >
          <Package className="w-3 h-3 shrink-0" />
          Add: {name}
        </Badge>,
      );
      badges.push(
        <Badge
          key="qty"
          variant="secondary"
          className="flex items-center gap-1 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/40 text-[10px] py-0.5 px-2"
        >
          Qty: {delta.qty}
        </Badge>,
      );
      if (delta.selectedModifierState) {
        badges.push(
          <Badge
            key="mod"
            variant="secondary"
            className="flex items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40 text-[10px] py-0.5 px-2"
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            Modifier: {delta.selectedModifierState}
          </Badge>,
        );
      }
      if (delta.allocations && delta.allocations.length > 0) {
        delta.allocations.forEach((id, idx) => {
          const block = getAllocationBlock(id, state);
          if (block) {
            if (block.type === AllocationType.Assignment) {
              badges.push(
                <Badge
                  key={`alloc-assign-${idx}`}
                  variant="secondary"
                  className="flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40 text-[10px] py-0.5 px-2"
                >
                  <User className="w-3 h-3 shrink-0" />
                  Assignee: {block.entity}
                </Badge>,
              );
            } else if (block.type === AllocationType.Payment) {
              const display = getPaymentAllocDisplayName(
                block,
                state?.allocations || {},
              );
              badges.push(
                <Badge
                  key={`alloc-pay-${idx}`}
                  variant="secondary"
                  className="flex items-center gap-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40 text-[10px] py-0.5 px-2"
                >
                  <CreditCard className="w-3 h-3 shrink-0" />
                  {display}
                </Badge>,
              );
            } else if (block.type === AllocationType.Fulfillment) {
              const display = formatAllocationBlock(
                block,
                initiatedAt,
                state?.allocations,
              );
              badges.push(
                <Badge
                  key={`alloc-ful-${idx}`}
                  variant="secondary"
                  className="flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border-green-200/60 dark:border-green-800/40 text-[10px] py-0.5 px-2"
                >
                  <Clock className="w-3 h-3 shrink-0" />
                  {display}
                </Badge>,
              );
            }
          }
        });
      }
      break;
    }
    case DeltaActionType.RemoveItem: {
      badges.push(
        <Badge
          key="remove"
          variant="secondary"
          className="flex items-center gap-1 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40 text-[10px] py-0.5 px-2"
        >
          <Package className="w-3 h-3 shrink-0" />
          Remove Item
        </Badge>,
      );
      badges.push(
        <Badge
          key="qty"
          variant="secondary"
          className="flex items-center gap-1 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40 text-[10px] py-0.5 px-2"
        >
          Qty: {delta.qty}
        </Badge>,
      );
      break;
    }
    case DeltaActionType.ModifySku: {
      const beforeEntry = catalog[delta.beforeSku];
      const afterEntry = catalog[delta.afterSku];

      const beforeName = beforeEntry?.name || delta.beforeSku;
      const afterName = afterEntry?.name || delta.afterSku;

      // Detect size change (inplace modifier like small, medium, large)
      const isSizeChange = !!(
        beforeEntry &&
        afterEntry &&
        beforeEntry.sizeGroupId &&
        beforeEntry.sizeGroupId === afterEntry.sizeGroupId
      );

      badges.push(
        <Badge
          key="sku"
          variant="secondary"
          className="flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40 text-[10px] py-0.5 px-2"
        >
          <Tag className="w-3 h-3 shrink-0" />
          {isSizeChange
            ? `Size: ${beforeName} ➔ ${afterName}`
            : `Item: ${beforeName} ➔ ${afterName}`}
        </Badge>,
      );
      break;
    }
    case DeltaActionType.ModifyQty: {
      badges.push(
        <Badge
          key="qty"
          variant="secondary"
          className="flex items-center gap-1 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/40 text-[10px] py-0.5 px-2"
        >
          Qty: {delta.beforeQty} ➔ {delta.afterQty}
        </Badge>,
      );
      break;
    }
    case DeltaActionType.ModifyModifierState: {
      badges.push(
        <Badge
          key="mod"
          variant="secondary"
          className="flex items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40 text-[10px] py-0.5 px-2"
        >
          <Sparkles className="w-3 h-3 shrink-0" />
          Modifier: {delta.beforeState || "None"} ➔ {delta.afterState || "None"}
        </Badge>,
      );
      break;
    }
    case DeltaActionType.ModifyItemAllocations: {
      // Find what allocations were added in afterAllocations
      const added = delta.afterAllocations.filter(
        (id) => !delta.beforeAllocations.includes(id),
      );
      const removed = delta.beforeAllocations.filter(
        (id) => !delta.afterAllocations.includes(id),
      );

      added.forEach((id, idx) => {
        const block = getAllocationBlock(id, state);
        if (block) {
          if (block.type === AllocationType.Assignment) {
            badges.push(
              <Badge
                key={`add-assign-${idx}`}
                variant="secondary"
                className="flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40 text-[10px] py-0.5 px-2"
              >
                <User className="w-3 h-3 shrink-0" />
                Assign: {block.entity}
              </Badge>,
            );
          } else if (block.type === AllocationType.Payment) {
            const display = getPaymentAllocDisplayName(
              block,
              state?.allocations || {},
            );
            badges.push(
              <Badge
                key={`add-pay-${idx}`}
                variant="secondary"
                className="flex items-center gap-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40 text-[10px] py-0.5 px-2"
              >
                <CreditCard className="w-3 h-3 shrink-0" />
                Payment: {display}
              </Badge>,
            );
          } else if (block.type === AllocationType.Fulfillment) {
            const display = formatAllocationBlock(
              block,
              initiatedAt,
              state?.allocations,
            );
            badges.push(
              <Badge
                key={`add-ful-${idx}`}
                variant="secondary"
                className="flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border-green-200/60 dark:border-green-800/40 text-[10px] py-0.5 px-2"
              >
                <Clock className="w-3 h-3 shrink-0" />
                {display}
              </Badge>,
            );
          }
        }
      });

      removed.forEach((id, idx) => {
        const block = getAllocationBlock(id, state);
        if (block) {
          badges.push(
            <Badge
              key={`rem-alloc-${idx}`}
              variant="secondary"
              className="flex items-center gap-1 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40 text-[10px] py-0.5 px-2 line-through opacity-70"
            >
              Remove Alloc: {block.type}
            </Badge>,
          );
        }
      });

      if (badges.length === 0) {
        badges.push(
          <Badge
            key="alloc-change"
            variant="secondary"
            className="flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40 text-[10px] py-0.5 px-2"
          >
            Reallocated Allocations
          </Badge>,
        );
      }
      break;
    }
    case DeltaActionType.DeclareAllocation: {
      const block = delta.allocation;
      if (block.type === AllocationType.Assignment) {
        badges.push(
          <Badge
            key="decl-assign"
            variant="secondary"
            className="flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40 text-[10px] py-0.5 px-2"
          >
            <User className="w-3 h-3 shrink-0" />
            Declare Assignee: {block.entity}
          </Badge>,
        );
      } else if (block.type === AllocationType.Payment) {
        const display = getPaymentAllocDisplayName(
          block,
          state?.allocations || {},
        );
        badges.push(
          <Badge
            key="decl-pay"
            variant="secondary"
            className="flex items-center gap-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40 text-[10px] py-0.5 px-2"
          >
            <CreditCard className="w-3 h-3 shrink-0" />
            Declare Payment: {display}
          </Badge>,
        );
      } else if (block.type === AllocationType.Fulfillment) {
        const display = formatAllocationBlock(
          block,
          initiatedAt,
          state?.allocations,
        );
        badges.push(
          <Badge
            key="decl-ful"
            variant="secondary"
            className="flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border-green-200/60 dark:border-green-800/40 text-[10px] py-0.5 px-2"
          >
            <Clock className="w-3 h-3 shrink-0" />
            {display}
          </Badge>,
        );
      }
      break;
    }
    case DeltaActionType.BatchByFilter: {
      badges.push(
        <Badge
          key="batch"
          variant="secondary"
          className="flex items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40 text-[10px] py-0.5 px-2"
        >
          Batch: {delta.templateMutation.mutationType}
        </Badge>,
      );
      break;
    }
  }

  return badges;
}

function ConflictsDialog({
  open,
  onOpenChange,
  conflicts,
  onConflictChange,
  autoMergedState,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conflicts: MergeConflict[];
  onConflictChange: (id: string, resolution: string) => void;
  autoMergedState?: ProjectedState;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const unresolvedCount = conflicts.filter((c) => !c.resolution).length;

  const catalog = useVCSStore((s) => s.catalog);
  const initiatedAt = useVCSStore((s) => s.orderContext?.initiatedAt);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setShowDetails(false);
    }
  }, [open]);

  useEffect(() => {
    setShowDetails(false);
  }, [activeIndex]);

  const activeConflict = conflicts[activeIndex];
  const affectedItem = activeConflict
    ? findItemForConflict(activeConflict, autoMergedState)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-120 flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-amber-500" />
            Merge Conflicts
            <Badge
              variant={unresolvedCount > 0 ? "destructive" : "secondary"}
              className="ml-auto text-[10px] h-5"
            >
              {unresolvedCount > 0
                ? `${unresolvedCount} unresolved`
                : "All resolved"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Pick which branch wins for each conflict. All must be resolved
            before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2">
          <div className="space-y-4 py-2 pr-2">
            {conflicts.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  Clean merge — no conflicts detected
                </p>
              </div>
            ) : (
              <>
                {/* Conflict Card for current active index */}
                {activeConflict && (
                  <ConflictCard
                    conflict={activeConflict}
                    onChange={onConflictChange}
                    autoMergedState={autoMergedState}
                  />
                )}

                {/* Selected Option Visual Indicator Badges */}
                {activeConflict && activeConflict.resolution && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 p-2.5 space-y-1.5 transition-all">
                    <p className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      Incoming changes (accepted)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {renderIncomingChangeBadges(
                        activeConflict.resolution === activeConflict.branchA
                          ? activeConflict.deltaA
                          : activeConflict.deltaB,
                        autoMergedState,
                        catalog,
                        initiatedAt,
                      )}
                    </div>
                  </div>
                )}

                {/* Affected Item Details & Clickable Comparison Toggler */}
                {affectedItem && (
                  <div className="space-y-2">
                    <div
                      onClick={() => setShowDetails(!showDetails)}
                      className="rounded-xl border bg-muted/40 p-3 flex items-center justify-between gap-3 shadow-xs cursor-pointer hover:bg-muted/60 transition-all select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {affectedItem.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {affectedItem.sku}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-bold text-foreground">
                          ${affectedItem.price.toFixed(2)}
                        </span>
                        {showDetails ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </div>

                    {showDetails && (
                      <div className="p-3 rounded-xl border bg-background/50 space-y-3 transition-all animate-fadeIn">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Detailed Changes Comparison
                        </p>
                        <div className="grid grid-cols-2 gap-3.5 text-[11px] leading-relaxed">
                          {/* Column A */}
                          <div className="p-2.5 rounded-lg border bg-muted/20 min-w-0">
                            <div
                              className="flex items-center gap-1.5 mb-2 pb-1.5 border-b text-foreground font-mono font-semibold truncate"
                              title={activeConflict.branchA}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              {activeConflict.branchA}
                            </div>
                            {formatDeltaDetails(
                              activeConflict.deltaA,
                              autoMergedState,
                              catalog,
                              initiatedAt,
                            )}
                          </div>
                          {/* Column B */}
                          <div className="p-2.5 rounded-lg border bg-muted/20 min-w-0">
                            <div
                              className="flex items-center gap-1.5 mb-2 pb-1.5 border-b text-foreground font-mono font-semibold truncate"
                              title={activeConflict.branchB}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              {activeConflict.branchB}
                            </div>
                            {formatDeltaDetails(
                              activeConflict.deltaB,
                              autoMergedState,
                              catalog,
                              initiatedAt,
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Controls */}
                {conflicts.length > 1 && (
                  <div className="flex flex-col gap-3.5 pt-3 border-t mt-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs flex items-center gap-1.5"
                        disabled={activeIndex === 0}
                        type="button"
                        onClick={() => setActiveIndex((prev) => prev - 1)}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Previous
                      </Button>

                      {/* Dots row */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-50 sm:max-w-60">
                        {conflicts.map((c, idx) => {
                          const isActive = idx === activeIndex;
                          const isResolved = !!c.resolution;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setActiveIndex(idx)}
                              className={`w-2.5 h-2.5 rounded-full transition-all border ${
                                isActive
                                  ? "ring-2 ring-primary ring-offset-1 scale-110"
                                  : ""
                              } ${
                                isResolved
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "bg-amber-400 border-amber-400"
                              }`}
                              title={`Conflict ${idx + 1}: ${isResolved ? "Resolved" : "Unresolved"}`}
                            />
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs flex items-center gap-1.5"
                        disabled={activeIndex === conflicts.length - 1}
                        type="button"
                        onClick={() => setActiveIndex((prev) => prev + 1)}
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium px-0.5">
                      <span>
                        Conflict {activeIndex + 1} of {conflicts.length}
                      </span>
                      <span>
                        {conflicts.filter((c) => c.resolution).length} of{" "}
                        {conflicts.length} resolved
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="pt-2 border-t shrink-0">
          <Button className="w-full h-9" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Merged State Preview Sheet ───────────────────────────────────────────────

function renderLineItem(
  item: ProjectedLineItem,
  depth: number = 0,
): React.ReactNode {
  const indent = depth * 12;
  return (
    <React.Fragment key={item.lineId}>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors ${depth > 0 ? "opacity-75" : ""}`}
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        <Package className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="flex-1 text-xs font-medium truncate">
          {item.name || item.sku}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          ×{item.qty}
        </span>
        <span className="text-xs font-semibold tabular-nums shrink-0 w-14 text-right">
          ${item.totalPrice.toFixed(2)}
        </span>
      </div>
      {item.children
        .filter((c) => c.name)
        .map((child) => renderLineItem(child, depth + 1))}
    </React.Fragment>
  );
}

function MergedStateSheet({
  open,
  onOpenChange,
  state,
  targetBranch,
  sourceBranches,
  resolveGuestName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  state: ProjectedState;
  targetBranch: string;
  sourceBranches: string[];
  resolveGuestName?: (idOrName: string) => string;
}) {
  const rootItems = Object.values(state.items).filter((i) => !i.parentLineId);
  const { subtotal, personBreakdown } = state.financials;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-120 flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-primary" />
            Preview — Merged Order
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            {sourceBranches.join(" + ")} → {targetBranch}
            {" · "}This is a read-only projection of what the order would look
            like after merging.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-5 py-4 space-y-5">
            {/* Items */}
            <section className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Order Items — {rootItems.length} line
                {rootItems.length !== 1 ? "s" : ""}
              </p>
              {rootItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Empty order after merge
                </p>
              ) : (
                <div className="rounded-xl border divide-y">
                  {rootItems.map((item) => (
                    <div key={item.lineId} className="px-1 py-0.5">
                      {renderLineItem(item)}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Person breakdown */}
            {(() => {
              const activePayers = personBreakdown.filter(pb => pb.subtotal > 0).sort((a, b) => b.subtotal - a.subtotal);
              if (activePayers.length === 0) return null;
              
              const visible = activePayers.slice(0, 5);
              const hiddenCount = activePayers.length - visible.length;
              
              return (
                <section className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Per-Person Breakdown
                  </p>
                  <div className="space-y-2">
                    {visible.map((pb) => (
                      <div
                        key={pb.person}
                        className="flex items-center justify-between rounded-xl bg-muted/30 border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-semibold">
                              {resolveGuestName
                                ? resolveGuestName(pb.person)
                                : pb.person}
                            </p>
                            {pb.paymentMethod && (
                              <p className="text-[10px] text-muted-foreground capitalize">
                                {pb.paymentMethod}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-bold tabular-nums">
                          ${pb.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {hiddenCount > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            Show {hiddenCount} more paying entities
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>All Paying Entities</DialogTitle>
                            <DialogDescription>Full breakdown of amounts owed by each person.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                            {activePayers.map((pb) => (
                              <div
                                key={pb.person}
                                className="flex items-center justify-between rounded-xl bg-muted/30 border px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                                  <div>
                                    <p className="text-xs font-semibold">
                                      {resolveGuestName
                                        ? resolveGuestName(pb.person)
                                        : pb.person}
                                    </p>
                                    {pb.paymentMethod && (
                                      <p className="text-[10px] text-muted-foreground capitalize">
                                        {pb.paymentMethod}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-sm font-bold tabular-nums">
                                  ${pb.subtotal.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </section>
              );
            })()}

            <Separator />

            {/* Total */}
            <section className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Subtotal</span>
              </div>
              <span className="text-xl font-bold tabular-nums">
                ${subtotal.toFixed(2)}
              </span>
            </section>
          </div>
        </div>

        <div className="px-5 py-4 border-t shrink-0">
          <Button
            variant="outline"
            className="w-full h-9"
            onClick={() => onOpenChange(false)}
          >
            Close Preview
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Step 1: Branch Selection ─────────────────────────────────────────────────

function StepSelectBranches({
  branches,
  activeBranch,
  targetBranch,
  setTargetBranch,
  selectedSources,
  setSelectedSources,
  isAlreadyMerged,
  onNext,
}: {
  branches: BranchMap;
  activeBranch: string;
  targetBranch: string;
  setTargetBranch: (b: string) => void;
  selectedSources: Set<string>;
  setSelectedSources: (s: Set<string>) => void;
  isAlreadyMerged: (sourceBranch: string, targetBranch: string) => boolean;
  onNext: () => void;
}) {
  const branchNames = Object.keys(branches).filter(b => b !== "system");
  const mainBranchName = useVCSStore.getState().mainActiveBranch();
  const availableSources = branchNames.filter((b) => b !== targetBranch);
  const mergeableSources = availableSources.filter(
    (b) => !isAlreadyMerged(b, targetBranch),
  );

  const toggleSource = (name: string) => {
    if (isAlreadyMerged(name, targetBranch)) return;
    const next = new Set(selectedSources);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedSources(next);
  };

  return (
    <div className="space-y-5 py-2">
      {/* Target */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Merge into (target)
        </label>
        <Select
          value={targetBranch}
          onValueChange={(v) => {
            setTargetBranch(v);
            setSelectedSources(new Set());
          }}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {branchNames.map((b) => {
              const isLocked =
                b !== mainBranchName && isAlreadyMerged(b, mainBranchName);
              return (
                <SelectItem key={b} value={b} disabled={isLocked}>
                  <div className="flex items-center gap-2 w-full">
                    <BranchBadge name={b} pointer={branches[b]} />
                    {b === activeBranch && (
                      <span className="text-[10px] text-muted-foreground">
                        (active)
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-[9px] text-muted-foreground/60 flex items-center gap-1 font-sans ml-auto">
                        <Lock className="w-2.5 h-2.5" /> merged to main
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Sources */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Source branches to merge in
        </label>
        <div className="rounded-xl border divide-y">
          {availableSources.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No other branches available
            </p>
          ) : (
            availableSources.map((b) => {
              const checked = selectedSources.has(b);
              const alreadyMerged = isAlreadyMerged(b, targetBranch);
              return (
                <div
                  key={b}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                    alreadyMerged
                      ? "opacity-60 cursor-not-allowed"
                      : `cursor-pointer ${checked ? "bg-primary/5" : "hover:bg-accent/40"}`
                  }`}
                  onClick={() => toggleSource(b)}
                >
                  <Checkbox
                    checked={checked}
                    disabled={alreadyMerged}
                    onCheckedChange={() => toggleSource(b)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 data-[state=checked]:border-primary"
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <BranchBadge name={b} pointer={branches[b]} />
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {branches[b].headHash?.slice(0, 7) ?? "no commits"}
                    </span>
                    {alreadyMerged && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] h-4 px-1.5 shrink-0"
                      >
                        Already merged
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {selectedSources.size > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {selectedSources.size} source branch
            {selectedSources.size !== 1 ? "es" : ""} selected
          </p>
        )}
        {mergeableSources.length === 0 && availableSources.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            All other branches are already merged into {targetBranch}.
          </p>
        )}
      </div>

      <Button
        onClick={onNext}
        disabled={selectedSources.size === 0 || mergeableSources.length === 0}
        className="w-full h-9 gap-2"
      >
        <GitMerge className="w-4 h-4" />
        Preview Merge
        <ChevronRight className="w-3 h-3 ml-auto" />
      </Button>
    </div>
  );
}

// ─── Step 2: Preview (compact — launches sub-dialogs) ─────────────────────────

function StepPreview({
  targetBranch,
  sourceBranches,
  preview,
  conflicts,
  onConflictChange,
  onConfirm,
  onBack,
  isCommitting,
  squashBeforeMerge,
  onSquashBeforeMergeChange,
  resolveGuestName,
}: {
  targetBranch: string;
  sourceBranches: string[];
  preview: MergePreview;
  conflicts: MergeConflict[];
  onConflictChange: (id: string, resolution: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  isCommitting: boolean;
  squashBeforeMerge: "none" | SquashType;
  onSquashBeforeMergeChange: (val: "none" | SquashType) => void;
  resolveGuestName?: (idOrName: string) => string;
}) {
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);

  const unresolvedCount = conflicts.filter((c) => !c.resolution).length;
  const canConfirm = unresolvedCount === 0 && !preview.isUpToDate;

  const targetDeltaCount = preview.deltasByBranch[targetBranch]?.length ?? 0;
  const sourceDeltaCounts = sourceBranches.map((sb) => ({
    branch: sb,
    count: preview.deltasByBranch[sb]?.length ?? 0,
  }));
  const rootItemCount = Object.values(preview.autoMergedState.items).filter(
    (i) => !i.parentLineId,
  ).length;

  return (
    <>
      <div className="space-y-4 py-1">
        {/* Merge summary header */}
        <div className="rounded-xl bg-muted/40 border px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {sourceBranches.map((sb, i) => (
              <React.Fragment key={sb}>
                <span className="text-xs font-mono font-semibold">{sb}</span>
                {i < sourceBranches.length - 1 && (
                  <span className="text-muted-foreground text-xs">+</span>
                )}
              </React.Fragment>
            ))}
            <GitMerge className="w-3.5 h-3.5 text-muted-foreground mx-1" />
            <span className="text-xs font-mono font-semibold">
              {targetBranch}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {preview.isFastForward && (
              <Badge className="text-[10px] h-5 bg-sky-500 hover:bg-sky-500 gap-1">
                <Zap className="w-2.5 h-2.5" /> Fast-forward
              </Badge>
            )}
            {preview.isUpToDate && (
              <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                Already up to date
              </Badge>
            )}
            {preview.lcaHash && (
              <span className="text-[10px] text-muted-foreground font-mono">
                LCA: {preview.lcaHash.slice(0, 7)}
              </span>
            )}
          </div>
        </div>

        {/* Delta pool summary */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Delta pools
          </p>
          <div className="rounded-xl border divide-y">
            <div className="flex items-center justify-between text-[10px] px-3 py-1.5">
              <span className="font-mono">{targetBranch}</span>
              <span className="text-muted-foreground">
                {targetDeltaCount} delta{targetDeltaCount !== 1 ? "s" : ""}{" "}
                <span className="text-foreground/40">(target)</span>
              </span>
            </div>
            {sourceDeltaCounts.map(({ branch, count }) => (
              <div
                key={branch}
                className="flex items-center justify-between text-[10px] px-3 py-1.5"
              >
                <span className="font-mono">{branch}</span>
                <span className="text-muted-foreground">
                  {count} delta{count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Squash before merge configuration */}
        <div className="rounded-xl border p-3 space-y-2.5 bg-card/50">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ChevronsUpDown className="w-3.5 h-3.5 text-sky-500" />
            Squash source commits before merging
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["none", SquashType.Light, SquashType.Full] as const).map((type) => {
              const label = MERGE_SQUASH_DESCRIPTIONS[type].label;
              const desc = type === "none" ? "Merge as-is" : type === SquashType.Light ? "Prune net-zero" : "Compress range";
              const isSelected = squashBeforeMerge === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onSquashBeforeMergeChange(type)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isSelected
                      ? "border-sky-500 bg-sky-500/5 font-semibold text-sky-600 shadow-sm"
                      : "border-border bg-background opacity-70 hover:opacity-100 text-muted-foreground"
                  }`}
                >
                  <div className="text-[10px] font-bold">{label}</div>
                  <div className="text-[8px] opacity-75 mt-0.5 leading-normal">{desc}</div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal mt-1">
            {MERGE_SQUASH_DESCRIPTIONS[squashBeforeMerge].desc}
          </p>
        </div>

        {/* Two action buttons — each opens its own popup */}
        <div className="grid grid-cols-2 gap-2">
          {/* Merged State Preview */}
          <button
            type="button"
            onClick={() => setPreviewSheetOpen(true)}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 px-3 py-4 text-center transition-all cursor-pointer"
          >
            <Eye className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                View Order
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {rootItemCount} item{rootItemCount !== 1 ? "s" : ""}
              </p>
            </div>
          </button>

          {/* Conflicts */}
          <button
            type="button"
            onClick={() => setConflictsOpen(true)}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-all cursor-pointer ${
              conflicts.length === 0
                ? "border-emerald-300/50 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/10"
                : unresolvedCount > 0
                  ? "border-amber-400/60 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/10"
                  : "border-emerald-300/50 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/10"
            }`}
          >
            {conflicts.length === 0 || unresolvedCount === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <p className="text-xs font-semibold text-foreground">Conflicts</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {conflicts.length === 0
                  ? "None"
                  : unresolvedCount > 0
                    ? `${unresolvedCount} unresolved`
                    : "All resolved"}
              </p>
            </div>
          </button>
        </div>

        {/* Status line */}
        {conflicts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              Clean merge — no conflicts
            </p>
          </div>
        ) : preview.isUpToDate ? (
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 border px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground font-medium">
              Selected branches are already merged into {targetBranch}
            </p>
          </div>
        ) : unresolvedCount > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <TriangleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              {unresolvedCount} conflict{unresolvedCount !== 1 ? "s" : ""} need
              resolution before merging
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              All conflicts resolved — ready to merge
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-9" onClick={onBack}>
            Back
          </Button>
          <Button
            size="sm"
            className="h-9 flex-1 gap-2"
            onClick={onConfirm}
            disabled={!canConfirm || isCommitting}
          >
            {isCommitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Merging…
              </>
            ) : (
              <>
                <GitMerge className="w-3.5 h-3.5" /> Confirm Merge
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sub-dialogs — rendered here so they overlay on top of the main dialog */}
      <ConflictsDialog
        open={conflictsOpen}
        onOpenChange={setConflictsOpen}
        conflicts={conflicts}
        onConflictChange={onConflictChange}
        autoMergedState={preview.autoMergedState}
      />

      <MergedStateSheet
        open={previewSheetOpen}
        onOpenChange={setPreviewSheetOpen}
        state={preview.autoMergedState}
        targetBranch={targetBranch}
        sourceBranches={sourceBranches}
        resolveGuestName={resolveGuestName}
      />
    </>
  );
}

// ─── Step 3: Done ─────────────────────────────────────────────────────────────

function StepDone({
  mergeCommitHash,
  sourceBranches,
  targetBranch,
  onClose,
}: {
  mergeCommitHash: string;
  sourceBranches: string[];
  targetBranch: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
          <GitMerge className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">Merge committed</p>
          <p className="text-xs text-muted-foreground mt-1">
            {sourceBranches.join(" + ")} → {targetBranch}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-3 space-y-2 font-mono text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">commit</span>
          <span className="text-foreground">
            {mergeCommitHash.slice(0, 12)}
          </span>
        </div>
        <div className="flex items-start justify-between">
          <span className="text-muted-foreground">merge_parent_hashes</span>
          <span className="text-foreground text-right">
            [{sourceBranches.length}]
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">branch</span>
          <span className="text-foreground">{targetBranch}</span>
        </div>
      </div>

      <Button className="w-full h-9" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function MergeBranchDialog({
  open,
  onOpenChange,
  branches,
  activeBranch,
  isAlreadyMerged,
  onPreview,
  onCommit,
  resolveGuestName,
}: MergeDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [targetBranch, setTargetBranch] = useState<string>(activeBranch === "system" ? "main" : activeBranch);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(),
  );
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
  const [mergeCommitHash, setMergeCommitHash] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [squashBeforeMerge, setSquashBeforeMerge] = useState<"none" | SquashType>("none");

  useEffect(() => {
    if (open) {
      const mainBranchName = useVCSStore.getState().mainActiveBranch();
      const isTargetLocked =
        (activeBranch !== mainBranchName && isAlreadyMerged(activeBranch, mainBranchName)) || activeBranch === "system";
      setStep("select");
      setTargetBranch(isTargetLocked ? mainBranchName : activeBranch);
      setSelectedSources(new Set());
      setPreview(null);
      setConflicts([]);
      setMergeCommitHash("");
      setSquashBeforeMerge("none");
    }
  }, [open, activeBranch, isAlreadyMerged]);

  const sourceBranches = useMemo(
    () => Array.from(selectedSources),
    [selectedSources],
  );

  const runPreview = (sources: string[], target: string) => {
    const result = onPreview(sources, target);
    setPreview(result);
    const mapped = result.conflicts.map((c) => {
      const isIdentical = areDeltasIdentical(
        c.deltaA,
        c.deltaB,
        result.autoMergedState,
      );
      return {
        ...c,
        resolution: isIdentical ? c.branchA : null,
      };
    });
    setConflicts(mapped);
    setStep("preview");
  };

  const handlePreview = () => {
    if (sourceBranches.length === 0) return;
    runPreview(sourceBranches, targetBranch);
  };

  const mainBranchName = useVCSStore.getState().mainActiveBranch();
  const canQuickPreviewToMain =
    step === "select" &&
    activeBranch !== mainBranchName &&
    branches[mainBranchName] !== undefined &&
    !isAlreadyMerged(activeBranch, mainBranchName);

  const handleQuickPreviewToMain = () => {
    setTargetBranch(mainBranchName);
    setSelectedSources(new Set([activeBranch]));
    runPreview([activeBranch], mainBranchName);
  };

  const handleConflictChange = (id: string, resolution: string) => {
    setConflicts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolution } : c)),
    );
  };

  const handleCommit = () => {
    if (!preview) return;
    setIsCommitting(true);
    const resolutionDeltas: Delta[] = conflicts
      .filter((c) => c.resolution !== null)
      .map((c) => (c.resolution === c.branchA ? c.deltaA : c.deltaB));
    try {
      // Squash each source branch's pending commits before merging
      if (squashBeforeMerge !== "none") {
        const engine = useVCSStore.getState().engine;
        const confirmedHash = engine.getConfirmedHash();
        for (const srcBranch of sourceBranches) {
          const branchHead = engine.getRepo().branches[srcBranch]?.headHash;
          if (!branchHead) continue;
          // Walk back to find the first pending (non-confirmed) commit
          const log = engine.getRepo().log;
          const commitByHash = new Map(log.map((c) => [c.commitHash, c]));
          let firstPendingHash: string | null = null;
          let cur: string | null = branchHead;
          while (cur) {
            const c = commitByHash.get(cur);
            if (!c) break;

            // Stop walking back if we hit a confirmed commit (e.g. branch point from main)
            if (
              confirmedHash &&
              (c.commitHash === confirmedHash ||
                engine.isAncestorOf(c.commitHash, confirmedHash))
            ) {
              break;
            }

            // Also stop if we hit any system initialization commits
            if (
              c.mergeParentHashes.length > 0 ||
              c.authorId.startsWith("system-")
            ) {
              break;
            }

            firstPendingHash = c.commitHash;
            cur = c.parentHash;
          }
          if (firstPendingHash && firstPendingHash !== branchHead) {
            try {
              engine.squashPendingCommits(firstPendingHash, squashBeforeMerge as SquashType, srcBranch);
            } catch {
              // Non-fatal: squash may fail for single-commit branches or if already squashed
            }
          }
        }
        // Re-run preview with squashed branches so delta counts are accurate
        // (merge itself is idempotent from the state perspective)
      }
      onCommit(sourceBranches, targetBranch, resolutionDeltas);
      setMergeCommitHash(`merge-${Date.now().toString(16)}`);
      setStep("done");
    } finally {
      setIsCommitting(false);
    }
  };

  const stepTitle = {
    select: "Merge Branches",
    preview: "Merge Preview",
    done: "Merge Complete",
  }[step];

  const stepDescription = {
    select: "Select which branches to merge together.",
    preview:
      "Review deltas, inspect the merged order, and resolve any conflicts.",
    done: "The merge commit has been recorded in the ledger.",
  }[step];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-120 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-primary" />
            {stepTitle}
          </DialogTitle>
          <DialogDescription>{stepDescription}</DialogDescription>
        </DialogHeader>

        {/* Quick merge to main shortcut */}
        {canQuickPreviewToMain && (
          <button
            onClick={handleQuickPreviewToMain}
            className="flex items-center gap-2 w-full rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 px-3 py-2 text-left transition-colors group shrink-0"
          >
            <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary leading-tight">
                Quick preview: {activeBranch} → {mainBranchName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Skip selection and preview this merge now
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-primary/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-1 shrink-0">
          {(["select", "preview", "done"] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step === s
                  ? "bg-primary"
                  : (step === "preview" && s === "select") || step === "done"
                    ? "bg-primary/30"
                    : "bg-muted"
              }`}
            />
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0 -mx-1 px-1">
          {step === "select" && (
            <StepSelectBranches
              branches={branches}
              activeBranch={activeBranch}
              targetBranch={targetBranch}
              setTargetBranch={setTargetBranch}
              selectedSources={selectedSources}
              setSelectedSources={setSelectedSources}
              isAlreadyMerged={isAlreadyMerged}
              onNext={handlePreview}
            />
          )}

          {step === "preview" && preview && (
            <StepPreview
              targetBranch={targetBranch}
              sourceBranches={sourceBranches}
              preview={preview}
              conflicts={conflicts}
              onConflictChange={handleConflictChange}
              onConfirm={handleCommit}
              onBack={() => setStep("select")}
              isCommitting={isCommitting}
              squashBeforeMerge={squashBeforeMerge}
              onSquashBeforeMergeChange={setSquashBeforeMerge}
              resolveGuestName={resolveGuestName}
            />
          )}

          {step === "done" && (
            <StepDone
              mergeCommitHash={mergeCommitHash}
              sourceBranches={sourceBranches}
              targetBranch={targetBranch}
              onClose={() => onOpenChange(false)}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
