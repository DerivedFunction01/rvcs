"use client";

import React, { useMemo, useState } from "react";
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
import { Search } from "lucide-react";

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
  onChoose: (option: ChoiceDialogOption) => void;
  footer?: React.ReactNode;
  emptyText?: string;
}

export function ChoiceDialog({
  open,
  onOpenChange,
  title,
  description,
  searchPlaceholder = "Search...",
  options,
  onChoose,
  footer,
  emptyText = "No matching results.",
}: ChoiceDialogProps) {
  const [query, setQuery] = useState("");

  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.id.toLowerCase().includes(q) ||
        (opt.description?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setQuery("");
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
            className="pl-9"
          />
        </div>

        <div className="min-h-0 max-h-[55vh] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onChoose(option)}
                  className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/40"
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {option.label}
                    </span>
                    {option.badge}
                  </div>
                  {option.description && (
                    <span className="text-[10px] text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
