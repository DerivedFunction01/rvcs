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
import type { NoteAllocation } from "@/lib/vcs/types";

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

  const existingNotes = React.useMemo(() => {
    return Object.values(store.projectedState.allocations)
      .filter((a) => a.type === "note")
      .map((a) => ({ id: a.allocationId, text: (a as any).text }));
  }, [store.projectedState.allocations]);

  const groupNoteContext = React.useMemo(() => {
    const selectedItems = selectedLineIdsArray
      .map((id) => store.projectedState.items[id])
      .filter(Boolean);

    const linkedNotes = new Map<string, { id: string; text: string }>();
    const orderedNotes = Object.values(store.projectedState.allocations).filter(
      (a): a is NoteAllocation => a.type === "note",
    );

    for (const note of orderedNotes) {
      if (
        selectedItems.some((item) => item.allocations.includes(note.allocationId))
      ) {
        linkedNotes.set(note.allocationId, {
          id: note.allocationId,
          text: note.text,
        });
      }
    }

    const linkedList = [...linkedNotes.values()];
    const selectedNoteId =
      linkedList.length === 1
        ? linkedList[0]?.id ?? null
        : linkedList[linkedList.length - 1]?.id ?? null;

    const mode: "edit" | "add" | "attach" =
      linkedList.length === 1
        ? "edit"
        : linkedList.length > 1
          ? "attach"
          : "add";

    return {
      mode,
      selectedNoteId,
    };
  }, [existingNotes, selectedLineIdsArray, store.projectedState.allocations, store.projectedState.items]);

  React.useEffect(() => {
    if (!dialogs.groupNoteOpen) return;
    dialogs.setGroupNoteMode(groupNoteContext.mode);
    dialogs.setGroupNoteSelectedNoteId(groupNoteContext.selectedNoteId);
  }, [
    dialogs.groupNoteOpen,
    dialogs.setGroupNoteMode,
    dialogs.setGroupNoteSelectedNoteId,
    groupNoteContext.mode,
    groupNoteContext.selectedNoteId,
  ]);

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
        onUpdateInlineQty={(sku, change, targetLineIds) => {
          const targets = targetLineIds || (dialogs.modifierAddItem ? [dialogs.modifierAddItem.lineId] : selectedLineIdsArray);
          const state = store.projectedState;
          const deltas: Delta[] = [];
          for (const parentId of targets) {
            const parent = state.items[parentId];
            if (parent) {
              const modChild = parent.children.find((c) => c.sku === sku);
              if (modChild) {
                const current = modChild.inlineQty ?? 1;
                const next = Math.round((current + change) * 1000) / 1000;
                if (next > 0) {
                  deltas.push({
                    action: DeltaActionType.ModifyInlineQty,
                    lineId: modChild.lineId,
                    beforeInlineQty: current,
                    afterInlineQty: next,
                  });
                } else {
                  deltas.push({
                    action: DeltaActionType.RemoveItem,
                    lineId: modChild.lineId,
                    qty: modChild.qty
                  });
                }
              } else if (change > 0) {
                deltas.push({
                  action: DeltaActionType.AddItem,
                  lineId: generateLineId(),
                  parentLineId: parentId,
                  sku: sku,
                  qty: 1,
                  inlineQty: change,
                  allocations: [],
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
        mode={dialogs.groupNoteMode}
        onModeChange={dialogs.setGroupNoteMode}
        selectedNoteId={dialogs.groupNoteSelectedNoteId ?? groupNoteContext.selectedNoteId}
        onCreateNote={actions.handleSaveGroupNote}
        onUpdateNote={actions.handleUpdateGroupNote}
        onAttachExisting={actions.handleAttachExistingGroupNote}
        selectedCount={dialogs.groupNoteLineIds.length}
        existingNotes={existingNotes}
      />
    </>
  );
}
