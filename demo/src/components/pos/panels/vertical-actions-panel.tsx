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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
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
  ListChecks,
  CheckSquare,
  Square,
  Layers,
  Copy,
  BringToFront,
  Combine,
  Unlink,
  PackageCheck,
  User,
  CreditCard,
  Clock,
  Equal,
  Split,
  ChevronLeft,
  HatGlasses,
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
  onSwapComboChoice: (
    lineId: string,
    parentLineId: string,
    slotSku: string,
  ) => void;
  onGroupNoteOpen: (ids: string[]) => void;

  // Selection props
  selectedLineIds: Set<string>;
  setSelectedLineIds: (ids: Set<string>) => void;
  filteredRootItems: any[];
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (mode: boolean) => void;

  // Advanced Action props
  onDuplicateItems: (ids: string[]) => void;
  onMergeItems: (ids: string[]) => void;
  onBreakItems: (ids: string[]) => void;
  onCombineOpen: () => void;
  onDupMoveOpen: () => void;
  onAssignGuestOpen: () => void;
  onAssignPaymentOpen: () => void;
  onAssignFulfillmentOpen: () => void;
  onModifyItemsQty: (ids: string[], change: number) => void;
  onSetQtyPadOpen: () => void;
  onSplitOpen: () => void;
  disableNonModActions: boolean;
  canMerge: boolean;
  canBreak: boolean;
  canCombine: boolean;
  onEditModifiersBulk: () => void;
  canEditModifiersBulk: boolean;
  isHypotheticalMode: boolean;
  onEnterHypothetical: () => void;
  onExitHypothetical: () => void;
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

  // Selection
  selectedLineIds,
  setSelectedLineIds,
  filteredRootItems,
  isMultiSelectMode,
  setIsMultiSelectMode,

  // Advanced Actions
  onDuplicateItems,
  onMergeItems,
  onBreakItems,
  onCombineOpen,
  onDupMoveOpen,
  onAssignGuestOpen,
  onAssignPaymentOpen,
  onAssignFulfillmentOpen,
  onModifyItemsQty,
  onSetQtyPadOpen,
  onSplitOpen,
  disableNonModActions,
  canMerge,
  canBreak,
  canCombine,
  onEditModifiersBulk,
  canEditModifiersBulk,
  isHypotheticalMode,
  onEnterHypothetical,
  onExitHypothetical,
}: VerticalActionsPanelProps) {
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [trayMode, setTrayMode] = useState<"item" | "advanced">("item");

  const isSearchActive = !!catalogFilter.trim();
  const isFilterActive =
    requireTags.size + avoidTags.size > 0 || isSearchActive;

  // Single item calculations (for item mode)
  const item = selectedItems.length === 1 ? selectedItems[0] : null;
  const catalogEntry = item ? catalog[item.sku] : null;

  const parentItem = item?.parentLineId
    ? projectedState.items[item.parentLineId]
    : null;
  const isComboLinkedChild =
    !!parentItem && !!catalog[parentItem.sku]?.comboChoices?.length;

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
    return (
      pCatalogEntry?.comboChoices?.find(
        (choice) => choice.optionSku === item.sku,
      ) ?? null
    );
  }, [isComboLinkedChild, item, projectedState, catalog]);

  const canSwitchCombo = !!comboSwapTarget;

  // Multi-item checks (for advanced mode)
  const hasSelection = selectedLineIds.size > 0;

  return (
    <TooltipProvider>
      <aside
        id="vertical-actions-panel"
        className="w-20 border-l-2 border-r-2 border-l-slate-300 border-r-slate-300 dark:border-l-slate-700 dark:border-r-slate-700 bg-card/90 backdrop-blur-sm flex flex-col shrink-0 h-full overflow-hidden z-10 shadow-sm"
      >
        {/* SECTION 0: SEARCH & FILTER (Always at the very top) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isFilterActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterDialogOpen(true)}
              className={`h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none transition-all relative ${
                isFilterActive
                  ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Filter className="w-4 h-4" />
              {isFilterActive && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-primary rounded-full border border-background" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Search & Filter
          </TooltipContent>
        </Tooltip>

        {/* Hypothetical / What-if Mode Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isHypotheticalMode ? "secondary" : "ghost"}
              size="sm"
              onClick={
                isHypotheticalMode ? onExitHypothetical : onEnterHypothetical
              }
              className={`h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none transition-all ${
                isHypotheticalMode
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <HatGlasses className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {isHypotheticalMode
              ? "End What-If Session"
              : "Start What-If Session"}
          </TooltipContent>
        </Tooltip>

        {/* SHARED ACTIONS SECTION (Always visible, adapts function based on mode) */}

        {/* 2. Add Note */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={trayMode === "item" ? !item : !hasSelection}
              onClick={() => {
                if (trayMode === "item") {
                  if (item) onGroupNoteOpen([item.lineId]);
                } else {
                  onGroupNoteOpen(Array.from(selectedLineIds));
                }
              }}
              className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
            >
              <StickyNote className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {trayMode === "item"
              ? !item
                ? "Select exactly one item to add a note"
                : `Add note to ${item.name}`
              : !hasSelection
                ? "Select items to add note"
                : "Add note to selected items"}
          </TooltipContent>
        </Tooltip>

        {/* 3. Duplicate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={
                trayMode === "item"
                  ? !item || disableNonModActions
                  : !hasSelection || disableNonModActions
              }
              onClick={() => {
                if (trayMode === "item") {
                  if (item) onDuplicateItems([item.lineId]);
                } else {
                  onDuplicateItems(Array.from(selectedLineIds));
                }
              }}
              className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {trayMode === "item"
              ? !item
                ? "Select exactly one item to duplicate"
                : `Duplicate ${item.name}`
              : !hasSelection
                ? "Select items to duplicate"
                : "Duplicate selected items"}
          </TooltipContent>
        </Tooltip>

        {/* 4. Dup & Move */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={
                trayMode === "item"
                  ? !item || disableNonModActions
                  : !hasSelection || disableNonModActions
              }
              onClick={onDupMoveOpen}
              className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
            >
              <BringToFront className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {trayMode === "item"
              ? !item
                ? "Select exactly one item to duplicate & move"
                : `Duplicate & move ${item.name}`
              : !hasSelection
                ? "Select items to duplicate & move"
                : "Duplicate & move selected items"}
          </TooltipContent>
        </Tooltip>

        {/* 5. Split */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={
                trayMode === "item"
                  ? !item || disableNonModActions
                  : !hasSelection || disableNonModActions
              }
              onClick={onSplitOpen}
              className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
            >
              <Split className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {trayMode === "item"
              ? !item
                ? "Select exactly one item to split"
                : `Split ${item.name}`
              : !hasSelection
                ? "Select items to split"
                : "Split selected items"}
          </TooltipContent>
        </Tooltip>

        {/* SECTION 2: TRAY SWITCHER */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={trayMode === "advanced" ? "secondary" : "ghost"}
              size="sm"
              className={`h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none transition-all ${
                trayMode === "advanced"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setTrayMode((prev) => {
                  const next = prev === "item" ? "advanced" : "item";
                  if (next === "item") {
                    setIsMultiSelectMode(false);
                    if (selectedLineIds.size > 1) {
                      const first = Array.from(selectedLineIds)[0];
                      setSelectedLineIds(new Set([first]));
                    }
                  }
                  return next;
                });
              }}
            >
              <Layers className="w-4.5 h-4.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs font-semibold">
            {trayMode === "item"
              ? "Show Advanced Actions"
              : "Show Item Actions"}
          </TooltipContent>
        </Tooltip>

        {/* SECTION 1: SELECTION CONTROLS (Only visible in advanced/multi-select mode) */}
        {trayMode === "advanced" && (
          <>
            <div className="flex flex-col w-full animate-in fade-in duration-200">
              {/* Multi-Select Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMultiSelectMode ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none transition-all ${
                      isMultiSelectMode
                        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                      const next = !isMultiSelectMode;
                      setIsMultiSelectMode(next);
                      if (!next && selectedLineIds.size > 1) {
                        const first = Array.from(selectedLineIds)[0];
                        setSelectedLineIds(new Set([first]));
                      }
                    }}
                  >
                    <ListChecks className="w-4.5 h-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {isMultiSelectMode
                    ? "Disable Multi-Select"
                    : "Enable Multi-Select"}
                </TooltipContent>
              </Tooltip>

              {/* Select All / Clear Selection */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => {
                      if (hasSelection) {
                        setSelectedLineIds(new Set());
                      } else if (isMultiSelectMode) {
                        setSelectedLineIds(
                          new Set(filteredRootItems.map((i) => i.lineId)),
                        );
                      }
                    }}
                    disabled={!hasSelection && !isMultiSelectMode}
                  >
                    {hasSelection ? (
                      <CheckSquare className="w-4.5 h-4.5 text-primary" />
                    ) : (
                      <Square className="w-4.5 h-4.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {hasSelection ? "Clear Selection" : "Select All Items"}
                </TooltipContent>
              </Tooltip>
            </div>
          </>
        )}

        {/* SECTION 3: ACTIONS TRAY */}
        <div className="flex-1 flex flex-col w-full overflow-y-auto">
          {trayMode === "item" ? (
            /* TRAY A: DEFAULT SINGLE ITEM ACTIONS */
            <>
              {/* Allocation Config */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!item}
                    onClick={() => item && onAllocConfig(item)}
                    className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {!item
                    ? "Select exactly one item to configure allocations"
                    : `Configure allocations for ${item.name}`}
                </TooltipContent>
              </Tooltip>

              {/* Switch Combo Choice */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!item || !canSwitchCombo}
                    onClick={() => {
                      if (item && comboSwapTarget && item.parentLineId) {
                        onSwapComboChoice(
                          item.lineId,
                          item.parentLineId,
                          comboSwapTarget.slotSku,
                        );
                      }
                    }}
                    className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
                  >
                    <Workflow className="w-4 h-4" />
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
            </>
          ) : (
            /* TRAY B: ADVANCED MULTI-SELECT/BATCH ACTIONS */
            <>
              {/* Merge Identical */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      !hasSelection || disableNonModActions || !canMerge
                    }
                    onClick={() => onMergeItems(Array.from(selectedLineIds))}
                    className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
                  >
                    <Combine className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {!hasSelection
                    ? "Select identical items to merge"
                    : !canMerge
                      ? "Selected items cannot be merged"
                      : "Merge identical items"}
                </TooltipContent>
              </Tooltip>

              {/* Break Combo */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      !hasSelection || disableNonModActions || !canBreak
                    }
                    onClick={() => onBreakItems(Array.from(selectedLineIds))}
                    className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {!hasSelection
                    ? "Select combo to break"
                    : !canBreak
                      ? "Selected items cannot be broken"
                      : "Break combo package"}
                </TooltipContent>
              </Tooltip>

              {/* Combine to Combo */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      !hasSelection || disableNonModActions || !canCombine
                    }
                    onClick={onCombineOpen}
                    className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
                  >
                    <PackageCheck className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {!hasSelection
                    ? "Select items to combine"
                    : !canCombine
                      ? "Selected items cannot be combined"
                      : "Bundle items into combo package"}
                </TooltipContent>
              </Tooltip>

              {/* Assign Guest */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!hasSelection || disableNonModActions}
                    onClick={onAssignGuestOpen}
                    className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
                  >
                    <User className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {!hasSelection
                    ? "Select items to assign guest"
                    : "Assign Guest to selected items"}
                </TooltipContent>
              </Tooltip>

              {/* Assign Payment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!hasSelection || disableNonModActions}
                    onClick={onAssignPaymentOpen}
                    className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
                  >
                    <CreditCard className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {!hasSelection
                    ? "Select items to assign payment"
                    : "Assign Payment to selected items"}
                </TooltipContent>
              </Tooltip>

              {/* Assign Fulfillment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!hasSelection || disableNonModActions}
                    onClick={onAssignFulfillmentOpen}
                    className="h-16 w-full p-0 border-b border-t-0 border-x-0 border-border/80 rounded-none hover:bg-accent disabled:opacity-30 text-muted-foreground hover:text-foreground"
                  >
                    <Clock className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {!hasSelection
                    ? "Select items to assign fulfillment"
                    : "Assign Fulfillment to selected items"}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </aside>

      {/* Unified Search & Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
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
                {isFilterActive && (
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
                  let stateClass =
                    "hover:bg-accent text-foreground bg-card border";
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
              onClick={() => setFilterDialogOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
