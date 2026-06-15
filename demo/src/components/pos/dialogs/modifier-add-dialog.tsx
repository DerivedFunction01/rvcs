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
import { Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { NumberPadDialog } from "./number-pad-dialog";

interface ModifierAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  modifiers: CatalogItemEntry[];
  onAdd: (sku: string, defaultState?: string, targetLineIds?: string[]) => void;
  onRemove: (sku: string, targetLineIds?: string[]) => void;
  onUpdateState?: (sku: string, newState?: string, targetLineIds?: string[]) => void;
  onUpdateInlineQty?: (sku: string, change: number, targetLineIds?: string[]) => void;
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
  parentItems
}: ModifierAddDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionPrompt, setActionPrompt] = useState<{ sku: string, defaultState?: string } | null>(null);
  const [qtyPadTarget, setQtyPadTarget] = useState<string | null>(null);
  const [lastTouchedSku, setLastTouchedSku] = useState<string | null>(null);

  const catalog = useVCSStore((s) => s.catalog);
  const formatNumber = useFormatNumber();

  const modifierStats = useMemo(() => {
    const stats = new Map<string, {
      appliedCount: number;
      canAddCount: number;
      totalParents: number;
      allowDuplicates: boolean;
      itemsWithoutIt: string[];
      itemsWithIt: string[];
      appliedStates: Set<string>;
      currentInlineQty: number | null;
    }>();
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
        const modConfig = parentEntry?.modifierConfigs?.find((c) => c.modifierSku === mod.sku);
        const allowDuplicates = modConfig?.allowDuplicates ?? false;

        const modChildren = parent.children.filter((c) => c.sku === mod.sku);
        const hasMod = modChildren.length > 0;

        if (hasMod) {
          appliedCount++;
          itemsWithIt.push(parent.lineId);
          for (const c of modChildren) {
            if (c.selectedModifierState) appliedStates.add(c.selectedModifierState);
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
      const modConfigFallback = parentEntryFallback?.modifierConfigs?.find((c) => c.modifierSku === mod.sku);
      const allowDuplicates = modConfigFallback?.allowDuplicates ?? false;

      stats.set(mod.sku, {
        appliedCount,
        canAddCount,
        totalParents: parentItems.length,
        allowDuplicates,
        itemsWithoutIt,
        itemsWithIt,
        appliedStates,
        currentInlineQty
      });
    }
    return stats;
  }, [modifiers, parentItems, catalog]);

  // Filter modifiers by search query
  const filtered = useMemo(() => {
    return modifiers.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [modifiers, searchQuery]);

  // Reset search when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setActionPrompt(null);
      setLastTouchedSku(null);
    }
  }, [open]);

  const lastTouchedMod = useMemo(() => {
    if (!lastTouchedSku) return null;
    return modifiers.find(m => m.sku === lastTouchedSku) || null;
  }, [modifiers, lastTouchedSku]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-8xl w-[95vw] h-[95vh] max-h-[95vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Modifiers
          </DialogTitle>
          <DialogDescription>
            Select modifiers to add or remove from <span className="font-semibold text-foreground">{itemName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col landscape:flex-row gap-4 flex-1 min-h-0 mt-2">
          {/* Left Column (Search + Customization) */}
          <div className="flex flex-col gap-3 shrink-0 landscape:w-[320px] md:landscape:w-100">
            {/* Search Input */}
            <div className="relative shrink-0 flex flex-row gap-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modifiers (e.g. Cheese, Onions...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
              <Button variant="outline" size="default" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>

            {/* Customization Bar */}
            {lastTouchedMod ? (() => {
              const stats = modifierStats.get(lastTouchedMod.sku);
              const isApplied = stats && stats.appliedCount > 0;
              const isFullyApplied = stats && stats.appliedCount === stats.totalParents && !stats.allowDuplicates;
              const hasStates = lastTouchedMod.allowedStates && lastTouchedMod.allowedStates.length > 0;
              const hasInlineQty = lastTouchedMod.inlineQtyType && lastTouchedMod.inlineQtyType !== "none";

              const inlineStep = lastTouchedMod.inlineQtyIncrement ?? (lastTouchedMod.inlineQtyType === "float" ? 0.05 : 1);
              const inlineQtyLabel = lastTouchedMod.inlineQtyLabel ?? (lastTouchedMod.inlineQtyType === "int" ? "Count" : lastTouchedMod.inlineQtyType === "float" ? "Measure" : "Qty");
              const inlineQtyUnit = lastTouchedMod.inlineQtyUnit ?? (lastTouchedMod.inlineQtyType === "float" ? "units" : "");
              const precision = (() => {
                const increment = inlineStep;
                if (!Number.isFinite(increment)) return 0;
                const text = increment.toString();
                if (text.includes("e-")) {
                  const match = text.match(/e-(\d+)$/);
                  return match ? Number(match[1]) : 0;
                }
                const decimals = text.split(".")[1];
                return decimals ? decimals.length : 0;
              })();
              const formatInlineQty = (value: number) => formatNumber(value, precision > 0 ? precision : 0);

              return (
                <div className="flex flex-col md:flex-row landscape:flex-col md:items-center landscape:items-start gap-4 md:gap-6 landscape:gap-4 p-4 border rounded-xl bg-card shrink-0 shadow-sm z-10 mx-1 landscape:mx-0 mt-2 landscape:mt-0">
                  <div className="flex-1 flex flex-wrap landscape:flex-nowrap landscape:flex-col items-end landscape:items-stretch gap-4 md:gap-6 landscape:gap-4 w-full">
                    {hasStates && (
                      <div className="flex flex-col gap-1 md:border-r landscape:border-r-0 md:pr-6 landscape:pr-0 border-border/50 w-full md:w-auto landscape:w-full">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Options</span>
                        <div className="flex flex-wrap items-center gap-1">
                          {lastTouchedMod.allowedStates?.map((stateOpt) => {
                            const priceDiff =
                              stateOpt.priceOverride !== null && stateOpt.priceOverride !== undefined
                                ? stateOpt.priceOverride - lastTouchedMod.basePrice
                                : 0;

                            const isStateApplied = stats?.appliedStates.has(stateOpt.state);

                            return (
                              <Button
                                key={stateOpt.state}
                                size="lg"
                                variant={isStateApplied ? (stateOpt.state === "NO" || stateOpt.state === "LESS" || stateOpt.state === "REMOVE" || stateOpt.state === "EXCLUDE" ? "destructive" : "default") : "outline"}
                                className={`h-14 px-4 text-sm font-bold flex flex-col gap-0.5 min-w-20 ${isStateApplied
                                  ? (stateOpt.state === "NO" || stateOpt.state === "LESS" || stateOpt.state === "REMOVE" || stateOpt.state === "EXCLUDE"
                                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700")
                                  : "bg-background"
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const itemsWithThisState = parentItems?.filter(p => p.children.some(c => c.sku === lastTouchedMod.sku && c.selectedModifierState === stateOpt.state)) || [];

                                  if (stats && stats.appliedCount === 0) {
                                    onAdd(lastTouchedMod.sku, stateOpt.state);
                                  } else if (stats && stats.totalParents > 1) {
                                    if (isFullyApplied && itemsWithThisState.length === 0) {
                                      if (onUpdateState) onUpdateState(lastTouchedMod.sku, stateOpt.state);
                                      else onAdd(lastTouchedMod.sku, stateOpt.state);
                                    } else {
                                      setActionPrompt({ sku: lastTouchedMod.sku, defaultState: stateOpt.state });
                                    }
                                  } else {
                                    if (itemsWithThisState.length > 0 || stats?.allowDuplicates) {
                                      setActionPrompt({ sku: lastTouchedMod.sku, defaultState: stateOpt.state });
                                    } else {
                                      if (onUpdateState) onUpdateState(lastTouchedMod.sku, stateOpt.state);
                                      else onAdd(lastTouchedMod.sku, stateOpt.state);
                                    }
                                  }
                                }}
                              >
                                <span>{stateOpt.state}</span>
                                {priceDiff !== 0 && (
                                  <span className="opacity-80 font-mono text-[10px] font-normal">
                                    {priceDiff > 0 ? "+" : ""}${formatNumber(priceDiff, 2)}
                                  </span>
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-end landscape:items-start landscape:flex-col justify-between w-full md:w-auto landscape:w-full gap-2 md:gap-4">


                      <div className={`md:pl-4 landscape:pl-0 md:border-l landscape:border-l-0 border-border/50 shrink-0 flex items-center gap-2 landscape:pt-2 landscape:border-t `
                        + hasInlineQty ? `` : `w-full`
                      }>
                        {stats?.allowDuplicates && isApplied && parentItems && parentItems.length === 1 && (
                          <Button
                            variant="ghost"
                            className="h-14 px-3 flex flex-col landscape:flex-row landscape:h-12 gap-1 text-primary hover:text-primary hover:bg-primary/10 flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAdd(lastTouchedMod.sku);
                            }}
                          >
                            <Plus className="w-5 h-5 landscape:w-4 landscape:h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Add Another</span>
                          </Button>
                        )}
                        {isApplied && (
                          <Button
                            variant="ghost"
                            className="h-14 px-3 flex flex-col landscape:flex-row landscape:h-12 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (stats) onRemove(lastTouchedMod.sku, stats.itemsWithIt);
                            }}
                          >
                            <Trash2 className="w-5 h-5 landscape:w-4 landscape:h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Remove</span>
                          </Button>
                        )}
                      </div>
                      {hasInlineQty ? (
                        <div className="flex flex-col gap-1 w-full">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                            {inlineQtyLabel}
                          </span>
                          <div className="flex items-center rounded-lg border bg-background shadow-sm overflow-hidden w-full">
                            <Button
                              variant="ghost"
                              className="h-12 w-12 rounded-none border-r hover:bg-muted text-muted-foreground hover:text-foreground hidden sm:block"
                              disabled={!isApplied}
                              onClick={() => {
                                if (onUpdateInlineQty) onUpdateInlineQty(lastTouchedMod.sku, -inlineStep);
                              }}
                            >
                              <Minus className="w-6 h-6" />
                            </Button>
                            <button
                              className="h-12 px-4 min-w-25 flex-1 text-lg text-foreground font-mono font-bold text-center select-none hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                              disabled={!isApplied}
                              onClick={() => {
                                setQtyPadTarget(lastTouchedMod.sku);
                              }}
                            >
                              {isApplied ? formatInlineQty(stats?.currentInlineQty ?? 1) : "0"}
                              <span className="text-xs ml-1 font-sans font-medium text-muted-foreground">{inlineQtyUnit}</span>
                            </button>
                            <Button
                              variant="ghost"
                              className="h-12 w-12 rounded-none border-l hover:bg-muted text-muted-foreground hover:text-foreground hidden sm:block"
                              disabled={!isApplied && !isFullyApplied && !stats?.allowDuplicates}
                              onClick={() => {
                                if (!isApplied) {
                                  onAdd(lastTouchedMod.sku);
                                } else {
                                  if (onUpdateInlineQty) onUpdateInlineQty(lastTouchedMod.sku, inlineStep);
                                }
                              }}
                            >
                              <Plus className="w-6 h-6" />
                            </Button>
                          </div>
                        </div>
                      ) : <div className="hidden landscape:block" />}
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="flex items-center justify-center p-6 border rounded-xl bg-muted/10 shrink-0 h-26.5 mx-1 mt-2 landscape:mt-0">
                <span className="text-sm font-medium text-muted-foreground text-center">Select a modifier to customize</span>
              </div>
            )}
          </div>

          {/* Right Column (Grid Scroll Area) */}
          <div className="flex">
            <div className="flex-1 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No matching modifiers found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                  {filtered.map((mod) => {
                    const defaultState = mod.allowedStates?.find(
                      (s) => s.state === "Add" || s.state === "With"
                    )?.state || mod.allowedStates?.[0]?.state || undefined;

                    const hasStates = mod.allowedStates && mod.allowedStates.length > 0;

                    const hasInlineQty = mod.inlineQtyType && mod.inlineQtyType !== "none";
                    const inlineStep = mod.inlineQtyIncrement ?? (mod.inlineQtyType === "float" ? 0.05 : 1);
                    const inlineQtyLabel = mod.inlineQtyLabel ?? (mod.inlineQtyType === "int" ? "Count" : mod.inlineQtyType === "float" ? "Measure" : "Qty");
                    const inlineQtyUnit = mod.inlineQtyUnit ?? (mod.inlineQtyType === "float" ? "units" : "");
                    const precision = (() => {
                      const increment = inlineStep;
                      if (!Number.isFinite(increment)) return 0;
                      const text = increment.toString();
                      if (text.includes("e-")) {
                        const match = text.match(/e-(\d+)$/);
                        return match ? Number(match[1]) : 0;
                      }
                      const decimals = text.split(".")[1];
                      return decimals ? decimals.length : 0;
                    })();
                    const formatInlineQty = (value: number) => formatNumber(value, precision > 0 ? precision : 0);

                    const stats = modifierStats.get(mod.sku);
                    const isFullyApplied = stats && stats.appliedCount === stats.totalParents && !stats.allowDuplicates;
                    const isPartiallyApplied = stats && stats.appliedCount > 0 && stats.appliedCount < stats.totalParents;
                    const isApplied = stats && stats.appliedCount > 0;

                    let displayPrice = mod.basePrice;
                    let isMixedPrice = false;
                    if (isApplied) {
                      let uniquePrice: number | null = null;

                      parentItems?.forEach((parent) => {
                        const modChildren = parent.children.filter((c) => c.sku === mod.sku);
                        modChildren.forEach((child) => {
                          let childPrice = mod.basePrice;
                          if (child.selectedModifierState) {
                            const stateOpt = mod.allowedStates?.find(
                              (s) => s.state === child.selectedModifierState
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

                    const handleMainClick = () => {
                      setLastTouchedSku(mod.sku);

                      if (stats && stats.totalParents === 1) {
                        if (stats.appliedCount === 0) {
                          onAdd(mod.sku, defaultState);
                        } else if (stats.allowDuplicates) {
                          setActionPrompt({ sku: mod.sku, defaultState });
                        }
                      } else {
                        if (stats && stats.appliedCount === 0) {
                          onAdd(mod.sku, defaultState);
                        } else if ((!isFullyApplied || stats?.allowDuplicates) && mod.allowedStates?.length == 0) {
                          setActionPrompt({ sku: mod.sku, defaultState });
                        }
                      }
                    };

                    return (
                      <div
                        key={mod.sku}
                        role="button"
                        tabIndex={0}
                        onClick={handleMainClick}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleMainClick();
                          }
                        }}
                        className={`flex flex-col p-4 text-left border rounded-lg transition-all group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${lastTouchedSku === mod.sku ? "ring-2 ring-primary border-primary shadow-sm" : ""
                          } ${isFullyApplied ? "bg-primary/10 border-primary" :
                            isPartiallyApplied || isApplied ? "bg-primary/5 border-primary/50 hover:border-primary" :
                              "bg-card/50 hover:border-primary/50"
                          }`}
                      >
                        <div className={`flex flex-col items-start w-full flex-1 text-left relative`}>
                          <div className="flex w-full justify-between items-start">
                            <span className={`text-sm font-semibold group-hover:text-primary transition-colors pr-6 ${isApplied ? 'text-primary' : 'text-foreground'}`}>
                              {mod.name}
                            </span>
                            {stats && stats.totalParents > 1 && stats.appliedCount > 0 && (
                              <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                                {formatNumber(stats.appliedCount)} / {formatNumber(stats.totalParents)}
                              </span>
                            )}
                            {stats && stats.totalParents === 1 && stats.appliedCount > 0 && (
                              <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded ml-2 whitespace-nowrap hidden sm:block">
                                Applied{stats.appliedCount > 1 ? formatNumber(stats.appliedCount) : ''}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground mt-1 font-mono">
                            {mod.sku}
                          </span>
                          <span className="text-sm font-bold text-foreground/80 mt-2 font-mono">
                            {isMixedPrice
                              ? "Mixed"
                              : displayPrice !== 0
                                ? `${displayPrice > 0 ? "+" : "-"}$${formatNumber(Math.abs(displayPrice), 2)}`
                                : "Free"}
                          </span>
                          {(!isFullyApplied || stats?.allowDuplicates) && !isApplied && (
                            <span className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-4 h-4 text-primary" />
                            </span>
                          )}
                        </div>
                        {isApplied && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLastTouchedSku(mod.sku);
                              if (stats) onRemove(mod.sku, stats.itemsWithIt);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove modifier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {(hasStates || hasInlineQty) && (
                          <div className="hidden md:flex flex-col gap-2 mt-3 pt-3 border-t border-border/50">
                            {hasStates && (
                              <div className="flex flex-wrap gap-1.5">
                                {mod.allowedStates?.map((stateOpt) => {
                                  const priceDiff =
                                    stateOpt.priceOverride !== null && stateOpt.priceOverride !== undefined
                                      ? stateOpt.priceOverride - mod.basePrice
                                      : 0;

                                  const isStateApplied = stats?.appliedStates.has(stateOpt.state);

                                  return (
                                    <button
                                      key={stateOpt.state}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLastTouchedSku(mod.sku);
                                        const itemsWithThisState = parentItems?.filter(p => p.children.some(c => c.sku === mod.sku && c.selectedModifierState === stateOpt.state)) || [];

                                        if (stats && stats.appliedCount === 0) {
                                          onAdd(mod.sku, stateOpt.state);
                                        } else if (stats && stats.totalParents > 1) {
                                          if (isFullyApplied && itemsWithThisState.length === 0) {
                                            if (onUpdateState) onUpdateState(mod.sku, stateOpt.state);
                                            else onAdd(mod.sku, stateOpt.state);
                                          } else {
                                            setActionPrompt({ sku: mod.sku, defaultState: stateOpt.state });
                                          }
                                        } else {
                                          if (itemsWithThisState.length > 0 || stats?.allowDuplicates) {
                                            setActionPrompt({ sku: mod.sku, defaultState: stateOpt.state });
                                          } else {
                                            if (onUpdateState) onUpdateState(mod.sku, stateOpt.state);
                                            else onAdd(mod.sku, stateOpt.state);
                                          }
                                        }
                                      }}
                                      className={`text-[10px] px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${isStateApplied
                                        ? (stateOpt.state === "NO" || stateOpt.state === "LESS" || stateOpt.state === "REMOVE" || stateOpt.state === "EXCLUDE"
                                          ? "bg-destructive/15 text-destructive border border-destructive/30"
                                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30")
                                        : "bg-muted hover:bg-primary/20 hover:text-primary border border-transparent"
                                        }`}
                                    >
                                      {stateOpt.state}
                                      {priceDiff !== 0 && (
                                        <span className="opacity-70 font-mono text-[9px]">
                                          ({priceDiff > 0 ? "+" : ""}${formatNumber(priceDiff, 2)})
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {hasInlineQty && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  {inlineQtyLabel}:
                                </span>
                                <div className="flex items-center rounded border p-0.5 bg-background shrink-0 shadow-sm">
                                  <button
                                    className="h-5 w-5 flex items-center justify-center hover:bg-muted hover:text-primary rounded text-muted-foreground transition-colors disabled:opacity-50"
                                    disabled={!isApplied}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLastTouchedSku(mod.sku);
                                      if (onUpdateInlineQty) onUpdateInlineQty(mod.sku, -inlineStep);
                                    }}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <button
                                    className="text-[10px] text-foreground font-mono font-semibold min-w-8 text-center select-none px-1 hover:bg-muted rounded transition-colors cursor-pointer disabled:opacity-50"
                                    disabled={!isApplied}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLastTouchedSku(mod.sku);
                                      setQtyPadTarget(mod.sku);
                                    }}
                                  >
                                    {isApplied ? formatInlineQty(stats?.currentInlineQty ?? 1) : "0"}
                                    {inlineQtyUnit ? ` ${inlineQtyUnit}` : ""}
                                  </button>
                                  <button
                                    className="h-5 w-5 flex items-center justify-center hover:bg-muted hover:text-primary rounded text-muted-foreground transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLastTouchedSku(mod.sku);
                                      if (onUpdateInlineQty) onUpdateInlineQty(mod.sku, inlineStep);
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {actionPrompt && (() => {
          const mod = modifiers.find(m => m.sku === actionPrompt.sku);
          if (!mod) return null;
          const stats = modifierStats.get(actionPrompt.sku);
          const targetState = actionPrompt.defaultState;
          const itemsWithSpecificState = parentItems?.filter(p =>
            p.children.some(c => c.sku === mod.sku && c.selectedModifierState === targetState)
          ) || [];
          const specificStateCount = itemsWithSpecificState.length;

          return (
            ModifierCollisionDialog(actionPrompt, setActionPrompt, mod, stats, onUpdateState, onAdd, parentItems, specificStateCount, onRemove, itemsWithSpecificState, targetState)
          )
        })()}
        {qtyPadTarget && (() => {
          const mod = modifiers.find((m) => m.sku === qtyPadTarget);
          if (!mod) return null;
          const stats = modifierStats.get(qtyPadTarget);
          const inlineStep = mod.inlineQtyIncrement ?? (mod.inlineQtyType === "float" ? 0.05 : 1);
          return (
            <NumberPadDialog
              open={qtyPadTarget !== null}
              onOpenChange={(isOpen) => {
                if (!isOpen) setQtyPadTarget(null);
              }}
              title="Measurement"
              description={`Set the measurement for ${mod.name}`}
              initialValue={stats?.currentInlineQty ?? 1}
              min={inlineStep}
              increment={inlineStep}
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
function ModifierCollisionDialog(actionPrompt: { sku: string; defaultState?: string; }, setActionPrompt: React.Dispatch<React.SetStateAction<{ sku: string; defaultState?: string; } | null>>, mod: CatalogItemEntry, stats: { appliedCount: number; canAddCount: number; totalParents: number; allowDuplicates: boolean; itemsWithoutIt: string[]; itemsWithIt: string[]; appliedStates: Set<string>; currentInlineQty: number | null; } | undefined, onUpdateState: ((sku: string, newState?: string, targetLineIds?: string[]) => void) | undefined, onAdd: (sku: string, defaultState?: string, targetLineIds?: string[]) => void, parentItems: ProjectedLineItem[] | undefined, specificStateCount: number, onRemove: (sku: string, targetLineIds?: string[]) => void, itemsWithSpecificState: ProjectedLineItem[], targetState: string | undefined): React.ReactNode {
  return <Dialog open={actionPrompt !== null} onOpenChange={(isOpen) => { if (!isOpen) setActionPrompt(null); }}>
    <DialogContent className="sm:max-w-xs">
      <DialogHeader>
        <DialogTitle>Edit {mod.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-2 py-2">
        {stats && stats.itemsWithoutIt.length > 0 && stats.appliedCount > 0 && (
          <Button size="sm" variant="secondary" className="w-full text-xs h-10" onClick={() => {
            if (onUpdateState) onUpdateState(mod.sku, actionPrompt.defaultState, stats.itemsWithoutIt);
            else onAdd(mod.sku, actionPrompt.defaultState, stats.itemsWithoutIt);
            setActionPrompt(null);
          }}>
            Apply {actionPrompt.defaultState || "Add"} to {stats.itemsWithoutIt.length} remaining
          </Button>
        )}
        {stats && stats.appliedCount > 0 && parentItems && parentItems.length > 1 && (
          <Button size="sm" variant="secondary" className="w-full text-xs h-10" onClick={() => {
            if (onUpdateState && actionPrompt.defaultState) onUpdateState(mod.sku, actionPrompt.defaultState);
            else onAdd(mod.sku, actionPrompt.defaultState);
            setActionPrompt(null);
          }}>
            Apply {actionPrompt.defaultState || "Add"} to all {stats.totalParents} items
          </Button>
        )}
        {stats && stats.allowDuplicates && parentItems && parentItems.length === 1 && (
          <Button size="sm" variant="secondary" className="w-full text-xs h-10" onClick={() => {
            onAdd(mod.sku, actionPrompt.defaultState);
            setActionPrompt(null);
          }}>
            Add another
          </Button>
        )}
        {specificStateCount > 0 && (
          <Button size="sm" variant="destructive" className="w-full text-xs h-10" onClick={() => { onRemove(mod.sku, itemsWithSpecificState.map(i => i.lineId)); setActionPrompt(null); }}>
            Remove{targetState ? ` ${targetState}` : ""}{parentItems && parentItems.length > 1 ? ` from ${specificStateCount} items` : ''}
          </Button>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" className="w-full" onClick={() => setActionPrompt(null)}>
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

