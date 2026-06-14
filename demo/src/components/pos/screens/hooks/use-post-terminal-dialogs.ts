import { useState, useCallback } from "react";
import { ProjectedLineItem } from "@/lib/vcs/types";

export function usePostTerminalDialogs() {
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [editGuestOpen, setEditGuestOpen] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<any>(null);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);

  const [removeModDialogOpen, setRemoveModDialogOpen] = useState(false);
  const [groupNoteOpen, setGroupNoteOpen] = useState(false);
  const [groupNoteLineIds, setGroupNoteLineIds] = useState<string[]>([]);

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

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
    removeModDialogOpen,
    setRemoveModDialogOpen,
    groupNoteOpen,
    setGroupNoteOpen,
    groupNoteLineIds,
    setGroupNoteLineIds,
    customerDialogOpen,
    setCustomerDialogOpen,
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
    handleOpenGroupNoteDialog,
  };
}