"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitBranch, Lightbulb, Save, Info, AlertTriangle } from "lucide-react";

interface BranchConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchName: string;
  currentType: "parallel" | "hypothetical";
  currentLabel: string;
  existingBranches: string[];
  onSave: (newName: string, type: "parallel" | "hypothetical", label: string) => void;
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
  const [type, setType] = useState<"parallel" | "hypothetical">(currentType);
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

  const isMain = branchName === "main";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Configure Branch: <span className="font-semibold text-primary">{branchName}</span>
          </DialogTitle>
          <DialogDescription>
            Modify branch name, label, and operation flow type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Branch Identifier</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isMain}
              placeholder="e.g. guest-2-checkout"
              className={`h-9 text-sm ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {error ? (
              <p className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </p>
            ) : (
              name.trim() !== branchName && (
                <p className="text-[10px] text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-0.5 font-medium">
                  <Info className="w-3 h-3 shrink-0" />
                  Renaming updates all commits in the ledger.
                </p>
              )
            )}
          </div>

          {/* Label Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Custom Display Label (Optional)</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Split segment for Bob"
              className="h-9 text-sm"
            />
          </div>

          {/* Branch Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Branch Classification Type</label>
            {isMain ? (
              <div className="p-3 rounded-xl border-2 border-primary/20 bg-primary/5 flex flex-col items-start text-left">
                <div className="p-1.5 rounded-lg mb-2 bg-primary/10 text-primary w-fit">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div className="font-semibold text-xs text-foreground">Main Trunk</div>
                <div className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                  The primary ledger history. This branch serves as the authoritative source of truth and cannot be reclassified.
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <strong className="font-semibold">Warning:</strong> Main is purely a read-only place. Any modifications made here will automatically create a new draft branch to protect the main ledger.
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Parallel Input */}
                <button
                  type="button"
                  onClick={() => setType("parallel")}
                  className={`flex flex-col items-start text-left p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    type === "parallel"
                      ? "border-emerald-500 bg-emerald-500/[0.04] shadow-xs"
                      : "border-border hover:border-muted-foreground/30 bg-background"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg mb-2 ${
                    type === "parallel" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                  }`}>
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div className="font-semibold text-xs text-foreground">Parallel Branch</div>
                  <div className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Co-existing active flow representing multiple inputs (e.g., parallel customer bills).
                  </div>
                </button>

                {/* Hypothetical */}
                <button
                  type="button"
                  onClick={() => setType("hypothetical")}
                  className={`flex flex-col items-start text-left p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    type === "hypothetical"
                      ? "border-amber-500 bg-amber-500/[0.04] shadow-xs"
                      : "border-border hover:border-muted-foreground/30 bg-background"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg mb-2 ${
                    type === "hypothetical" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
                  }`}>
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div className="font-semibold text-xs text-foreground">Hypothetical Branch</div>
                  <div className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Speculative "what if" draft changes (sandbox scenarios, mock discount runs).
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-9">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!!error}
            className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
