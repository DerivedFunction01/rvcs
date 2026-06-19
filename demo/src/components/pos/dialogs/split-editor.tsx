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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PAYMENT_METHODS } from "@/lib/pos/ui-utils";
import { PaymentStrategyType } from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import { Plus, Trash2, X, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { NumberPadDialog } from "./number-pad-dialog";

export interface PaymentSplitEntry {
  entity: string;
  strategyType: PaymentStrategyType;
  value: number;
  method?: string | null;
}

const STRATEGY_OPTIONS = [
  { value: PaymentStrategyType.Percentage, label: "Percentage" },
  { value: PaymentStrategyType.FixedItem, label: "Fixed/Item" },
  { value: PaymentStrategyType.FixedGlobal, label: "Fixed Global" },
  { value: PaymentStrategyType.Remaining, label: "Remaining" },
];

const METHOD_OPTIONS = [
  { value: "any", label: "Method..." },
  ...PAYMENT_METHODS.map((m) => ({
    value: m,
    label: m.charAt(0).toUpperCase() + m.slice(1),
  })),
];

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
    return totalPercentage <= 100.001;
  }
}

/**
 * Dialog for selecting guests to add to split
 * Handles search, filtering, and large guest lists (100+)
 */
function GuestSelectionDialog({
  open,
  onOpenChange,
  availableGuests,
  onSelectGuests,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableGuests: string[];
  onSelectGuests: (guests: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!query.trim()) return availableGuests;
    const q = query.toLowerCase();
    return availableGuests.filter((g) => g.toLowerCase().includes(q));
  }, [query, availableGuests]);

  const handleClose = () => {
    setQuery("");
    setSelectedGuests(new Set());
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onSelectGuests(Array.from(selectedGuests));
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add Guests to Split
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search guests..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-10 md:h-12 text-xs md:text-sm"
          />
        </div>

        {/* Quick Actions */}
        {availableGuests.length > 1 && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGuests(new Set(filtered))}
              className="h-10 md:h-12 text-xs md:text-sm flex-1"
            >
              Select All {filtered.length > availableGuests.length ? `(${filtered.length})` : ""}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGuests(new Set())}
              className="h-10 md:h-12 text-xs md:text-sm text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 flex-1"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Guest Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs md:text-sm text-muted-foreground">
              No guests found
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 pb-2">
              {filtered.map((guestName) => {
                const isSelected = selectedGuests.has(guestName);
                return (
                  <label
                    key={guestName}
                    className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 border rounded-lg text-left text-xs md:text-sm transition-all min-h-10 md:min-h-12 cursor-pointer ${isSelected
                        ? "border-primary bg-primary/5 font-medium shadow-sm"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent/40"
                      }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        setSelectedGuests((prev) => {
                          const next = new Set(prev);
                          if (next.has(guestName)) {
                            next.delete(guestName);
                          } else {
                            next.add(guestName);
                          }
                          return next;
                        });
                      }}
                      className="w-4 h-4 md:w-5 md:h-5"
                    />
                    <span className="truncate flex-1">{guestName}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-2 shrink-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-12 md:h-14 flex-1 text-sm md:text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedGuests.size === 0}
            className="h-12 md:h-14 flex-1 text-sm md:text-base"
          >
            Add {selectedGuests.size > 0 ? `(${selectedGuests.size})` : ""} Guest{selectedGuests.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const [autoRedistribute, setAutoRedistribute] = useState(true);
  const [guestSelectionOpen, setGuestSelectionOpen] = useState(false);

  const formatNumber = useFormatNumber();

  const [quickAddStrategy, setQuickAddStrategy] = useState<PaymentStrategyType>(
    PaymentStrategyType.Percentage,
  );
  const [quickAddMethod, setQuickAddMethod] = useState<string>("any");
  const [quickAddValue, setQuickAddValue] = useState<string>("");
  const [padTarget, setPadTarget] = useState<{ type: "split"; index: number } | { type: "quick-add" } | null>(null);

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

  const availableGuests = useMemo(
    () =>
      guests.filter(
        (g) => !splits.some((s) => s.entity.toLowerCase() === g.toLowerCase()),
      ),
    [guests, splits],
  );

  const handleDistributeEqually = useCallback(() => {
    const n = splits.length;
    if (n === 0) return;
    const base = Math.round((100 / n) * 1000) / 1000;
    const updated = splits.map((s) => ({
      ...s,
      strategyType: PaymentStrategyType.Percentage,
      value: base,
    }));
    const remainder = Math.round((100 - base * n) * 1000) / 1000;
    updated[0].value = Math.round((updated[0].value + remainder) * 1000) / 1000;
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
        const base = Math.round((100 / n) * 1000) / 1000;
        newSplits.forEach((s) => {
          s.value = base;
        });
        const remainder = Math.round((100 - base * n) * 1000) / 1000;
        newSplits[0].value = Math.round((newSplits[0].value + remainder) * 1000) / 1000;
      }

      onChange(newSplits);
    },
    [splits, onChange, quickAddStrategy, quickAddMethod, quickAddValue],
  );

  const handleAddMultipleGuests = useCallback(
    (guestNames: string[]) => {
      let newSplits = [...splits];

      for (const name of guestNames) {
        const trimmed = name.trim();
        if (!trimmed) continue;
        if (newSplits.some((s) => s.entity.toLowerCase() === trimmed.toLowerCase()))
          continue;

        newSplits.push({
          entity: trimmed,
          strategyType: quickAddStrategy,
          value: 0,
          method: quickAddMethod === "any" ? null : quickAddMethod,
        });
      }

      if (newSplits.length === splits.length) return;

      const isAutoPercent =
        quickAddStrategy === PaymentStrategyType.Percentage &&
        quickAddValue === "";

      if (
        isAutoPercent &&
        newSplits.every(
          (s) => s.strategyType === PaymentStrategyType.Percentage,
        )
      ) {
        const n = newSplits.length;
        const base = Math.round((100 / n) * 1000) / 1000;
        newSplits.forEach((s) => {
          s.value = base;
        });
        const remainder = Math.round((100 - base * n) * 1000) / 1000;
        newSplits[0].value = Math.round((newSplits[0].value + remainder) * 1000) / 1000;
      }

      onChange(newSplits);
    },
    [splits, onChange, quickAddStrategy, quickAddMethod, quickAddValue],
  );

  const handleAddNewGuest = useCallback(() => {
    const trimmed = dialogNewGuestName.trim();
    if (!trimmed) return;
    onAddGuest(trimmed);
    setDialogNewGuestName("");
    setShowNewGuestInput(false);
    handleAddSpecificGuest(trimmed);
  }, [dialogNewGuestName, onAddGuest, handleAddSpecificGuest]);

  const handleRemoveSplitEntry = useCallback(
    (index: number) => {
      const updated = splits.filter((_, i) => i !== index);
      if (updated.length === 0) return;

      if (autoRedistribute && updated.every((s) => s.strategyType === PaymentStrategyType.Percentage)) {
        const n = updated.length;
        const base = Math.round((100 / n) * 1000) / 1000;
        updated.forEach((s) => {
          s.value = base;
        });
        const remainder = Math.round((100 - base * n) * 1000) / 1000;
        updated[0].value = Math.round((updated[0].value + remainder) * 1000) / 1000;
      }

      onChange(updated);
    },
    [splits, onChange, autoRedistribute],
  );

  const handleSplitValueChange = useCallback(
    (index: number, newValue: number) => {
      const updated = [...splits];
      updated[index].value = newValue;
      onChange(updated);
    },
    [splits, onChange],
  );

  const handleSplitStrategyChange = useCallback(
    (index: number, newStrategy: PaymentStrategyType) => {
      const updated = [...splits];
      updated[index].strategyType = newStrategy;
      onChange(updated);
    },
    [splits, onChange],
  );

  const handleSplitMethodChange = useCallback(
    (index: number, newMethod: string) => {
      const updated = [...splits];
      updated[index].method = newMethod === "any" ? null : newMethod;
      onChange(updated);
    },
    [splits, onChange],
  );

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Existing Splits List */}
      <div className="space-y-2 md:space-y-3">
        {splits.map((split, idx) => (
          <div
            key={`${split.entity}-${idx}`}
            className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 rounded-lg border bg-card p-3 md:p-4"
          >
            {/* Entity Name */}
            <div className="flex-1 min-w-0 text-xs md:text-sm font-medium truncate">
              {split.entity}
            </div>

            {/* Strategy Selector */}
            <div className="flex items-center gap-2 min-w-max">
              <Select
                value={split.strategyType}
                onValueChange={(val) => handleSplitStrategyChange(idx, val as any)}
              >
                <SelectTrigger className="h-10 md:h-12 text-xs md:text-sm w-28 md:w-32 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs md:text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Value Input */}
            {split.strategyType !== PaymentStrategyType.Remaining && (
              <div className="flex items-center gap-1.5 min-w-max">
                <button
                  type="button"
                  className="flex h-10 md:h-12 w-20 md:w-24 rounded-md border border-input bg-background px-2 md:px-3 py-1 text-xs md:text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono justify-end items-center"
                  onClick={() => setPadTarget({ type: "split", index: idx })}
                >
                  {String(split.value).replace(".", ".")}
                </button>
                <span className="text-xs md:text-sm text-muted-foreground font-medium min-w-max">
                  {split.strategyType === PaymentStrategyType.Percentage ? "%" : "$"}
                </span>
              </div>
            )}

            {/* Payment Method */}
            <div className="flex items-center gap-2 min-w-max">
              <Select
                value={split.method ?? "any"}
                onValueChange={(val) => handleSplitMethodChange(idx, val)}
              >
                <SelectTrigger className="h-10 md:h-12 text-xs md:text-sm w-24 md:w-28 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs md:text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Remaining Badge / Delete Button */}
            {split.strategyType === PaymentStrategyType.Remaining && (
              <div className="text-xs md:text-sm font-medium text-muted-foreground px-2 py-1 bg-muted/30 rounded min-w-max">
                Rem.
              </div>
            )}

            {splits.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 md:h-12 w-10 md:w-12 p-0 text-destructive shrink-0 hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRemoveSplitEntry(idx)}
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Separator />

      {/* Quick Add Settings */}
      <div className="space-y-3 md:space-y-4 bg-muted/20 p-3 md:p-4 rounded-lg border">
        <div className="flex justify-between items-center">
          <div className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Add Settings
          </div>
        </div>

        {/* Strategy & Method Selectors */}
        <div className="flex flex-col sm:flex-row gap-2 pb-3 border-b border-border/50">
          <Select
            value={quickAddStrategy}
            onValueChange={(val) => setQuickAddStrategy(val as any)}
          >
            <SelectTrigger className="h-10 md:h-12 text-xs md:text-sm bg-background flex-1 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRATEGY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs md:text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={quickAddMethod}
            onValueChange={(val) => setQuickAddMethod(val)}
          >
            <SelectTrigger className="h-10 md:h-12 text-xs md:text-sm bg-background flex-1 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs md:text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {quickAddStrategy !== "remaining" && (
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <button
                type="button"
                className={`flex h-10 md:h-12 flex-1 rounded-md border border-input bg-background px-2 md:px-3 py-1 text-xs md:text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono justify-end items-center ${quickAddValue === "" ? "text-muted-foreground" : ""}`}
                onClick={() => setPadTarget({ type: "quick-add" })}
              >
                {quickAddValue === "" ? (quickAddStrategy === "percentage" ? "Auto" : "0.00") : quickAddValue}
              </button>
              <span className="text-xs md:text-sm text-muted-foreground font-medium">
                {quickAddStrategy === "percentage" ? "%" : "$"}
              </span>
            </div>
          )}
        </div>

        {/* Add Payer Section */}
        <div className="space-y-2 md:space-y-3">
          <div className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Add Guests to Split
          </div>

          {availableGuests.length === 0 ? (
            <div className="text-xs md:text-sm text-muted-foreground italic pb-1">
              All current guests are included in the split.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 md:h-12 text-xs md:text-sm flex-1 gap-2"
                onClick={() => setGuestSelectionOpen(true)}
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                Add Guest{availableGuests.length > 1 ? "s" : ""} ({availableGuests.length})
              </Button>
            </div>
          )}

          {showNewGuestInput ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t">
              <Input
                placeholder="New guest name..."
                value={dialogNewGuestName}
                onChange={(e) => setDialogNewGuestName(e.target.value)}
                className="h-10 md:h-12 text-xs md:text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddNewGuest()}
              />
              <Button
                size="sm"
                className="h-10 md:h-12 text-xs md:text-sm"
                disabled={!dialogNewGuestName.trim()}
                onClick={handleAddNewGuest}
              >
                Add Guest
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 md:h-12 w-10 md:w-12 p-0"
                onClick={() => setShowNewGuestInput(false)}
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="link"
              className="p-0 h-10 md:h-12 text-xs md:text-sm text-primary flex items-center gap-1 font-semibold hover:no-underline"
              onClick={() => setShowNewGuestInput(true)}
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              Add new guest to table
            </Button>
          )}
        </div>
      </div>

      {/* Validation Message */}
      <div className="text-xs md:text-sm p-3 md:p-4 rounded-lg bg-muted/40 font-medium">
        {itemTotalPrice !== undefined ? (
          isValidSplit ? (
            <div className="text-emerald-600 dark:text-emerald-400">
              {hasRemaining
                ? "Split is valid (remainder pays balance)."
                : totalFixed + itemTotalPrice * (totalPercentage / 100) <
                  itemTotalPrice - 0.01
                  ? `Covered: $${formatNumber(totalFixed + itemTotalPrice * (totalPercentage / 100), 2)} (remainder of $${formatNumber(itemTotalPrice - (totalFixed + itemTotalPrice * (totalPercentage / 100)), 2)} defaults to Guest)`
                  : "Split covers the full price."}
            </div>
          ) : (
            <div className="text-destructive">
              Exceeds total item price of ${formatNumber(itemTotalPrice, 2)}. Please
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
              ? `Total Percentage: ${totalPercentage}% ${totalPercentage < 100 && !hasRemaining
                ? `(remaining ${100 - totalPercentage}% will default to Guest)`
                : ""
              }`
              : `Total Percentage: ${totalPercentage}% (Cannot exceed 100%)`}
          </div>
        )}
      </div>

      {/* Guest Selection Dialog */}
      <GuestSelectionDialog
        open={guestSelectionOpen}
        onOpenChange={setGuestSelectionOpen}
        availableGuests={availableGuests}
        onSelectGuests={handleAddMultipleGuests}
      />

      {/* Number Pad Dialog */}
      {padTarget && (
        <NumberPadDialog
          open={padTarget !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setPadTarget(null);
          }}
          title={
            padTarget.type === "quick-add"
              ? quickAddStrategy === PaymentStrategyType.Percentage ? "Percentage" : "Amount"
              : splits[padTarget.index].strategyType === PaymentStrategyType.Percentage ? "Percentage" : "Amount"
          }
          description={`Set the ${padTarget.type === "quick-add" ? (quickAddStrategy === PaymentStrategyType.Percentage ? "percentage" : "amount") : (splits[padTarget.index].strategyType === PaymentStrategyType.Percentage ? "percentage" : "amount")} for this split`}
          initialValue={
            padTarget.type === "quick-add"
              ? (quickAddValue === "" ? null : Number(quickAddValue))
              : splits[padTarget.index].value
          }
          min={0}
          onConfirm={(val) => {
            if (padTarget.type === "quick-add") {
              setQuickAddValue(String(val));
            } else {
              handleSplitValueChange(padTarget.index, val);
            }
          }}
        />
      )}
    </div>
  );
}