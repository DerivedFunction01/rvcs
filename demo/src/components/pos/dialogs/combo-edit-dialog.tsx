"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectedLineItem, CatalogItemEntry } from "@/lib/vcs/types";
import { Flame, Pencil } from "lucide-react";
import { ChoiceDialog } from "@/components/pos/dialogs/choice-dialog";

interface ComboEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comboItem: ProjectedLineItem | null;
  catalog: Record<string, CatalogItemEntry>;
  onSwapChoice: (
    oldLineId: string,
    parentLineId: string,
    newSku: string,
    modifierSku?: string,
  ) => void;
}

export function ComboEditDialog({
  open,
  onOpenChange,
  comboItem,
  catalog,
  onSwapChoice,
}: ComboEditDialogProps) {
  const [activeSlotSku, setActiveSlotSku] = useState<string | null>(null);

  const comboEntry = comboItem ? catalog[comboItem.sku] : null;

  // Group choices by slot
  const slotsData = useMemo(() => {
    if (!comboItem || !comboEntry || !comboEntry.comboChoices) return [];

    // Find unique slotSkus in order
    const slotSkusSet = new Set<string>();
    const slotsOrder: string[] = [];
    for (const choice of comboEntry.comboChoices) {
      if (!slotSkusSet.has(choice.slotSku)) {
        slotSkusSet.add(choice.slotSku);
        slotsOrder.push(choice.slotSku);
      }
    }

    const assignedChildIds = new Set<string>();

    return slotsOrder.map((slotSku) => {
      const slotEntry = catalog[slotSku];
      const slotName = slotEntry?.name || "Slot Choice";

      // Available options for this slot
      const options = comboEntry.comboChoices!.filter(
        (c) => c.slotSku === slotSku
      );

      // Find currently selected child for this slot that hasn't been assigned yet
      const activeChild = comboItem.children.find((child) => {
        if (assignedChildIds.has(child.lineId)) return false;
        return options.some((opt) => opt.optionSku === child.sku);
      });

      if (activeChild) {
        assignedChildIds.add(activeChild.lineId);
      }

      return {
        slotSku,
        slotName,
        options,
        activeChild,
      };
    });
  }, [comboItem, comboEntry, catalog]);

  if (!comboItem || !comboEntry) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Flame className="w-5 h-5 text-amber-500" />
              Customize Combo: {comboEntry.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure choices for each slot in this combo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {slotsData.map(({ slotSku, slotName, options, activeChild }) => {
              const activeChoice = activeChild ? options.find(choice => {
                return activeChild.sku === choice.optionSku &&
                  (choice.modifierSku
                    ? activeChild.children?.some(c => c.sku === choice.modifierSku)
                    : !activeChild.children?.some(c => options.some(opt => opt.optionSku === activeChild.sku && opt.modifierSku === c.sku)));
              }) : null;

              const optionEntry = activeChild ? catalog[activeChild.sku] : null;
              const modifierChild = activeChild?.children?.find(c => activeChoice?.modifierSku === c.sku);
              const modifierEntry = modifierChild ? catalog[modifierChild.sku] : null;

              const displayName = optionEntry
                ? modifierEntry
                  ? `${optionEntry.name} (${modifierEntry.name})`
                  : optionEntry.name
                : "Not Selected";

              const priceText = activeChoice && activeChoice.price > 0
                ? `+$${activeChoice.price.toFixed(2)}`
                : "Included";

              return (
                <div
                  key={slotSku}
                  onClick={() => {
                    if (activeChild) {
                      setActiveSlotSku(slotSku);
                    }
                  }}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 hover:border-muted-foreground/30 cursor-pointer transition-all"
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {slotName}
                    </span>
                    <span className="text-sm font-semibold text-foreground mt-1 truncate">
                      {displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground font-medium">
                      {priceText}
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-3 border-t shrink-0">
            <Button
              className="w-full font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeSlotSku && (() => {
        const slotData = slotsData.find(s => s.slotSku === activeSlotSku);
        if (!slotData) return null;

        const choiceOptions = slotData.options.map((choice) => {
          const optionEntry = catalog[choice.optionSku];
          if (!optionEntry) return null;

          const modifierEntry = choice.modifierSku
            ? catalog[choice.modifierSku]
            : null;

          const label = modifierEntry
            ? `${optionEntry.name} (${modifierEntry.name})`
            : optionEntry.name;

          const badge = choice.price > 0
            ? `+$${choice.price.toFixed(2)}`
            : "Included";

          return {
            id: `${choice.optionSku}:${choice.modifierSku || ""}`,
            label,
            description: badge,
          };
        }).filter(Boolean) as any[];

        const currentChoiceId = slotData.activeChild
          ? `${slotData.activeChild.sku}:${
              slotData.activeChild.children?.find((c) =>
                slotData.options.some((opt) => opt.optionSku === slotData.activeChild?.sku && opt.modifierSku === c.sku)
              )?.sku || ""
            }`
          : "";

        return (
          <ChoiceDialog
            open={!!activeSlotSku}
            onOpenChange={(open) => {
              if (!open) setActiveSlotSku(null);
            }}
            title={`Select ${slotData.slotName}`}
            description={`Choose an option for the ${slotData.slotName} slot.`}
            options={choiceOptions}
            initialSelectedIds={currentChoiceId ? [currentChoiceId] : []}
            onChoose={(option) => {
              const [optionSku, modifierSku] = option.id.split(":");
              if (slotData.activeChild) {
                onSwapChoice(
                  slotData.activeChild.lineId,
                  comboItem.lineId,
                  optionSku,
                  modifierSku || undefined
                );
              }
              setActiveSlotSku(null);
            }}
          />
        );
      })()}
    </>
  );
}
