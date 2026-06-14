"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PAYMENT_METHODS } from "@/lib/pos/ui-utils";
import { PaymentStrategyType } from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export interface PaymentSplitEntry {
  entity: string;
  strategyType: PaymentStrategyType;
  value: number;
  method?: string | null;
}

export function validateSplit(
  splits: PaymentSplitEntry[],
  itemTotalPrice?: number,
) {
  const totalPercentage = splits
    .filter((s) => s.strategyType === PaymentStrategyType.Percentage)
    .reduce((sum, s) => sum + s.value, 0);
  const totalFixedItem = splits
    .filter((s) => s.strategyType === PaymentStrategyType.FixedItem)
    .reduce((sum, s) => sum + s.value, 0);
  const totalFixedGlobal = splits
    .filter((s) => s.strategyType === PaymentStrategyType.FixedGlobal)
    .reduce((sum, s) => sum + s.value, 0);

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
  itemTotalPrice?: number;
}

export function SplitEditor({
  splits,
  onChange,
  itemTotalPrice,
}: SplitEditorProps) {
  const allocationsState = useVCSStore((s) => s.projectedState.allocations);
  const getGuests = useVCSStore((s) => s.guests);
  const onAddGuest = useVCSStore((s) => s.addGuest);
  const guests = useMemo(() => {
    return getGuests().map((g) => g.name);
  }, [getGuests, allocationsState]);
  const [dialogNewGuestName, setDialogNewGuestName] = useState("");
  const [showNewGuestInput, setShowNewGuestInput] = useState(false);

  const [quickAddStrategy, setQuickAddStrategy] = useState<PaymentStrategyType>(
    PaymentStrategyType.Percentage,
  );
  const [quickAddMethod, setQuickAddMethod] = useState<string>("any");
  const [quickAddValue, setQuickAddValue] = useState<string>("");

  const totalPercentage = useMemo(
    () =>
      splits
        .filter((s) => s.strategyType === PaymentStrategyType.Percentage)
        .reduce((sum, s) => sum + s.value, 0),
    [splits],
  );

  const totalFixed = useMemo(
    () =>
      splits
        .filter(
          (s) =>
            s.strategyType === PaymentStrategyType.FixedItem ||
            s.strategyType === PaymentStrategyType.FixedGlobal,
        )
        .reduce((sum, s) => sum + s.value, 0),
    [splits],
  );

  const hasRemaining = useMemo(
    () => splits.some((s) => s.strategyType === PaymentStrategyType.Remaining),
    [splits],
  );

  const isValidSplit = validateSplit(splits, itemTotalPrice);

  const handleDistributeEqually = useCallback(() => {
    const n = splits.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const updated = splits.map((s) => ({
      ...s,
      strategyType: PaymentStrategyType.Percentage,
      value: base,
    }));
    const remainder = 100 - base * n;
    updated[0].value += remainder;
    onChange(updated);
  }, [splits, onChange]);

  const handleAddSpecificGuest = useCallback(
    (entity: string) => {
      const trimmed = entity.trim();
      if (!trimmed) return;
      if (splits.some((s) => s.entity.toLowerCase() === trimmed.toLowerCase()))
        return;

      let valueToUse = quickAddValue === "" ? null : Number(quickAddValue);
      const isAutoPercent =
        quickAddStrategy === PaymentStrategyType.Percentage &&
        valueToUse === null;

      if (valueToUse === null) {
        valueToUse = quickAddStrategy === PaymentStrategyType.Remaining ? 0 : 0;
      }

      const n = splits.length + 1;
      const newSplits = [
        ...splits,
        {
          entity: trimmed,
          strategyType: quickAddStrategy,
          value: isAutoPercent ? Math.floor(100 / n) : valueToUse,
          method: quickAddMethod === "any" ? null : quickAddMethod,
        },
      ];

      if (
        isAutoPercent &&
        newSplits.every(
          (s) => s.strategyType === PaymentStrategyType.Percentage,
        )
      ) {
        const base = Math.floor(100 / n);
        newSplits.forEach((s) => {
          s.value = base;
        });
        const remainder = 100 - base * n;
        newSplits[0].value += remainder;
      }

      onChange(newSplits);
    },
    [splits, onChange, quickAddStrategy, quickAddMethod, quickAddValue],
  );

  const handleAddAllAvailable = useCallback(() => {
    const available = guests.filter(
      (g) => !splits.some((s) => s.entity.toLowerCase() === g.toLowerCase()),
    );
    if (available.length === 0) return;

    let valueToUse = quickAddValue === "" ? null : Number(quickAddValue);
    const isAutoPercent =
      quickAddStrategy === PaymentStrategyType.Percentage &&
      valueToUse === null;

    if (valueToUse === null) {
      valueToUse = quickAddStrategy === PaymentStrategyType.Remaining ? 0 : 0;
    }

    const n = splits.length + available.length;
    const addedSplits = available.map((entity) => ({
      entity,
      strategyType: quickAddStrategy,
      value: isAutoPercent ? Math.floor(100 / n) : valueToUse!,
      method: quickAddMethod === "any" ? null : quickAddMethod,
    }));

    const newSplits = [...splits, ...addedSplits];
    if (
      isAutoPercent &&
      newSplits.every((s) => s.strategyType === PaymentStrategyType.Percentage)
    ) {
      const base = Math.floor(100 / n);
      newSplits.forEach((s) => {
        s.value = base;
      });
      const remainder = 100 - base * n;
      newSplits[0].value += remainder;
    }

    onChange(newSplits);
  }, [
    splits,
    guests,
    onChange,
    quickAddStrategy,
    quickAddMethod,
    quickAddValue,
  ]);

  const handleRemoveSplitEntry = useCallback(
    (index: number) => {
      if (splits.length <= 1) return;
      const newSplits = splits.filter((_, i) => i !== index);
      const allPercentage = newSplits.every(
        (s) => s.strategyType === PaymentStrategyType.Percentage,
      );
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
    [splits, onChange],
  );

  const handleEntityChange = useCallback(
    (index: number, newEntity: string) => {
      const updated = [...splits];
      updated[index] = { ...updated[index], entity: newEntity };
      onChange(updated);
    },
    [splits, onChange],
  );

  const handleSplitTypeChange = (index: number, type: PaymentStrategyType) => {
    const updated = [...splits];
    updated[index] = {
      ...updated[index],
      strategyType: type,
      value:
        type === PaymentStrategyType.Remaining
          ? 0
          : type === PaymentStrategyType.Percentage
            ? 50
            : 5,
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

    if (splits.some((s) => s.entity.toLowerCase() === name.toLowerCase()))
      return;

    let valueToUse = quickAddValue === "" ? null : Number(quickAddValue);
    const isAutoPercent =
      quickAddStrategy === PaymentStrategyType.Percentage &&
      valueToUse === null;

    if (valueToUse === null) {
      valueToUse = quickAddStrategy === PaymentStrategyType.Remaining ? 0 : 0;
    }

    const n = splits.length + 1;
    const newSplits = [
      ...splits,
      {
        entity: name,
        strategyType: quickAddStrategy,
        value: isAutoPercent ? Math.floor(100 / n) : valueToUse,
        method: quickAddMethod === "any" ? null : quickAddMethod,
      },
    ];
    if (
      isAutoPercent &&
      newSplits.every((s) => s.strategyType === PaymentStrategyType.Percentage)
    ) {
      const base = Math.floor(100 / n);
      newSplits.forEach((s) => {
        s.value = base;
      });
      const remainder = 100 - base * n;
      newSplits[0].value += remainder;
    }
    onChange(newSplits);
  }, [
    dialogNewGuestName,
    onAddGuest,
    splits,
    onChange,
    quickAddStrategy,
    quickAddMethod,
    quickAddValue,
  ]);

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
          <div
            key={`split-row-${idx}`}
            className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-b pb-2 last:border-b-0 last:pb-0"
          >
            <Select
              value={split.entity}
              onValueChange={(val) => handleEntityChange(idx, val)}
            >
              <SelectTrigger className="h-7 text-xs font-semibold text-foreground border-none shadow-none bg-transparent hover:bg-accent/40 p-1 flex-1 min-w-[80px] justify-between gap-1 focus:ring-0">
                <SelectValue placeholder={split.entity} />
              </SelectTrigger>
              <SelectContent>
                {guests.map((g) => {
                  const isAlreadyUsed = splits.some(
                    (s) => s.entity.toLowerCase() === g.toLowerCase(),
                  );
                  const isCurrent = g === split.entity;
                  if (isAlreadyUsed && !isCurrent) return null;
                  return (
                    <SelectItem key={g} value={g} className="text-xs">
                      {g}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={split.strategyType}
              onValueChange={(val) => handleSplitTypeChange(idx, val as any)}
            >
              <SelectTrigger className="h-7 text-[10px] w-20 sm:w-24 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage" className="text-xs">
                  Percentage
                </SelectItem>
                <SelectItem value="fixed_item" className="text-xs">
                  Fixed/Item
                </SelectItem>
                <SelectItem value="fixed_global" className="text-xs">
                  Fixed Global
                </SelectItem>
                <SelectItem value="remaining" className="text-xs">
                  Remaining
                </SelectItem>
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
                <SelectItem value="any" className="text-xs">
                  Method...
                </SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {split.strategyType !== "remaining" ? (
              <div className="flex items-center gap-1 w-16 sm:w-20 shrink-0">
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
        <div className="flex justify-between items-center">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Add Settings
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-border/50">
          <Select
            value={quickAddStrategy}
            onValueChange={(val) => setQuickAddStrategy(val as any)}
          >
            <SelectTrigger className="h-7 text-[10px] w-24 sm:w-28 shrink-0 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage" className="text-xs">
                Percentage
              </SelectItem>
              <SelectItem value="fixed_item" className="text-xs">
                Fixed/Item
              </SelectItem>
              <SelectItem value="fixed_global" className="text-xs">
                Fixed Global
              </SelectItem>
              <SelectItem value="remaining" className="text-xs">
                Remaining
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={quickAddMethod}
            onValueChange={(val) => setQuickAddMethod(val)}
          >
            <SelectTrigger className="h-7 text-[10px] w-20 sm:w-24 shrink-0 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any" className="text-xs">
                Method...
              </SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {quickAddStrategy !== "remaining" && (
            <div className="flex items-center gap-1 w-16 sm:w-20 shrink-0">
              <Input
                type="number"
                placeholder={
                  quickAddStrategy === "percentage" ? "Auto" : "0.00"
                }
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                className="h-7 text-xs px-1.5 font-mono text-right bg-background"
              />
              <span className="text-[10px] text-muted-foreground">
                {quickAddStrategy === "percentage" ? "%" : "$"}
              </span>
            </div>
          )}
        </div>

        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Add Payer to Split
        </div>

        {(() => {
          const availableGuests = guests.filter(
            (g) =>
              !splits.some((s) => s.entity.toLowerCase() === g.toLowerCase()),
          );

          if (availableGuests.length === 0) {
            return (
              <div className="text-[11px] text-muted-foreground italic pb-1">
                All current guests are included in the split.
              </div>
            );
          }

          return (
            <div className="flex flex-wrap items-center gap-2">
              {availableGuests.map((g) => (
                <label
                  key={g}
                  className="flex items-center gap-1.5 px-2 py-1 border rounded bg-background cursor-pointer hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleAddSpecificGuest(g)}
                    className="w-3 h-3"
                  />
                  <span className="text-xs font-medium leading-none mt-0.5">
                    {g}
                  </span>
                </label>
              ))}
              {availableGuests.length > 1 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-[10px] px-2 ml-auto shrink-0"
                  onClick={handleAddAllAvailable}
                >
                  Add Everyone
                </Button>
              )}
            </div>
          );
        })()}

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
                : totalFixed + itemTotalPrice * (totalPercentage / 100) <
                    itemTotalPrice - 0.01
                  ? `Covered: $${(totalFixed + itemTotalPrice * (totalPercentage / 100)).toFixed(2)} (remainder of $${(itemTotalPrice - (totalFixed + itemTotalPrice * (totalPercentage / 100))).toFixed(2)} defaults to Guest)`
                  : "Split covers the full price."}
            </div>
          ) : (
            <div className="text-destructive">
              Exceeds total item price of ${itemTotalPrice.toFixed(2)}. Please
              adjust split values.
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
