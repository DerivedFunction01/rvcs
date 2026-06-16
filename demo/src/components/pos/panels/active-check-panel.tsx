import { LineItemNode } from "@/components/pos/items/line-item-node";
import {
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useVCSStore } from "@/store/vcs-store";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { CombineDialog } from "@/components/pos/dialogs/combine-dialog";
import { SplitIntoLinesDialog } from "@/components/pos/dialogs/split-into-lines-dialog";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";
import { BulkActionsPanel } from "@/components/pos/panels/bulk-actions-panel";
import { POSHeaderPanel } from "@/components/pos/panels/pos-header-panel";

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
      <POSHeaderPanel
        projectedState={projectedState}
        guests={guests}
        resolveGuestName={resolveGuestName}
        formatNumber={formatNumber}
      />
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
      <BulkActionsPanel
        bulkActionsBarRef={bulkActionsBarRef}
        selectedLineIds={selectedLineIds}
        setSelectedLineIds={setSelectedLineIds}
        filteredRootItems={filteredRootItems}
        parsedStep={parsedStep}
        qtyStep={qtyStep}
        setQtyStep={setQtyStep}
        setQtyStepPadOpen={setQtyStepPadOpen}
        setQtyPadOpen={setQtyPadOpen}
        setSplitQtyDialogOpen={setSplitQtyDialogOpen}
        setSplitLineDialogOpen={setSplitLineDialogOpen}
        setDupMoveDialogOpen={setDupMoveDialogOpen}
        setCombineDialogOpen={setCombineDialogOpen}
        setAssignmentAllocationItems={setAssignmentAllocationItems}
        setAssignmentAllocationContext={setAssignmentAllocationContext}
        setAssignmentAllocationOpen={setAssignmentAllocationOpen}
        setPaymentAllocationItems={setPaymentAllocationItems}
        setPaymentAllocationContext={setPaymentAllocationContext}
        setPaymentAllocationOpen={setPaymentAllocationOpen}
        setFulfillmentAllocationItems={setFulfillmentAllocationItems}
        setFulfillmentAllocationContext={setFulfillmentAllocationContext}
        setFulfillmentAllocationOpen={setFulfillmentAllocationOpen}
        setModifierAddItem={setModifierAddItem}
        setModifierAddOpen={setModifierAddOpen}
        onGroupNoteOpen={onGroupNoteOpen}
        modifyItemsQty={modifyItemsQty}
        duplicateItems={duplicateItems}
        removeItems={removeItems}
        mergeItems={mergeItems}
        breakItems={breakItems}
        disableNonModActions={disableNonModActions}
        canMerge={canMerge}
        canBreak={canBreak}
        canCombine={canCombine}
        formatNumber={formatNumber}
        projectedState={projectedState}
        compatibleModifiers={compatibleModifiers}
        activeModifiersOnSelected={activeModifiersOnSelected}
      />

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
