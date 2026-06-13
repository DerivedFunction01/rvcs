import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, Search, Plus, Minus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { formatLabel } from "@/lib/pos/ui-utils";
import type { CatalogItemEntry } from "@/lib/vcs/types";
import type { IconConfig } from "@/store/vcs-store";

export function CatalogPanel({
  catalogItems,
  groupedCatalog,
  availableTags,
  iconConfigs,
  onAddItem
}: {
  catalogItems: CatalogItemEntry[];
  groupedCatalog: Record<string, CatalogItemEntry[]>;
  availableTags: string[];
  iconConfigs: Record<string, IconConfig>;
  onAddItem: (sku: string) => void;
}) {
  const [catalogFilter, setCatalogFilter] = useState("");
  const [requireTags, setRequireTags] = useState<Set<string>>(new Set());
  const [avoidTags, setAvoidTags] = useState<Set<string>>(new Set());

  return (
    <aside className="w-lg border-r bg-card flex flex-col shrink-0">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catalog</h2>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={`h-6 text-[10px] px-2 gap-1.5 ${(requireTags.size > 0 || avoidTags.size > 0) ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20" : ""}`}>
                  <Filter className="w-3 h-3" />
                  {(requireTags.size > 0 || avoidTags.size > 0) ? `Filters (${requireTags.size + avoidTags.size})` : "Filters"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 pb-1 border-b">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filter Items</span>
                    {(requireTags.size > 0 || avoidTags.size > 0) && (
                      <Button variant="link" className="h-auto p-0 text-[10px]" onClick={() => { setRequireTags(new Set()); setAvoidTags(new Set()); }}>Clear</Button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto pt-1 space-y-1">
                    {availableTags.map((tag) => {
                      const config = iconConfigs[tag];
                      const Icon = config ? (LucideIcons as any)[config.icon] || LucideIcons.Info : LucideIcons.Info;
                      const isRequired = requireTags.has(tag);
                      const isAvoided = avoidTags.has(tag);
                      let stateClass = "hover:bg-accent text-foreground";
                      let iconColor = config ? config.color : "text-muted-foreground";
                      if (isRequired) { stateClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"; iconColor = "text-emerald-600 dark:text-emerald-400"; }
                      else if (isAvoided) { stateClass = "bg-rose-500/10 text-rose-700 dark:text-rose-400"; iconColor = "text-rose-600 dark:text-rose-400"; }

                      return (
                        <button key={tag} className={`w-full flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${stateClass}`} onClick={() => { if (!isRequired && !isAvoided) { setRequireTags(prev => new Set(prev).add(tag)); } else if (isRequired) { setRequireTags(prev => { const n = new Set(prev); n.delete(tag); return n; }); setAvoidTags(prev => new Set(prev).add(tag)); } else if (isAvoided) { setAvoidTags(prev => { const n = new Set(prev); n.delete(tag); return n; }); } }}>
                          <div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${iconColor}`} /><span className="text-xs font-medium capitalize">{config ? config.label : formatLabel(tag)}</span></div>
                          {isRequired && <Plus className="w-3.5 h-3.5 opacity-70" />}
                          {isAvoided && <Minus className="w-3.5 h-3.5 opacity-70" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={catalogFilter} onChange={(e) => setCatalogFilter(e.target.value)} className="h-8 text-xs pl-8" />
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {Object.entries(groupedCatalog).map(([category, items]) => {
            const filteredItems = items.filter((i) => {
              if (catalogFilter && !i.name.toLowerCase().includes(catalogFilter.toLowerCase()) && !i.sku.toLowerCase().includes(catalogFilter.toLowerCase())) return false;
              if (avoidTags.size > 0) { for (const a of i.allergens) { if (avoidTags.has(a)) return false; } for (const f of i.dietaryFlags) { if (avoidTags.has(f)) return false; } }
              if (requireTags.size > 0) { for (const tag of requireTags) { if (!i.allergens.includes(tag) && !i.dietaryFlags.includes(tag)) return false; } }
              return true;
            });
            if (filteredItems.length === 0) return null;
            return (
              <div key={category}>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5 mt-1">{category}</div>
                {filteredItems.map((item) => (
                  <Tooltip key={item.sku}>
                    <TooltipTrigger asChild>
                      <button onClick={() => onAddItem(item.sku)} className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-accent transition-colors group flex justify-between items-center">
                        <div className="min-w-0 flex-1 flex flex-col">
                          <div className="flex items-center gap-1.5"><span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.name}</span></div>
                          <div className="text-[10px] text-muted-foreground font-mono">{item.sku}</div>
                        </div>
                        <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-foreground shrink-0 ml-2">${item.basePrice.toFixed(2)}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs"><div>{item.name}</div><div className="text-muted-foreground">{item.sku}</div></TooltipContent>
                  </Tooltip>
                ))}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}