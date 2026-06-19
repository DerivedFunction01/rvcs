"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search,
  Filter,
  Plus,
  Minus,
  Info,
  Trash2,
  Pencil,
  StickyNote,
  Settings2,
  Workflow,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { formatLabel } from "@/lib/pos/ui-utils";
import type { IconConfig } from "@/store/vcs-store";
import type { CatalogItemEntry, ProjectedLineItem } from "@/lib/vcs/types";
import { Dispatch, SetStateAction, useState, useMemo } from "react";

interface VerticalActionsPanelProps {
  catalogFilter: string;
  setCatalogFilter: Dispatch<SetStateAction<string>>;
  requireTags: Set<string>;
  avoidTags: Set<string>;
  setRequireTags: Dispatch<SetStateAction<Set<string>>>;
  setAvoidTags: Dispatch<SetStateAction<Set<string>>>;
  availableTags: string[];
  iconConfigs: Record<string, IconConfig>;
  selectedItems: ProjectedLineItem[];
  catalog: Record<string, CatalogItemEntry>;
  compatibleModifiers: CatalogItemEntry[];
  projectedState: any;
  onRemoveModifier: (lineId: string) => void;
  onEditModifiers: (item: ProjectedLineItem) => void;
  onAllocConfig: (item: ProjectedLineItem) => void;
  onSwapComboChoice: (lineId: string, parentLineId: string, slotSku: string) => void;
  onGroupNoteOpen: (ids: string[]) => void;
}

export function VerticalActionsPanel({
  catalogFilter,
  setCatalogFilter,
  requireTags,
  avoidTags,
  setRequireTags,
  setAvoidTags,
  availableTags,
  iconConfigs,
  selectedItems,
  catalog,
  compatibleModifiers,
  projectedState,
  onRemoveModifier,
  onEditModifiers,
  onAllocConfig,
  onSwapComboChoice,
  onGroupNoteOpen,
}: VerticalActionsPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const activeFiltersCount = requireTags.size + avoidTags.size;
  const isSearchActive = !!catalogFilter.trim();
  const isActive = isSearchActive || activeFiltersCount > 0;

  // Single item calculations
  const item = selectedItems.length === 1 ? selectedItems[0] : null;
  const catalogEntry = item ? catalog[item.sku] : null;

  const parentItem = item?.parentLineId ? projectedState.items[item.parentLineId] : null;
  const isComboLinkedChild = !!parentItem && !!catalog[parentItem.sku]?.comboChoices?.length;

  const hasEditableModifiers = useMemo(() => {
    if (!item || !catalogEntry) return false;
    return (
      (catalogEntry.allowedModifiers?.length ?? 0) > 0 ||
      compatibleModifiers.length > 0 ||
      item.children.some((child) => {
        const childEntry = catalog[child.sku];
        return !!childEntry && childEntry.basePrice === 0;
      })
    );
  }, [item, catalogEntry, compatibleModifiers, catalog]);

  const comboSwapTarget = useMemo(() => {
    if (!isComboLinkedChild || !item || !item.parentLineId) return null;
    const pItem = projectedState.items[item.parentLineId];
    const pCatalogEntry = pItem ? catalog[pItem.sku] : null;
    return pCatalogEntry?.comboChoices?.find((choice) => choice.optionSku === item.sku) ?? null;
  }, [isComboLinkedChild, item, projectedState, catalog]);

  const canSwitchCombo = !!comboSwapTarget;

  return (
    <aside id="vertical-actions-panel" className="w-16 border-r bg-card/90 backdrop-blur-sm flex flex-col items-center py-4 gap-4 shrink-0 h-full overflow-hidden z-10 shadow-sm">
      {/* Search & Filter Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setDialogOpen(true)}
            className={`h-10 w-10 p-0 rounded-xl transition-all relative ${
              isActive
                ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="w-5 h-5" />
            {isActive && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          Search & Filter
        </TooltipContent>
      </Tooltip>

      {/* Divider */}
      <div className="w-10 border-b border-border/80" />

      {/* Item Lifecycle Context Actions */}

      {/* Edit Modifiers */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!item || !hasEditableModifiers}
            onClick={() => item && onEditModifiers(item)}
            className="h-10 w-10 p-0 rounded-xl hover:bg-accent disabled:opacity-30 text-primary"
            title=""
          >
            <Pencil className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {!item
            ? "Select exactly one item to edit modifiers"
            : !hasEditableModifiers
            ? "No editable modifiers available"
            : `Edit modifiers for ${item.name}`}
        </TooltipContent>
      </Tooltip>

      {/* Add Note */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!item}
            onClick={() => item && onGroupNoteOpen([item.lineId])}
            className="h-10 w-10 p-0 rounded-xl hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
            title=""
          >
            <StickyNote className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {!item ? "Select exactly one item to add a note" : `Add note to ${item.name}`}
        </TooltipContent>
      </Tooltip>

      {/* Allocation Config */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!item}
            onClick={() => item && onAllocConfig(item)}
            className="h-10 w-10 p-0 rounded-xl hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
            title=""
          >
            <Settings2 className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {!item ? "Select exactly one item to configure allocations" : `Configure allocations for ${item.name}`}
        </TooltipContent>
      </Tooltip>

      {/* Switch Choice (Combo Swap) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!item || !canSwitchCombo}
            onClick={() => {
              if (item && comboSwapTarget && item.parentLineId) {
                onSwapComboChoice(item.lineId, item.parentLineId, comboSwapTarget.slotSku);
              }
            }}
            className="h-10 w-10 p-0 rounded-xl hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
            title=""
          >
            <Workflow className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {!item
            ? "Select exactly one item to switch"
            : !canSwitchCombo
            ? "No alternate combo choice available"
            : `Switch combo choice for ${item.name}`}
        </TooltipContent>
      </Tooltip>

      {/* Remove Item */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!item || isComboLinkedChild}
            onClick={() => item && onRemoveModifier(item.lineId)}
            className="h-10 w-10 p-0 rounded-xl hover:bg-destructive/15 text-destructive disabled:opacity-30"
            title=""
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {!item
            ? "Select exactly one item to remove"
            : isComboLinkedChild
            ? "Combo-linked children cannot be removed here"
            : `Remove ${item.name}`}
        </TooltipContent>
      </Tooltip>

      {/* Unified Search & Filter Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 max-h-[90vh] flex flex-col">
          <DialogHeader className="space-y-1.5 pb-2 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Filter className="w-5 h-5 text-primary" />
              Search & Filter Catalog
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Search by name/SKU, or filter by allergen and dietary flags.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Search Input section */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> Search Catalog
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items or SKUs..."
                  value={catalogFilter}
                  onChange={(e) => setCatalogFilter(e.target.value)}
                  className="h-11 pl-9 pr-9 text-sm"
                  autoFocus
                />
                {catalogFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCatalogFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-xs text-muted-foreground hover:bg-accent rounded-md"
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Filter tags section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs md:text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Filter by Tags
                </label>
                {isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold rounded-lg"
                    onClick={() => {
                      setCatalogFilter("");
                      setRequireTags(new Set());
                      setAvoidTags(new Set());
                    }}
                  >
                    Clear All
                  </Button>
                )}
              </div>
              
              <div className="max-h-[30vh] sm:max-h-60 overflow-y-auto pt-1.5 space-y-1.5 pr-1 border rounded-xl p-2 bg-muted/20">
                {availableTags.map((tag) => {
                  const config = iconConfigs[tag];
                  const Icon = config
                    ? (LucideIcons as any)[config.icon] || Info
                    : Info;
                  const isRequired = requireTags.has(tag);
                  const isAvoided = avoidTags.has(tag);
                  let stateClass = "hover:bg-accent text-foreground bg-card border";
                  let iconColor = config
                    ? config.color
                    : "text-muted-foreground";
                  if (isRequired) {
                    stateClass =
                      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
                    iconColor = "text-emerald-600 dark:text-emerald-400";
                  } else if (isAvoided) {
                    stateClass =
                      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
                    iconColor = "text-rose-600 dark:text-rose-400";
                  }

                  return (
                    <button
                      key={tag}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-left text-xs md:text-sm font-semibold ${stateClass}`}
                      onClick={() => {
                        if (!isRequired && !isAvoided) {
                          setRequireTags((prev) => new Set(prev).add(tag));
                        } else if (isRequired) {
                          setRequireTags((prev) => {
                            const n = new Set(prev);
                            n.delete(tag);
                            return n;
                          });
                          setAvoidTags((prev) => new Set(prev).add(tag));
                        } else if (isAvoided) {
                          setAvoidTags((prev) => {
                            const n = new Set(prev);
                            n.delete(tag);
                            return n;
                          });
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                        <span className="capitalize">
                          {config ? config.label : formatLabel(tag)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {isRequired && (
                          <Plus className="w-4 h-4 text-emerald-600 opacity-90" />
                        )}
                        {isAvoided && (
                          <Minus className="w-4 h-4 text-rose-600 opacity-90" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end pt-3 border-t shrink-0">
            <Button
              className="h-10 text-sm font-semibold px-5"
              onClick={() => setDialogOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
