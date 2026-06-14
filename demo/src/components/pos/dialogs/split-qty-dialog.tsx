"use client";

import { Button } from "@/components/ui/button";
import { SplitQtyType } from "@/lib/pos/types";
import { Split } from "lucide-react";
import React, { useState, useEffect } from "react";
import { NumberPadDialog } from "./number-pad-dialog";

interface SplitQtyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxQty: number;
  onConfirm: (type: SplitQtyType, value: number) => void;
}

export function SplitQtyDialog({
  open,
  onOpenChange,
  maxQty,
  onConfirm,
}: SplitQtyDialogProps) {
  const [type, setType] = useState<SplitQtyType>(SplitQtyType.Amount);

  useEffect(() => {
    if (open) {
      setType(SplitQtyType.Amount);
    }
  }, [open]);

  const maxAllowed = type === SplitQtyType.Amount ? Math.max(1, maxQty - 1) : 99;

  return (
    <NumberPadDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Split className="w-5 h-5 text-primary" />}
      title="Split Quantity"
      description="Split the selected items into new lines by amount or percentage."
      confirmLabel="Split Items"
      min={1}
      max={maxAllowed}
      placeholder={type === SplitQtyType.Amount ? `Max: ${maxAllowed}` : "Max: 99%"}
      resetDependency={type}
      onConfirm={(val) => onConfirm(type, val)}
      extraContent={
        <div className="flex bg-muted/50 p-1 rounded-lg gap-1">
          <Button
            type="button"
            variant={type === SplitQtyType.Amount ? "default" : "ghost"}
            className="flex-1 h-8 text-xs font-medium"
            onClick={() => setType(SplitQtyType.Amount)}
          >
            By Amount
          </Button>
          <Button
            type="button"
            variant={type === SplitQtyType.Percentage ? "default" : "ghost"}
            className="flex-1 h-8 text-xs font-medium"
            onClick={() => setType(SplitQtyType.Percentage)}
          >
            By Percentage (%)
          </Button>
        </div>
      }
    />
  );
}