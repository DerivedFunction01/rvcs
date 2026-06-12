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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Split, User, Plus, Trash2, X } from "lucide-react";

interface SplitEntry {
  entity: string;
  strategyType: "percentage" | "fixed" | "remaining";
  value: number; // 0-100 for percentage, dollar amount for fixed, 0 for remaining
}

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
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [newSplitEntity, setNewSplitEntity] = useState("");
  const [dialogNewGuestName, setDialogNewGuestName] = useState("");
  const [showNewGuestInput, setShowNewGuestInput] = useState(false);

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
      setNewSplitEntity("");
      setDialogNewGuestName("");
      setShowNewGuestInput(false);
    }
  }, [open, guests]);

  // Validation
  const totalPercentage = useMemo(
    () =>
      splits
        .filter((s) => s.strategyType === "percentage")
        .reduce((sum, s) => sum + s.value, 0),
    [splits]
  );

  const hasRemaining = useMemo(
    () => splits.some((s) => s.strategyType === "remaining"),
    [splits]
  );

  const hasFixed = useMemo(
    () => splits.some((s) => s.strategyType === "fixed"),
    [splits]
  );

  const isValidSplit = useMemo(() => {
    if (splits.length < 1) return false;
    return totalPercentage <= 100;
  }, [splits, totalPercentage]);

  const handleAddSplitEntry = useCallback(() => {
    const entity = newSplitEntity.trim();
    if (!entity) return;
    if (splits.some((s) => s.entity.toLowerCase() === entity.toLowerCase()))
      return;

    const n = splits.length + 1;
    const newSplits = [
      ...splits,
      { entity, strategyType: "percentage" as const, value: Math.floor(100 / n) },
    ];

    // Re-balance percentages equally if they are all percentage strategy
    const allPercentage = newSplits.every((s) => s.strategyType === "percentage");
    if (allPercentage) {
      const base = Math.floor(100 / n);
      newSplits.forEach((s) => {
        s.value = base;
      });
      const remainder = 100 - base * n;
      newSplits[0].value += remainder;
    }

    setSplits(newSplits);
    setNewSplitEntity("");
  }, [newSplitEntity, splits]);

  const handleRemoveSplitEntry = useCallback(
    (index: number) => {
      if (splits.length <= 1) return;
      const newSplits = splits.filter((_, i) => i !== index);

      // Re-balance percentages
      const allPercentage = newSplits.every((s) => s.strategyType === "percentage");
      if (allPercentage) {
        const base = Math.floor(100 / newSplits.length);
        newSplits.forEach((s) => {
          s.value = base;
        });
        const remainder = 100 - base * newSplits.length;
        newSplits[0].value += remainder;
      }
      setSplits(newSplits);
    },
    [splits]
  );

  const handleSplitTypeChange = (
    index: number,
    type: "percentage" | "fixed" | "remaining"
  ) => {
    setSplits((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        strategyType: type,
        value: type === "remaining" ? 0 : type === "percentage" ? 50 : 5,
      };
      return updated;
    });
  };

  const handleSplitValueChange = (index: number, val: number) => {
    setSplits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: Math.max(0, val) };
      return updated;
    });
  };

  const handleDistributeEqually = () => {
    const n = splits.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const updated = splits.map((s) => ({
      ...s,
      strategyType: "percentage" as const,
      value: base,
    }));
    const remainder = 100 - base * n;
    updated[0].value += remainder;
    setSplits(updated);
  };

  const handleAddNewGuest = useCallback(() => {
    const name = dialogNewGuestName.trim();
    if (!name) return;
    onAddGuest(name);
    setDialogNewGuestName("");
    setShowNewGuestInput(false);

    // Automatically add this new guest to the split editor
    setSplits((prev) => {
      if (prev.some((s) => s.entity.toLowerCase() === name.toLowerCase()))
        return prev;
      const n = prev.length + 1;
      const newSplits = [
        ...prev,
        { entity: name, strategyType: "percentage" as const, value: Math.floor(100 / n) },
      ];
      const allPercentage = newSplits.every((s) => s.strategyType === "percentage");
      if (allPercentage) {
        const base = Math.floor(100 / n);
        newSplits.forEach((s) => {
          s.value = base;
        });
        const remainder = 100 - base * n;
        newSplits[0].value += remainder;
      }
      return newSplits;
    });
  }, [dialogNewGuestName, onAddGuest]);

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

        {/* Guest Split List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Split Breakdown
            </div>
            {splits.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-primary"
                onClick={handleDistributeEqually}
              >
                Split Equally
              </Button>
            )}
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {splits.map((split, idx) => (
              <div
                key={split.entity}
                className="flex items-center gap-2 border-b pb-2 last:border-b-0 last:pb-0"
              >
                <span className="text-xs font-semibold text-foreground truncate w-24">
                  {split.entity}
                </span>

                <Select
                  value={split.strategyType}
                  onValueChange={(val) =>
                    handleSplitTypeChange(
                      idx,
                      val as "percentage" | "fixed" | "remaining"
                    )
                  }
                >
                  <SelectTrigger className="h-7 text-[10px] w-24 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="percentage" className="text-xs">
                      Percentage
                    </SelectItem>
                    <SelectItem value="fixed" className="text-xs">
                      Fixed Amt
                    </SelectItem>
                    <SelectItem value="remaining" className="text-xs">
                      Remaining
                    </SelectItem>
                  </SelectContent>
                </Select>

                {split.strategyType !== "remaining" ? (
                  <div className="flex items-center gap-1 w-20 shrink-0">
                    <Input
                      type="number"
                      value={split.value}
                      onChange={(e) =>
                        handleSplitValueChange(idx, Number(e.target.value) || 0)
                      }
                      className="h-7 text-xs px-1.5 font-mono text-right"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {split.strategyType === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                ) : (
                  <div className="w-20 shrink-0 text-[10px] text-muted-foreground font-mono text-center bg-muted/30 py-1 rounded">
                    Remaining
                  </div>
                )}

                {splits.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive shrink-0 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveSplitEntry(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Validation Feedback */}
          {splits.length >= 1 && (
            <div className="text-[11px] p-2 rounded bg-muted/40 font-medium">
              <div
                className={
                  totalPercentage <= 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }
              >
                {totalPercentage <= 100
                  ? `Total Percentage: ${totalPercentage}% ${
                      totalPercentage < 100 && !hasRemaining
                        ? `(remaining ${100 - totalPercentage}% will default to Guest)`
                        : ""
                    }`
                  : `Total Percentage: ${totalPercentage}% (Cannot exceed 100%)`}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Add Payer / Add Guest */}
        <div className="space-y-2 bg-muted/20 p-2.5 rounded-lg border">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Add Payer to Split
          </div>

          <div className="flex items-center gap-2">
            <Select value={newSplitEntity} onValueChange={setNewSplitEntity}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Choose guest..." />
              </SelectTrigger>
              <SelectContent>
                {guests
                  .filter(
                    (g) =>
                      !splits.some(
                        (s) => s.entity.toLowerCase() === g.toLowerCase()
                      )
                  )
                  .map((g) => (
                    <SelectItem key={g} value={g} className="text-xs">
                      {g}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              disabled={!newSplitEntity}
              onClick={handleAddSplitEntry}
            >
              Add
            </Button>
          </div>

          {showNewGuestInput ? (
            <div className="flex items-center gap-1.5 pt-1 border-t">
              <Input
                placeholder="New guest name..."
                value={dialogNewGuestName}
                onChange={(e) => setDialogNewGuestName(e.target.value)}
                className="h-7 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddNewGuest()}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!dialogNewGuestName.trim()}
                onClick={handleAddNewGuest}
              >
                Add Guest
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowNewGuestInput(false)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="link"
              className="p-0 h-6 text-xs text-primary flex items-center gap-1 font-semibold hover:no-underline"
              onClick={() => setShowNewGuestInput(true)}
            >
              <Plus className="w-3 h-3" />
              Add new guest to table
            </Button>
          )}
        </div>

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
