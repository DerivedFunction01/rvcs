"use client";

import React, { useState, useMemo, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { User, Plus, X } from "lucide-react";
import type {
  ProjectedLineItem,
  AllocationBlock,
  AssignmentAllocation,
} from "@/lib/vcs/types";
import { AllocationContext } from "@/lib/pos/types";
import type { Guest } from "@/lib/pos/ui-utils";
import { toast } from "sonner";

interface AssignmentAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AllocationContext;
  items: ProjectedLineItem[];
  allocations: Record<string, AllocationBlock>;
  guests: Guest[];
  onApplyConfig: (guestIds: string) => void;
  onAddGuest: (name: string) => void;
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

  const currentAssignment = useMemo(() => {
    if (items.length === 0) return null;
    for (const id of items[0].allocations) {
      const a = allocations[id];
      if (a?.type === "assignment") return a as AssignmentAllocation;
    }
    return null;
  }, [items, allocations]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setShowAddGuestInput(false);
      setNewGuestInputName("");
      if (currentAssignment) {
        setSelectedIds(
          currentAssignment.entity.split(",").map((s) => s.trim()),
        );
      } else {
        setSelectedIds([]);
      }
    }
  }, [open, currentAssignment]);

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
    onAddGuest(name);

    // Predetermine sequential guest ID
    const currentMax =
      guests.length > 0 ? Math.max(...guests.map((g) => g.number)) : 0;
    const nextNum = currentMax + 1;
    const newGuestId = `__vcs_guest_${nextNum}__`;

    setSelectedIds((prev) => [...prev, newGuestId]);
    setNewGuestInputName("");
    setShowAddGuestInput(false);
  }, [newGuestInputName, onAddGuest, guests]);

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
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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
          <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{items[0].name}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {items[0].sku}
              </div>
            </div>
            <div className="font-mono font-bold text-sm">
              ${items[0].totalPrice.toFixed(2)}
            </div>
          </div>
        )}

        <div className="space-y-2.5 rounded-lg border p-3.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Guests
            </div>
            {!showAddGuestInput && (
              <Button
                variant="link"
                className="h-auto p-0 text-xs text-primary font-semibold flex items-center gap-1 hover:no-underline"
                onClick={() => setShowAddGuestInput(true)}
              >
                <Plus className="w-3 h-3" /> Add Guest
              </Button>
            )}
          </div>

          {showAddGuestInput ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="New guest name..."
                value={newGuestInputName}
                onChange={(e) => setNewGuestInputName(e.target.value)}
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddNewGuest()}
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleAddNewGuest}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowAddGuestInput(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {guests.map((g) => {
                const guestLabel = g.alias || `Guest ${g.number}`;
                const isSelected = selectedIds.includes(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleGuestSelection(g.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary shadow-xs"
                        : "bg-background border-input hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleGuestSelection(g.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 border-muted-foreground/30 data-[state=checked]:border-primary"
                    />
                    <span className="truncate select-none">{guestLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
