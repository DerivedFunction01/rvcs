import { useState } from "react";
import { HistoryOpType } from "@/lib/pos/types";

export function usePostTerminalBranchDialogs() {
  const [historyOpDialog, setHistoryOpDialog] = useState<{
    type: HistoryOpType;
    targetHash: string;
    label: string;
    description: string;
  } | null>(null);
  
  const [isBranchManagerOpen, setIsBranchManagerOpen] = useState(false);
  const [isBranchConfigOpen, setIsBranchConfigOpen] = useState(false);
  const [branchToConfig, setBranchToConfig] = useState<string | null>(null);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return {
    historyOpDialog,
    setHistoryOpDialog,
    isBranchManagerOpen,
    setIsBranchManagerOpen,
    isBranchConfigOpen,
    setIsBranchConfigOpen,
    branchToConfig,
    setBranchToConfig,
    isMergeOpen,
    setIsMergeOpen,
    showResetConfirm,
    setShowResetConfirm,
  };
}