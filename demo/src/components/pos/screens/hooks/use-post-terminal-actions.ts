import { useCallback } from "react";
import { toast } from "sonner";
import { useVCSStore } from "@/store/vcs-store";
import { formatFulfillmentTime } from "@/lib/pos/utils";
import {
  BranchType,

  PaymentStrategyType,
  type ProjectedLineItem,
  SquashType,
  TimeBlockType,
} from "@/lib/vcs/types";
import { HistoryOpType } from "@/lib/pos/types";
import { type OrderContext, PaymentUpdateMode, SplitQtyType } from "@/lib/pos/types";

export function usePostTerminalActions({
  selectedPerson,
  resolveGuestName,
  storeGuests,
  orderContext,
  defaultPaymentMethod,
  selectedLineIds,
  setSelectedLineIds,
  groupNoteLineIds,
  viewingHash,
  historyOpDialog,
  setHistoryOpDialog,
  branchToConfig,
  noteItem,
  setNoteDialogOpen,
  setShowResetConfirm,
  setAddGuestOpen,
}: {
  selectedPerson: string;
  resolveGuestName: (idOrName: string) => string;
  storeGuests: Array<{ id: string; name: string }>;
  orderContext: OrderContext | null;
  defaultPaymentMethod: string;
  selectedLineIds: Set<string>;
  setSelectedLineIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  groupNoteLineIds: string[];
  viewingHash: string | null;
  historyOpDialog: { type: HistoryOpType; targetHash: string; label: string; description: string } | null;
  setHistoryOpDialog: (dialog: null) => void;
  branchToConfig: string | null;
  noteItem: ProjectedLineItem | null;
  setNoteDialogOpen: (open: boolean) => void;
  setShowResetConfirm: (open: boolean) => void;
  setAddGuestOpen: (open: boolean) => void;
}) {
  const {
    addItemWithDefaults,
    reassignItem,
    updateFulfillmentAllocation,
    splitItemPayment,
    resetItemPaymentToDefault,
    setItemsQty,
    addGroupNote,
    removeGroupNote,
    cleanupStaleNotes,
    attachNoteToOrder,
    createBranch,
    resetOrder,
    squashPendingCommits,
    resetToCommit,
    renameBranch,
    updateBranchConfig,
  } = useVCSStore();

  const handleConfirmHistoryOp = useCallback(
    (squashType?: SquashType) => {
      if (!historyOpDialog) return;
      try {
        if (historyOpDialog.type === HistoryOpType.Squash) {
          squashPendingCommits(
            historyOpDialog.targetHash,
            squashType || SquashType.Light,
          );
          toast.success(
            squashType === SquashType.Full
              ? "Commits squashed to a single commit"
              : "Net-zero items removed from pending history",
          );
        } else if (historyOpDialog.type === HistoryOpType.Reset) {
          resetToCommit(historyOpDialog.targetHash);
          toast.success("Branch reset to selected commit");
        }
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setHistoryOpDialog(null);
      }
    },
    [historyOpDialog, squashPendingCommits, resetToCommit, setHistoryOpDialog],
  );

  const handleSaveCustomerFields = useCallback(
    (fields: Record<string, string>) => {
      useVCSStore.getState().updateOrderContext({ customerFields: fields });
      const newNameRaw = fields.name?.trim();
      if (newNameRaw) {
        const primaryGuest = storeGuests[0];
        if (primaryGuest && primaryGuest.name !== newNameRaw) {
          useVCSStore.getState().updateGuest(primaryGuest.id, newNameRaw);
        }
      }
      toast.success("Customer info updated");
    },
    [storeGuests],
  );

  const handleSaveBranchConfig = useCallback(
    (newName: string, type: BranchType, label: string) => {
      if (!branchToConfig) return;
      try {
        if (newName !== branchToConfig) {
          renameBranch(branchToConfig, newName);
          toast.success(`Branch "${branchToConfig}" renamed to "${newName}"`);
        }
        updateBranchConfig(newName, { type, label });
        toast.success(`Branch configuration saved`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [branchToConfig, renameBranch, updateBranchConfig],
  );

  const handleSaveNote = useCallback(
    (text: string, linkToComboBase: boolean) => {
      if (!noteItem || !text.trim()) return;
      if (noteItem.sku === "custom_note") {
        useVCSStore
          .getState()
          .modifyModifierState(
            noteItem.lineId,
            noteItem.selectedModifierState,
            text.trim(),
          );
        toast.success("Note updated");
      } else {
        const parentId =
          linkToComboBase && noteItem.parentLineId
            ? noteItem.parentLineId
            : noteItem.lineId;
        useVCSStore
          .getState()
          .addModifier(parentId, "custom_note", text.trim());
        toast.success("Note added");
      }
      setNoteDialogOpen(false);
    },
    [noteItem, setNoteDialogOpen],
  );

  const handleAddGuestFromDialog = useCallback((name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    const guestId = useVCSStore.getState().addGuest(trimmed);
    toast.success(`${trimmed} added to the order`);
    return guestId;
  }, []);

  const handleAddItem = useCallback(
    (sku: string) => {
      addItemWithDefaults(sku, 1, selectedPerson);
      toast.success(`Added to ${resolveGuestName(selectedPerson)}'s order`);
    },
    [addItemWithDefaults, selectedPerson, resolveGuestName],
  );

  const handleReassign = useCallback(
    (lineId: string, newAssigneeIds: string) => {
      const names = newAssigneeIds
        .split(",")
        .map((id) => {
          const g = storeGuests.find((g) => g.id === id.trim());
          return g ? g.name : id.trim();
        })
        .join(" + ");
      reassignItem(lineId, newAssigneeIds);
      toast.success(`Reassigned to ${names}`);
    },
    [reassignItem, storeGuests],
  );

  const handleUpdateFulfillment = useCallback(
    (lineId: string, timeType: TimeBlockType, calculatedAt: string | null) => {
      updateFulfillmentAllocation(lineId, timeType, calculatedAt);
      toast.success(
        timeType === TimeBlockType.Immediate
          ? "Fulfillment scheduled: on confirmation"
          : `Fulfillment scheduled for ${formatFulfillmentTime(calculatedAt!, orderContext?.initiatedAt)}`,
      );
    },
    [updateFulfillmentAllocation, orderContext?.initiatedAt],
  );

  const handleSplitPayment = useCallback(
    (
      lineId: string,
      splits: Array<{
        entity: string;
        strategyType: PaymentStrategyType;
        value: number;
        method?: string | null;
      }>,
      mode: PaymentUpdateMode = PaymentUpdateMode.Group,
    ) => {
      splitItemPayment(
        lineId,
        splits.map((s) => ({ ...s, entity: s.entity })),
        mode,
      );
      const splitName = [...splits]
        .sort((a, b) => b.value - a.value)
        .map(
          (s) =>
            `${s.entity} ${s.strategyType === PaymentStrategyType.Remaining ? "rem" : s.strategyType === PaymentStrategyType.Percentage ? `${Math.round(s.value * 100)}%` : `$${s.value}`}`,
        )
        .join(" / ");
      toast.success(`Payment split: ${splitName}`);
    },
    [splitItemPayment],
  );

  const handleResetToDefault = useCallback(
    (lineId: string) => {
      resetItemPaymentToDefault(lineId);
      toast.success(`Payment reset to ${defaultPaymentMethod}`);
    },
    [resetItemPaymentToDefault, defaultPaymentMethod],
  );

  const handleSetBulkQty = useCallback(
    (qty: number) => {
      if (selectedLineIds.size > 0) {
        setItemsQty(Array.from(selectedLineIds), qty);
        toast.success(`Set quantity to ${qty}`);
      }
    },
    [selectedLineIds, setItemsQty],
  );

  const handleSplitQty = useCallback(
    (type: SplitQtyType, value: number) => {
      const newLineIds = useVCSStore.getState().splitItemsQty(
        Array.from(selectedLineIds),
        type,
        value
      );
      setSelectedLineIds(new Set(newLineIds));
      toast.success("Items split successfully");
    },
    [selectedLineIds, setSelectedLineIds]
  );

  const handleSaveGroupNote = useCallback(
    (text: string) => {
      addGroupNote(groupNoteLineIds, text);
      setSelectedLineIds(new Set());
    },
    [addGroupNote, groupNoteLineIds, setSelectedLineIds],
  );

  const handleRemoveNoteFromItems = useCallback(
    (lineIds: string[], noteId: string) => {
      removeGroupNote(lineIds, noteId);
    },
    [removeGroupNote],
  );

  const handleCleanupStaleNotes = useCallback(
    (noteIds: string[]) => {
      cleanupStaleNotes(noteIds);
    },
    [cleanupStaleNotes],
  );

  const handleAttachNoteToOrder = useCallback(
    (noteId: string, attached: boolean) => {
      attachNoteToOrder(noteId, attached);
    },
    [attachNoteToOrder],
  );

  const handleCreateBranch = useCallback(
    (name: string, startFromEmpty: boolean) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      try {
        let fromHash = viewingHash;
        if (startFromEmpty) {
          const fullLog = useVCSStore.getState().commitLog();
          fromHash =
            (
              fullLog.find((c) => c.authorId === "system-init") ||
              fullLog[fullLog.length - 1]
            )?.commitHash || null;
        }
        createBranch(trimmed, fromHash);
        toast.success(
          `Branch "${trimmed}" created${startFromEmpty ? " from empty root" : fromHash ? ` at commit ${fromHash.substring(0, 7)}` : ""}`,
        );
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [createBranch, viewingHash],
  );

  const handleResetOrder = useCallback(() => {
    resetOrder();
    setShowResetConfirm(false);
    setAddGuestOpen(false);
    toast.success("Order reset — ready for a new order");
  }, [resetOrder, setShowResetConfirm, setAddGuestOpen]);

  return {
    handleConfirmHistoryOp,
    handleSaveCustomerFields,
    handleSaveBranchConfig,
    handleSaveNote,
    handleAddGuestFromDialog,
    handleAddItem,
    handleReassign,
    handleUpdateFulfillment,
    handleSplitPayment,
    handleResetToDefault,
    handleSetBulkQty,
    handleSplitQty,
    handleSaveGroupNote,
    handleRemoveNoteFromItems,
    handleCleanupStaleNotes,
    handleAttachNoteToOrder,
    handleCreateBranch,
    handleResetOrder,
  };
}