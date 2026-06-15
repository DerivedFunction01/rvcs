"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, Delete, RotateCcw } from "lucide-react";
import React, { useMemo, useState } from "react";
import { usePreferencesStore } from "@/store/preferences-store";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function snapQty(qty: number, increment: number): number {
  if (qty <= 0) return 0;
  let snapped = Math.floor(qty / increment) * increment;
  if (snapped <= 0) snapped = increment;
  return Math.round(snapped * 1000) / 1000;
}

interface NumberPadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  initialValue?: number | null;
  min?: number;
  max?: number;
  increment?: number;
  onConfirm: (value: number) => void;
  placeholder?: string;
  extraContent?: React.ReactNode;
  resetDependency?: any;
  icon?: React.ReactNode;
  warningMessage?: (value: number | null) => string | null;
}

export function NumberPadDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Apply",
  initialValue = null,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  increment,
  onConfirm,
  placeholder,
  extraContent,
  resetDependency,
  icon,
  warningMessage,
}: NumberPadDialogProps) {
  const [value, setValue] = useState("");
  const { defaultPrefs } = usePreferencesStore();
  const useCommaDecimal = defaultPrefs?.useCommaDecimal ?? false;
  const decimalChar = useCommaDecimal ? "," : ".";

  const normalizedInitialValue = useMemo(() => {
    if (initialValue === null || Number.isNaN(initialValue)) return "";
    let str = String(Math.max(min, Math.min(max, initialValue)));
    if (useCommaDecimal) {
      str = str.replace(".", ",");
    }
    return str;
  }, [initialValue, min, max, useCommaDecimal]);

  React.useEffect(() => {
    if (open) {
      setValue(normalizedInitialValue);
    }
  }, [open, normalizedInitialValue]);

  const prevResetDep = React.useRef(resetDependency);
  React.useEffect(() => {
    if (open && resetDependency !== prevResetDep.current) {
      setValue("");
      prevResetDep.current = resetDependency;
    }
  }, [open, resetDependency]);

  const normalizedValueForParsing = value.replace(",", ".");
  const parsed = value === "" || value === decimalChar ? null : Number.parseFloat(normalizedValueForParsing);
  let clamped =
    parsed === null || Number.isNaN(parsed)
      ? null
      : Math.max(min, Math.min(max, parsed));

  let snapped = clamped;
  if (clamped !== null && increment && increment > 0) {
    snapped = snapQty(clamped, increment);
  }

  const willSnap =
    clamped !== null && snapped !== null && Math.abs(clamped - snapped) > 0.0001;

  const warning = warningMessage ? warningMessage(snapped ?? clamped) : null;

  const appendDigit = (digit: string) => {
    setValue((prev) => {
      if (digit === decimalChar && prev.includes(decimalChar)) return prev;
      if (digit === decimalChar && prev === "") return `0${decimalChar}`;
      const next = `${prev}${digit}`.replace(/^0+(?=\d)/, "");
      return next;
    });
  };

  const handleConfirm = () => {
    const next = snapped ?? min;
    onConfirm(next);
    onOpenChange(false);
  };

  const displayArea = (
    <div className="flex w-full min-w-0 gap-2">
      <Input
        readOnly
        tabIndex={-1}
        inputMode="none"
        value={value !== "" ? value : (placeholder ?? String(min).replace(".", decimalChar))}
        className={cn(
          "flex h-16 md:h-20 flex-1 rounded-md border border-input bg-background px-3 font-mono text-3xl tracking-wider shadow-sm text-center min-w-0 cursor-default focus:outline-none select-none",
          value === "" ? "text-muted-foreground" : "text-foreground"
        )}
      />
      <Button
        variant="outline"
        className="h-16 w-16 md:h-20 md:w-20 shrink-0"
        onClick={() => setValue("")}
      >
        <RotateCcw className="w-6 h-6 md:w-7 md:h-7" />
      </Button>
    </div>
  );

  const numpadArea = (
    <div className="grid grid-cols-3 gap-2">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <Button
          key={digit}
          variant="outline"
          className="h-16 text-2xl font-semibold"
          onClick={() => appendDigit(digit)}
        >
          {digit}
        </Button>
      ))}
      <Button
        variant="outline"
        className="h-16 text-2xl font-semibold"
        onClick={() => appendDigit(decimalChar)}
      >
        {decimalChar}
      </Button>
      <Button
        variant="outline"
        className="h-16 text-2xl font-semibold"
        onClick={() => appendDigit("0")}
      >
        0
      </Button>
      <Button
        variant="outline"
        className="h-16"
        onClick={() => setValue((prev) => prev.slice(0, -1))}
      >
        <Delete className="w-6 h-6 md:w-7 md:h-7" />
      </Button>
    </div>
  );

  const actionButtons = (
    <>
      <Button
        variant="outline"
        className="flex-1 h-16 md:h-20 text-xl font-semibold"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button
        onClick={handleConfirm}
        disabled={clamped === null && value !== ""}
        className="flex-1 h-16 md:h-20 text-xl font-semibold"
      >
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setValue("");
      }}
    >
      <DialogContent
        className="sm:max-w-md md:max-w-lg landscape:sm:max-w-2xl landscape:md:max-w-3xl max-h-[95vh] landscape:md:min-h-95 overflow-y-auto landscape:max-h-[95vh] landscape:overflow-hidden"
        onKeyDown={(e) => {
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            appendDigit(e.key);
          } else if (e.key === decimalChar) {
            e.preventDefault();
            appendDigit(decimalChar);
          } else if (e.key === "Backspace" || e.key === "Delete") {
            e.preventDefault();
            setValue((prev) => prev.slice(0, -1));
          } else if (e.key === "Enter") {
            if (e.target instanceof HTMLButtonElement) return;
            e.preventDefault();
            if (clamped !== null || value === "") handleConfirm();
          }
        }}
      >
        <div className="flex flex-col landscape:flex-row gap-4 landscape:gap-6 h-full landscape:h-full landscape:overflow-hidden">
          <div className="flex flex-col gap-3 flex-1 min-w-0 landscape:overflow-y-auto landscape:min-h-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {icon || <ArrowLeft className="w-5 h-5 text-primary" />}
                {title}
              </DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>

            {extraContent}
            {displayArea}

            {willSnap && (
              <div className="text-[11px] text-amber-600 dark:text-amber-500 bg-amber-500/10 px-3 py-2 rounded-md flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Will be adjusted to <strong className="font-mono text-xs">{String(snapped).replace(".", decimalChar)}</strong> (increment of {increment}).
                </span>
              </div>
            )}

            {warning && (
              <div className="text-[11px] text-amber-600 dark:text-amber-500 bg-amber-500/10 px-3 py-2 rounded-md flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{warning}</span>
              </div>
            )}

            <div className="hidden landscape:flex flex-row gap-3 pt-2 mt-auto w-full">
              {actionButtons}
            </div>
          </div>

          <div className="shrink-0 landscape:w-70 landscape:md:w-96 landscape:mt-8">
            {numpadArea}
          </div>
        </div>

        <DialogFooter className="flex-row sm:flex-row gap-3 sm:gap-3 space-x-0 sm:space-x-0 pt-2 w-full landscape:hidden mt-2">
          {actionButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
