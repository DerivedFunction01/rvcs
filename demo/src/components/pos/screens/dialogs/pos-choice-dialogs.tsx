import React from "react";
import { toast } from "sonner";
import { ChoiceDialog } from "@/components/pos/dialogs/choice-dialog";
import { useVCSStore } from "@/store/vcs-store";
import type { usePostTerminalDialogs } from "@/components/pos/screens/hooks/use-post-terminal-dialogs";
import type { usePostTerminalQtyDialogs } from "@/components/pos/screens/hooks/use-post-terminal-qty-dialogs";
import type { usePostTerminalCatalog } from "@/components/pos/screens/hooks/use-post-terminal-catalog";

export function PosChoiceDialogs({
  dialogs,
  qtyDialogs,
  catalogData,
  guestChoiceOptions,
  selectedLineIds,
  setSelectedLineIds,
}: {
  dialogs: ReturnType<typeof usePostTerminalDialogs>;
  qtyDialogs: ReturnType<typeof usePostTerminalQtyDialogs>;
  catalogData: ReturnType<typeof usePostTerminalCatalog>;
  guestChoiceOptions: any[];
  selectedLineIds: Set<string>;
  setSelectedLineIds: (ids: Set<string>) => void;
}) {
  const store = useVCSStore();

  return (
    <>
      <ChoiceDialog
        open={!!dialogs.swapChoiceState}
        onOpenChange={(open) => {
          if (!open) dialogs.setSwapChoiceState(null);
        }}
        title={`Swap ${catalogData.slotName}`}
        description="Select an alternative option to swap for this slot."
        options={catalogData.swapOptions}
        extraToggle={{
          label: "Retain compatible modifiers (e.g. extra cheese)",
          checked: dialogs.retainModifiersDuringSwap,
          onCheckedChange: dialogs.setRetainModifiersDuringSwap,
        }}
        onChoose={(option) => {
          if (dialogs.swapChoiceState) {
            const [optionSku, modifierSku] = option.id.split(":");
            store.swapComboChoice(
              dialogs.swapChoiceState.lineId,
              dialogs.swapChoiceState.parentLineId,
              optionSku,
              modifierSku || undefined,
              dialogs.retainModifiersDuringSwap,
            );
            dialogs.setSwapChoiceState(null);
            toast.success("Combo choice updated");
          }
        }}
      />

      <ChoiceDialog
        open={qtyDialogs.dupMoveDialogOpen}
        onOpenChange={qtyDialogs.setDupMoveDialogOpen}
        title="Duplicate and Move"
        description="Choose a guest to duplicate the selected items to."
        searchPlaceholder="Search guests..."
        options={guestChoiceOptions}
        onChoose={(option) => {
          const newIds = store.duplicateAndReassignItems(Array.from(selectedLineIds), option.id);
          if (newIds && newIds.length > 0) {
            setSelectedLineIds(new Set(newIds));
          } else {
            setSelectedLineIds(new Set());
          }
          qtyDialogs.setDupMoveDialogOpen(false);
          toast.success(`Selected items duplicated and moved to ${option.label}`);
        }}
      />
    </>
  );
}