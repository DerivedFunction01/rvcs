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
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";

interface ModifierAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  modifiers: CatalogItemEntry[];
  onAdd: (sku: string, defaultState?: string, targetLineIds?: string[]) => void;
  onRemove: (sku: string, targetLineIds?: string[]) => void;
  onUpdateState?: (sku: string, newState?: string, targetLineIds?: string[]) => void;
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
    }>();
    if (!parentItems || parentItems.length === 0) return stats;

    for (const mod of modifiers) {
      let appliedCount = 0;
      let canAddCount = 0;
      const itemsWithoutIt: string[] = [];
      const itemsWithIt: string[] = [];
      const appliedStates = new Set<string>();

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
        appliedStates
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((mod) => {
                const defaultState = mod.allowedStates?.find(
                  (s) => s.state === "ADD" || s.state === "WITH"
                )?.state || mod.allowedStates?.[0]?.state || undefined;
                
                const hasStates = mod.allowedStates && mod.allowedStates.length > 0;

                const stats = modifierStats.get(mod.sku);
                const isFullyApplied = stats && stats.appliedCount === stats.totalParents && !stats.allowDuplicates;
                const isPartiallyApplied = stats && stats.appliedCount > 0 && stats.appliedCount < stats.totalParents;
                const isApplied = stats && stats.appliedCount > 0;

                if (actionPrompt?.sku === mod.sku) {
                  return (
                    <div key={mod.sku} className="flex flex-col p-3 text-left border rounded-lg border-primary bg-primary/5">
                       <span className="text-xs font-semibold text-foreground mb-2">Edit {mod.name}</span>
                       <div className="space-y-1.5">
                         {stats && stats.itemsWithoutIt.length > 0 && stats.appliedCount > 0 && (
                           <Button size="sm" variant="secondary" className="w-full text-xs h-7" onClick={() => { 
                               if (onUpdateState) onUpdateState(mod.sku, actionPrompt.defaultState, stats.itemsWithoutIt);
                               else onAdd(mod.sku, actionPrompt.defaultState, stats.itemsWithoutIt); 
                               setActionPrompt(null); 
                             }}>
                             Apply {actionPrompt.defaultState || "Add"} to {stats.itemsWithoutIt.length} remaining
                           </Button>
                         )}
                         {stats && stats.allowDuplicates && stats.appliedCount > 0 && parentItems && parentItems.length > 1 && (
                           <Button size="sm" variant="secondary" className="w-full text-xs h-7" onClick={() => { 
                               if (onUpdateState && actionPrompt.defaultState) onUpdateState(mod.sku, actionPrompt.defaultState);
                               else onAdd(mod.sku, actionPrompt.defaultState); 
                               setActionPrompt(null); 
                             }}>
                             Apply {actionPrompt.defaultState || "Add"} to all {stats.totalParents} items
                           </Button>
                         )}
                         {stats && stats.allowDuplicates && parentItems && parentItems.length === 1 && (
                           <Button size="sm" variant="secondary" className="w-full text-xs h-7" onClick={() => { 
                             onAdd(mod.sku, actionPrompt.defaultState); 
                             setActionPrompt(null); 
                           }}>
                             Add another
                           </Button>
                         )}
                         {stats && stats.appliedCount > 0 && (
                           <Button size="sm" variant="destructive" className="w-full text-xs h-7" onClick={() => { onRemove(mod.sku, stats.itemsWithIt); setActionPrompt(null); }}>
                             Remove {parentItems && parentItems.length > 1 ? `from ${stats.appliedCount} items` : ''}
                           </Button>
                         )}
                         <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={() => setActionPrompt(null)}>
                           Cancel
                         </Button>
                       </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={mod.sku}
                    className={`flex flex-col p-3 text-left border rounded-lg transition-all group relative ${
                      isFullyApplied ? "bg-primary/10 border-primary" : 
                      isPartiallyApplied || isApplied ? "bg-primary/5 border-primary/50 hover:border-primary" : 
                      "bg-card/50 hover:border-primary/50"
                    }`}
                  >
                    <button
                      className={`flex flex-col items-start w-full text-left outline-none relative`}
                      onClick={() => {
                        if (stats && stats.totalParents === 1) {
                          if (stats.appliedCount === 0) {
                            onAdd(mod.sku, defaultState);
                          } else if (stats.allowDuplicates) {
                            setActionPrompt({ sku: mod.sku, defaultState });
                          }
                        } else {
                          if (stats && stats.appliedCount === 0) {
                            onAdd(mod.sku, defaultState);
                          } else {
                            setActionPrompt({ sku: mod.sku, defaultState });
                          }
                        }
                      }}
                    >
                      <div className="flex w-full justify-between items-start">
                        <span className={`text-xs font-semibold group-hover:text-primary transition-colors pr-6 ${isApplied ? 'text-primary' : 'text-foreground'}`}>
                          {mod.name}
                        </span>
                        {stats && stats.totalParents > 1 && stats.appliedCount > 0 && (
                          <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                            {stats.appliedCount} / {stats.totalParents}
                          </span>
                        )}
                        {stats && stats.totalParents === 1 && stats.appliedCount > 0 && (
                          <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                            Applied{stats.appliedCount > 1 ? ` (${stats.appliedCount})` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {mod.sku}
                      </span>
                      <span className="text-xs font-bold text-foreground/80 mt-2 font-mono">
                        {mod.basePrice > 0 ? `+$${mod.basePrice.toFixed(2)}` : "Free"}
                      </span>
                      {(!isFullyApplied || stats?.allowDuplicates) && !isApplied && (
                        <span className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3.5 h-3.5 text-primary" />
                        </span>
                      )}
                    </button>
                    {isApplied && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (stats) onRemove(mod.sku, stats.itemsWithIt);
                        }}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove modifier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasStates && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
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
                                if (stats && stats.totalParents > 1) {
                                   setActionPrompt({ sku: mod.sku, defaultState: stateOpt.state });
                                } else {
                                   if (onUpdateState) onUpdateState(mod.sku, stateOpt.state);
                                   else onAdd(mod.sku, stateOpt.state);
                                }
                              }}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 transition-colors ${
                                isStateApplied 
                                  ? (stateOpt.state === "NO" || stateOpt.state === "LESS" || stateOpt.state === "REMOVE" || stateOpt.state === "EXCLUDE" 
                                      ? "bg-destructive/15 text-destructive border border-destructive/30" 
                                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30") 
                                  : "bg-muted hover:bg-primary/20 hover:text-primary border border-transparent"
                              }`}
                            >
                              {stateOpt.state}
                              {priceDiff !== 0 && (
                                <span className="opacity-70 font-mono text-[8px]">
                                  ({priceDiff > 0 ? "+" : ""}${priceDiff.toFixed(2)})
                                </span>
                              )}
                            </button>
                          );
                        })}
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
