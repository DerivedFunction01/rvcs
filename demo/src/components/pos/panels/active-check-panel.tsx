import { LineItemNode } from "@/components/pos/items/line-item-node";
import {
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useVCSStore } from "@/store/vcs-store";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
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
    isMultiSelectMode,
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
  } = props;

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
                  else {
                    if (!isMultiSelectMode) {
                      newSet.clear();
                    }
                    newSet.add(lineId);
                  }
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
    </main>
  );
}
