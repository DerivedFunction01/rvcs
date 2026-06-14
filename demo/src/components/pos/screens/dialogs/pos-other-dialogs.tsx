import React from "react";
import { toast } from "sonner";
import { CustomerEditDialog } from "@/components/pos/dialogs/customer-edit-dialog";
import { NoteDialog } from "@/components/pos/dialogs/note-dialog";
import { ModifierAddDialog } from "@/components/pos/dialogs/modifier-add-dialog";
import { GroupNoteDialog } from "@/components/pos/dialogs/group-note-dialog";
import { ChoiceDialog } from "@/components/pos/dialogs/choice-dialog";
import { useVCSStore } from "@/store/vcs-store";
import type { usePostTerminalDialogs } from "@/components/pos/screens/hooks/use-post-terminal-dialogs";
import type { usePostTerminalActions } from "@/components/pos/screens/hooks/use-post-terminal-actions";
import type { usePostTerminalCatalog } from "@/components/pos/screens/hooks/use-post-terminal-catalog";

export function PosOtherDialogs({
  dialogs,
  actions,
  catalogData,
  orderContext,
  isComboChildItem,
  selectedLineIdsSize,
  selectedLineIdsArray,
}: {
  dialogs: ReturnType<typeof usePostTerminalDialogs>;
  actions: ReturnType<typeof usePostTerminalActions>;
  catalogData: ReturnType<typeof usePostTerminalCatalog>;
  orderContext: any;
  isComboChildItem: boolean;
  selectedLineIdsSize: number;
  selectedLineIdsArray: string[];
}) {
  const store = useVCSStore();

  return (
    <>
      <CustomerEditDialog
        open={dialogs.customerDialogOpen}
        onOpenChange={dialogs.setCustomerDialogOpen}
        orderType={orderContext?.orderType}
        customerFields={orderContext?.customerFields || {}}
        onSave={actions.handleSaveCustomerFields}
      />
      <NoteDialog
        open={dialogs.noteDialogOpen}
        onOpenChange={dialogs.setNoteDialogOpen}
        noteItem={dialogs.noteItem}
        isComboChildItem={isComboChildItem}
        onSave={actions.handleSaveNote}
      />
      <ModifierAddDialog
        open={dialogs.modifierAddOpen}
        onOpenChange={dialogs.setModifierAddOpen}
        itemName={dialogs.modifierAddItem ? dialogs.modifierAddItem.name : `${selectedLineIdsSize} selected items`}
        modifiers={dialogs.modifierAddItem ? catalogData.singleItemCompatibleModifiers : catalogData.compatibleModifiers}
        onAdd={(sku, defaultState) => {
          if (dialogs.modifierAddItem) store.addModifier(dialogs.modifierAddItem.lineId, sku, defaultState);
          else store.addGroupModifier(selectedLineIdsArray, sku, defaultState);
        }}
      />
      <GroupNoteDialog
        open={dialogs.groupNoteOpen}
        onOpenChange={dialogs.setGroupNoteOpen}
        onSave={actions.handleSaveGroupNote}
        selectedCount={dialogs.groupNoteLineIds.length}
      />
      <ChoiceDialog
        open={dialogs.removeModDialogOpen}
        onOpenChange={dialogs.setRemoveModDialogOpen}
        title="Remove Modifier"
        description="Choose a modifier to remove from all selected items."
        searchPlaceholder="Search modifiers..."
        options={catalogData.removeModChoiceOptions}
        onChoose={(option) => {
          store.removeGroupModifier(selectedLineIdsArray, option.id);
          toast.success(`Removed modifier ${option.label} in bulk`);
        }}
      />
    </>
  );
}