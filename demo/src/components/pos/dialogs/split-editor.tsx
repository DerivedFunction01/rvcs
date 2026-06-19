"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PAYMENT_METHODS } from "@/lib/pos/ui-utils";
import { PaymentStrategyType } from "@/lib/vcs/types";
import { usePreferencesStore } from "@/store/preferences-store";
import { useVCSStore } from "@/store/vcs-store";
import { Plus, Trash2, Users, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { NumberPadDialog } from "./number-pad-dialog";
import { GuestGridPicker } from "./guest-picker";
import { SplitQtyUnit } from "@/lib/pos/types";

export interface PaymentSplitEntry {
  entity: string;
  strategyType: PaymentStrategyType;
  value: number; // Stored internally as the base PER-UNIT (per-seat) value
  method?: string | null;
  multiplier?: number;
  multiplierMode?: SplitQtyUnit; // SplitQtyUnit.PerUnit (each pays X), SplitQtyUnit.Collective (group pays X total)
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

type ChoiceOption = {
  value: string;
  label: string;
};

function ChoiceDialog({
  open,
  onOpenChange,
  title,
  description,
  options,
  value,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  options: ChoiceOption[];
  value: string;
  onSelect: (next: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg md:text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm md:text-base">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto min-h-0">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  onOpenChange(false);
                }}
                className={`min-h-12 md:min-h-14 rounded-xl border px-4 py-3 text-left text-sm md:text-base transition-all ${active
                    ? "border-primary bg-primary/5 font-semibold shadow-sm"
                    : "border-border bg-card hover:bg-accent"
                  }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SplitControlSet({
  strategyType,
  method,
  value,
  valueUnit,
  valueLabel,
  strategyOptions,
  methodOptions,
  onStrategyChange,
  onMethodChange,
  onValueClick,
  hideValue,
  compact = false,
}: {
  strategyType: PaymentStrategyType;
  method: string | null | undefined;
  value: number;
  valueUnit: string;
  valueLabel: string;
  strategyOptions: ChoiceOption[];
  methodOptions: ChoiceOption[];
  onStrategyChange: (next: PaymentStrategyType) => void;
  onMethodChange: (next: string | null) => void;
  onValueClick: () => void;
  hideValue?: boolean;
  compact?: boolean;
}) {
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);

  const selectedStrategy = strategyOptions.find((opt) => opt.value === strategyType)?.label ?? "Select";
  const selectedMethod = methodOptions.find((opt) => opt.value === (method ?? "any"))?.label ?? "Method...";

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "w-full sm:w-auto" : ""}`}>
        <button
          type="button"
          className="h-12 md:h-14 rounded-lg border bg-background px-3 md:px-4 text-xs md:text-sm font-semibold text-left min-w-28 md:min-w-32 hover:bg-accent transition-colors shrink-0"
          onClick={() => setStrategyOpen(true)}
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Type</span>
            <span className="truncate w-full">{selectedStrategy}</span>
          </div>
        </button>

        <button
          type="button"
          className="h-12 md:h-14 rounded-lg border bg-background px-3 md:px-4 text-xs md:text-sm font-semibold text-left min-w-28 md:min-w-32 hover:bg-accent transition-colors shrink-0"
          onClick={() => setMethodOpen(true)}
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Method</span>
            <span className="truncate w-full">{selectedMethod}</span>
          </div>
        </button>

        {!hideValue && (
          <button
            type="button"
            className="h-12 md:h-14 rounded-lg border bg-background px-3 md:px-4 text-xs md:text-sm font-semibold text-left min-w-24 md:min-w-28 font-mono hover:bg-accent transition-colors flex items-center justify-between gap-2 shrink-0"
            onClick={onValueClick}
          >
            <div className="flex flex-col items-start gap-0.5 min-w-0">
              <span className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-sans font-semibold">Value</span>
              <span className="truncate w-full">{valueLabel}</span>
            </div>
            <span className="text-xs md:text-sm text-muted-foreground font-sans shrink-0">{valueUnit}</span>
          </button>
        )}
      </div>

      <ChoiceDialog
        open={strategyOpen}
        onOpenChange={setStrategyOpen}
        title="Choose Split Type"
        description="Select how this split should be calculated."
        options={strategyOptions}
        value={strategyType}
        onSelect={(next) => onStrategyChange(next as PaymentStrategyType)}
      />

      <ChoiceDialog
        open={methodOpen}
        onOpenChange={setMethodOpen}
        title="Choose Payment Method"
        description="Select the payment method for this split."
        options={methodOptions}
        value={method ?? "any"}
        onSelect={(next) => onMethodChange(next === "any" ? null : next)}
      />
    </>
  );
}

export function validateSplit(
  splits: PaymentSplitEntry[],
  itemTotalPrice?: number,
) {
  const totalPercentage = splits
    .filter((s) => s.strategyType === PaymentStrategyType.Percentage)
    .reduce((sum, s) => sum + s.value * (s.multiplier ?? 1), 0);
  const totalFixedItem = splits
    .filter((s) => s.strategyType === PaymentStrategyType.FixedItem)
    .reduce((sum, s) => sum + s.value * (s.multiplier ?? 1), 0);
  const totalFixedGlobal = splits
    .filter((s) => s.strategyType === PaymentStrategyType.FixedGlobal)
    .reduce((sum, s) => sum + s.value * (s.multiplier ?? 1), 0);

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
 * Robust redistribution engine designed to equally split auto-percentages.
 * Each row declares its own "multiplierMode" to determine its weight fraction.
 */
function redistributePercentages(
  splitsList: PaymentSplitEntry[]
): PaymentSplitEntry[] {
  const n = splitsList.length;
  if (n === 0) return [];

  const updated = splitsList.map((s) => ({ ...s }));

  // Calculate the collective weight of all splits
  const totalWeight = updated.reduce((sum, s) => {
    const mode = s.multiplierMode ?? SplitQtyUnit.PerUnit;
    const mult = s.multiplier ?? 1;
    return sum + (mode === SplitQtyUnit.Collective ? 1 : mult);
  }, 0);

  if (totalWeight === 0) return updated;

  const baseUnitPercent = 100 / totalWeight;

  updated.forEach((s) => {
    const mode = s.multiplierMode ?? SplitQtyUnit.PerUnit;
    const mult = s.multiplier ?? 1;

    if (mode === SplitQtyUnit.Collective) {
      s.value = Math.round((baseUnitPercent / mult) * 1000) / 1000;
    } else {
      s.value = Math.round(baseUnitPercent * 1000) / 1000;
    }
  });

  // Absorb remainder drifts into the first element
  const currentSum = updated.reduce((sum, s) => sum + s.value * (s.multiplier ?? 1), 0);
  const remainder = 100 - currentSum;
  const firstMultiplier = updated[0].multiplier ?? 1;
  updated[0].value = Math.round((updated[0].value + remainder / firstMultiplier) * 1000) / 1000;

  return updated;
}

function GuestSelectionDialog({
  open,
  onOpenChange,
  availableGuests,
  onSelectGuests,
  palette,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableGuests: Array<{ id: string; label: string; multiplier: number }>;
  onSelectGuests: (guests: Array<{ id: string; multiplier: number }>) => void;
  palette?: string[];
}) {
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierPadOpen, setMultiplierPadOpen] = useState(false);

  const handleClose = () => {
    setSelectedGuests(new Set());
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onSelectGuests(Array.from(selectedGuests).map((id) => ({ id, multiplier })));
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

        <GuestGridPicker
          open={open}
          items={availableGuests.map((guest) => ({
            id: guest.id,
            label: guest.label,
            secondary: guest.multiplier > 1 ? `x${guest.multiplier}` : undefined,
          }))}
          selectedIds={selectedGuests}
          onToggle={(guestName) => {
            setSelectedGuests((prev) => {
              const next = new Set(prev);
              if (next.has(guestName)) next.delete(guestName);
              else next.add(guestName);
              return next;
            });
          }}
          searchPlaceholder="Search guests..."
          emptyText="No guests found."
          palette={palette}
          showSelectAll
          showClearAll
          onSelectAll={() => setSelectedGuests(new Set(availableGuests.map((g) => g.id)))}
          onClearAll={() => setSelectedGuests(new Set())}
          showCheckbox
          header={
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Multiplier
              </span>
              <Button
                variant="outline"
                className="h-9 px-3 text-xs md:h-10 md:px-4 md:text-sm font-semibold"
                onClick={() => setMultiplierPadOpen(true)}
              >
                x{multiplier}
              </Button>
            </div>
          }
          footer={
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
          }
        />
        {multiplierPadOpen && (
          <NumberPadDialog
            open={multiplierPadOpen}
            onOpenChange={setMultiplierPadOpen}
            title="Guest Multiplier"
            description="Set how many internal guests this selection represents."
            initialValue={multiplier}
            min={1}
            onConfirm={(val) => setMultiplier(val)}
          />
        )}
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
  const globalGuestPalette =
    usePreferencesStore((state) => state.defaultPrefs.globalGuestPalette) || [
      "#94a3b8",
    ];
  const guests = useMemo(() => {
    return getGuests();
  }, [getGuests, allocationsState]);

  const [dialogNewGuestName, setDialogNewGuestName] = useState("");
  const [showNewGuestInput, setShowNewGuestInput] = useState(false);
  const [autoRedistribute] = useState(true);
  const [guestSelectionOpen, setGuestSelectionOpen] = useState(false);

  const formatNumber = useFormatNumber();

  const [quickAddStrategy, setQuickAddStrategy] = useState<PaymentStrategyType>(
    PaymentStrategyType.Percentage,
  );
  const [quickAddMethod, setQuickAddMethod] = useState<string>("any");
  const [quickAddValue, setQuickAddValue] = useState<string>("");

  const [padTarget, setPadTarget] = useState<
    | { type: "split"; index: number }
    | { type: "quick-add" }
    | { type: "multiplier"; index: number }
    | null
  >(null);

  const totalPercentage = useMemo(
    () =>
      splits
        .filter((s) => s.strategyType === PaymentStrategyType.Percentage)
        .reduce((sum, s) => sum + s.value * (s.multiplier ?? 1), 0),
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
        .reduce((sum, s) => sum + s.value * (s.multiplier ?? 1), 0),
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
        (g) => !splits.some((s) => s.entity.toLowerCase() === g.name.toLowerCase()),
      ),
    [guests, splits],
  );

  const handleDistributeEqually = useCallback(() => {
    const updated = splits.map((s) => ({
      ...s,
      strategyType: PaymentStrategyType.Percentage,
    }));
    const redistributed = redistributePercentages(updated);
    onChange(redistributed);
  }, [splits, onChange]);

  const handleAddSpecificGuest = useCallback(
    (entity: string, multiplier = 1) => {
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

      const newSplits = [
        ...splits,
        {
          entity: trimmed,
          multiplier,
          multiplierMode: SplitQtyUnit.PerUnit as const,
          strategyType: quickAddStrategy,
          value: isAutoPercent ? 0 : valueToUse,
          method: quickAddMethod === "any" ? null : quickAddMethod,
        },
      ];

      if (
        isAutoPercent &&
        newSplits.every(
          (s) => s.strategyType === PaymentStrategyType.Percentage,
        )
      ) {
        const redistributed = redistributePercentages(newSplits);
        onChange(redistributed);
      } else {
        onChange(newSplits);
      }
    },
    [splits, onChange, quickAddStrategy, quickAddMethod, quickAddValue],
  );

  const handleAddMultipleGuests = useCallback(
    (guestEntries: Array<{ id: string; multiplier: number }>) => {
      const newSplits = [...splits];

      for (const entry of guestEntries) {
        const guest = guests.find((g) => g.id === entry.id);
        const trimmed = guest?.name.trim() || "";
        if (!trimmed) continue;
        if (newSplits.some((s) => s.entity.toLowerCase() === trimmed.toLowerCase()))
          continue;

        newSplits.push({
          entity: trimmed,
          multiplier: Math.max(1, entry.multiplier),
          multiplierMode: SplitQtyUnit.PerUnit as const,
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
        const redistributed = redistributePercentages(newSplits);
        onChange(redistributed);
      } else {
        onChange(newSplits);
      }
    },
    [splits, onChange, quickAddStrategy, quickAddMethod, quickAddValue, guests],
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
        const redistributed = redistributePercentages(updated);
        onChange(redistributed);
      } else {
        onChange(updated);
      }
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

  const handleRowMultiplierModeToggle = useCallback(
    (index: number, mode: SplitQtyUnit.PerUnit | SplitQtyUnit.Collective) => {
      const updated = [...splits];
      const entry = updated[index];

      if (entry.multiplierMode === mode) return;

      entry.multiplierMode = mode;

      if (updated.every((s) => s.strategyType === PaymentStrategyType.Percentage)) {
        const redistributed = redistributePercentages(updated);
        onChange(redistributed);
      } else {
        onChange(updated);
      }
    },
    [splits, onChange]
  );

  return (
    <div className="space-y-4">

      {/* Dynamic Global Action Bar */}
      <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/50">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick distribution</span>
          <p className="text-[11px] text-muted-foreground leading-tight">Re-allocate weights dynamically based on row settings.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDistributeEqually}
          className="h-12 md:h-14 text-sm px-3 font-semibold"
        >
          Distribute Equally
        </Button>
      </div>

      { }
      {/* Existing Splits List */}
      <div className="space-y-3">
        {splits.map((split, idx) => {
          const mode = split.multiplierMode ?? SplitQtyUnit.PerUnit;
          const mult = split.multiplier ?? 1;
          const hasMult = mult > 1;

          // Determine the user-facing displayed value and labels
          const displayedValue = mode === SplitQtyUnit.Collective && hasMult
            ? split.value * mult
            : split.value;

          const unitLabel = split.strategyType === PaymentStrategyType.Percentage ? "%" : "$";
          const subTextLabel = mode === SplitQtyUnit.Collective ? "total group contribution" : "per seat weight";

          return (
            <div
              key={`${split.entity}-${idx}`}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border bg-card p-4 md:p-5 shadow-sm hover:shadow-md/5 transition-all"
            >
              {/* Left Column: Identity & Granular Configuration Buttons */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-base font-bold text-foreground truncate">{split.entity}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Guest Configuration</span>
                  </div>

                  {/* Premium-styled Seats Button (Matches height of right side card buttons) */}
                  <button
                    type="button"
                    onClick={() => setPadTarget({ type: "multiplier", index: idx })}
                    className="h-12 md:h-14 rounded-lg border bg-background px-3 md:px-4 text-xs md:text-sm font-semibold text-left min-w-28 hover:bg-accent transition-colors flex items-center justify-between gap-3 active:scale-[0.98]"
                    title="Edit number of seats"
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Seats</span>
                      <span className="truncate font-mono font-bold text-primary text-sm">x{mult}</span>
                    </div>
                    <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </div>

                {/* Multiplier Logic Segmented Button (Sized/Styled to eliminate deadspace) */}
                {hasMult ? (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Multiplier logic</span>
                    <div className="flex h-12 md:h-14 bg-muted/60 p-1 rounded-lg border border-border/60 w-full sm:max-w-md">
                      <button
                        type="button"
                        onClick={() => handleRowMultiplierModeToggle(idx, SplitQtyUnit.PerUnit)}
                        className={`flex-1 h-full rounded-md transition-all flex flex-col justify-center items-start px-3 ${mode === SplitQtyUnit.PerUnit
                            ? "bg-background shadow-sm text-foreground border border-border/40 font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80 leading-none">Per Seat</span>
                        <span className="font-mono text-xs font-bold mt-0.5">{unitLabel}{formatNumber(split.value, 2)} each</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRowMultiplierModeToggle(idx, SplitQtyUnit.Collective)}
                        className={`flex-1 h-full rounded-md transition-all flex flex-col justify-center items-start px-3 ${mode === SplitQtyUnit.Collective
                            ? "bg-background shadow-sm text-foreground border border-border/40 font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80 leading-none">Collective</span>
                        <span className="font-mono text-xs font-bold mt-0.5">{unitLabel}{formatNumber(split.value * mult, 2)} group</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">Single seat payer</span>
                )}
              </div>

              {/* Right Column: Premium Form Selection Controls */}
              <div className="flex flex-col gap-3 lg:items-end shrink-0 w-full lg:w-auto">
                <SplitControlSet
                  strategyType={split.strategyType}
                  method={split.method}
                  value={displayedValue}
                  valueLabel={formatNumber(displayedValue, 2)}
                  valueUnit={unitLabel}
                  strategyOptions={STRATEGY_OPTIONS}
                  methodOptions={METHOD_OPTIONS}
                  onStrategyChange={(next) => handleSplitStrategyChange(idx, next)}
                  onMethodChange={(next) => handleSplitMethodChange(idx, next ?? "any")}
                  onValueClick={() => setPadTarget({ type: "split", index: idx })}
                  hideValue={split.strategyType === PaymentStrategyType.Remaining}
                  compact
                />

                {/* Subtext describing computed weights / deletion */}
                <div className="flex items-center gap-3 justify-between w-full">
                  <span className="text-[10px] text-muted-foreground italic font-medium leading-none">
                    * Displays {subTextLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {split.strategyType === PaymentStrategyType.Remaining && (
                      <span className="text-[10px] font-bold uppercase text-muted-foreground px-2 py-1 bg-muted rounded">
                        Rem.
                      </span>
                    )}
                    {splits.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg active:scale-95"
                        onClick={() => handleRemoveSplitEntry(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Quick Add Settings */}
      <div className="space-y-4 bg-muted/20 p-4 rounded-xl border">
        <div className="flex justify-between items-center">
          <div className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Add Settings
          </div>
        </div>

        {/* Strategy & Method Selectors */}
        <div className="flex flex-col gap-3 pb-3 border-b border-border/50">
          <SplitControlSet
            strategyType={quickAddStrategy}
            method={quickAddMethod}
            value={quickAddValue === "" ? 0 : Number(quickAddValue)}
            valueLabel={quickAddValue === "" ? (quickAddStrategy === "percentage" ? "Auto" : "0.00") : quickAddValue}
            valueUnit={quickAddStrategy === "percentage" ? "%" : "$"}
            strategyOptions={STRATEGY_OPTIONS}
            methodOptions={METHOD_OPTIONS}
            onStrategyChange={(next) => setQuickAddStrategy(next)}
            onMethodChange={(next) => setQuickAddMethod(next ?? "any")}
            onValueClick={() => setPadTarget({ type: "quick-add" })}
            hideValue={quickAddStrategy === "remaining"}
          />
          <div className="text-[10px] md:text-xs text-muted-foreground">
            Pick split type and payment method. New guests will use these parameters.
          </div>
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
        availableGuests={availableGuests.map((guest) => ({
          id: guest.id,
          label: guest.name,
          multiplier: guest.multiplier ?? 1,
        }))}
        onSelectGuests={handleAddMultipleGuests}
        palette={globalGuestPalette}
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
              : padTarget.type === "multiplier"
                ? "Edit Seats"
                : splits[padTarget.index].strategyType === PaymentStrategyType.Percentage ? "Percentage" : "Amount"
          }
          description={
            padTarget.type === "quick-add"
              ? `Set the ${quickAddStrategy === PaymentStrategyType.Percentage ? "percentage" : "amount"} for this split`
              : padTarget.type === "multiplier"
                ? `Enter the number of seats for ${splits[padTarget.index].entity}`
                : splits[padTarget.index].multiplierMode === SplitQtyUnit.Collective && splits[padTarget.index].multiplier && splits[padTarget.index].multiplier! > 1
                  ? `Set the collective group total amount/percentage for all ${splits[padTarget.index].multiplier} seats`
                  : `Set the individual per-seat amount/percentage for this split`
          }
          initialValue={
            padTarget.type === "quick-add"
              ? (quickAddValue === "" ? null : Number(quickAddValue))
              : padTarget.type === "multiplier"
                ? splits[padTarget.index].multiplier ?? 1
                : splits[padTarget.index].multiplierMode === SplitQtyUnit.Collective
                  ? splits[padTarget.index].value * (splits[padTarget.index].multiplier ?? 1)
                  : splits[padTarget.index].value
          }
          min={1}
          onConfirm={(val) => {
            if (padTarget.type === "quick-add") {
              setQuickAddValue(String(val));
            } else if (padTarget.type === "multiplier") {
              const idx = padTarget.index;
              const updated = [...splits];
              const entry = updated[idx];

              const oldMult = entry.multiplier ?? 1;
              const newMult = Math.max(1, Math.round(val)); // Must be integer >= 1

              if (oldMult !== newMult) {
                // If in collective mode, adjust base unit-value to prevent sudden jumps
                if (entry.multiplierMode === SplitQtyUnit.Collective) {
                  entry.value = (entry.value * oldMult) / newMult;
                }
                entry.multiplier = newMult;

                // Reset multiplier mode back to individual defaults if it goes back down to 1
                if (newMult === 1) {
                  entry.multiplierMode = SplitQtyUnit.PerUnit;
                }

                // Recalculate automatic weights if active
                if (updated.every((s) => s.strategyType === PaymentStrategyType.Percentage)) {
                  onChange(redistributePercentages(updated));
                  return;
                }
              }
              onChange(updated);
            } else {
              const entry = splits[padTarget.index];
              const resolvedValue =
                entry.multiplierMode === SplitQtyUnit.Collective
                  ? val / (entry.multiplier ?? 1)
                  : val;
              handleSplitValueChange(padTarget.index, resolvedValue);
            }
          }}
        />
      )}
    </div>
  );
}
