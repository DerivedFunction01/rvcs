import React from "react";
import { toast } from "sonner";
import { HistoryOpDialog } from "@/components/pos/dialogs/history-op-dialog";
import { BranchManagerDialog } from "@/components/pos/dialogs/branch-manager-dialog";
import { BranchConfigDialog } from "@/components/pos/dialogs/branch-config-dialog";
import { MergeBranchDialog } from "@/components/pos/dialogs/merge-dialog";
import { useVCSStore } from "@/store/vcs-store";
import { BranchType } from "@/lib/vcs/types";
import type { usePostTerminalBranchDialogs } from "@/components/pos/screens/hooks/use-post-terminal-branch-dialogs";
import type { usePostTerminalActions } from "@/components/pos/screens/hooks/use-post-terminal-actions";

export function PosBranchDialogs({
  dialogs,
  actions,
  activeBranch,
  viewingHash,
  serverName,
  resolveGuestName,
}: {
  dialogs: ReturnType<typeof usePostTerminalBranchDialogs>;
  actions: ReturnType<typeof usePostTerminalActions>;
  activeBranch: string;
  viewingHash: string | null;
  serverName: string;
  resolveGuestName: (id: string) => string;
}) {
  const store = useVCSStore();
  const branches = store.engine.getRepo().branches;

  return (
    <>
      <HistoryOpDialog
        open={!!dialogs.historyOpDialog}
        onOpenChange={(open) => {
          if (!open) dialogs.setHistoryOpDialog(null);
        }}
        operation={dialogs.historyOpDialog}
        onConfirm={actions.handleConfirmHistoryOp}
      />
      <BranchManagerDialog
        open={dialogs.isBranchManagerOpen}
        onOpenChange={dialogs.setIsBranchManagerOpen}
        branches={branches}
        activeBranch={activeBranch}
        viewingHash={viewingHash}
        serverName={serverName}
        onCheckout={(branch) => {
          store.checkoutBranch(branch);
          toast.success(`Switched to "${branch}"`);
        }}
        onConfigure={(branch) => {
          dialogs.setIsBranchManagerOpen(false);
          dialogs.setBranchToConfig(branch);
          dialogs.setIsBranchConfigOpen(true);
        }}
        onCreateBranch={actions.handleCreateBranch}
        onOpenMerge={() => {
          dialogs.setIsBranchManagerOpen(false);
          dialogs.setIsMergeOpen(true);
        }}
      />
      <BranchConfigDialog
        open={dialogs.isBranchConfigOpen}
        onOpenChange={dialogs.setIsBranchConfigOpen}
        branchName={dialogs.branchToConfig || ""}
        currentType={dialogs.branchToConfig ? branches[dialogs.branchToConfig]?.type || BranchType.Parallel : BranchType.Parallel}
        currentLabel={dialogs.branchToConfig ? branches[dialogs.branchToConfig]?.label || "" : ""}
        existingBranches={Object.keys(branches)}
        onSave={actions.handleSaveBranchConfig}
      />
      <MergeBranchDialog
        open={dialogs.isMergeOpen}
        onOpenChange={dialogs.setIsMergeOpen}
        branches={branches}
        activeBranch={activeBranch}
        resolveGuestName={resolveGuestName}
        isAlreadyMerged={(sourceBranch, targetBranch) => {
          const sourceHead = branches[sourceBranch]?.headHash;
          const targetHead = branches[targetBranch]?.headHash;
          if (!sourceHead || !targetHead) return false;
          return store.engine.isAncestorOf(sourceHead, targetHead);
        }}
        onPreview={store.previewMerge}
        onCommit={(sourceBranches, targetBranch, resolutionDeltas) => {
          store.commitMerge(sourceBranches, targetBranch, resolutionDeltas);
          if (targetBranch === "main") {
            store.checkoutBranch("main");
            toast.success("Order confirmed on main and ready for checkout");
          }
        }}
      />
    </>
  );
}