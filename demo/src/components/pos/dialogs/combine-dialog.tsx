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
import { PackageCheck } from "lucide-react";
import React, { useMemo, useState } from "react";

export function CombineDialog({
  open,
  onOpenChange,
  selectedItems,
  catalog,
  onCombine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: ProjectedLineItem[];
  catalog: Record<string, CatalogItemEntry>;
  onCombine: (comboSku: string, assignments: any[][]) => void;
}) {
  const compatibleCombos = useMemo(() => {
    const combos = Object.values(catalog).filter(
      (c) => c.type === "item" && c.category === "combo" && c.comboChoices && c.comboChoices.length > 0
    );

    const results: {
      comboSku: string;
      comboName: string;
      maxCombos: number;
      assignments: Array<{ slotSku: string; unit: any }>[]
    }[] = [];

    for (const combo of combos) {
      const slots: Record<string, Set<string>> = {};
      for (const choice of combo.comboChoices!) {
        if (!slots[choice.slotSku]) slots[choice.slotSku] = new Set();
        slots[choice.slotSku].add(choice.optionSku);
      }

      const requiredSlots = Object.keys(slots);
      const availableUnits: { lineId: string; sku: string; item: ProjectedLineItem }[] = [];
      for (const item of selectedItems) {
        if (item.status === "canceled") continue;
        for (let i = 0; i < item.qty; i++) {
          availableUnits.push({ lineId: item.lineId, sku: item.sku, item });
        }
      }

      let combosFormed = 0;
      const assignments: Array<{ slotSku: string; unit: any }>[] = [];

      while (true) {
        const currentAssignment: { slotSku: string; unit: any }[] = [];
        const usedIndices = new Set<number>();

        let matchedAll = true;
        for (const slotSku of requiredSlots) {
          const validSkus = slots[slotSku];
          const index = availableUnits.findIndex((u, i) => !usedIndices.has(i) && validSkus.has(u.sku));
          if (index !== -1) {
            usedIndices.add(index);
            currentAssignment.push({ slotSku, unit: availableUnits[index] });
          } else {
            matchedAll = false;
            break;
          }
        }

        if (matchedAll) {
          combosFormed++;
          assignments.push(currentAssignment);
          const sortedIndices = Array.from(usedIndices).sort((a, b) => b - a);
          for (const i of sortedIndices) {
            availableUnits.splice(i, 1);
          }
        } else {
          break;
        }
      }

      if (combosFormed > 0) {
        results.push({
          comboSku: combo.sku,
          comboName: combo.name,
          maxCombos: combosFormed,
          assignments,
        });
      }
    }

    return results;
  }, [selectedItems, catalog]);

  const [selectedComboSku, setSelectedComboSku] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelectedComboSku(compatibleCombos.length > 0 ? compatibleCombos[0].comboSku : null);
    }
  }, [open, compatibleCombos]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-primary" />
            Combine into Combo
          </DialogTitle>
          <DialogDescription>
            Selected items can be combined into the following combos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {compatibleCombos.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No compatible combos found for the selected items.
            </div>
          ) : (
            compatibleCombos.map((combo) => (
              <div
                key={combo.comboSku}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedComboSku === combo.comboSku ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                onClick={() => setSelectedComboSku(combo.comboSku)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">{combo.comboName}</span>
                  <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Max: {combo.maxCombos}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedComboSku}
            onClick={() => {
              if (selectedComboSku) {
                const match = compatibleCombos.find(c => c.comboSku === selectedComboSku);
                if (match) {
                  onCombine(match.comboSku, match.assignments);
                  onOpenChange(false);
                }
              }
            }}
          >
            Combine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}