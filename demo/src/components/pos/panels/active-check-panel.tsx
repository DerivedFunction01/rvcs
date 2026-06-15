import { LineItemNode } from "@/components/pos/items/line-item-node";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator as SeparatorUI } from "@/components/ui/separator";
import { AllocationContext } from "@/lib/pos/types";
import { getGuestColor } from "@/lib/pos/ui-utils";
import {
  AlertCircle,
  ChevronDown,
  Copy,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  User,
  Split,
  XCircle,
  BringToFront,
  Combine,
  Equal,
  Pencil,
  RotateCcw,
  Unlink,
  PackageCheck,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useVCSStore } from "@/store/vcs-store";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { CombineDialog } from "@/components/pos/dialogs/combine-dialog";
import { SplitIntoLinesDialog } from "@/components/pos/dialogs/split-into-lines-dialog";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";

export function ActiveCheckPanel(props: any) {
  const {
    activeBranch,
    mainBranchName,
    isMergedToMain,
    isViewingHistory,
    projectedState,
    guests,
    resolveGuestName,
    hideCanceled,
    detailLevel,
    isCompactMode,
    filteredRootItems,
    resolvedAllocations,
    defaultPaymentAllocId,
    removeItem,
    handleOpenModifierDialog,
    handleOpenNoteDialog,
    handleAllocConfig,
    handleOpenSwapDialog,
    modifierItems,
    selectedLineIds,
    setSelectedLineIds,
    handleSelectToggle,
    collapsedItems,
    handleToggleCollapse,
    checklistRef,
    bulkActionsBarRef,
    modifyItemsQty,
    mergeItems,
    breakItems,
    combineItems,
    splitItemsIntoIncrements,
    setQtyPadOpen,
    setSplitQtyDialogOpen,
    duplicateItems,
    setDupMoveDialogOpen,
    removeItems,
    setAssignmentAllocationItems,
    setAssignmentAllocationContext,
    setAssignmentAllocationOpen,
    setPaymentAllocationItems,
    setPaymentAllocationContext,
    setPaymentAllocationOpen,
    setFulfillmentAllocationItems,
    setFulfillmentAllocationContext,
    setFulfillmentAllocationOpen,
    compatibleModifiers,
    setModifierAddItem,
    setModifierAddOpen,
    activeModifiersOnSelected,
    onGroupNoteOpen,
  } = props;

  const catalog = useVCSStore((s) => s.catalog);

  const { canMerge, canBreak, canCombine } = useMemo(() => {
    let canMerge = false;
    let canBreak = false;
    let canCombine = false;

    if (selectedLineIds.size === 0) return { canMerge, canBreak, canCombine };

    const selectedItems = Array.from(selectedLineIds)
      .map((id) => projectedState.items[id as string])
      .filter(Boolean);

    // Check Merge
    if (selectedItems.length >= 2) {
      const getSignature = (item: any): string => {
        const childrenSig = item.children
          .filter((c: any) => c.status !== "canceled")
          .map((c: any) => getSignature(c))
          .sort()
          .join("|");
        const allocSig = [...item.allocations].sort().join(",");
        return `${item.sku}::${item.inlineQty}::${item.selectedModifierState}::${allocSig}::${childrenSig}`;
      };
      
      const sigs = new Set<string>();
      for (const item of selectedItems) {
        if (item.status !== "canceled") {
          const sig = getSignature(item);
          if (sigs.has(sig)) {
            const entry = catalog[item.sku];
            if (!entry?.inlineQtyMainQtyLocked) {
              canMerge = true;
              break;
            }
          }
          sigs.add(sig);
        }
      }
    }

    // Check Break
    for (const item of selectedItems) {
      if (item.status !== "canceled") {
        const entry = catalog[item.sku];
        if (entry?.comboChoices && entry.comboChoices.length > 0) {
          canBreak = true;
          break;
        }
      }
    }

    // Check Combine
    if (selectedItems.length >= 2) {
      const combos = Object.values(catalog).filter(
        (c) => c.type === "item" && c.category === "combo" && c.comboChoices && c.comboChoices.length > 0
      );
      
      for (const combo of combos) {
        const increment = combo.mainQtyIncrement ?? 1;

        const slots: Record<string, Array<{ optionSku: string, reqQty: number }>> = {};
        for (const choice of combo.comboChoices!) {
          if (!slots[choice.slotSku]) slots[choice.slotSku] = [];
          slots[choice.slotSku].push({ optionSku: choice.optionSku, reqQty: choice.qty ?? 1 });
        }
        const requiredSlots = Object.keys(slots);
        
        const availablePool = selectedItems
          .filter((item) => item.status !== "canceled")
          .map((item) => ({ sku: item.sku, qty: item.qty }));
        
        let matchedAll = true;
        for (const slotSku of requiredSlots) {
          const options = slots[slotSku];
          let matchedOption = false;

          for (const option of options) {
            const needed = option.reqQty * increment;
            const poolItemIdx = availablePool.findIndex(p => p.sku === option.optionSku && p.qty >= needed - 0.0001);
            if (poolItemIdx !== -1) {
              availablePool[poolItemIdx].qty -= needed;
              matchedOption = true;
              break;
            }
          }

          if (!matchedOption) {
            matchedAll = false;
            break;
          }
        }
        
        if (matchedAll) {
          canCombine = true;
          break;
        }
      }
    }

    return { canMerge, canBreak, canCombine };
  }, [selectedLineIds, projectedState.items, catalog]);

  const [qtyStep, setQtyStep] = useState<number | "">(1);
  const parsedStep = Number(qtyStep) || 1;
  const [combineDialogOpen, setCombineDialogOpen] = useState(false);
  const [splitLineDialogOpen, setSplitLineDialogOpen] = useState(false);
  const [qtyStepPadOpen, setQtyStepPadOpen] = useState(false);

  const disableNonModActions = useMemo(() => {
    for (const id of selectedLineIds) {
      const item = projectedState.items[id as string];
      if (item && item.parentLineId) return true;
    }
    return false;
  }, [selectedLineIds, projectedState.items]);

  const maxSelectedQty = useMemo(() => {
    let max = 0;
    for (const id of selectedLineIds) {
      const item = projectedState.items[id as string];
      if (item && item.qty > max) max = item.qty;
    }
    return max;
  }, [selectedLineIds, projectedState.items]);

  const selectedQtys = useMemo(() => {
    const qtys: number[] = [];
    for (const id of selectedLineIds) {
      const item = projectedState.items[id as string];
      if (item) qtys.push(item.qty);
    }
    return qtys;
  }, [selectedLineIds, projectedState.items]);

  const selectedIncrement = useMemo(() => {
    if (selectedLineIds.size === 0) return 1;
    const firstId = Array.from(selectedLineIds)[0] as string;
    const firstItem = projectedState.items[firstId];
    if (!firstItem) return 1;
    const firstInc = catalog[firstItem.sku]?.mainQtyIncrement ?? 1;
    let allSame = true;
    for (const id of selectedLineIds) {
      const item = projectedState.items[id as string];
      if (item && (catalog[item.sku]?.mainQtyIncrement ?? 1) !== firstInc) {
        allSame = false;
        break;
      }
    }
    return allSame ? firstInc : 1;
  }, [selectedLineIds, projectedState.items, catalog]);

  const formatNumber = useFormatNumber();

  return (
    <main className="flex-1 flex flex-col min-w-0">
      <div className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold">Active Check</h2>
        </div>
        <div className="flex items-center gap-4">
          {(() => {
            const breakdown = projectedState.financials.personBreakdown;
            const sorted = [
              ...breakdown.filter((pb: any) => pb.subtotal > 0),
            ].sort((a, b) => b.subtotal - a.subtotal);
            if (sorted.length === 0) return null;
            return (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1.5 bg-background border hover:bg-accent"
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Paying Guests ({sorted.length})</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Paying Guests Breakdown</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {sorted.map((pb: any) => (
                      <div
                        key={pb.person}
                        className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: getGuestColor(pb.person, guests) }}
                          />
                          <span className="truncate font-medium">
                            {resolveGuestName(pb.person)}
                          </span>
                        </div>
                        <span className="font-mono font-semibold tabular-nums ml-2">
                          ${formatNumber(pb.subtotal, 2, 10)}
                        </span>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            );
          })()}
          <SeparatorUI orientation="vertical" className="h-8" />
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Subtotal
            </div>
            <div className="font-mono font-bold text-sm tabular-nums text-muted-foreground">
              ${formatNumber(projectedState.financials.subtotal, 2, 10)}
            </div>
          </div>
          {projectedState.financials.chargeTotal > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-right hover:bg-accent px-1 rounded transition-colors cursor-pointer flex flex-col items-end">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
                    Tax & Fees <ChevronDown className="w-2.5 h-2.5" />
                  </div>
                  <div className="font-mono font-bold text-sm tabular-nums text-muted-foreground">
                    ${formatNumber(projectedState.financials.chargeTotal, 2, 10)}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-l p-3" align="end">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Charge Breakdown
                  </h4>
                  <div className="space-y-1">
                    {projectedState.financials.chargeBreakdown.map(
                      (charge: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-xs"
                        >
                          <span className="truncate pr-2 text-muted-foreground">
                            {charge.label}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            ${formatNumber(charge.chargeAmount, 2, 10)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <div className="text-right bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
            <div className="text-[10px] text-primary/80 uppercase tracking-wider font-bold">
              Total
            </div>
            <div className="font-mono font-bold text-lg tabular-nums text-primary leading-tight">
              ${formatNumber(projectedState.financials.grandTotal, 2, 10)}
            </div>
          </div>
        </div>
      </div>
      {(activeBranch === mainBranchName || isMergedToMain) &&
        !isViewingHistory && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/50 px-6 py-2.5 flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong className="font-semibold uppercase tracking-wider text-[10px] mr-1.5">
                {activeBranch === mainBranchName
                  ? "Read-Only Trunk:"
                  : "Merged Branch:"}
              </strong>
              {activeBranch === mainBranchName
                ? "Main is purely a read-only place. Any modifications made here will automatically create a new draft branch to protect the main ledger."
                : "This branch has already been merged into main and is read-only. Any modifications made here will automatically create a new draft branch."}
            </p>
          </div>
        )}
      <div ref={checklistRef} className="flex-1 overflow-y-auto">
        {filteredRootItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
            <ShoppingCart className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">No items in check</p>
            <p className="text-xs mt-1">
              Select items from the catalog to begin
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredRootItems.map((item: any) => (
              <LineItemNode
                key={item.lineId}
                item={item}
                allocations={resolvedAllocations}
                defaultPaymentAllocId={defaultPaymentAllocId}
                onRemove={removeItem}
                onAddModifier={handleOpenModifierDialog}
                onAddNote={handleOpenNoteDialog}
                onAllocConfig={handleAllocConfig}
                onSwapComboChoice={handleOpenSwapDialog}
                onDuplicateItem={(lineId) => {
                  const newId = useVCSStore.getState().duplicateItem(lineId);
                  if (newId) setSelectedLineIds(new Set([newId]));
                  toast.success("Item duplicated");
                }}
                depth={0}
                modifiers={modifierItems}
                guests={guests}
                isSelected={selectedLineIds.has(item.lineId)}
                selectedLineIds={selectedLineIds}
                onSelectToggle={(lineId) => {
                  const newSet = new Set(selectedLineIds);
                  if (newSet.has(lineId)) newSet.delete(lineId);
                  else newSet.add(lineId);
                  setSelectedLineIds(newSet);
                }}
                isCollapsed={collapsedItems.has(item.lineId)}
                onToggleCollapse={handleToggleCollapse}
                collapsedItems={collapsedItems}
                detailLevel={detailLevel}
                isCompactMode={isCompactMode}
                hideCanceled={hideCanceled}
              />
            ))}
          </div>
        )}
      </div>
      {selectedLineIds.size > 0 && (
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
      )}

      <CombineDialog
        open={combineDialogOpen}
        onOpenChange={setCombineDialogOpen}
        selectedItems={Array.from(selectedLineIds).map(id => projectedState.items[id as string]).filter(Boolean)}
        catalog={useVCSStore.getState().catalog}
        onCombine={(requests) => {
          const newIds = combineItems(requests);
          if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
        }}
      />
      <SplitIntoLinesDialog
        open={splitLineDialogOpen}
        onOpenChange={setSplitLineDialogOpen}
        maxQty={maxSelectedQty}
        selectedQtys={selectedQtys}
        increment={selectedIncrement}
        onConfirm={(val) => {
          const newIds = splitItemsIntoIncrements(Array.from(selectedLineIds), val);
          if (newIds && newIds.length > 0) setSelectedLineIds(new Set(newIds));
        }}
      />
      <NumberPadDialog
        open={qtyStepPadOpen}
        onOpenChange={setQtyStepPadOpen}
        title="Quantity Increment"
        description="Set the increment step for bulk quantity adjustments"
        initialValue={qtyStep === "" ? 1 : Number(qtyStep)}
        min={selectedIncrement}
        increment={selectedIncrement}
        onConfirm={(val) => setQtyStep(val)}
      />
    </main>
  );
}
