"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

export type GuestPickerItem = {
  id: string;
  label: string;
  secondary?: string;
};

type GuestGridPickerProps = {
  open: boolean;
  items: GuestPickerItem[];
  selectedIds?: Set<string>;
  onToggle: (id: string) => void;
  palette?: string[];
  searchPlaceholder?: string;
  emptyText?: string;
  minHeightClassName?: string;
  showCheckbox?: boolean;
  showSelectAll?: boolean;
  showClearAll?: boolean;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  itemClassName?: string;
  onItemClick?: (id: string) => void;
  renderTrailingAction?: (item: GuestPickerItem, isSelected: boolean) => ReactNode;
};

export function GuestGridPicker({
  open,
  items,
  selectedIds,
  onToggle,
  palette = ["#94a3b8"],
  searchPlaceholder = "Search guests...",
  emptyText = "No guests found.",
  minHeightClassName = "min-h-0",
  showCheckbox = true,
  showSelectAll = false,
  showClearAll = false,
  onSelectAll,
  onClearAll,
  header,
  footer,
  itemClassName = "",
  onItemClick,
  renderTrailingAction,
}: GuestGridPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      return (
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.secondary?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, debouncedQuery]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-11 pl-9 pr-9 text-sm md:h-12 md:text-base"
        />
        {query !== debouncedQuery && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {(showSelectAll || showClearAll || header) && (
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">{header}</div>
          <div className="flex gap-2 shrink-0">
            {showSelectAll && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 min-w-14 px-3 text-xs md:h-10 md:min-w-16 md:px-4 md:text-sm font-semibold text-primary"
                onClick={onSelectAll}
              >
                All
              </Button>
            )}
            {showClearAll && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 min-w-14 px-3 text-xs md:h-10 md:min-w-16 md:px-4 md:text-sm font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={onClearAll}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      <div className={`flex-1 ${minHeightClassName} overflow-y-auto pr-1`}>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-2 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((item, idx) => {
              const isSelected = selectedIds?.has(item.id) ?? false;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onToggle(item.id);
                    onItemClick?.(item.id);
                  }}
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-4 text-left text-sm transition-all min-h-16 md:min-h-20 ${
                    isSelected
                      ? "border-primary bg-primary/5 font-medium shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
                  } ${itemClassName}`}
                  >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span
                      className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
                        isSelected ? "ring-2 ring-primary/30" : ""
                      }`}
                      aria-hidden="true"
                      style={{
                        background:
                          palette[idx % Math.max(1, palette.length)],
                      }}
                    />
                    <div className="flex min-w-0 flex-1 items-start justify-end gap-1">
                      {renderTrailingAction?.(item, isSelected)}
                      {showCheckbox && (
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 w-full">
                    <span className="block truncate text-sm md:text-base font-semibold text-foreground">
                      {item.label}
                    </span>
                    {item.secondary && (
                      <span className="block truncate text-[11px] md:text-xs text-muted-foreground">
                        {item.secondary}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {footer && <div className="shrink-0 border-t pt-4">{footer}</div>}
    </div>
  );
}
