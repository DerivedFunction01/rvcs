"use client";

import { Split } from "lucide-react";
import React from "react";
import { NumberPadDialog } from "./number-pad-dialog";
import { usePreferencesStore } from "@/store/preferences-store";

interface SplitIntoLinesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxQty: number;
  selectedQtys: number[];
  increment?: number;
  onConfirm: (splitQty: number) => void;
}

export function SplitIntoLinesDialog({
  open,
  onOpenChange,
  maxQty,
  selectedQtys,
  increment,
  onConfirm,
}: SplitIntoLinesDialogProps) {
  const { defaultPrefs } = usePreferencesStore();
  const warnThreshold = (defaultPrefs as any)?.splitLineWarnThreshold ?? 10;

  return (
    <NumberPadDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Split className="w-5 h-5 text-primary" />}
      title="Split Into Increments"
      description="Split the selected items into separate lines of the specified quantity."
      confirmLabel="Split Lines"
      min={increment ?? 1}
      max={maxQty}
      increment={increment}
      initialValue={increment ?? 1}
      onConfirm={onConfirm}
      warningMessage={(val) => {
        if (!val || val <= 0) return null;
        let lines = 0;
        for (const qty of selectedQtys) {
          lines += Math.ceil(qty / val);
        }
        if (lines >= warnThreshold) {
          return `This will create ~${lines} new lines. Are you sure?`;
        }
        return null;
      }}
    />
  );
}