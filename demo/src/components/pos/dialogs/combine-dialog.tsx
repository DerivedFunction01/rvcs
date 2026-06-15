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
import type { ProjectedLineItem, CatalogItemEntry } from "@/lib/vcs/types";
import { PackageCheck, Minus, Plus } from "lucide-react";
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
  onCombine: (requests: { comboSku: string; qty: number; assignments: any[] }[]) => void;
}) {
  const [comboQtys, setComboQtys] = useState<Record<string, number>>({});

  React.useEffect(() => {
    if (open) setComboQtys({});
  }, [open]);

  const { compatibleCombos, totalSelected, finalRequests } = useMemo(() => {
    const combos = Object.values(catalog).filter(
      (c) => c.type === "item" && c.category === "combo" && c.comboChoices && c.comboChoices.length > 0
    );

    const availablePool = selectedItems
      .filter((item) => item.status !== "canceled")
      .map((item) => ({ lineId: item.lineId, sku: item.sku, qty: item.qty, item }));

    let totalSelected = 0;
    const finalRequests: Array<{ comboSku: string; qty: number; assignments: any[] }> = [];

    for (const combo of combos) {
      const requestedQty = comboQtys[combo.sku] || 0;
      if (requestedQty <= 0) continue;

      const increment = combo.mainQtyIncrement ?? 1;
      const slots: Record<string, Array<{ optionSku: string, reqQty: number }>> = {};
      for (const choice of combo.comboChoices!) {
        if (!slots[choice.slotSku]) slots[choice.slotSku] = [];
        slots[choice.slotSku].push({ optionSku: choice.optionSku, reqQty: choice.qty ?? 1 });
      }
      const requiredSlots = Object.keys(slots);
      
      let combosFormed = 0;
      const allFormedCombos: Array<{ qty: number, assignments: Array<{ slotSku: string; unit: any, reqQty: number }> }> = [];

      while (combosFormed < requestedQty - 0.0001) {
        const currentAssignment: any[] = [];
        let matchedAll = true;

        const tempPool = availablePool.map(p => ({ ...p }));

        for (const slotSku of requiredSlots) {
          const options = slots[slotSku];
          let matchedOption = false;

          for (const option of options) {
            const needed = option.reqQty * increment;
            const poolItemIdx = tempPool.findIndex(p => p.sku === option.optionSku && p.qty >= needed - 0.0001);
            if (poolItemIdx !== -1) {
              tempPool[poolItemIdx].qty -= needed;
              currentAssignment.push({ slotSku, unit: tempPool[poolItemIdx], reqQty: option.reqQty });
              matchedOption = true;
              break;
            }
          }

          if (!matchedOption) {
            matchedAll = false;
            break;
          }
        }

        if (matchedAll) {
          combosFormed += increment;
          for (let i = 0; i < availablePool.length; i++) availablePool[i].qty = tempPool[i].qty;
          
          const last = allFormedCombos[allFormedCombos.length - 1];
          if (last && last.assignments.every((a, i) => a.unit.lineId === currentAssignment[i].unit.lineId && a.slotSku === currentAssignment[i].slotSku)) {
            last.qty += increment;
          } else {
            allFormedCombos.push({ qty: increment, assignments: currentAssignment });
          }
        } else {
          break;
        }
      }

      totalSelected += combosFormed;
      if (combosFormed > 0) {
        for (const formed of allFormedCombos) {
          finalRequests.push({
            comboSku: combo.sku,
            qty: Math.round(formed.qty * 1000) / 1000,
            assignments: formed.assignments
          });
        }
      }
    }

    const results: {
      comboSku: string;
      comboName: string;
      maxCombos: number;
      increment: number;
      currentQty: number;
    }[] = [];

    for (const combo of combos) {
      const increment = combo.mainQtyIncrement ?? 1;

      const slots: Record<string, Array<{ optionSku: string, reqQty: number }>> = {};
      for (const choice of combo.comboChoices!) {
        if (!slots[choice.slotSku]) slots[choice.slotSku] = [];
        slots[choice.slotSku].push({ optionSku: choice.optionSku, reqQty: choice.qty ?? 1 });
      }
      const requiredSlots = Object.keys(slots);
      
      const simPool = availablePool.map(p => ({ ...p }));
      let additionalFormed = 0;

      while (true) {
        let matchedAll = true;
        const tempPool = simPool.map(p => ({ ...p }));

        for (const slotSku of requiredSlots) {
          const options = slots[slotSku];
          let matchedOption = false;

          for (const option of options) {
            const needed = option.reqQty * increment;
            const poolItemIdx = tempPool.findIndex(p => p.sku === option.optionSku && p.qty >= needed - 0.0001);
            if (poolItemIdx !== -1) {
              tempPool[poolItemIdx].qty -= needed;
              matchedOption = true;
              break;
            }
          }

          if (!matchedOption) {
            matchedAll = false;
            break;
          }
        }

        if (matchedAll) {
          additionalFormed += increment;
          for (let i = 0; i < simPool.length; i++) simPool[i].qty = tempPool[i].qty;
        } else {
          break;
        }
      }

      const currentQty = comboQtys[combo.sku] || 0;
      const totalPossible = Math.round((currentQty + additionalFormed) * 1000) / 1000;

      if (totalPossible > 0) {
        results.push({
          comboSku: combo.sku,
          comboName: combo.name,
          maxCombos: totalPossible,
          increment,
          currentQty,
        });
      }
    }

    return { compatibleCombos: results, totalSelected, finalRequests };
  }, [selectedItems, catalog, comboQtys]);

  const handleQtyChange = (sku: string, qty: number, max: number, increment: number) => {
    const snapped = Math.max(0, Math.min(Math.floor(qty / increment) * increment, max));
    setComboQtys((prev) => ({
      ...prev,
      [sku]: Math.round(snapped * 1000) / 1000
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-primary" />
            Combine into Combo
          </DialogTitle>
          <DialogDescription>
            Select the quantity for each compatible combo you want to create.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {compatibleCombos.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No compatible combos found for the selected items.
            </div>
          ) : (
            compatibleCombos.map((combo) => {
              const qty = combo.currentQty;
              return (
              <div
                key={combo.comboSku}
                className={`p-3 rounded-lg border transition-colors ${qty > 0 ? "border-primary bg-primary/5" : "bg-card"}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">{combo.comboName}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQtyChange(combo.comboSku, combo.maxCombos, combo.maxCombos, combo.increment)}>Max: {combo.maxCombos}</Button>
                    <div className="flex items-center gap-1 border rounded-md px-1 py-0.5 bg-background">
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => handleQtyChange(combo.comboSku, qty - combo.increment, combo.maxCombos, combo.increment)} disabled={qty <= 0}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        max={combo.maxCombos}
                        step={combo.increment}
                        value={qty}
                        onChange={(e) => handleQtyChange(combo.comboSku, parseFloat(e.target.value) || 0, combo.maxCombos, combo.increment)}
                        className="w-12 h-5 text-center text-xs p-0 border-none focus-visible:ring-0"
                      />
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => handleQtyChange(combo.comboSku, qty + combo.increment, combo.maxCombos, combo.increment)} disabled={qty >= combo.maxCombos - 0.0001}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )})
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={totalSelected <= 0}
            onClick={() => {
              if (totalSelected > 0) {
                onCombine(finalRequests);
                onOpenChange(false);
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