import { useState, useCallback } from "react";
import { HistoryOpType, AllocationContext } from "@/lib/pos/types";
import { ProjectedLineItem } from "@/lib/vcs/types";

export function usePostTerminalDialogs() {
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [editGuestOpen, setEditGuestOpen] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<any>(null);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [qtyPadOpen, setQtyPadOpen] = useState(false);
  const [splitQtyDialogOpen, setSplitQtyDialogOpen] = useState(false);
  const [dupMoveDialogOpen, setDupMoveDialogOpen] = useState(false);
  const [removeModDialogOpen, setRemoveModDialogOpen] = useState(false);
  const [groupNoteOpen, setGroupNoteOpen] = useState(false);
  const [groupNoteLineIds, setGroupNoteLineIds] = useState<string[]>([]);

  const [historyOpDialog, setHistoryOpDialog] = useState<{
    type: HistoryOpType;
    targetHash: string;
    label: string;
    description: string;
  } | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  const [isBranchManagerOpen, setIsBranchManagerOpen] = useState(false);
  const [isBranchConfigOpen, setIsBranchConfigOpen] = useState(false);
  const [branchToConfig, setBranchToConfig] = useState<string | null>(null);
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  const [allocConfigItem, setAllocConfigItem] =
    useState<ProjectedLineItem | null>(null);
  const [assignmentAllocationOpen, setAssignmentAllocationOpen] =
    useState(false);
  const [assignmentAllocationContext, setAssignmentAllocationContext] =
    useState<AllocationContext>(AllocationContext.Item);
  const [assignmentAllocationItems, setAssignmentAllocationItems] = useState<
    ProjectedLineItem[]
  >([]);
  const [paymentAllocationOpen, setPaymentAllocationOpen] = useState(false);
  const [paymentAllocationContext, setPaymentAllocationContext] =
    useState<AllocationContext>(AllocationContext.Item);
  const [paymentAllocationItems, setPaymentAllocationItems] = useState<
    ProjectedLineItem[]
  >([]);
  const [fulfillmentAllocationOpen, setFulfillmentAllocationOpen] =
    useState(false);
  const [fulfillmentAllocationContext, setFulfillmentAllocationContext] =
    useState<AllocationContext>(AllocationContext.Item);
  const [fulfillmentAllocationItems, setFulfillmentAllocationItems] = useState<
    ProjectedLineItem[]
  >([]);

  const [modifierAddOpen, setModifierAddOpen] = useState(false);
  const [modifierAddItem, setModifierAddItem] =
    useState<ProjectedLineItem | null>(null);

  const [swapChoiceState, setSwapChoiceState] = useState<{
    lineId: string;
    parentLineId: string;
    slotSku: string;
  } | null>(null);
  const [retainModifiersDuringSwap, setRetainModifiersDuringSwap] =
    useState<boolean>(true);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteItem, setNoteItem] = useState<ProjectedLineItem | null>(null);

  const handleOpenCustomerDialog = useCallback(() => {
    setCustomerDialogOpen(true);
  }, []);

  const handleOpenModifierDialog = useCallback((item: ProjectedLineItem) => {
    setModifierAddItem(item);
    setModifierAddOpen(true);
  }, []);

  const handleOpenSwapDialog = useCallback(
    (lineId: string, parentLineId: string, slotSku: string) => {
      setSwapChoiceState({ lineId, parentLineId, slotSku });
    },
    []
  );

  const handleOpenNoteDialog = useCallback((item: ProjectedLineItem) => {
    setNoteItem(item);
    setNoteDialogOpen(true);
  }, []);

  const handleOpenAddGuestDialog = useCallback(() => {
    setAddGuestOpen(true);
  }, []);

  const handleAllocConfig = useCallback((item: ProjectedLineItem) => {
    setAllocConfigItem((prev) => (prev === item ? null : item));
  }, []);

  const handleOpenGroupNoteDialog = useCallback((lineIds: string[]) => {
    setGroupNoteLineIds(lineIds);
    setGroupNoteOpen(true);
  }, []);

  return {
    addGuestOpen,
    setAddGuestOpen,
    editGuestOpen,
    setEditGuestOpen,
    guestToEdit,
    setGuestToEdit,
    guestPickerOpen,
    setGuestPickerOpen,
    showResetConfirm,
    setShowResetConfirm,
    qtyPadOpen,
    setQtyPadOpen,
    splitQtyDialogOpen,
    setSplitQtyDialogOpen,
    dupMoveDialogOpen,
    setDupMoveDialogOpen,
    removeModDialogOpen,
    setRemoveModDialogOpen,
    groupNoteOpen,
    setGroupNoteOpen,
    groupNoteLineIds,
    setGroupNoteLineIds,
    historyOpDialog,
    setHistoryOpDialog,
    customerDialogOpen,
    setCustomerDialogOpen,
    isBranchManagerOpen,
    setIsBranchManagerOpen,
    isBranchConfigOpen,
    setIsBranchConfigOpen,
    branchToConfig,
    setBranchToConfig,
    isMergeOpen,
    setIsMergeOpen,
    allocConfigItem,
    setAllocConfigItem,
    assignmentAllocationOpen,
    setAssignmentAllocationOpen,
    assignmentAllocationContext,
    setAssignmentAllocationContext,
    assignmentAllocationItems,
    setAssignmentAllocationItems,
    paymentAllocationOpen,
    setPaymentAllocationOpen,
    paymentAllocationContext,
    setPaymentAllocationContext,
    paymentAllocationItems,
    setPaymentAllocationItems,
    fulfillmentAllocationOpen,
    setFulfillmentAllocationOpen,
    fulfillmentAllocationContext,
    setFulfillmentAllocationContext,
    fulfillmentAllocationItems,
    setFulfillmentAllocationItems,
    modifierAddOpen,
    setModifierAddOpen,
    modifierAddItem,
    setModifierAddItem,
    swapChoiceState,
    setSwapChoiceState,
    retainModifiersDuringSwap,
    setRetainModifiersDuringSwap,
    noteDialogOpen,
    setNoteDialogOpen,
    noteItem,
    setNoteItem,

    // Actions
    handleOpenCustomerDialog,
    handleOpenModifierDialog,
    handleOpenSwapDialog,
    handleOpenNoteDialog,
    handleOpenAddGuestDialog,
    handleAllocConfig,
    handleOpenGroupNoteDialog,
  };
}