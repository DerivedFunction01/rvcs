import React from "react";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";
import { SplitQtyDialog } from "@/components/pos/dialogs/split-qty-dialog";
import type { usePostTerminalQtyDialogs } from "@/components/pos/screens/hooks/use-post-terminal-qty-dialogs";
import type { usePostTerminalActions } from "@/components/pos/screens/hooks/use-post-terminal-actions";

export function PosQtyDialogs({
  dialogs,
  actions,
  selectedItemsLength,
  firstSelectedQty,
  maxSelectedQty,
  selectedQtys = [],
  increment,
}: {
  dialogs: ReturnType<typeof usePostTerminalQtyDialogs>;
  actions: ReturnType<typeof usePostTerminalActions>;
  selectedItemsLength: number;
  firstSelectedQty: number | null;
  maxSelectedQty: number;
  selectedQtys: number[];
  increment?: number;
}) {
  return (
    <>
      <NumberPadDialog
        open={dialogs.qtyPadOpen}
        onOpenChange={dialogs.setQtyPadOpen}
        title="Set Quantity"
        description="Enter the quantity to apply to all selected items."
        confirmLabel="Set Qty"
        initialValue={selectedItemsLength === 1 ? firstSelectedQty : null}
        min={increment ?? 1}
        increment={increment}
        onConfirm={actions.handleSetBulkQty}
      />
      <SplitQtyDialog
        open={dialogs.splitQtyDialogOpen}
        onOpenChange={dialogs.setSplitQtyDialogOpen}
        maxQty={maxSelectedQty}
        selectedQtys={selectedQtys}
        increment={increment}
        onConfirm={actions.handleSplitQty}
      />
    </>
  );
}