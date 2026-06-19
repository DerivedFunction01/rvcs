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
import { Separator } from "@/components/ui/separator";
import { generateDraftBranchName } from "@/lib/pos/id";
import type { BranchMap } from "@/lib/vcs/types";
import { BranchType } from "@/lib/vcs/types";
import {
  GitBranch,
  GitMerge,
  Lightbulb,
  Loader2,
  Plus,
  Search,
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
      className={`flex items-center gap-2 px-4 md:px-5 py-3 md:py-4 transition-colors ${isActive
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
          <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
        ) : (
          <GitBranch className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
        )}
      </span>

      <button
        type="button"
        onClick={onCheckout}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-sm md:text-base truncate ${isActive ? "font-semibold" : "font-medium"}`}
          >
            {displayName}
          </span>
          {pointer.label && (
            <span className="text-[10px] md:text-xs text-muted-foreground font-mono truncate">
              {branch}
            </span>
          )}
          {isActive && (
            <Badge variant="secondary" className="text-[9px] md:text-[10px] h-5 md:h-6 px-1.5 shrink-0">
              Active
            </Badge>
          )}
          {isMain && (
            <Badge
              variant="outline"
              className="text-[9px] md:text-[10px] h-5 md:h-6 px-1.5 shrink-0 border-amber-400/50 text-amber-600"
            >
              Main
            </Badge>
          )}
        </div>
        <p className="text-[10px] md:text-xs text-muted-foreground font-mono mt-1 md:mt-1.5">
          {pointer.headHash?.slice(0, 7) ?? "no commits"}
        </p>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 md:h-10 w-9 md:w-10 shrink-0"
        onClick={onConfigure}
        title="Configure branch"
      >
        <Settings2 className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
      </Button>
      {!isMain && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 md:h-10 w-9 md:w-10 shrink-0"
          onClick={onCheckout}
          title={isActive ? "Active draft" : "Set as active draft"}
        >
          <Star
            className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"}`}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const branchEntries = Object.entries(branches);
  const branchCount = branchEntries.length;

  useEffect(() => {
    if (open) {
      setNewBranchName("");
      setStartFromEmpty(false);
      setSearchQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const filteredBranches = branchEntries.filter(([branch, pointer]) => {
    if (branch === "system") return false;
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return true;
    return branch.toLowerCase().includes(q) || pointer.label?.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[95vh] landscape:sm:max-w-5xl landscape:md:max-w-6xl overflow-y-auto landscape:max-h-[95vh] landscape:overflow-hidden flex flex-col p-4 md:p-6">
        <div className="flex flex-col landscape:flex-row gap-4 md:gap-6 landscape:gap-6 h-full landscape:overflow-hidden">
          <div className="flex flex-col gap-3 md:gap-4 flex-1 min-w-0 landscape:overflow-y-auto landscape:min-h-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
                <GitBranch className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                Branches
              </DialogTitle>
              <DialogDescription className="text-sm md:text-base">
                Checkout, configure, and manage parallel order branches.
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-2 shrink-0">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 text-xs md:text-sm h-10 md:h-11"
              />
              {searchQuery !== debouncedQuery && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-h-40 md:min-h-48 overflow-y-auto pr-1">
              <div className="divide-y border rounded-xl">
                {filteredBranches.map(([branch, pointer]) => (
                  <BranchRow
                    key={branch}
                    branch={branch}
                    pointer={pointer}
                    isActive={activeBranch === branch}
                    onCheckout={() => onCheckout(branch)}
                    onConfigure={() => onConfigure(branch)}
                  />
                ))}
                {filteredBranches.length === 0 && (
                  <div className="py-8 md:py-12 text-center text-xs md:text-sm text-muted-foreground">
                    No matching branches found.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 landscape:w-80 landscape:md:w-96 flex flex-col landscape:mt-4 landscape:border-l landscape:pl-6 border-t landscape:border-t-0 pt-4 md:pt-5 landscape:pt-0">
            <div className="space-y-4 md:space-y-5">
              <div className="space-y-3">
                <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  New branch
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className={`h-10 md:h-12 text-xs md:text-sm flex-1 ${viewingHash && !startFromEmpty ? "ring-1 ring-amber-400/60 border-amber-400/40" : ""}`}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-10 md:h-12 px-3 md:px-4 gap-1.5 shrink-0 text-xs md:text-sm ${viewingHash && !startFromEmpty ? "border-amber-400/50 text-amber-600" : ""}`}
                    onClick={handleCreate}
                  >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    Create
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2 md:mt-3">
                  <Checkbox
                    id="empty-branch-cb"
                    checked={startFromEmpty}
                    onCheckedChange={(c) => setStartFromEmpty(!!c)}
                    className="h-4 w-4 md:h-5 md:w-5"
                  />
                  <label
                    htmlFor="empty-branch-cb"
                    className="text-[10px] md:text-xs text-muted-foreground cursor-pointer select-none font-medium"
                  >
                    Start from empty (root of main)
                  </label>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground">
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
                    className="w-full h-10 md:h-12 gap-2 border-violet-400/50 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 dark:text-violet-400 text-xs md:text-sm"
                    onClick={onOpenMerge}
                  >
                    <GitMerge className="w-4 h-4 md:w-5 md:h-5" />
                    Merge branches
                  </Button>
                </>
              )}
            </div>

            <div className="mt-auto pt-4 md:pt-5 border-t hidden landscape:block shrink-0">
              <Button
                className="w-full h-12 md:h-16 text-sm md:text-base"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>

          <div className="pt-4 md:pt-5 border-t landscape:hidden shrink-0 mt-2">
            <Button
              className="w-full h-12 md:h-16 text-sm md:text-base"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}