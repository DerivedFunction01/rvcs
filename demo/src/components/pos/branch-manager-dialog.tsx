"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { generateDraftBranchName } from "@/lib/pos/id";
import type { BranchMap } from "@/lib/vcs/types";
import { BranchType } from "@/lib/vcs/types";
import {
  GitBranch,
  GitMerge,
  Lightbulb,
  Plus,
  Settings2,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";

interface BranchManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: BranchMap;
  activeBranch: string;
  viewingHash: string | null;
  serverName: string;
  onCheckout: (branch: string) => void;
  onConfigure: (branch: string) => void;
  onCreateBranch: (name: string, startFromEmpty: boolean) => void;
  onOpenMerge: () => void;
}

function BranchRow({
  branch,
  pointer,
  isActive,
  onCheckout,
  onConfigure,
}: {
  branch: string;
  pointer: BranchMap[string];
  isActive: boolean;
  onCheckout: () => void;
  onConfigure: () => void;
}) {
  const isHypothetical = pointer.type === BranchType.Hypothetical;
  const displayName = pointer.label || branch;
  const isMain = branch === "main";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 transition-colors ${
        isActive
          ? isHypothetical
            ? "bg-amber-500/10"
            : "bg-emerald-500/10"
          : "hover:bg-accent/40"
      }`}
    >
      <span
        className="shrink-0"
        title={
          isHypothetical
            ? "Hypothetical (What-if) Branch"
            : "Parallel Input Branch"
        }
      >
        {isHypothetical ? (
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
        )}
      </span>

      <button
        type="button"
        onClick={onCheckout}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-sm truncate ${isActive ? "font-semibold" : "font-medium"}`}
          >
            {displayName}
          </span>
          {pointer.label && (
            <span className="text-[10px] text-muted-foreground font-mono truncate">
              {branch}
            </span>
          )}
          {isActive && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
              Active
            </Badge>
          )}
          {isMain && (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1 shrink-0 border-amber-400/50 text-amber-600"
            >
              Main
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {pointer.headHash?.slice(0, 7) ?? "no commits"}
        </p>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={onConfigure}
        title="Configure branch"
      >
        <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>
      {!isMain && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onCheckout}
          title={isActive ? "Active draft" : "Set as active draft"}
        >
          <Star
            className={`w-3.5 h-3.5 ${isActive ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"}`}
          />
        </Button>
      )}
    </div>
  );
}

export function BranchManagerDialog({
  open,
  onOpenChange,
  branches,
  activeBranch,
  viewingHash,
  serverName,
  onCheckout,
  onConfigure,
  onCreateBranch,
  onOpenMerge,
}: BranchManagerDialogProps) {
  const [newBranchName, setNewBranchName] = useState("");
  const [startFromEmpty, setStartFromEmpty] = useState(false);
  const branchEntries = Object.entries(branches);
  const branchCount = branchEntries.length;

  useEffect(() => {
    if (open) {
      setNewBranchName("");
      setStartFromEmpty(false);
    }
  }, [open]);

  const handleCreate = () => {
    let trimmed = newBranchName.trim();
    if (!trimmed) {
      const baseName = generateDraftBranchName(serverName);
      trimmed = baseName;
      let suffix = 2;
      while (branches[trimmed]) {
        trimmed = `${baseName}-${suffix}`;
        suffix++;
      }
    }
    onCreateBranch(trimmed, startFromEmpty);
    setNewBranchName("");
    setStartFromEmpty(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Branches
          </DialogTitle>
          <DialogDescription>
            Checkout, configure, and manage parallel order branches.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="divide-y border-y">
            {branchEntries.map(([branch, pointer]) => {
              if (branch === "system") return null;
              return (
                <BranchRow
                  key={branch}
                  branch={branch}
                  pointer={pointer}
                  isActive={activeBranch === branch}
                  onCheckout={() => onCheckout(branch)}
                  onConfigure={() => onConfigure(branch)}
                />
              );
            })}
          </div>
        </ScrollArea>

        <div className="px-5 py-4 space-y-3">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              New branch
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Leave blank to auto-generate"
                className={`h-8 text-xs flex-1 ${viewingHash && !startFromEmpty ? "ring-1 ring-amber-400/60 border-amber-400/40" : ""}`}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button
                variant="outline"
                size="sm"
                className={`h-8 px-2.5 gap-1 shrink-0 ${viewingHash && !startFromEmpty ? "border-amber-400/50 text-amber-600" : ""}`}
                onClick={handleCreate}
              >
                <Plus className="w-3.5 h-3.5" />
                Create
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="empty-branch-cb"
                checked={startFromEmpty}
                onCheckedChange={(c) => setStartFromEmpty(!!c)}
                className="h-3.5 w-3.5"
              />
              <label
                htmlFor="empty-branch-cb"
                className="text-[10px] text-muted-foreground cursor-pointer select-none font-medium"
              >
                Start from empty (root of main)
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {startFromEmpty
                ? "Branches from the initial system state."
                : viewingHash
                  ? `Branches from commit ${viewingHash.slice(0, 7)}`
                  : "Branches from current HEAD"}
            </p>
          </div>

          {branchCount >= 2 && (
            <>
              <Separator />
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 gap-2 border-violet-400/50 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 dark:text-violet-400"
                onClick={onOpenMerge}
              >
                <GitMerge className="w-3.5 h-3.5" />
                Merge branches
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
