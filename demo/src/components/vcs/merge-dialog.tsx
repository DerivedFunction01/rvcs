"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useVCSStore } from "@/store/vcs-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
} from "lucide-react";
import type {
  BranchMap,
  MergePreview,
  MergeConflict,
  Delta,
  ProjectedState,
  ProjectedLineItem,
} from "@/lib/vcs/types";

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
}

type Step = "select" | "preview" | "done";

// ─── Small Helpers ────────────────────────────────────────────────────────────

function conflictLabel(c: MergeConflict): string {
  switch (c.type) {
    case "add_add":
      return `Same item ID, different content (lineId: ${c.lineId?.slice(0, 8)})`;
    case "remove_modify_sku":
      return `Item removed vs SKU changed (lineId: ${c.lineId?.slice(0, 8)})`;
    case "remove_modify_alloc":
      return `Item removed vs allocation changed (lineId: ${c.lineId?.slice(0, 8)})`;
    case "modify_sku_sku":
      return `SKU changed to different values (lineId: ${c.lineId?.slice(0, 8)})`;
    case "alloc_alloc":
      return `Allocation edited on both branches (id: ${c.allocationId?.slice(0, 8)})`;
    case "modify_alloc_alloc":
      return `Allocations changed differently (lineId: ${c.lineId?.slice(0, 8)})`;
  }
}

function deltaDescription(delta: Delta, branch: string): string {
  switch (delta.action) {
    case "add_item":
      return `Add item (${delta.sku})`;
    case "remove_item":
      return `Remove item`;
    case "modify_sku":
      return `SKU → ${delta.afterSku}`;
    case "modify_item_allocations":
      return `Reallocate item`;
    case "declare_allocation":
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
}: {
  conflict: MergeConflict;
  onChange: (id: string, resolution: string) => void;
}) {
  const options = [
    { branch: conflict.branchA, delta: conflict.deltaA },
    { branch: conflict.branchB, delta: conflict.deltaB },
  ];

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
          <p className="text-xs font-semibold text-foreground leading-tight">
            {conflictLabel(conflict)}
          </p>
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
        if (delta.action === "add_item" && delta.lineId === lineId) {
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
  const unresolvedCount = conflicts.filter((c) => !c.resolution).length;

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
    }
  }, [open]);

  const activeConflict = conflicts[activeIndex];
  const affectedItem = activeConflict
    ? findItemForConflict(activeConflict, autoMergedState)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] flex flex-col">
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

        <div className="space-y-4 py-2">
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
                />
              )}

              {/* Affected Item Details */}
              {affectedItem && (
                <div className="rounded-xl border bg-muted/40 p-3 flex items-center justify-between gap-3 shadow-xs">
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
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-foreground">
                      ${affectedItem.price.toFixed(2)}
                    </span>
                  </div>
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
                    <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[200px] sm:max-w-[240px]">
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

        <div className="pt-2 border-t">
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  state: ProjectedState;
  targetBranch: string;
  sourceBranches: string[];
}) {
  const rootItems = Object.values(state.items).filter((i) => !i.parentLineId);
  const { subtotal, personBreakdown } = state.financials;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
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

        <ScrollArea className="flex-1">
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
            {personBreakdown.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Per-Person Breakdown
                </p>
                <div className="space-y-2">
                  {personBreakdown.map((pb) => (
                    <div
                      key={pb.person}
                      className="flex items-center justify-between rounded-xl bg-muted/30 border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-semibold">{pb.person}</p>
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
              </section>
            )}

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
        </ScrollArea>

        <div className="px-5 py-4 border-t">
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
  const branchNames = Object.keys(branches);
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
              const isLocked = b !== mainBranchName && isAlreadyMerged(b, mainBranchName);
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
}: {
  targetBranch: string;
  sourceBranches: string[];
  preview: MergePreview;
  conflicts: MergeConflict[];
  onConflictChange: (id: string, resolution: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  isCommitting: boolean;
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
}: MergeDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [targetBranch, setTargetBranch] = useState<string>(activeBranch);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(),
  );
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
  const [mergeCommitHash, setMergeCommitHash] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    if (open) {
      const mainBranchName = useVCSStore.getState().mainActiveBranch();
      const isTargetLocked =
        activeBranch !== mainBranchName &&
        isAlreadyMerged(activeBranch, mainBranchName);
      setStep("select");
      setTargetBranch(isTargetLocked ? mainBranchName : activeBranch);
      setSelectedSources(new Set());
      setPreview(null);
      setConflicts([]);
      setMergeCommitHash("");
    }
  }, [open, activeBranch, isAlreadyMerged]);

  const sourceBranches = useMemo(
    () => Array.from(selectedSources),
    [selectedSources],
  );

  const handlePreview = () => {
    if (sourceBranches.length === 0) return;
    const result = onPreview(sourceBranches, targetBranch);
    setPreview(result);
    setConflicts(result.conflicts.map((c) => ({ ...c, resolution: null })));
    setStep("preview");
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
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-primary" />
            {stepTitle}
          </DialogTitle>
          <DialogDescription>{stepDescription}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-1">
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

        <ScrollArea className="flex-1 -mx-1 px-1">
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
