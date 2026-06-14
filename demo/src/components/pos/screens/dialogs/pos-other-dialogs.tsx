import React from "react";
import { toast } from "sonner";
import { CustomerEditDialog } from "@/components/pos/dialogs/customer-edit-dialog";
import { NoteDialog } from "@/components/pos/dialogs/note-dialog";
import { ModifierAddDialog } from "@/components/pos/dialogs/modifier-add-dialog";
import { GroupNoteDialog } from "@/components/pos/dialogs/group-note-dialog";
import { Delta, DeltaActionType } from "@/lib/vcs/types";
import { generateLineId } from "@/lib/vcs/id";
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

  const parentItems = React.useMemo(() => {
    if (dialogs.modifierAddItem) {
      const liveItem = store.projectedState.items[dialogs.modifierAddItem.lineId];
      return liveItem ? [liveItem] : [dialogs.modifierAddItem];
    }
    return selectedLineIdsArray
      .map((id) => store.projectedState.items[id])
      .filter(Boolean);
  }, [dialogs.modifierAddItem, selectedLineIdsArray, store.projectedState.items]);

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
        onAdd={(sku, defaultState, targetLineIds) => {
          const targets = targetLineIds || (dialogs.modifierAddItem ? [dialogs.modifierAddItem.lineId] : selectedLineIdsArray);
          store.addGroupModifier(targets, sku, defaultState);
        }}
        onRemove={(sku, targetLineIds) => {
          const targets = targetLineIds || (dialogs.modifierAddItem ? [dialogs.modifierAddItem.lineId] : selectedLineIdsArray);
          store.removeGroupModifier(targets, sku);
          toast.success(dialogs.modifierAddItem ? `Removed modifier` : `Removed modifier in bulk`);
        }}
        onUpdateState={(sku, newState, targetLineIds) => {
          const targets = targetLineIds || (dialogs.modifierAddItem ? [dialogs.modifierAddItem.lineId] : selectedLineIdsArray);
          const state = store.projectedState;
          const deltas: Delta[] = [];
          for (const parentId of targets) {
            const parent = state.items[parentId];
            if (parent) {
              const modChild = parent.children.find((c) => c.sku === sku);
              if (modChild) {
                if (modChild.selectedModifierState !== newState) {
                  deltas.push({
                    action: DeltaActionType.ModifyModifierState,
                    lineId: modChild.lineId,
                    beforeState: modChild.selectedModifierState,
                    afterState: newState,
                  });
                }
              } else {
                deltas.push({
                  action: DeltaActionType.AddItem,
                  lineId: generateLineId(),
                  parentLineId: parentId,
                  sku: sku,
                  qty: 1,
                  allocations: [],
                  selectedModifierState: newState,
                });
              }
            }
          }
          if (deltas.length > 0) {
            store.commitDeltas(deltas, "pos-ui");
          }
        }}
        parentItems={parentItems}
      />
      <GroupNoteDialog
        open={dialogs.groupNoteOpen}
        onOpenChange={dialogs.setGroupNoteOpen}
        onSave={actions.handleSaveGroupNote}
        selectedCount={dialogs.groupNoteLineIds.length}
      />
    </>
  );
}