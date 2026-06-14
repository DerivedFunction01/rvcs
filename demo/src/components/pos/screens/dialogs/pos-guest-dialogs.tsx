import React from "react";
import { AddGuestDialog, EditGuestDialog, GuestPickerDialog } from "@/components/pos/dialogs/guest-dialogs";
import type { usePostTerminalDialogs } from "@/components/pos/screens/hooks/use-post-terminal-dialogs";
import type { usePostTerminalActions } from "@/components/pos/screens/hooks/use-post-terminal-actions";

export function PosGuestDialogs({
  dialogs,
  actions,
  selectedPerson,
  setSelectedPerson,
}: {
  dialogs: ReturnType<typeof usePostTerminalDialogs>;
  actions: ReturnType<typeof usePostTerminalActions>;
  selectedPerson: string;
  setSelectedPerson: (id: string) => void;
}) {
  return (
    <>
      <AddGuestDialog 
        open={dialogs.addGuestOpen} 
        onOpenChange={dialogs.setAddGuestOpen} 
      />
      
      <GuestPickerDialog
        open={dialogs.guestPickerOpen}
        onOpenChange={dialogs.setGuestPickerOpen}
        selectedPerson={selectedPerson}
        onSelectPerson={setSelectedPerson}
        onEditGuest={(g: any) => {
          dialogs.setGuestToEdit(g);
          dialogs.setEditGuestOpen(true);
        }}
        onOpenAddGuest={dialogs.handleOpenAddGuestDialog}
      />
      <EditGuestDialog
        open={dialogs.editGuestOpen}
        onOpenChange={dialogs.setEditGuestOpen}
        guestToEdit={dialogs.guestToEdit}
      />
    </>
  );
}