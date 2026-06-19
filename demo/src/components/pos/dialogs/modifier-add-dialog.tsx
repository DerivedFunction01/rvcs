"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CatalogItemEntry, ProjectedLineItem } from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import { Loader2, Minus, Pencil, Plus, Search, Trash2, CheckCircle2 } from "lucide-react";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { NumberPadDialog } from "./number-pad-dialog";

interface ModifierAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  modifiers: CatalogItemEntry[];
  onAdd: (sku: string, defaultState?: string, targetLineIds?: string[]) => void;
  onRemove: (sku: string, targetLineIds?: string[]) => void;
  onUpdateState?: (
    sku: string,
    newState?: string,
    targetLineIds?: string[],
  ) => void;
  onUpdateInlineQty?: (
    sku: string,
    change: number,
    targetLineIds?: string[],
  ) => void;
  parentItems?: ProjectedLineItem[];
}

export function ModifierAddDialog({
  open,
  onOpenChange,
  itemName,
  modifiers,
  onAdd,
  onRemove,
  onUpdateState,
  onUpdateInlineQty,
  parentItems,
}: ModifierAddDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [actionPrompt, setActionPrompt] = useState<{
    sku: string;
    defaultState?: string;
  } | null>(null);
  const [qtyPadTarget, setQtyPadTarget] = useState<string | null>(null);
  const [lastTouchedSku, setLastTouchedSku] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const catalog = useVCSStore((s) => s.catalog);
  const formatNumber = useFormatNumber();

  const modifierStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        appliedCount: number;
        canAddCount: number;
        totalParents: number;
        allowDuplicates: boolean;
        itemsWithoutIt: string[];
        itemsWithIt: string[];
        appliedStates: Set<string>;
        currentInlineQty: number | null;
      }
    >();
    if (!parentItems || parentItems.length === 0) return stats;

    for (const mod of modifiers) {
      let appliedCount = 0;
      let canAddCount = 0;
      const itemsWithoutIt: string[] = [];
      const itemsWithIt: string[] = [];
      const appliedStates = new Set<string>();
      let currentInlineQty: number | null = null;

      for (const parent of parentItems) {
        const parentEntry = catalog[parent.sku];
        const modConfig = parentEntry?.modifierConfigs?.find(
          (c) => c.modifierSku === mod.sku,
        );
        const allowDuplicates = modConfig?.allowDuplicates ?? false;

        const modChildren = parent.children.filter((c) => c.sku === mod.sku);
        const hasMod = modChildren.length > 0;

        if (hasMod) {
          appliedCount++;
          itemsWithIt.push(parent.lineId);
          for (const c of modChildren) {
            if (c.selectedModifierState)
              appliedStates.add(c.selectedModifierState);
            if (currentInlineQty === null) currentInlineQty = c.inlineQty ?? 1;
          }
        } else {
          itemsWithoutIt.push(parent.lineId);
        }

        if (!allowDuplicates) {
          if (!hasMod) canAddCount++;
        } else {
          canAddCount++;
        }
      }

      const parentEntryFallback = catalog[parentItems[0]?.sku];
      const modConfigFallback = parentEntryFallback?.modifierConfigs?.find(
        (c) => c.modifierSku === mod.sku,
      );
      const allowDuplicates = modConfigFallback?.allowDuplicates ?? false;

      stats.set(mod.sku, {
        appliedCount,
        canAddCount,
        totalParents: parentItems.length,
        allowDuplicates,
        itemsWithoutIt,
        itemsWithIt,
        appliedStates,
        currentInlineQty,
      });
    }
    return stats;
  }, [modifiers, parentItems, catalog]);

  // Filter modifiers by search query
  const filtered = useMemo(() => {
    return modifiers.filter(
      (m) =>
        m.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        m.sku.toLowerCase().includes(debouncedQuery.toLowerCase()),
    );
  }, [modifiers, debouncedQuery]);

  // Reset search when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setDebouncedQuery("");
      setActionPrompt(null);
      setLastTouchedSku(null);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const lastTouchedMod = useMemo(() => {
    if (!lastTouchedSku) return null;
    return modifiers.find((m) => m.sku === lastTouchedSku) || null;
  }, [modifiers, lastTouchedSku]);

  // Auto-select first modifier if none selected
  useEffect(() => {
    if (open && filtered.length > 0 && !lastTouchedSku) {
      setLastTouchedSku(filtered[0].sku);
    }
  }, [open, filtered, lastTouchedSku]);

  // Helper values for active modifier
  const activeStats = lastTouchedMod
    ? modifierStats.get(lastTouchedMod.sku)
    : null;
  const isApplied = activeStats ? activeStats.appliedCount > 0 : false;
  const hasInlineQty =
    lastTouchedMod?.inlineQtyType && lastTouchedMod.inlineQtyType !== "none";
  const inlineStep =
    lastTouchedMod?.inlineQtyIncrement ??
    (lastTouchedMod?.inlineQtyType === "float" ? 0.05 : 1);
  const inlineQtyLabel =
    lastTouchedMod?.inlineQtyLabel ??
    (lastTouchedMod?.inlineQtyType === "int"
      ? "Count"
      : lastTouchedMod?.inlineQtyType === "float"
        ? "Measure"
        : "Qty");
  const inlineQtyUnit =
    lastTouchedMod?.inlineQtyUnit ??
    (lastTouchedMod?.inlineQtyType === "float" ? "units" : "");

  const precision = useMemo(() => {
    if (!inlineStep || !Number.isFinite(inlineStep)) return 0;
    const text = inlineStep.toString();
    if (text.includes("e-")) {
      const match = text.match(/e-(\d+)$/);
      return match ? Number(match[1]) : 0;
    }
    const decimals = text.split(".")[1];
    return decimals ? decimals.length : 0;
  }, [inlineStep]);

  const formatInlineQty = (value: number) =>
    formatNumber(value, precision > 0 ? precision : 0);

  const defaultState =
    lastTouchedMod?.allowedStates?.find(
      (s) => s.state === "Add" || s.state === "With",
    )?.state ||
    lastTouchedMod?.allowedStates?.[0]?.state ||
    undefined;

  // Handle modifier grid item click
  const handleModClick = (mod: CatalogItemEntry) => {
    setLastTouchedSku(mod.sku);
    const stats = modifierStats.get(mod.sku);
    const isModFullyApplied =
      stats &&
      stats.appliedCount === stats.totalParents &&
      !stats.allowDuplicates;
    const modDefaultState =
      mod.allowedStates?.find((s) => s.state === "Add" || s.state === "With")
        ?.state ||
      mod.allowedStates?.[0]?.state ||
      undefined;

    if (stats && stats.totalParents === 1) {
      if (stats.appliedCount === 0) {
        onAdd(mod.sku, modDefaultState);
      } else if (stats.allowDuplicates) {
        setActionPrompt({ sku: mod.sku, defaultState: modDefaultState });
      }
    } else {
      if (stats && stats.appliedCount === 0) {
        onAdd(mod.sku, modDefaultState);
      } else if (
        (!isModFullyApplied || stats?.allowDuplicates) &&
        mod.allowedStates?.length === 0
      ) {
        setActionPrompt({ sku: mod.sku, defaultState: modDefaultState });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-4 md:p-6 overflow-hidden">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Modifiers
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select modifiers to customize{" "}
            <span className="font-semibold text-foreground">{itemName}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* 3-Column Layout */}
        <div className="flex flex-row gap-4 flex-1 min-h-0 mt-3 overflow-hidden">
          {/* Column 1: Modifiers Grid (Left) */}
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {/* Search Box */}
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search modifiers (e.g. Cheese, Onions...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 text-xs w-full h-9"
              />
              {searchQuery !== debouncedQuery && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Modifier Grid - Collapse Border Layout */}
            <div className="flex-1 overflow-y-auto pr-1 border-t border-l">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground border-b border-r">
                  No matching modifiers found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-0">
                  {filtered.map((mod) => {
                    const stats = modifierStats.get(mod.sku);
                    const isSelected = lastTouchedSku === mod.sku;

                    let displayPrice = mod.basePrice;
                    let isMixedPrice = false;
                    const isModApplied = stats && stats.appliedCount > 0;

                    if (isModApplied && parentItems) {
                      let uniquePrice: number | null = null;
                      parentItems.forEach((parent) => {
                        const modChildren = parent.children.filter(
                          (c) => c.sku === mod.sku,
                        );
                        modChildren.forEach((child) => {
                          let childPrice = mod.basePrice;
                          if (child.selectedModifierState) {
                            const stateOpt = mod.allowedStates?.find(
                              (s) => s.state === child.selectedModifierState,
                            );
                            if (
                              stateOpt &&
                              stateOpt.priceOverride !== null &&
                              stateOpt.priceOverride !== undefined
                            ) {
                              childPrice = stateOpt.priceOverride;
                            }
                          }
                          if (uniquePrice === null) {
                            uniquePrice = childPrice;
                          } else if (uniquePrice !== childPrice) {
                            isMixedPrice = true;
                          }
                        });
                      });

                      if (!isMixedPrice && uniquePrice !== null) {
                        displayPrice = uniquePrice;
                      }
                    }

                    return (
                      <ModifierGridItem
                        key={mod.sku}
                        mod={mod}
                        stats={stats}
                        isSelected={isSelected}
                        isMixedPrice={isMixedPrice}
                        displayPrice={displayPrice}
                        formatNumber={formatNumber}
                        onClick={() => handleModClick(mod)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Vertical Options Bar (Middle) */}
          <div className="w-32 shrink-0 flex flex-col px-0 h-full overflow-y-auto bg-muted/5 border-l border-r">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block text-center mb-2 mt-1">
              Options
            </span>
            {lastTouchedMod &&
            lastTouchedMod.allowedStates &&
            lastTouchedMod.allowedStates.length > 0 ? (
              <div className="flex flex-col gap-0 w-full border-t">
                {lastTouchedMod.allowedStates.map((stateOpt) => {
                  const priceDiff =
                    stateOpt.priceOverride !== null &&
                    stateOpt.priceOverride !== undefined
                      ? stateOpt.priceOverride - lastTouchedMod.basePrice
                      : 0;

                  const isStateApplied = activeStats?.appliedStates.has(
                    stateOpt.state,
                  );

                  return (
                    <Button
                      key={stateOpt.state}
                      variant={isStateApplied ? "default" : "outline"}
                      className={`h-14 px-2 w-full text-xs font-bold flex flex-col gap-0.5 justify-center rounded-none border-b border-t-0 border-x-0 ${
                        isStateApplied
                          ? stateOpt.state === "NO" ||
                            stateOpt.state === "LESS" ||
                            stateOpt.state === "REMOVE" ||
                            stateOpt.state === "EXCLUDE"
                            ? "bg-destructive text-white hover:bg-destructive/90"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-background hover:bg-muted"
                      }`}
                      onClick={() => {
                        if (!parentItems) return;
                        const itemsWithThisState =
                          parentItems.filter((p) =>
                            p.children.some(
                              (c) =>
                                c.sku === lastTouchedMod.sku &&
                                c.selectedModifierState === stateOpt.state,
                            ),
                          ) || [];

                        if (activeStats && activeStats.appliedCount === 0) {
                          onAdd(lastTouchedMod.sku, stateOpt.state);
                        } else if (
                          activeStats &&
                          activeStats.totalParents > 1
                        ) {
                          const isFullyApplied =
                            activeStats.appliedCount ===
                              activeStats.totalParents &&
                            !activeStats.allowDuplicates;
                          if (
                            isFullyApplied &&
                            itemsWithThisState.length === 0
                          ) {
                            if (onUpdateState)
                              onUpdateState(lastTouchedMod.sku, stateOpt.state);
                            else onAdd(lastTouchedMod.sku, stateOpt.state);
                          } else {
                            setActionPrompt({
                              sku: lastTouchedMod.sku,
                              defaultState: stateOpt.state,
                            });
                          }
                        } else {
                          if (
                            itemsWithThisState.length > 0 ||
                            activeStats?.allowDuplicates
                          ) {
                            setActionPrompt({
                              sku: lastTouchedMod.sku,
                              defaultState: stateOpt.state,
                            });
                          } else {
                            if (onUpdateState)
                              onUpdateState(lastTouchedMod.sku, stateOpt.state);
                            else onAdd(lastTouchedMod.sku, stateOpt.state);
                          }
                        }
                      }}
                    >
                      <span className="truncate">{stateOpt.state}</span>
                      {priceDiff !== 0 && (
                        <span className="opacity-80 font-mono text-[9px] font-normal">
                          {priceDiff > 0 ? "+" : ""}$
                          {formatNumber(priceDiff, 2)}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-2 border-t">
                <span className="text-[10px] text-muted-foreground/60 italic">
                  No options available
                </span>
              </div>
            )}
          </div>

          {/* Column 3: Active Check Preview & Actions (Right) */}
          <div className="w-[300px] md:w-[350px] shrink-0 flex flex-col h-full pl-1">
            {/* Active Check Preview Container */}
            <div className="flex-1 min-h-0 overflow-y-auto mb-3">
              <ActiveCheckPreview
                parentItems={parentItems || []}
                lastTouchedSku={lastTouchedSku}
                setLastTouchedSku={setLastTouchedSku}
                formatNumber={formatNumber}
              />
            </div>

            {/* Active Modifier Info Panel */}
            {lastTouchedMod && (
              <div className="p-2 border border-b-0 bg-muted/30 text-xs flex justify-between items-center rounded-t-lg">
                <div className="truncate pr-2">
                  <div className="font-semibold truncate text-foreground">
                    {lastTouchedMod.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {lastTouchedMod.sku}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {hasInlineQty && (
                    <div className="font-mono text-primary font-bold">
                      {isApplied
                        ? formatInlineQty(activeStats?.currentInlineQty ?? 1)
                        : "0"}{" "}
                      {inlineQtyUnit}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    {inlineQtyLabel}
                  </div>
                </div>
              </div>
            )}

            {/* 2x3 Action Grid - Seamless Borders */}
            <div className="grid grid-cols-3 gap-0 shrink-0 border-t border-l">
              {/* Row 1, Col 1: Plus Button */}
              <Button
                variant="outline"
                className="h-14 flex flex-col gap-0.5 items-center justify-center rounded-none border-r border-b border-t-0 border-l-0"
                disabled={
                  !lastTouchedMod ||
                  (!hasInlineQty &&
                    !activeStats?.allowDuplicates &&
                    activeStats?.appliedCount === activeStats?.totalParents)
                }
                onClick={() => {
                  if (!lastTouchedMod) return;
                  if (!isApplied) {
                    onAdd(lastTouchedMod.sku, defaultState);
                  } else {
                    if (hasInlineQty && onUpdateInlineQty) {
                      onUpdateInlineQty(lastTouchedMod.sku, inlineStep);
                    } else if (activeStats?.allowDuplicates) {
                      setActionPrompt({
                        sku: lastTouchedMod.sku,
                        defaultState,
                      });
                    }
                  }
                }}
              >
                <Plus className="w-5 h-5 text-primary" />
                <span className="text-[9px] uppercase font-bold text-muted-foreground">
                  Add / +
                </span>
              </Button>

              {/* Row 1, Col 2: Minus Button */}
              <Button
                variant="outline"
                className="h-14 flex flex-col gap-0.5 items-center justify-center rounded-none border-r border-b border-t-0 border-l-0"
                disabled={!lastTouchedMod || !isApplied || !hasInlineQty}
                onClick={() => {
                  if (
                    lastTouchedMod &&
                    isApplied &&
                    hasInlineQty &&
                    onUpdateInlineQty
                  ) {
                    onUpdateInlineQty(lastTouchedMod.sku, -inlineStep);
                  }
                }}
              >
                <Minus className="w-5 h-5 text-muted-foreground" />
                <span className="text-[9px] uppercase font-bold text-muted-foreground">
                  Minus / -
                </span>
              </Button>

              {/* Row 1, Col 3: Qty / Measurement Pad */}
              <Button
                variant="outline"
                className="h-14 flex flex-col gap-0.5 items-center justify-center rounded-none border-r border-b border-t-0 border-l-0"
                disabled={!lastTouchedMod || !isApplied || !hasInlineQty}
                onClick={() => {
                  if (lastTouchedSku) setQtyPadTarget(lastTouchedSku);
                }}
              >
                <span className="text-sm font-mono font-bold">
                  {isApplied && hasInlineQty
                    ? formatInlineQty(activeStats?.currentInlineQty ?? 1)
                    : "—"}
                </span>
                <span className="text-[9px] uppercase font-bold text-muted-foreground">
                  Set Qty
                </span>
              </Button>

              {/* Row 2, Col 1: Trash / Remove */}
              <Button
                variant="outline"
                className="h-14 flex flex-col gap-0.5 items-center justify-center text-destructive hover:bg-destructive/5 hover:text-destructive rounded-none border-r border-b border-t-0 border-l-0"
                disabled={!lastTouchedMod || !isApplied}
                onClick={(e) => {
                  e.stopPropagation();
                  if (lastTouchedMod && activeStats) {
                    onRemove(lastTouchedMod.sku, activeStats.itemsWithIt);
                  }
                }}
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-[9px] uppercase font-bold">Remove</span>
              </Button>

              {/* Row 2, Col 2: Search */}
              <Button
                variant="outline"
                className="h-14 flex flex-col gap-0.5 items-center justify-center rounded-none border-r border-b border-t-0 border-l-0"
                onClick={() => {
                  searchInputRef.current?.focus();
                  searchInputRef.current?.select();
                }}
              >
                <Search className="w-5 h-5 text-muted-foreground" />
                <span className="text-[9px] uppercase font-bold text-muted-foreground">
                  Search
                </span>
              </Button>

              {/* Row 2, Col 3: Done */}
              <Button
                variant="default"
                className="h-14 flex flex-col gap-0.5 items-center justify-center font-bold rounded-none border-r border-b border-t-0 border-l-0"
                onClick={() => onOpenChange(false)}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-[9px] uppercase font-bold">Done</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Dialogs for collisions/number pad */}
        {actionPrompt &&
          (() => {
            const mod = modifiers.find((m) => m.sku === actionPrompt.sku);
            if (!mod) return null;
            const stats = modifierStats.get(actionPrompt.sku);
            const targetState = actionPrompt.defaultState;
            const itemsWithSpecificState =
              parentItems?.filter((p) =>
                p.children.some(
                  (c) =>
                    c.sku === mod.sku &&
                    c.selectedModifierState === targetState,
                ),
              ) || [];
            const specificStateCount = itemsWithSpecificState.length;

            return ModifierCollisionDialog(
              actionPrompt,
              setActionPrompt,
              mod,
              stats,
              onUpdateState,
              onAdd,
              parentItems,
              specificStateCount,
              onRemove,
              itemsWithSpecificState,
              targetState,
            );
          })()}

        {qtyPadTarget &&
          (() => {
            const mod = modifiers.find((m) => m.sku === qtyPadTarget);
            if (!mod) return null;
            const stats = modifierStats.get(qtyPadTarget);
            const step =
              mod.inlineQtyIncrement ??
              (mod.inlineQtyType === "float" ? 0.05 : 1);
            return (
              <NumberPadDialog
                open={qtyPadTarget !== null}
                onOpenChange={(isOpen) => {
                  if (!isOpen) setQtyPadTarget(null);
                }}
                title="Measurement"
                description={`Set the measurement for ${mod.name}`}
                initialValue={stats?.currentInlineQty ?? 1}
                min={step}
                increment={step}
                onConfirm={(val) => {
                  if (onUpdateInlineQty) {
                    const current = stats?.currentInlineQty ?? 1;
                    onUpdateInlineQty(mod.sku, val - current);
                  }
                }}
              />
            );
          })()}
      </DialogContent>
    </Dialog>
  );
}

// Extracted Sub-component for individual Modifier Grid Items (maintains sharp flat border look)
interface ModifierGridItemProps {
  mod: CatalogItemEntry;
  stats: any;
  isSelected: boolean;
  isMixedPrice: boolean;
  displayPrice: number;
  formatNumber: (n: number, decimals?: number) => string;
  onClick: () => void;
}

function ModifierGridItem({
  mod,
  stats,
  isSelected,
  isMixedPrice,
  displayPrice,
  formatNumber,
  onClick,
}: ModifierGridItemProps) {
  const isFullyApplied =
    stats &&
    stats.appliedCount === stats.totalParents &&
    !stats.allowDuplicates;
  const isPartiallyApplied =
    stats && stats.appliedCount > 0 && stats.appliedCount < stats.totalParents;
  const isApplied = stats && stats.appliedCount > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex flex-col p-3 text-left border-r border-b border-t-0 border-l-0 transition-all group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isSelected ? "bg-accent/40 ring-1 ring-primary z-10" : ""
      } ${
        isFullyApplied
          ? "bg-primary/5 hover:bg-primary/10"
          : isPartiallyApplied || isApplied
            ? "bg-primary/5 hover:bg-primary/10"
            : "bg-card/50 hover:bg-accent/30"
      }`}
    >
      <div className="flex flex-col items-start w-full flex-1 text-left">
        <div className="flex w-full justify-between items-start">
          <span
            className={`text-xs font-semibold truncate group-hover:text-primary transition-colors pr-2 ${
              isApplied ? "text-primary" : "text-foreground"
            }`}
          >
            {mod.name}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
          {mod.sku}
        </span>
        <span className="text-xs font-bold text-foreground/80 mt-1.5 font-mono">
          {isMixedPrice
            ? "Mixed"
            : displayPrice !== 0
              ? `${displayPrice > 0 ? "+" : "-"}$${formatNumber(Math.abs(displayPrice), 2)}`
              : "Free"}
        </span>
      </div>
    </div>
  );
}

// Extracted Sub-component for Active Check Preview (maintains rounded borders)
interface ActiveCheckPreviewProps {
  parentItems: ProjectedLineItem[];
  lastTouchedSku: string | null;
  setLastTouchedSku: (sku: string | null) => void;
  formatNumber: (n: number, decimals?: number) => string;
}

function ActiveCheckPreview({
  parentItems,
  lastTouchedSku,
  setLastTouchedSku,
  formatNumber,
}: ActiveCheckPreviewProps) {
  if (!parentItems || parentItems.length === 0) return null;

  return (
    <div className="border bg-muted/10 p-3 h-full overflow-y-auto space-y-3 rounded-lg">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
        Active Check Preview
      </span>
      {parentItems.map((parent) => (
        <div key={parent.lineId} className="space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-foreground">
            <span className="truncate">
              {parent.qty}x {parent.name}
            </span>
            <span className="font-mono ml-2 shrink-0">
              ${formatNumber(parent.totalPrice, 2)}
            </span>
          </div>
          <div className="pl-3 border-l border-muted-foreground/30 space-y-1">
            {parent.children.map((child) => {
              const isSelected = lastTouchedSku === child.sku;
              const inlineQtyDisplay =
                child.inlineQty && child.inlineQty !== 1
                  ? `(${formatNumber(child.inlineQty)})`
                  : "";
              const stateDisplay = child.selectedModifierState
                ? `[${child.selectedModifierState}] `
                : "";

              return (
                <div
                  key={child.lineId}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLastTouchedSku(child.sku);
                  }}
                  className={`flex justify-between items-center text-[11px] p-1 cursor-pointer transition-colors rounded-md ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="truncate mr-2">
                    {stateDisplay}
                    {child.name} {inlineQtyDisplay}
                  </span>
                  <span className="font-mono shrink-0">
                    {child.totalPrice > 0
                      ? `+$${formatNumber(child.totalPrice, 2)}`
                      : "Free"}
                  </span>
                </div>
              );
            })}
            {parent.children.length === 0 && (
              <div className="text-[10px] text-muted-foreground/50 italic pl-1">
                No modifiers applied
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Collisions helper (maintains rounded borders)
function ModifierCollisionDialog(
  actionPrompt: { sku: string; defaultState?: string },
  setActionPrompt: React.Dispatch<
    React.SetStateAction<{ sku: string; defaultState?: string } | null>
  >,
  mod: CatalogItemEntry,
  stats:
    | {
        appliedCount: number;
        canAddCount: number;
        totalParents: number;
        allowDuplicates: boolean;
        itemsWithoutIt: string[];
        itemsWithIt: string[];
        appliedStates: Set<string>;
        currentInlineQty: number | null;
      }
    | undefined,
  onUpdateState:
    | ((sku: string, newState?: string, targetLineIds?: string[]) => void)
    | undefined,
  onAdd: (sku: string, defaultState?: string, targetLineIds?: string[]) => void,
  parentItems: ProjectedLineItem[] | undefined,
  specificStateCount: number,
  onRemove: (sku: string, targetLineIds?: string[]) => void,
  itemsWithSpecificState: ProjectedLineItem[],
  targetState: string | undefined,
): React.ReactNode {
  return (
    <Dialog
      open={actionPrompt !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) setActionPrompt(null);
      }}
    >
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Edit {mod.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {stats &&
            stats.itemsWithoutIt.length > 0 &&
            stats.appliedCount > 0 && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs h-10"
                onClick={() => {
                  if (onUpdateState)
                    onUpdateState(
                      mod.sku,
                      actionPrompt.defaultState,
                      stats.itemsWithoutIt,
                    );
                  else
                    onAdd(
                      mod.sku,
                      actionPrompt.defaultState,
                      stats.itemsWithoutIt,
                    );
                  setActionPrompt(null);
                }}
              >
                Apply {actionPrompt.defaultState || "Add"} to{" "}
                {stats.itemsWithoutIt.length} remaining
              </Button>
            )}
          {stats &&
            stats.appliedCount > 0 &&
            parentItems &&
            parentItems.length > 1 && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs h-10"
                onClick={() => {
                  if (onUpdateState && actionPrompt.defaultState)
                    onUpdateState(mod.sku, actionPrompt.defaultState);
                  else onAdd(mod.sku, actionPrompt.defaultState);
                  setActionPrompt(null);
                }}
              >
                Apply {actionPrompt.defaultState || "Add"} to all{" "}
                {stats.totalParents} items
              </Button>
            )}
          {stats &&
            stats.allowDuplicates &&
            parentItems &&
            parentItems.length === 1 && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs h-10"
                onClick={() => {
                  onAdd(mod.sku, actionPrompt.defaultState);
                  setActionPrompt(null);
                }}
              >
                Add another
              </Button>
            )}
          {specificStateCount > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="w-full text-xs h-10"
              onClick={() => {
                onRemove(
                  mod.sku,
                  itemsWithSpecificState.map((i) => i.lineId),
                );
                setActionPrompt(null);
              }}
            >
              Remove{targetState ? ` ${targetState}` : ""}
              {parentItems && parentItems.length > 1
                ? ` from ${specificStateCount} items`
                : ""}
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setActionPrompt(null)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
