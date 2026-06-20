"use client";

import { Button } from "@/components/ui/button";
import { SplitQtyType } from "@/lib/pos/types";
import { Split } from "lucide-react";
import React, { useState, useEffect } from "react";
import { NumberPadDialog } from "./number-pad-dialog";
import { usePreferencesStore } from "@/store/preferences-store";

interface SplitQtyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxQty: number;
  selectedQtys?: number[];
  increment?: number;
  onConfirm: (type: SplitQtyType, value: number) => void;
}

export function SplitQtyDialog({
  open,
  onOpenChange,
  maxQty,
  selectedQtys = [],
  increment,
  onConfirm,
}: SplitQtyDialogProps) {
  const [type, setType] = useState<SplitQtyType>(SplitQtyType.Amount);
  const { defaultPrefs } = usePreferencesStore();
  const warnThreshold = (defaultPrefs as any)?.splitLineWarnThreshold ?? 10;

  useEffect(() => {
    if (open) {
      setType(SplitQtyType.Amount);
    }
  }, [open]);

  const minVal = type === SplitQtyType.Percentage ? 1 : (increment ?? 1);
  const maxAllowed = type === SplitQtyType.Amount 
    ? Math.max(minVal, maxQty - minVal) 
    : type === SplitQtyType.Percentage 
      ? 99 
      : maxQty;

  const handleWarningMessage = (val: number | null) => {
    if (type !== SplitQtyType.Increments || !val || val <= 0) return null;
    let lines = 0;
    for (const qty of selectedQtys) {
      lines += Math.ceil(qty / val);
    }
    if (lines >= warnThreshold) {
      return `This will create ~${lines} new lines. Are you sure?`;
    }
    return null;
  };

  return (
    <NumberPadDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Split className="w-5 h-5 text-primary" />}
      title="Split Quantity"
      description={
        type === SplitQtyType.Increments
          ? "Split the selected items into separate lines of the specified quantity."
          : "Split the selected items into new lines by amount or percentage."
      }
      confirmLabel={type === SplitQtyType.Increments ? "Split Lines" : "Split Items"}
      min={minVal}
      max={maxAllowed}
      increment={type === SplitQtyType.Percentage ? undefined : increment}
      initialValue={type === SplitQtyType.Increments ? (increment ?? 1) : undefined}
      placeholder={
        type === SplitQtyType.Amount 
          ? `Max: ${maxAllowed}` 
          : type === SplitQtyType.Percentage 
            ? "Max: 99%" 
            : `Max increment: ${maxAllowed}`
      }
      resetDependency={type}
      warningMessage={handleWarningMessage}
      onConfirm={(val) => onConfirm(type, val)}
      extraContent={
        <div className="flex bg-muted/50 p-1 rounded-lg gap-1">
          <Button
            type="button"
            variant={type === SplitQtyType.Amount ? "default" : "ghost"}
            className="flex-1 h-8 text-[11px] font-medium px-1"
            onClick={() => setType(SplitQtyType.Amount)}
          >
            By Amount
          </Button>
          <Button
            type="button"
            variant={type === SplitQtyType.Percentage ? "default" : "ghost"}
            className="flex-1 h-8 text-[11px] font-medium px-1"
            onClick={() => setType(SplitQtyType.Percentage)}
          >
            By Pct (%)
          </Button>
          <Button
            type="button"
            variant={type === SplitQtyType.Increments ? "default" : "ghost"}
            className="flex-1 h-8 text-[11px] font-medium px-1"
            onClick={() => setType(SplitQtyType.Increments)}
          >
            Into Lines
          </Button>
        </div>
      }
    />
  );
}