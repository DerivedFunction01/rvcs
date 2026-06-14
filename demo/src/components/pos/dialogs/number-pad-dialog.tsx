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
import { Input } from "@/components/ui/input";
import { AlertTriangle, ArrowLeft, Delete, RotateCcw } from "lucide-react";
import React, { useMemo, useState } from "react";
import { usePreferencesStore } from "@/store/preferences-store";

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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setValue("");
      }}
    >
      <DialogContent
        className="sm:max-w-md"
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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon || <ArrowLeft className="w-5 h-5 text-primary" />}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3">
          {extraContent}
          <div className="flex gap-2">
            <Input
              value={value}
              readOnly
              inputMode="decimal"
              className="h-12 text-center text-2xl font-mono tracking-wider flex-1"
              placeholder={placeholder ?? String(min).replace(".", decimalChar)}
            />
            <Button
              variant="outline"
              className="h-12 w-12 shrink-0"
              onClick={() => setValue("")}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {willSnap && (
            <div className="text-[11px] text-amber-600 dark:text-amber-500 bg-amber-500/10 px-3 py-2 rounded-md flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Will be adjusted to <strong className="font-mono text-xs">{String(snapped).replace(".", decimalChar)}</strong> (increment of {increment}).
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-12 text-lg font-semibold"
                onClick={() => appendDigit(digit)}
              >
                {digit}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-12 text-lg font-semibold"
              onClick={() => appendDigit(decimalChar)}
            >
              {decimalChar}
            </Button>
            <Button
              variant="outline"
              className="h-12 text-lg font-semibold"
              onClick={() => appendDigit("0")}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-12"
              onClick={() => setValue((prev) => prev.slice(0, -1))}
            >
              <Delete className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={clamped === null && value !== ""}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
