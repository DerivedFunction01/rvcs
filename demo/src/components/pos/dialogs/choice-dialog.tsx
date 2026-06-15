"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import React, { useMemo, useState } from "react";

export interface ChoiceDialogOption {
  id: string;
  label: string;
  description?: string;
  badge?: React.ReactNode;
}

interface ChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  searchPlaceholder?: string;
  options: ChoiceDialogOption[];
  onChoose?: (option: ChoiceDialogOption) => void;
  onChooseMultiple?: (selected: ChoiceDialogOption[]) => void;
  isMultiSelect?: boolean;
  initialSelectedIds?: string[];
  footer?: React.ReactNode;
  emptyText?: string;
  extraToggle?: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  };
}

export function ChoiceDialog({
  open,
  onOpenChange,
  title,
  description,
  searchPlaceholder = "Search...",
  options,
  onChoose,
  onChooseMultiple,
  isMultiSelect = false,
  initialSelectedIds,
  footer,
  emptyText = "No matching results.",
  extraToggle,
}: ChoiceDialogProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIds(initialSelectedIds || []);
    }
  }, [open, initialSelectedIds]);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const toggleOption = (option: ChoiceDialogOption) => {
    if (isMultiSelect) {
      setSelectedIds((prev) => {
        if (prev.includes(option.id)) {
          return prev.filter((id) => id !== option.id);
        } else {
          return [...prev, option.id];
        }
      });
    } else {
      onChoose?.(option);
    }
  };

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.id.toLowerCase().includes(q) ||
        (opt.description?.toLowerCase().includes(q) ?? false),
    );
  }, [options, debouncedQuery]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setQuery("");
          setDebouncedQuery("");
          setSelectedIds([]);
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
          className="pl-9 pr-9"
          />
        {query !== debouncedQuery && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        </div>

        {extraToggle && (
          <div className="flex items-center gap-2 px-1 py-1 text-xs">
            <Checkbox
              id="choice-dialog-toggle"
              checked={extraToggle.checked}
              onCheckedChange={(checked) =>
                extraToggle.onCheckedChange(!!checked)
              }
            />
            <label
              htmlFor="choice-dialog-toggle"
              className="text-xs font-semibold leading-none cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors"
            >
              {extraToggle.label}
            </label>
          </div>
        )}

        <div className="min-h-0 max-h-[55vh] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((option) => {
                const isSelected = selectedIds.includes(option.id);
                return (
                  <div
                    key={option.id}
                    onClick={() => toggleOption(option)}
                    className={`flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-all cursor-pointer hover:border-primary/50 ${
                      isMultiSelect && isSelected
                        ? "border-primary bg-primary/5 text-primary shadow-xs"
                        : "hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isMultiSelect && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOption(option)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 border-muted-foreground/30 data-[state=checked]:border-primary"
                          />
                        )}
                        <span className="min-w-0 truncate text-sm font-semibold">
                          {option.label}
                        </span>
                      </div>
                      {option.badge}
                    </div>
                    {option.description && (
                      <span
                        className={`text-[10px] text-muted-foreground ${isMultiSelect ? "pl-5.5" : ""}`}
                      >
                        {option.description}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isMultiSelect ? (
          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between border-t pt-3 mt-1">
            <span className="text-xs text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const selectedOptions = options.filter((o) =>
                    selectedIds.includes(o.id),
                  );
                  onChooseMultiple?.(selectedOptions);
                }}
                disabled={selectedIds.length === 0}
              >
                Apply
              </Button>
            </div>
          </DialogFooter>
        ) : (
          footer && <DialogFooter>{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
