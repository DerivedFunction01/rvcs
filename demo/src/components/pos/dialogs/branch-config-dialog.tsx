"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BranchType } from "@/lib/vcs/types";
import { AlertTriangle, GitBranch, Info, HatGlasses, Save } from "lucide-react";
import { useEffect, useState } from "react";

interface BranchConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchName: string;
  currentType: BranchType;
  currentLabel: string;
  existingBranches: string[];
  onSave: (newName: string, type: BranchType, label: string) => void;
}

export function BranchConfigDialog({
  open,
  onOpenChange,
  branchName,
  currentType,
  currentLabel,
  existingBranches,
  onSave,
}: BranchConfigDialogProps) {
  const [name, setName] = useState(branchName);
  const [type, setType] = useState<BranchType>(currentType);
  const [label, setLabel] = useState(currentLabel);
  const [error, setError] = useState<string | null>(null);

  // Sync state when dialog opens
  useEffect(() => {
    if (open) {
      setName(branchName);
      setType(currentType);
      setLabel(currentLabel);
      setError(null);
    }
  }, [open, branchName, currentType, currentLabel]);

  // Validate inputs
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Branch name cannot be empty");
      return;
    }
    if (trimmed === "system") {
      setError("Cannot use reserved branch name 'system'");
      return;
    }
    if (trimmed !== branchName && existingBranches.includes(trimmed)) {
      setError(`A branch named "${trimmed}" already exists`);
      return;
    }
    setError(null);
  }, [name, branchName, existingBranches]);

  const handleSave = () => {
    if (error) return;
    onSave(name.trim(), type, label.trim());
    onOpenChange(false);
  };

  const isMain = branchName === "main" || currentType === BranchType.Main;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[95vh] landscape:sm:max-w-5xl landscape:md:max-w-6xl flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
            <GitBranch className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            Configure Branch:{" "}
            <span className="font-semibold text-primary">{branchName}</span>
          </DialogTitle>
          <DialogDescription className="text-sm md:text-base">
            Modify branch name, label, and operation flow type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-5 py-3 md:py-4 flex-1 min-h-0 overflow-y-auto">
          {/* Name Field */}
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-muted-foreground">
              Branch Identifier
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isMain}
              placeholder="e.g. guest-2-checkout"
              className={`h-10 md:h-12 text-sm md:text-base ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {error ? (
              <p className="text-[10px] md:text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                {error}
              </p>
            ) : (
              name.trim() !== branchName && (
                <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-1 font-medium">
                  <Info className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  Renaming updates all commits in the ledger.
                </p>
              )
            )}
          </div>

          {/* Label Field */}
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-muted-foreground">
              Custom Display Label (Optional)
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Split segment for Bob"
              className="h-10 md:h-12 text-sm md:text-base"
            />
          </div>

          {/* Branch Type Selector */}
          <div className="space-y-3">
            <label className="text-xs md:text-sm font-semibold text-muted-foreground">
              Branch Classification Type
            </label>
            {isMain ? (
              <div className="p-4 md:p-5 rounded-xl border-2 border-primary/20 bg-primary/5 flex flex-col items-start text-left">
                <div className="p-2 md:p-2.5 rounded-lg mb-3 bg-primary/10 text-primary w-fit">
                  <GitBranch className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="font-semibold text-xs md:text-sm text-foreground">
                  Main Trunk
                </div>
                <div className="text-[10px] md:text-xs text-muted-foreground leading-relaxed mt-2 md:mt-3">
                  The primary ledger history. This branch serves as the
                  authoritative source of truth and cannot be reclassified.
                  <div className="mt-3 md:mt-4 p-3 md:p-4 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <strong className="font-semibold text-xs md:text-sm">
                      Warning:
                    </strong>
                    <p className="text-[10px] md:text-xs mt-1 md:mt-1.5">
                      Main is purely a read-only place. Any modifications made
                      here will automatically create a new draft branch to
                      protect the main ledger.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                {/* Parallel Input */}
                <button
                  type="button"
                  onClick={() => setType(BranchType.Parallel)}
                  className={`flex flex-col items-start text-left p-4 md:p-5 rounded-xl border-2 transition-all cursor-pointer min-h-32 md:min-h-40 landscape:min-h-28 ${
                    type === BranchType.Parallel
                      ? "border-emerald-500 bg-emerald-500/4 shadow-xs"
                      : "border-border hover:border-muted-foreground/30 bg-background"
                  }`}
                >
                  <div
                    className={`p-2 md:p-2.5 rounded-lg mb-3 ${
                      type === BranchType.Parallel
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <GitBranch className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="font-semibold text-xs md:text-sm text-foreground">
                    Parallel Branch
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-relaxed mt-2 md:mt-3">
                    Co-existing active flow representing multiple inputs (e.g.,
                    parallel customer bills).
                  </div>
                </button>

                {/* Hypothetical */}
                <button
                  type="button"
                  onClick={() => setType(BranchType.Hypothetical)}
                  className={`flex flex-col items-start text-left p-4 md:p-5 rounded-xl border-2 transition-all cursor-pointer min-h-32 md:min-h-40 landscape:min-h-28 ${
                    type === BranchType.Hypothetical
                      ? "border-amber-500 bg-amber-500/4 shadow-xs"
                      : "border-border hover:border-muted-foreground/30 bg-background"
                  }`}
                >
                  <div
                    className={`p-2 md:p-2.5 rounded-lg mb-3 ${
                      type === BranchType.Hypothetical
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <HatGlasses className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="font-semibold text-xs md:text-sm text-foreground">
                    Hypothetical Branch
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-relaxed mt-2 md:mt-3">
                    Speculative "what if" draft changes (sandbox scenarios, mock
                    discount runs).
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2 landscape:flex-row pt-4 md:pt-5 mt-2 md:mt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-12 md:h-16 text-sm md:text-base"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!!error}
            className="h-12 md:h-16 text-sm md:text-base bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 justify-center"
          >
            <Save className="w-4 h-4 md:w-5 md:h-5" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
