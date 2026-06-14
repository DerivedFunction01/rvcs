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
  const [actionPrompt, setActionPrompt] = useState<{sku: string, defaultState?: string} | null>(null);

  const catalog = useVCSStore((s) => s.catalog);

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
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Modifiers
          </DialogTitle>
          <DialogDescription>
            Select modifiers to add or remove from <span className="font-semibold text-foreground">{itemName}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative mt-2 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modifiers (e.g. Cheese, Onions...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {/* Grid Scroll Area */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching modifiers found.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {filtered.map((mod) => {
                const defaultState = mod.allowedStates?.find(
                  (s) => s.state === "ADD" || s.state === "WITH"
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
                const formatInlineQty = (value: number) => precision > 0 ? value.toFixed(precision) : `${Math.round(value)}`;

                const stats = modifierStats.get(mod.sku);
                const isFullyApplied = stats && stats.appliedCount === stats.totalParents && !stats.allowDuplicates;
                const isPartiallyApplied = stats && stats.appliedCount > 0 && stats.appliedCount < stats.totalParents;
                const isApplied = stats && stats.appliedCount > 0;

                const handleMainClick = () => {
                  if (stats && stats.totalParents === 1) {
                    if (stats.appliedCount === 0) {
                      onAdd(mod.sku, defaultState);
                    } else if (stats.allowDuplicates) {
                      setActionPrompt({ sku: mod.sku, defaultState });
                    }
                  } else {
                    if (stats && stats.appliedCount === 0) {
                      onAdd(mod.sku, defaultState);
                    } else if (!isFullyApplied || stats?.allowDuplicates) {
                      setActionPrompt({ sku: mod.sku, defaultState });
                    }
                  }
                };

                if (actionPrompt?.sku === mod.sku) {
                  const targetState = actionPrompt.defaultState;
                  const itemsWithSpecificState = parentItems?.filter(p => 
                    p.children.some(c => c.sku === mod.sku && c.selectedModifierState === targetState)
                  ) || [];
                  const specificStateCount = itemsWithSpecificState.length;

                  return (
                    <div key={mod.sku} className="flex flex-col p-4 text-left border rounded-lg border-primary bg-primary/5">
                       <span className="text-sm font-semibold text-foreground mb-3">Edit {mod.name}</span>
                       <div className="space-y-2">
                         {stats && stats.itemsWithoutIt.length > 0 && stats.appliedCount > 0 && (
                           <Button size="sm" variant="secondary" className="w-full text-xs h-8" onClick={() => { 
                               if (onUpdateState) onUpdateState(mod.sku, actionPrompt.defaultState, stats.itemsWithoutIt);
                               else onAdd(mod.sku, actionPrompt.defaultState, stats.itemsWithoutIt); 
                               setActionPrompt(null); 
                             }}>
                             Apply {actionPrompt.defaultState || "Add"} to {stats.itemsWithoutIt.length} remaining
                           </Button>
                         )}
                         {stats && stats.appliedCount > 0 && parentItems && parentItems.length > 1 && (
                           <Button size="sm" variant="secondary" className="w-full text-xs h-8" onClick={() => { 
                               if (onUpdateState && actionPrompt.defaultState) onUpdateState(mod.sku, actionPrompt.defaultState);
                               else onAdd(mod.sku, actionPrompt.defaultState); 
                               setActionPrompt(null); 
                             }}>
                             Apply {actionPrompt.defaultState || "Add"} to all {stats.totalParents} items
                           </Button>
                         )}
                         {stats && stats.allowDuplicates && parentItems && parentItems.length === 1 && (
                           <Button size="sm" variant="secondary" className="w-full text-xs h-8" onClick={() => { 
                             onAdd(mod.sku, actionPrompt.defaultState); 
                             setActionPrompt(null); 
                           }}>
                             Add another
                           </Button>
                         )}
                         {specificStateCount > 0 && (
                           <Button size="sm" variant="destructive" className="w-full text-xs h-8" onClick={() => { onRemove(mod.sku, itemsWithSpecificState.map(i => i.lineId)); setActionPrompt(null); }}>
                             Remove{targetState ? ` ${targetState}` : ""}{parentItems && parentItems.length > 1 ? ` from ${specificStateCount} items` : ''}
                           </Button>
                         )}
                         <Button size="sm" variant="ghost" className="w-full text-xs h-8" onClick={() => setActionPrompt(null)}>
                           Cancel
                         </Button>
                       </div>
                    </div>
                  );
                }

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
                    className={`flex flex-col p-4 text-left border rounded-lg transition-all group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isFullyApplied ? "bg-primary/10 border-primary" : 
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
                            {stats.appliedCount} / {stats.totalParents}
                          </span>
                        )}
                        {stats && stats.totalParents === 1 && stats.appliedCount > 0 && (
                          <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                            Applied{stats.appliedCount > 1 ? ` (${stats.appliedCount})` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 font-mono">
                        {mod.sku}
                      </span>
                      <span className="text-sm font-bold text-foreground/80 mt-2 font-mono">
                        {mod.basePrice > 0 ? `+$${mod.basePrice.toFixed(2)}` : "Free"}
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
                          if (stats) onRemove(mod.sku, stats.itemsWithIt);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove modifier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {(hasStates || hasInlineQty) && (
                      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/50">
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
                                  className={`text-[10px] px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                                    isStateApplied 
                                      ? (stateOpt.state === "NO" || stateOpt.state === "LESS" || stateOpt.state === "REMOVE" || stateOpt.state === "EXCLUDE" 
                                          ? "bg-destructive/15 text-destructive border border-destructive/30" 
                                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30") 
                                      : "bg-muted hover:bg-primary/20 hover:text-primary border border-transparent"
                                  }`}
                                >
                                  {stateOpt.state}
                                  {priceDiff !== 0 && (
                                    <span className="opacity-70 font-mono text-[9px]">
                                      ({priceDiff > 0 ? "+" : ""}${priceDiff.toFixed(2)})
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
                                  if (onUpdateInlineQty) onUpdateInlineQty(mod.sku, -inlineStep);
                                }}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] text-foreground font-mono font-semibold min-w-8 text-center select-none px-1">
                                {isApplied ? formatInlineQty(stats?.currentInlineQty ?? 1) : "0"}
                                {inlineQtyUnit ? ` ${inlineQtyUnit}` : ""}
                              </span>
                              <button
                                className="h-5 w-5 flex items-center justify-center hover:bg-muted hover:text-primary rounded text-muted-foreground transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
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

        <DialogFooter className="mt-4 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
