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
import { AllocationContext } from "@/lib/pos/types";
import type { Guest } from "@/lib/pos/ui-utils";
import { usePreferencesStore } from "@/store/preferences-store";
import {
  type AllocationBlock,
  type AssignmentAllocation,
  type ProjectedLineItem,
  AllocationType,
} from "@/lib/vcs/types";
import { Loader2, Plus, Search, User, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";

interface AssignmentAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AllocationContext;
  items: ProjectedLineItem[];
  allocations: Record<string, AllocationBlock>;
  guests: Guest[];
  onApplyConfig: (guestIds: string) => void;
  onAddGuest: (name: string) => string;
}

export function AssignmentAllocationDialog({
  open,
  onOpenChange,
  context,
  items,
  allocations,
  guests,
  onApplyConfig,
  onAddGuest,
}: AssignmentAllocationDialogProps) {
  const [showAddGuestInput, setShowAddGuestInput] = useState(false);
  const [newGuestInputName, setNewGuestInputName] = useState("");

  const formatNumber = useFormatNumber();
  const globalGuestPalette =
    usePreferencesStore((state) => state.defaultPrefs.globalGuestPalette) || [
      "#94a3b8",
    ];
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const currentAssignment = useMemo(() => {
    if (items.length === 0) return null;
    for (const id of items[0].allocations) {
      const a = allocations[id];
      if (a?.type === AllocationType.Assignment)
        return a as AssignmentAllocation;
    }
    return null;
  }, [items, allocations]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setShowAddGuestInput(false);
      setNewGuestInputName("");
      setQuery("");
      setDebouncedQuery("");
      if (currentAssignment) {
        if (currentAssignment.allocationId.startsWith("alloc-assign-")) {
          const idsOrNames = currentAssignment.entity
            .split(",")
            .map((s) => s.trim());
          const resolvedIds = idsOrNames
            .map((idOrName) => {
              if (guests.some((g) => g.id === idOrName)) {
                return idOrName;
              }
              const found = guests.find(
                (g) => g.alias === idOrName || `Guest ${g.number}` === idOrName,
              );
              return found ? found.id : null;
            })
            .filter(Boolean) as string[];
          setSelectedIds(resolvedIds);
        } else {
          setSelectedIds([currentAssignment.allocationId]);
        }
      } else {
        setSelectedIds([]);
      }
    }
  }, [open, currentAssignment, guests]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredGuests = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => {
      const label = g.alias || `Guest ${g.number}`;
      return label.toLowerCase().includes(q);
    });
  }, [guests, debouncedQuery]);

  const getGuestDotColor = useCallback(
    (guestId: string) => {
      const originalIdx = guests.findIndex((g) => g.id === guestId);
      if (originalIdx < 0) return globalGuestPalette[0];
      return globalGuestPalette[originalIdx % Math.max(1, globalGuestPalette.length)];
    },
    [guests, globalGuestPalette],
  );

  const toggleGuestSelection = useCallback((guestId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(guestId)) {
        if (prev.length === 1) {
          toast.warning("At least one guest must be assigned.");
          return prev;
        }
        return prev.filter((id) => id !== guestId);
      } else {
        return [...prev, guestId];
      }
    });
  }, []);

  const handleAddNewGuest = useCallback(() => {
    const name = newGuestInputName.trim();
    if (!name) return;
    const newGuestId = onAddGuest(name);

    setSelectedIds((prev) => [...prev, newGuestId]);
    setNewGuestInputName("");
    setShowAddGuestInput(false);
  }, [newGuestInputName, onAddGuest]);

  const handleApply = useCallback(() => {
    if (selectedIds.length === 0) {
      toast.warning("At least one guest must be selected.");
      return;
    }
    onApplyConfig(selectedIds.join(","));
    onOpenChange(false);
  }, [selectedIds, onApplyConfig, onOpenChange]);

  if (items.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl landscape:sm:max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {context === AllocationContext.Group
              ? "Group Guest Assignment"
              : "Guest Assignment"}
          </DialogTitle>
          <DialogDescription>
            {context === AllocationContext.Group
              ? `Assign guests to the ${items.length} selected items.`
              : `Assign guests to ${items[0].name}.`}
          </DialogDescription>
        </DialogHeader>

        {context === AllocationContext.Item && (
          <div className="rounded-xl border bg-muted/30 p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{items[0].name}</div>
              <div className="text-xs text-muted-foreground font-mono truncate">
                {items[0].sku}
              </div>
            </div>
            <div className="font-mono font-bold text-sm shrink-0">
              ${formatNumber(items[0].totalPrice, 2)}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search guests..."
                  className="pl-9 h-11"
                />
                {query !== debouncedQuery && (
                  <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {!showAddGuestInput && (
                <Button
                  variant="outline"
                  className="h-11 shrink-0"
                  onClick={() => setShowAddGuestInput(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Guest
                </Button>
              )}
            </div>

            {showAddGuestInput && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  autoFocus
                  placeholder="New guest name..."
                  value={newGuestInputName}
                  onChange={(e) => setNewGuestInputName(e.target.value)}
                  className="h-11 flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddNewGuest()}
                />
                <div className="flex gap-2">
                  <Button
                    className="h-11"
                    onClick={handleAddNewGuest}
                    disabled={!newGuestInputName.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setShowAddGuestInput(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Guests
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedIds.length} selected
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {filteredGuests.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No guests match "{query.trim()}".
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-1">
                {filteredGuests.map((g) => {
                  const guestLabel = g.alias || `Guest ${g.number}`;
                  const isSelected = selectedIds.includes(g.id);
                  return (
                    <div
                      key={g.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleGuestSelection(g.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleGuestSelection(g.id);
                        }
                      }}
                      className={`relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all min-h-24 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "bg-card hover:border-primary/40 hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex w-full items-start justify-between gap-3">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          aria-hidden="true"
                          style={{ backgroundColor: getGuestDotColor(g.id) }}
                        />
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleGuestSelection(g.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4"
                        />
                      </div>
                      <span className="w-full truncate text-sm font-semibold">
                        {guestLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Guest {g.number}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between border-t pt-4 mt-1 shrink-0">
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
              onClick={handleApply}
              disabled={selectedIds.length === 0}
            >
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
