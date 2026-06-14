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
import { ArrowLeft, Delete, RotateCcw } from "lucide-react";
import React, { useMemo, useState } from "react";

interface NumberPadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  initialValue?: number | null;
  min?: number;
  max?: number;
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
  onConfirm,
  placeholder,
  extraContent,
  resetDependency,
  icon,
}: NumberPadDialogProps) {
  const [value, setValue] = useState("");

  const normalizedInitialValue = useMemo(() => {
    if (initialValue === null || Number.isNaN(initialValue)) return "";
    return String(Math.max(min, Math.min(max, Math.trunc(initialValue))));
  }, [initialValue, min, max]);

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

  const parsed = value === "" ? null : Number.parseInt(value, 10);
  const clamped =
    parsed === null || Number.isNaN(parsed)
      ? null
      : Math.max(min, Math.min(max, parsed));

  const appendDigit = (digit: string) => {
    setValue((prev) => {
      const next = `${prev}${digit}`.replace(/^0+(?=\d)/, "");
      return next;
    });
  };

  const handleConfirm = () => {
    const next = clamped ?? min;
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon || <ArrowLeft className="w-5 h-5 text-primary" />}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3">
          {extraContent}
          <Input
            value={value}
            readOnly
            inputMode="numeric"
            className="h-12 text-center text-2xl font-mono tracking-wider"
            placeholder={placeholder ?? String(min)}
          />

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
              className="h-12"
              onClick={() => setValue("")}
            >
              <RotateCcw className="w-4 h-4" />
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
