"use client";

import React, { useState, useMemo, useCallback } from "react";
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
import { Trash2, Plus, X } from "lucide-react";

export interface PaymentSplitEntry {
  entity: string;
  strategyType: "percentage" | "fixed_item" | "fixed_global" | "remaining";
  value: number;
  method?: string | null;
}

export function validateSplit(splits: PaymentSplitEntry[], itemTotalPrice?: number) {
  const totalPercentage = splits.filter(s => s.strategyType === "percentage").reduce((sum, s) => sum + s.value, 0);
  const totalFixedItem = splits.filter(s => s.strategyType === "fixed_item").reduce((sum, s) => sum + s.value, 0);
  const totalFixedGlobal = splits.filter(s => s.strategyType === "fixed_global").reduce((sum, s) => sum + s.value, 0);

  if (splits.length < 1) return false;
  if (itemTotalPrice !== undefined) {
    const price = itemTotalPrice;
    const fixedSum = totalFixedItem + totalFixedGlobal;
    const pctSum = price * (totalPercentage / 100);
    return fixedSum + pctSum <= price + 0.01;
  } else {
    return totalPercentage <= 100;
  }
}

interface SplitEditorProps {
  splits: PaymentSplitEntry[];
  onChange: (splits: PaymentSplitEntry[]) => void;
  guests: string[];
  onAddGuest: (name: string) => void;
  itemTotalPrice?: number;
}

export function SplitEditor({ splits, onChange, guests, onAddGuest, itemTotalPrice }: SplitEditorProps) {
  const [newSplitEntity, setNewSplitEntity] = useState("");
  const [dialogNewGuestName, setDialogNewGuestName] = useState("");
  const [showNewGuestInput, setShowNewGuestInput] = useState(false);

  const totalPercentage = useMemo(
    () => splits.filter(s => s.strategyType === "percentage").reduce((sum, s) => sum + s.value, 0),
    [splits]
  );

  const totalFixed = useMemo(
    () => splits.filter(s => s.strategyType === "fixed_item" || s.strategyType === "fixed_global").reduce((sum, s) => sum + s.value, 0),
    [splits]
  );

  const hasRemaining = useMemo(
    () => splits.some(s => s.strategyType === "remaining"),
    [splits]
  );

  const isValidSplit = validateSplit(splits, itemTotalPrice);

  const handleDistributeEqually = useCallback(() => {
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
    onChange(updated);
  }, [splits, onChange]);

  const handleAddSplitEntry = useCallback(() => {
    const entity = newSplitEntity.trim();
    if (!entity) return;
    if (splits.some((s) => s.entity.toLowerCase() === entity.toLowerCase())) return;

    const n = splits.length + 1;
    const newSplits = [...splits, { entity, strategyType: "percentage" as const, value: Math.floor(100 / n), method: null }];
    const allPercentage = newSplits.every(s => s.strategyType === "percentage");
    if (allPercentage) {
      const base = Math.floor(100 / n);
      newSplits.forEach((s) => {
        s.value = base;
      });
      const remainder = 100 - base * n;
      newSplits[0].value += remainder;
    }

    onChange(newSplits);
    setNewSplitEntity("");
  }, [newSplitEntity, splits, onChange]);

  const handleRemoveSplitEntry = useCallback(
    (index: number) => {
      if (splits.length <= 1) return;
      const newSplits = splits.filter((_, i) => i !== index);
      const allPercentage = newSplits.every(s => s.strategyType === "percentage");
      if (allPercentage) {
        const base = Math.floor(100 / newSplits.length);
        newSplits.forEach((s) => {
          s.value = base;
        });
        const remainder = 100 - base * newSplits.length;
        newSplits[0].value += remainder;
      }
      onChange(newSplits);
    },
    [splits, onChange]
  );

  const handleSplitTypeChange = (index: number, type: "percentage" | "fixed_item" | "fixed_global" | "remaining") => {
    const updated = [...splits];
    updated[index] = {
      ...updated[index],
      strategyType: type,
      value: type === "remaining" ? 0 : type === "percentage" ? 50 : 5,
    };
    onChange(updated);
  };

  const handleSplitMethodChange = (index: number, val: string) => {
    const updated = [...splits];
    updated[index] = { ...updated[index], method: val === "any" ? null : val };
    onChange(updated);
  };

  const handleSplitValueChange = (index: number, val: number) => {
    const updated = [...splits];
    updated[index] = { ...updated[index], value: Math.max(0, val) };
    onChange(updated);
  };

  const handleAddNewGuest = useCallback(() => {
    const name = dialogNewGuestName.trim();
    if (!name) return;
    onAddGuest(name);
    setDialogNewGuestName("");
    setShowNewGuestInput(false);

    if (splits.some((s) => s.entity.toLowerCase() === name.toLowerCase())) return;
    const n = splits.length + 1;
    const newSplits = [
      ...splits,
      { entity: name, strategyType: "percentage" as const, value: Math.floor(100 / n), method: null },
    ];
    const allPercentage = newSplits.every((s) => s.strategyType === "percentage");
    if (allPercentage) {
      const base = Math.floor(100 / n);
      newSplits.forEach((s) => { s.value = base; });
      const remainder = 100 - base * n;
      newSplits[0].value += remainder;
    }
    onChange(newSplits);
  }, [dialogNewGuestName, onAddGuest, splits, onChange]);

  return (
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

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {splits.map((split, idx) => (
          <div key={split.entity} className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-b pb-2 last:border-b-0 last:pb-0">
            <span className="text-xs font-semibold text-foreground truncate flex-1 min-w-[60px]" title={split.entity}>
              {split.entity}
            </span>

            <Select
              value={split.strategyType}
              onValueChange={(val) => handleSplitTypeChange(idx, val as any)}
            >
              <SelectTrigger className="h-7 text-[10px] w-20 sm:w-24 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage" className="text-xs">Percentage</SelectItem>
                <SelectItem value="fixed_item" className="text-xs">Fixed/Item</SelectItem>
                <SelectItem value="fixed_global" className="text-xs">Fixed Global</SelectItem>
                <SelectItem value="remaining" className="text-xs">Remaining</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={split.method || "any"}
              onValueChange={(val) => handleSplitMethodChange(idx, val)}
            >
              <SelectTrigger className="h-7 text-[10px] w-18 sm:w-20 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any" className="text-xs">Method...</SelectItem>
                <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                <SelectItem value="visa" className="text-xs">Visa</SelectItem>
                <SelectItem value="mastercard" className="text-xs">Mastercard</SelectItem>
                <SelectItem value="amex" className="text-xs">Amex</SelectItem>
              </SelectContent>
            </Select>

            {split.strategyType !== "remaining" ? (
              <div className="flex items-center gap-1 w-16 sm:w-20 shrink-0">
                <Input
                  type="number"
                  value={split.value}
                  onChange={(e) => handleSplitValueChange(idx, Number(e.target.value) || 0)}
                  className="h-7 text-xs px-1.5 font-mono text-right"
                />
                <span className="text-[10px] text-muted-foreground">
                  {split.strategyType === "percentage" ? "%" : "$"}
                </span>
              </div>
            ) : (
              <div className="w-16 sm:w-20 shrink-0 text-[10px] text-muted-foreground font-mono text-center bg-muted/30 py-1 rounded">
                Rem.
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

      <Separator />

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
                  (g) => !splits.some((s) => s.entity.toLowerCase() === g.toLowerCase())
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

      <div className="text-[11px] p-2 rounded bg-muted/40 font-medium">
        {itemTotalPrice !== undefined ? (
          isValidSplit ? (
            <div className="text-emerald-600 dark:text-emerald-400">
              {hasRemaining 
                ? "Split is valid (remainder pays balance)." 
                : totalFixed + itemTotalPrice * (totalPercentage / 100) < itemTotalPrice - 0.01
                ? `Covered: $${(totalFixed + itemTotalPrice * (totalPercentage / 100)).toFixed(2)} (remainder of $${(itemTotalPrice - (totalFixed + itemTotalPrice * (totalPercentage / 100))).toFixed(2)} defaults to Guest)`
                : "Split covers the full price."}
            </div>
          ) : (
            <div className="text-destructive">
              Exceeds total item price of ${itemTotalPrice.toFixed(2)}. Please adjust split values.
            </div>
          )
        ) : (
          <div
            className={
              isValidSplit
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            }
          >
            {isValidSplit
              ? `Total Percentage: ${totalPercentage}% ${
                  totalPercentage < 100 && !hasRemaining
                    ? `(remaining ${100 - totalPercentage}% will default to Guest)`
                    : ""
                }`
              : `Total Percentage: ${totalPercentage}% (Cannot exceed 100%)`}
          </div>
        )}
      </div>
    </div>
  );
}