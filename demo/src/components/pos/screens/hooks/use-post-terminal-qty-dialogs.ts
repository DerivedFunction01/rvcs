import { useState } from "react";

export function usePostTerminalQtyDialogs() {
  const [qtyPadOpen, setQtyPadOpen] = useState(false);
  const [splitQtyDialogOpen, setSplitQtyDialogOpen] = useState(false);
  const [dupMoveDialogOpen, setDupMoveDialogOpen] = useState(false);

  return {
    qtyPadOpen,
    setQtyPadOpen,
    splitQtyDialogOpen,
    setSplitQtyDialogOpen,
    dupMoveDialogOpen,
    setDupMoveDialogOpen,
  };
}