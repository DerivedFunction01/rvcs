"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CatalogItemEntry, ProductOption } from "@/lib/vcs/types";

interface ItemOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatalogItemEntry | null;
  onAddWithSelection: (sku: string, selectedOptions: string[]) => void;
}

export function ItemOptionsDialog({
  open,
  onOpenChange,
  item,
  onAddWithSelection,
}: ItemOptionsDialogProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Initialize selected options when dialog opens
  useEffect(() => {
    if (open && item) {
      const initial: Record<string, string> = {};
      if (item.optionGroups) {
        for (const og of item.optionGroups) {
          if (og.options.length > 0) {
            // Default select the first active option
            const defaultOpt = og.options.find((o) => o.active) || og.options[0];
            initial[og.id] = defaultOpt.id;
          }
        }
      }
      setSelectedOptions(initial);
    }
  }, [open, item]);

  if (!item) return null;

  const handleSelectOption = (groupId: string, optionId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupId]: optionId,
    }));
  };

  const handleConfirm = () => {
    onAddWithSelection(item.sku, Object.values(selectedOptions));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize {item.name}</DialogTitle>
          <DialogDescription>
            Select options below to customize this item.
          </DialogDescription>
        </DialogHeader>

        {/* Option Groups */}
        <div className="space-y-4 py-2">
          {item.optionGroups?.map((group) => (
            <div key={group.id} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.name} {group.isRequired && <span className="text-destructive">*</span>}
              </label>

              <div className="flex flex-wrap gap-2 pt-1">
                {group.options
                  .filter((opt) => opt.active)
                  .map((opt) => {
                    const isSelected = selectedOptions[group.id] === opt.id;
                    return (
                      <Button
                        key={opt.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-9 px-3"
                        onClick={() => handleSelectOption(group.id, opt.id)}
                      >
                        <span className="font-medium">{opt.label}</span>
                        {opt.priceOverride !== null && (
                          <span className="font-mono ml-1.5 opacity-80 text-[10px]">
                            (${opt.priceOverride.toFixed(2)})
                          </span>
                        )}
                      </Button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
