import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AllocationContext } from "@/lib/pos/types";
import type { CatalogItemEntry, ProjectedState } from "@/lib/vcs/types";
import {
  BringToFront,
  Combine,
  Copy,
  Equal,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  RotateCcw,
  Split,
  Trash2,
  Unlink,
  XCircle,
} from "lucide-react";
import React from "react";

export interface BulkActionsPanelProps {
  bulkActionsBarRef: React.RefObject<HTMLDivElement | null>;
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
  mergeItems: (ids: string[]) => void;
  breakItems: (ids: string[]) => string[];
  disableNonModActions: boolean;
  canMerge: boolean;
  canBreak: boolean;
  canCombine: boolean;
  formatNumber: (val: number) => string;
  projectedState: ProjectedState;
  compatibleModifiers: CatalogItemEntry[];
  activeModifiersOnSelected: any[];
}

export function BulkActionsPanel({
  bulkActionsBarRef,
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
}: BulkActionsPanelProps) {
  if (selectedLineIds.size === 0) return null;

  return (
    <div
      ref={bulkActionsBarRef}
      className="mx-4 my-2 p-3 bg-card/85 backdrop-blur-md border rounded-xl shadow-lg flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-200 shrink-0"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
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
          <span className="text-xs font-semibold text-foreground select-none">
            {selectedLineIds.size} selected
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => setSelectedLineIds(new Set())}
        >
          <XCircle className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/30 border p-1 rounded-lg">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 select-none">
            Qty
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => {
              modifyItemsQty(Array.from(selectedLineIds), -parsedStep);
            }}
            disabled={disableNonModActions}
          >
            <Minus className="w-3.5 h-3.5 mr-1" />
          </Button>
          <button
            className={`h-7 w-14 text-[11px] px-2 font-mono font-medium border shadow-sm rounded-md transition-colors flex items-center justify-center ${disableNonModActions ? "bg-muted/50 text-muted-foreground opacity-50 cursor-not-allowed" : "bg-background hover:bg-accent cursor-pointer"}`}
            onClick={() => !disableNonModActions && setQtyStepPadOpen(true)}
            disabled={disableNonModActions}
          >
            {qtyStep === "" ? "1" : formatNumber(Number(qtyStep))}
          </button>
          {qtyStep !== 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 bg-background border shadow-sm hover:bg-accent shrink-0"
              onClick={() => setQtyStep(1)}
              title="Reset to 1"
              disabled={disableNonModActions}
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => {
              modifyItemsQty(Array.from(selectedLineIds), parsedStep);
            }}
            disabled={disableNonModActions}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => setQtyPadOpen(true)}
            disabled={disableNonModActions}
          >
            <Equal className="w-3.5 h-3.5 mr-1" />
            Set Qty
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => setSplitQtyDialogOpen(true)}
            disabled={disableNonModActions}
          >
            <Split className="w-3.5 h-3.5 mr-1" />
            Split Qty
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => setSplitLineDialogOpen(true)}
            disabled={disableNonModActions}
          >
            <Split className="w-3.5 h-3.5 mr-1" />
            Split Line
          </Button>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 border p-1 rounded-lg">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 select-none">
            Action
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => {
              const newIds = duplicateItems(Array.from(selectedLineIds));
              if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
            }}
            disabled={disableNonModActions}
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            Duplicate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => setDupMoveDialogOpen(true)}
            disabled={disableNonModActions}
          >
            <BringToFront className="w-3.5 h-3.5 mr-1" />
            Duplicate & Move
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium hover:bg-destructive/90"
            onClick={() => {
              removeItems(Array.from(selectedLineIds));
              setSelectedLineIds(new Set());
            }}
            disabled={disableNonModActions}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Remove
          </Button>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 border p-1 rounded-lg">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 select-none">
            Transform
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => {
              mergeItems(Array.from(selectedLineIds));
              setSelectedLineIds(new Set());
            }}
            disabled={disableNonModActions || !canMerge}
          >
            <Combine className="w-3.5 h-3.5 mr-1" />
            Merge
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => {
              const newIds = breakItems(Array.from(selectedLineIds));
              if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
            }}
            disabled={disableNonModActions || !canBreak}
          >
            <Unlink className="w-3.5 h-3.5 mr-1" />
            Break
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => setCombineDialogOpen(true)}
            disabled={disableNonModActions || !canCombine}
          >
            <PackageCheck className="w-3.5 h-3.5 mr-1" />
            Combine
          </Button>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 border p-1 rounded-lg">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 select-none">
            Assign
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
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
            Guest
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
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
            Payment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
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
            Fulfillment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm hover:bg-accent"
            onClick={() => onGroupNoteOpen(Array.from(selectedLineIds))}
            disabled={disableNonModActions}
          >
            Group Note
          </Button>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 border p-1 rounded-lg">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 select-none">
            Mods
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] px-2.5 font-medium bg-background border shadow-sm text-primary hover:bg-primary/5 gap-1"
            onClick={() => {
              setModifierAddItem(null);
              setModifierAddOpen(true);
            }}
            disabled={compatibleModifiers.length === 0 && activeModifiersOnSelected.length === 0}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        </div>
      </div>
    </div>
  );
}