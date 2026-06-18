"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AllocationContext } from "@/lib/pos/types";
import type { CatalogItemEntry, ProjectedState } from "@/lib/vcs/types";
import {
  BringToFront,
  Clock,
  Combine,
  Copy,
  CreditCard,
  Equal,
  Layers,
  Minus,
  PackageCheck,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  RotateCcw,
  Split,
  StickyNote,
  Trash2,
  Unlink,
  User,
} from "lucide-react";
import React from "react";

export interface BulkActionsPanelProps {
  selectedLineIds: Set<string>;
  setSelectedLineIds: (ids: Set<string>) => void;
  filteredRootItems: any[];
  parsedStep: number;
  qtyStep: number | "";
  setQtyStep: (val: number | "") => void;
  setQtyStepPadOpen: (open: boolean) => void;
  setQtyPadOpen: (open: boolean) => void;
  setSplitQtyDialogOpen: (open: boolean) => void;
  setSplitLineDialogOpen: (open: boolean) => void;
  setDupMoveDialogOpen: (open: boolean) => void;
  setCombineDialogOpen: (open: boolean) => void;
  setAssignmentAllocationItems: (items: any[]) => void;
  setAssignmentAllocationContext: (ctx: AllocationContext) => void;
  setAssignmentAllocationOpen: (open: boolean) => void;
  setPaymentAllocationItems: (items: any[]) => void;
  setPaymentAllocationContext: (ctx: AllocationContext) => void;
  setPaymentAllocationOpen: (open: boolean) => void;
  setFulfillmentAllocationItems: (items: any[]) => void;
  setFulfillmentAllocationContext: (ctx: AllocationContext) => void;
  setFulfillmentAllocationOpen: (open: boolean) => void;
  setModifierAddItem: (item: any) => void;
  setModifierAddOpen: (open: boolean) => void;
  onGroupNoteOpen: (ids: string[]) => void;
  modifyItemsQty: (ids: string[], change: number) => void;
  duplicateItems: (ids: string[]) => string[];
  removeItems: (ids: string[]) => void;
  mergeItems: (ids: string[]) => string[];
  breakItems: (ids: string[]) => string[];
  disableNonModActions: boolean;
  canMerge: boolean;
  canBreak: boolean;
  canCombine: boolean;
  formatNumber: (val: number) => string;
  projectedState: ProjectedState;
  compatibleModifiers: CatalogItemEntry[];
  activeModifiersOnSelected: any[];
  isBulkActionsCollapsed: boolean;
  setIsBulkActionsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (mode: boolean) => void;
  autoSelectLastClickedItem: boolean;
  setAutoSelectLastClickedItem: (val: boolean) => void;
}

export function BulkActionsPanel({
  selectedLineIds,
  setSelectedLineIds,
  filteredRootItems,
  parsedStep,
  qtyStep,
  setQtyStep,
  setQtyStepPadOpen,
  setQtyPadOpen,
  setSplitQtyDialogOpen,
  setSplitLineDialogOpen,
  setDupMoveDialogOpen,
  setCombineDialogOpen,
  setAssignmentAllocationItems,
  setAssignmentAllocationContext,
  setAssignmentAllocationOpen,
  setPaymentAllocationItems,
  setPaymentAllocationContext,
  setPaymentAllocationOpen,
  setFulfillmentAllocationItems,
  setFulfillmentAllocationContext,
  setFulfillmentAllocationOpen,
  setModifierAddItem,
  setModifierAddOpen,
  onGroupNoteOpen,
  modifyItemsQty,
  duplicateItems,
  removeItems,
  mergeItems,
  breakItems,
  disableNonModActions,
  canMerge,
  canBreak,
  canCombine,
  formatNumber,
  projectedState,
  compatibleModifiers,
  activeModifiersOnSelected,
  isBulkActionsCollapsed,
  setIsBulkActionsCollapsed,
  isMultiSelectMode,
  setIsMultiSelectMode,
  autoSelectLastClickedItem,
  setAutoSelectLastClickedItem,
}: BulkActionsPanelProps) {
  return (
    <aside
      id="bulk-actions"
      className={`bg-card flex flex-col shrink-0 transition-all duration-200 ${isBulkActionsCollapsed ? "w-0 overflow-hidden border-l-0" : "w-80 border-l"}`}
    >
      {/* Header */}
      <div
        className={`p-3 border-b flex ${isBulkActionsCollapsed ? "flex-col items-center gap-3" : "items-center justify-between gap-2"}`}
      >
        {isBulkActionsCollapsed ? (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsBulkActionsCollapsed(false)}
                  >
                    <Layers className="w-4 h-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Bulk Actions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsBulkActionsCollapsed((prev: any) => !prev)}
              title="Expand bulk actions"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Bulk Actions
            </h2>
            <div className="flex items-center gap-1.5">
              {selectedLineIds.size > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {selectedLineIds.size} Selected
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsBulkActionsCollapsed((prev: any) => !prev)}
                title="Minimize bulk actions"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Select All Row */}
      {!isBulkActionsCollapsed && (
        <div className="px-3 py-2 border-b bg-muted/20 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={isMultiSelectMode}
                onCheckedChange={(c) => {
                  setIsMultiSelectMode(!!c);
                  if (!c && selectedLineIds.size > 1) {
                    const first = Array.from(selectedLineIds)[0];
                    setSelectedLineIds(new Set([first]));
                  }
                }}
              />
              <span className="text-xs font-semibold text-muted-foreground">
                Multi-Select Mode
              </span>
            </label>
            {selectedLineIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedLineIds(new Set())}
              >
                Clear selection
              </Button>
            )}
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer select-none pt-1 border-t border-muted-foreground/10">
            <Checkbox
              checked={autoSelectLastClickedItem}
              onCheckedChange={(c) => setAutoSelectLastClickedItem(!!c)}
            />
            <span className="text-[11px] font-medium text-muted-foreground">
              Auto-Select Last Clicked Item
            </span>
          </label>

          {isMultiSelectMode && (
            <label className="flex items-center gap-2 cursor-pointer select-none pt-1 border-t border-muted-foreground/10">
              <Checkbox
                checked={
                  selectedLineIds.size > 0 &&
                  selectedLineIds.size === filteredRootItems.length
                }
                onCheckedChange={(c) => {
                  if (c)
                    setSelectedLineIds(
                      new Set(filteredRootItems.map((i: any) => i.lineId)),
                    );
                  else setSelectedLineIds(new Set());
                }}
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                Select All ({filteredRootItems.length})
              </span>
            </label>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {!isBulkActionsCollapsed && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-4">
            {selectedLineIds.size === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground/60 flex flex-col items-center justify-center gap-2">
                <Layers className="w-8 h-8 text-muted-foreground/30" />
                <span className="font-medium">No items selected</span>
                <p className="text-[10px] text-muted-foreground/45 max-w-50 leading-normal mt-1">
                  Select one or more items in the active check to perform batch edits, transformations, or guest assignments.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Quantity Adjustments */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                    Quantity adjustments
                  </span>
                  <div className="p-2.5 bg-muted/30 border rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        className="h-10 w-10 p-0 shrink-0 shadow-sm hover:bg-accent"
                        onClick={() => {
                          modifyItemsQty(Array.from(selectedLineIds), -parsedStep);
                        }}
                        disabled={disableNonModActions}
                        title={`Decrease by ${parsedStep}`}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <button
                        className={`flex-1 h-10 px-3 flex items-center justify-center gap-1.5 border shadow-sm rounded-lg font-mono font-bold text-xs transition-colors ${disableNonModActions ? "bg-muted/50 text-muted-foreground opacity-50 cursor-not-allowed" : "bg-background hover:bg-accent"}`}
                        onClick={() => !disableNonModActions && setQtyStepPadOpen(true)}
                        disabled={disableNonModActions}
                      >
                        <span className="text-[10px] font-medium text-muted-foreground">Step:</span>
                        <span>{qtyStep === "" ? "1" : formatNumber(Number(qtyStep))}</span>
                        {qtyStep !== 1 && (
                          <div
                            className="p-1 rounded hover:bg-muted text-muted-foreground ml-auto shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQtyStep(1);
                            }}
                            title="Reset step to 1"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                      <Button
                        variant="outline"
                        className="h-10 w-10 p-0 shrink-0 shadow-sm hover:bg-accent"
                        onClick={() => {
                          modifyItemsQty(Array.from(selectedLineIds), parsedStep);
                        }}
                        disabled={disableNonModActions}
                        title={`Increase by ${parsedStep}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1 border-t border-border/40">
                      <Button
                        variant="outline"
                        className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                        onClick={() => setQtyPadOpen(true)}
                        disabled={disableNonModActions}
                      >
                        <Equal className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-xs">Set Exact Quantity</span>
                          <span className="text-[9px] text-muted-foreground font-normal">Overwrites current quantity</span>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                        onClick={() => setSplitQtyDialogOpen(true)}
                        disabled={disableNonModActions}
                      >
                        <Split className="w-4 h-4 text-muted-foreground rotate-90 shrink-0" />
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-xs">Split Quantity</span>
                          <span className="text-[9px] text-muted-foreground font-normal">Divide a line's qty into two</span>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                        onClick={() => setSplitLineDialogOpen(true)}
                        disabled={disableNonModActions}
                      >
                        <Split className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-xs">Split Line to Units</span>
                          <span className="text-[9px] text-muted-foreground font-normal">Break lines into multiple units of 1</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 2. Core Actions */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                    Core actions
                  </span>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                      onClick={() => {
                        const newIds = duplicateItems(Array.from(selectedLineIds));
                        if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
                      }}
                      disabled={disableNonModActions}
                    >
                      <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">Duplicate</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Clone selected items in-place</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                      onClick={() => setDupMoveDialogOpen(true)}
                      disabled={disableNonModActions}
                    >
                      <BringToFront className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">Duplicate & Move</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Clone and assign to another guest</span>
                      </div>
                    </Button>

                    <Button
                      variant="destructive"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-destructive/90 flex items-center gap-3 shadow-xs"
                      onClick={() => {
                        removeItems(Array.from(selectedLineIds));
                        setSelectedLineIds(new Set());
                      }}
                      disabled={disableNonModActions}
                    >
                      <Trash2 className="w-4 h-4 text-white shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs text-white">Remove Items</span>
                        <span className="text-[9px] text-destructive-foreground/85 font-normal">Void or delete from check</span>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* 3. Transformations */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                    Transformations
                  </span>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                      onClick={() => {
                        const survivorIds = mergeItems(Array.from(selectedLineIds));
                        if (survivorIds && survivorIds.length > 0) {
                          setSelectedLineIds(new Set(survivorIds));
                        } else {
                          setSelectedLineIds(new Set());
                        }
                      }}
                      disabled={disableNonModActions || !canMerge}
                    >
                      <Combine className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">Merge Identical</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Combine identical items together</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                      onClick={() => {
                        const newIds = breakItems(Array.from(selectedLineIds));
                        if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
                      }}
                      disabled={disableNonModActions || !canBreak}
                    >
                      <Unlink className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">Break Combo</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Split package into single parts</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                      onClick={() => setCombineDialogOpen(true)}
                      disabled={disableNonModActions || !canCombine}
                    >
                      <PackageCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">Combine to Combo</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Bundle selected items into package</span>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* 4. Assignments */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                    Assignments
                  </span>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                      onClick={() => {
                        setAssignmentAllocationItems(
                          Array.from(selectedLineIds)
                            .map((id) => projectedState.items[id as string])
                            .filter(Boolean),
                        );
                        setAssignmentAllocationContext(AllocationContext.Group);
                        setAssignmentAllocationOpen(true);
                      }}
                      disabled={disableNonModActions}
                    >
                      <User className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">Assign Guest</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Allocate items to specific seat</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                      onClick={() => {
                        setPaymentAllocationItems(
                          Array.from(selectedLineIds)
                            .map((id) => projectedState.items[id as string])
                            .filter(Boolean),
                        );
                        setPaymentAllocationContext(AllocationContext.Group);
                        setPaymentAllocationOpen(true);
                      }}
                      disabled={disableNonModActions}
                    >
                      <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">Assign Payment</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Split or route check allocations</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                      onClick={() => {
                        setFulfillmentAllocationItems(
                          Array.from(selectedLineIds)
                            .map((id) => projectedState.items[id as string])
                            .filter(Boolean),
                        );
                        setFulfillmentAllocationContext(AllocationContext.Group);
                        setFulfillmentAllocationOpen(true);
                      }}
                      disabled={disableNonModActions}
                    >
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">Assign Fulfillment</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Configure delivery or pick-up rules</span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 shadow-xs"
                      onClick={() => onGroupNoteOpen(Array.from(selectedLineIds))}
                      disabled={disableNonModActions}
                    >
                      <StickyNote className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs">Add Group Note</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Add notes/comments to items</span>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* 5. Modifiers */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                    Modifiers
                  </span>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start px-3 text-left hover:bg-accent/60 flex items-center gap-3 border-primary/20 hover:border-primary/45 shadow-xs"
                      onClick={() => {
                        setModifierAddItem(null);
                        setModifierAddOpen(true);
                      }}
                      disabled={compatibleModifiers.length === 0 && activeModifiersOnSelected.length === 0}
                    >
                      <Pencil className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs text-primary">Edit Modifiers</span>
                        <span className="text-[9px] text-muted-foreground font-normal">Manage ingredients and options</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}