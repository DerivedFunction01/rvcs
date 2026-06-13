"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Split } from "lucide-react";
import { SplitEditor, PaymentSplitEntry, validateSplit } from "./split-editor";

interface TableSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: string[];
  onAddGuest: (name: string) => void;
  onCreateSplit: (
    splits: Array<{
      entity: string;
      strategyType: "percentage" | "fixed" | "remaining";
      value: number;
    }>
  ) => void;
}

export function TableSplitDialog({
  open,
  onOpenChange,
  guests,
  onAddGuest,
  onCreateSplit,
}: TableSplitDialogProps) {
  const [splits, setSplits] = useState<PaymentSplitEntry[]>([]);

  // Initialize splits with primary customer/guest when opening
  React.useEffect(() => {
    if (open) {
      if (guests.length > 0) {
        setSplits([
          { entity: guests[0], strategyType: "percentage", value: 100 },
        ]);
      } else {
        setSplits([]);
      }
    }
  }, [open, guests]);

  const isValidSplit = validateSplit(splits);

  const handleApply = useCallback(() => {
    if (!isValidSplit) return;
    const mappedSplits = splits.map((s) => ({
      entity: s.entity,
      strategyType: s.strategyType,
      value: s.strategyType === "percentage" ? s.value / 100 : s.value,
    }));
    onCreateSplit(mappedSplits);
    onOpenChange(false);
  }, [isValidSplit, splits, onCreateSplit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="w-5 h-5 text-primary" />
            Create Table-Wide Split Config
          </DialogTitle>
          <DialogDescription>
            Configure a split payment configuration. All new items will be split
            automatically based on these settings.
          </DialogDescription>
        </DialogHeader>

        <SplitEditor
          splits={splits}
          onChange={setSplits}
          guests={guests}
          onAddGuest={onAddGuest}
        />

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!isValidSplit} onClick={handleApply}>
            Save & Activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
