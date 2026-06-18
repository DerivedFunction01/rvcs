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
                  <p>Advanced Actions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsBulkActionsCollapsed((prev: any) => !prev)}
              title="Expand Advanced Actions"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Advanced Actions
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
                title="Minimize Advanced Actions"
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
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Minus className="w-3.5 h-3.5" />
                    Quantity adjustments
                  </span>

                  {/* Main +/- Control */}
                  <div className="flex items-stretch rounded-xl border bg-background shadow-sm overflow-hidden h-14">
                    <Button
                      variant="ghost"
                      className="h-full w-14 rounded-none border-r hover:bg-muted"
                      onClick={() => {
                        modifyItemsQty(Array.from(selectedLineIds), -parsedStep);
                      }}
                      disabled={disableNonModActions}
                      title={`Decrease by ${parsedStep}`}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    <button
                      className={`flex-1 min-h-0 self-stretch flex flex-col items-center justify-center gap-0.5 bg-muted/10 px-2 py-1 transition-colors ${disableNonModActions ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/20"}`}
                      onClick={() => !disableNonModActions && setQtyStepPadOpen(true)}
                      disabled={disableNonModActions}
                      title="Tap to set step"
                    >
                      <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-wide">Step</span>
                      <span className="text-xl font-mono font-bold text-foreground leading-none">{qtyStep === "" ? "1" : formatNumber(Number(qtyStep))}</span>
                      {qtyStep !== 1 && (
                        <div
                          className="absolute p-1 rounded hover:bg-muted text-muted-foreground"
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
                      variant="ghost"
                      className="h-full w-14 rounded-none border-l hover:bg-muted"
                      onClick={() => {
                        modifyItemsQty(Array.from(selectedLineIds), parsedStep);
                      }}
                      disabled={disableNonModActions}
                      title={`Increase by ${parsedStep}`}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Set/Split Options - Two Column */}
                  <div className="grid grid-cols-2 gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-12 flex flex-col items-center justify-center gap-1 shadow-xs hover:bg-accent/60"
                            onClick={() => setQtyPadOpen(true)}
                            disabled={disableNonModActions}
                          >
                            <Equal className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Set Exact</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Overwrites current quantity</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-12 flex flex-col items-center justify-center gap-1 shadow-xs hover:bg-accent/60"
                            onClick={() => setSplitQtyDialogOpen(true)}
                            disabled={disableNonModActions}
                          >
                            <Split className="w-4 h-4 text-muted-foreground rotate-90" />
                            <span className="text-[10px] font-semibold leading-tight">Split Qty</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Divide a line's qty into two</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="col-span-2 h-12 flex flex-col items-center justify-center gap-1 shadow-xs hover:bg-accent/60"
                            onClick={() => setSplitLineDialogOpen(true)}
                            disabled={disableNonModActions}
                          >
                            <Split className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Split to Units</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Break lines into multiple units of 1</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* 2. Core Actions */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                    Core actions
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
                            onClick={() => {
                              const newIds = duplicateItems(Array.from(selectedLineIds));
                              if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
                            }}
                            disabled={disableNonModActions}
                          >
                            <Copy className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Duplicate</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clone selected items in-place</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
                            onClick={() => setDupMoveDialogOpen(true)}
                            disabled={disableNonModActions}
                          >
                            <BringToFront className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Dup & Move</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clone and assign to another guest</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            className="col-span-2 h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-destructive/90"
                            onClick={() => {
                              removeItems(Array.from(selectedLineIds));
                              setSelectedLineIds(new Set());
                            }}
                            disabled={disableNonModActions}
                          >
                            <Trash2 className="w-5 h-5" />
                            <span className="text-[10px] font-semibold leading-tight">Remove Items</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Void or delete from check</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* 3. Transformations */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                    Transformations
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
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
                            <Combine className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Merge Identical</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Combine identical items together</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
                            onClick={() => {
                              const newIds = breakItems(Array.from(selectedLineIds));
                              if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
                            }}
                            disabled={disableNonModActions || !canBreak}
                          >
                            <Unlink className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Break Combo</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Split package into single parts</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="col-span-2 h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
                            onClick={() => setCombineDialogOpen(true)}
                            disabled={disableNonModActions || !canCombine}
                          >
                            <PackageCheck className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Combine to Combo</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Bundle selected items into package</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* 4. Assignments */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                    Assignments
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
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
                            <User className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Assign Guest</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Allocate items to specific seat</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
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
                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Assign Payment</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Split or route check allocations</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
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
                            <Clock className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Assign Fulfillment</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Configure delivery or pick-up rules</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="col-span-2 h-14 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:bg-accent/60"
                            onClick={() => onGroupNoteOpen(Array.from(selectedLineIds))}
                            disabled={disableNonModActions}
                          >
                            <StickyNote className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[10px] font-semibold leading-tight">Add Group Note</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add notes/comments to items</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* 5. Modifiers */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                    Modifiers
                  </span>
                  <div className="grid grid-cols-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-14 flex flex-col items-center justify-center gap-1.5 border-primary/20 hover:border-primary/45 shadow-xs hover:bg-accent/60"
                            onClick={() => {
                              setModifierAddItem(null);
                              setModifierAddOpen(true);
                            }}
                            disabled={compatibleModifiers.length === 0 && activeModifiersOnSelected.length === 0}
                          >
                            <Pencil className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-semibold text-primary leading-tight">Edit Modifiers</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage ingredients and options</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
