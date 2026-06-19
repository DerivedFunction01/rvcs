import { Button } from "@/components/ui/button";
import { NumberFractionOverflow, useFormatNumber } from "@/components/pos/hooks/use-format-number";
import type { CatalogItemEntry, ProjectedLineItem } from "@/lib/vcs/types";
import { ItemStatus } from "@/lib/vcs/types";
import { Minus, Plus, ChevronDown } from "lucide-react";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";
import { useVCSStore } from "@/store/vcs-store";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ActiveCheckBottomProps {
  selectedItems: ProjectedLineItem[];
  catalog: Record<string, CatalogItemEntry>;
  compatibleModifiers: CatalogItemEntry[];
  onUpdateInlineQty: (sku: string, change: number) => void;
  projectedState: any;
}

export function ActiveCheckBottom({
  selectedItems,
  catalog,
  onUpdateInlineQty,
  projectedState,
}: ActiveCheckBottomProps) {
  const formatNumber = useFormatNumber();
  const [padTarget, setPadTarget] = useState<"main" | "inline" | null>(null);
  const [qtyMode, setQtyMode] = useState<"main" | "inline">("main");

  const item = selectedItems.length === 1 ? selectedItems[0] : null;
  const catalogEntry = item ? catalog[item.sku] : null;

  const isRootItem = !item?.parentLineId;
  const mainQtyLocked = catalogEntry?.inlineQtyMainQtyLocked ?? false;

  const hasInlineQty =
    catalogEntry?.inlineQtyType && catalogEntry.inlineQtyType !== "none";
  const shouldDefaultToInline =
    !!hasInlineQty && (!isRootItem || mainQtyLocked);
  const mainQtyDisabled = mainQtyLocked || !isRootItem;
  const inlineStep =
    catalogEntry?.inlineQtyIncrement ??
    (catalogEntry?.inlineQtyType === "float" ? 0.05 : 1);
  const inlineQtyUnit = catalogEntry?.inlineQtyUnit ?? "";
  const currentInlineQty = item?.inlineQty ?? 1;

  const precision = (() => {
    const text = inlineStep.toString();
    if (text.includes("e-")) return Number(text.match(/e-(\d+)$/)?.[1] || 0);
    return text.split(".")[1]?.length || 0;
  })();

  useEffect(() => {
    setQtyMode(shouldDefaultToInline ? "inline" : "main");
  }, [shouldDefaultToInline, item?.lineId, item?.sku]);

  return (
    <div
      className="border-t bg-card flex flex-col justify-between px-6 py-2.5 shrink-0 shadow-sm h-32 overflow-hidden"
      id="active-check-bottom"
    >
      {/* Top Row: Quantity Editor */}
      <div className="flex-1 flex items-center justify-center">
        {item && catalogEntry ? (
          <div className="flex items-center gap-4">
            {hasInlineQty && !mainQtyLocked && (
              <div className="inline-flex items-stretch rounded-full border bg-background p-0.5 shadow-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setQtyMode("main")}
                  disabled={mainQtyDisabled}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    qtyMode === "main"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Main
                </button>
                <button
                  type="button"
                  onClick={() => setQtyMode("inline")}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    qtyMode === "inline"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Measure
                </button>
              </div>
            )}

            {hasInlineQty ? (
              qtyMode === "main" && !shouldDefaultToInline ? (
                <MainQtyControl
                  item={item}
                  isEligible={isRootItem}
                  step={catalogEntry.mainQtyIncrement ?? 1}
                  isLocked={catalogEntry.inlineQtyMainQtyLocked ?? false}
                  formatNumber={formatNumber}
                  onOpenPad={() => setPadTarget("main")}
                />
              ) : (
                <MeasurementQty
                  hasInlineQty={hasInlineQty}
                  onUpdateInlineQty={onUpdateInlineQty}
                  item={item}
                  inlineStep={inlineStep}
                  formatNumber={formatNumber}
                  currentInlineQty={currentInlineQty}
                  precision={precision}
                  inlineQtyUnit={inlineQtyUnit}
                  onOpenPad={() => setPadTarget("inline")}
                />
              )
            ) : (
              <MainQtyControl
                item={item}
                isEligible={isRootItem}
                step={catalogEntry.mainQtyIncrement ?? 1}
                isLocked={catalogEntry.inlineQtyMainQtyLocked ?? false}
                formatNumber={formatNumber}
                onOpenPad={() => setPadTarget("main")}
              />
            )}
          </div>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground/50 tracking-wide select-none">
            Select item to edit quantity
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border/80 w-full" />

      {/* Bottom Row: Relocated Financials (always visible) */}
      <div className="flex items-center justify-between shrink-0 py-1">
        <div className="flex items-center gap-6">
          <div className="text-left flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold leading-none mb-1">
              Subtotal
            </span>
            <span className="font-mono font-bold text-sm tabular-nums text-muted-foreground leading-none">
              ${formatNumber(projectedState.financials.subtotal, 2, 10)}
            </span>
          </div>

          {projectedState.financials.chargeTotal > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-left hover:bg-accent px-2 py-1 rounded transition-colors cursor-pointer flex flex-col justify-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1 leading-none mb-1">
                    Tax & Fees <ChevronDown className="w-2.5 h-2.5" />
                  </div>
                  <div className="font-mono font-bold text-sm tabular-nums text-muted-foreground leading-none">
                    ${formatNumber(projectedState.financials.chargeTotal, 2, 10)}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="start">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Charge Breakdown
                  </h4>
                  <div className="space-y-1">
                    {projectedState.financials.chargeBreakdown.map(
                      (charge: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-xs"
                        >
                          <span className="truncate pr-2 text-muted-foreground">
                            {charge.label}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            ${formatNumber(charge.chargeAmount, 2, 10)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="text-right bg-primary/5 px-4 py-1.5 rounded-lg border border-primary/10 flex items-center gap-2">
          <span className="text-[10px] text-primary/80 uppercase tracking-wider font-bold">
            Total
          </span>
          <span className="font-mono font-bold text-lg tabular-nums text-primary leading-none">
            ${formatNumber(projectedState.financials.grandTotal, 2, 10)}
          </span>
        </div>
      </div>

      {item && catalogEntry && padTarget && (
        <NumberPadDialog
          open={padTarget !== null}
          onOpenChange={(open) => {
            if (!open) setPadTarget(null);
          }}
          title={padTarget === "main" ? "Quantity" : "Measurement"}
          description={`Set the ${
            padTarget === "main" ? "quantity" : "measurement"
          } for ${item.name}`}
          initialValue={
            padTarget === "main" ? item.qty : item.inlineQty ?? 1
          }
          min={
            padTarget === "main"
              ? catalogEntry.mainQtyIncrement ?? 1
              : inlineStep
          }
          increment={
            padTarget === "main"
              ? catalogEntry.mainQtyIncrement ?? 1
              : inlineStep
          }
          onConfirm={(val) => {
            if (padTarget === "main") {
              useVCSStore.getState().modifyItemQty(item.lineId, item.qty, val);
            } else {
              useVCSStore
                .getState()
                .modifyItemInlineQty(item.lineId, item.inlineQty ?? 1, val);
            }
          }}
        />
      )}
    </div>
  );
}

function MainQtyControl({
  item,
  isEligible,
  step,
  isLocked,
  formatNumber,
  onOpenPad,
}: {
  item: ProjectedLineItem;
  isEligible: boolean;
  step: number;
  isLocked: boolean;
  formatNumber: (
    value: number,
    decimals?: number,
    overflow_precision?: number,
    overflow_fraction_strategy?: NumberFractionOverflow,
  ) => string;
  onOpenPad: () => void;
}) {
  if (!isEligible) {
    return (
      <div className="flex items-center rounded-xl border bg-background shadow-xs overflow-hidden h-12 px-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground select-none">
        N/A
      </div>
    );
  }

  if (item.status === ItemStatus.Canceled) {
    return (
      <div className="flex items-stretch rounded-xl border border-destructive/20 bg-destructive/5 shadow-xs overflow-hidden h-12">
        <div className="flex w-12 items-center justify-center border-r border-destructive/20 bg-destructive/10">
          <span className="text-sm font-mono font-bold text-destructive">
            {formatNumber(item.canceledQty)}
          </span>
        </div>
        <div className="flex items-center justify-center px-4 text-[9px] font-bold uppercase tracking-wide text-destructive/80">
          Voided
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex items-stretch rounded-xl border bg-background shadow-xs overflow-hidden h-12">
        <Button
          variant="ghost"
          className="h-full w-12 p-0 rounded-none border-r hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            if (item.qty > step) {
              useVCSStore
                .getState()
                .modifyItemQty(
                  item.lineId,
                  item.qty,
                  Math.round((item.qty - step) * 1000) / 1000,
                );
            } else {
              useVCSStore.getState().removeItem(item.lineId);
            }
          }}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <button
          type="button"
          className="px-6 min-h-0 self-stretch flex flex-col items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPad();
          }}
        >
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
            Locked
          </span>
          <span className="text-base font-mono font-bold text-foreground leading-none">
            {formatNumber(item.qty)}
          </span>
        </button>
        <Button
          variant="ghost"
          className="h-full w-12 p-0 rounded-none border-l hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            useVCSStore
              .getState()
              .modifyItemQty(
                item.lineId,
                item.qty,
                Math.round((item.qty + step) * 1000) / 1000,
              );
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-stretch rounded-xl border bg-background shadow-xs overflow-hidden h-12">
      <Button
        variant="ghost"
        className="h-full w-12 p-0 rounded-none border-r hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation();
          if (item.qty > step) {
            useVCSStore
              .getState()
              .modifyItemQty(
                item.lineId,
                item.qty,
                Math.round((item.qty - step) * 1000) / 1000,
              );
          } else {
            useVCSStore.getState().removeItem(item.lineId);
          }
        }}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <button
        type="button"
        className="px-6 min-h-0 self-stretch flex flex-col items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onOpenPad();
        }}
      >
        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
          Qty
        </span>
        <span className="text-base font-mono font-bold text-foreground leading-none">
          {formatNumber(item.qty)}
        </span>
      </button>
      <Button
        variant="ghost"
        className="h-full w-12 p-0 rounded-none border-l hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation();
          useVCSStore
            .getState()
            .modifyItemQty(
              item.lineId,
              item.qty,
              Math.round((item.qty + step) * 1000) / 1000,
            );
        }}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}

function MeasurementQty({
  hasInlineQty,
  onUpdateInlineQty,
  item,
  inlineStep,
  formatNumber,
  currentInlineQty,
  precision,
  inlineQtyUnit,
  onOpenPad,
}: {
  hasInlineQty: boolean | null | undefined;
  onUpdateInlineQty: (sku: string, change: number) => void;
  item: ProjectedLineItem;
  inlineStep: number;
  formatNumber: (
    value: number,
    decimals?: number,
    overflow_precision?: number,
    overflow_fraction_strategy?: NumberFractionOverflow,
  ) => string;
  currentInlineQty: number;
  precision: number;
  inlineQtyUnit: string;
  onOpenPad: () => void;
}) {
  return (
    <div className="flex items-stretch rounded-xl border bg-background shadow-xs overflow-hidden h-12">
      <Button
        variant="ghost"
        className="h-full w-12 p-0 rounded-none border-r hover:bg-muted"
        onClick={() => onUpdateInlineQty(item.sku, -inlineStep)}
        disabled={!hasInlineQty}
      >
        <Minus className="w-4 h-4" />
      </Button>
      {hasInlineQty ? (
        <button
          type="button"
          className="px-6 min-h-0 self-stretch flex flex-col items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPad();
          }}
        >
          <span className="text-base font-mono font-bold text-foreground leading-none">
            {formatNumber(currentInlineQty, precision)}
          </span>
          {inlineQtyUnit && (
            <span className="text-[8px] font-bold text-muted-foreground uppercase leading-none mt-0.5">
              {inlineQtyUnit}
            </span>
          )}
        </button>
      ) : (
        <div className="px-6 flex items-center justify-center bg-muted/10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          N/A
        </div>
      )}
      <Button
        variant="ghost"
        className="h-full w-12 p-0 rounded-none border-l hover:bg-muted"
        onClick={() => onUpdateInlineQty(item.sku, inlineStep)}
        disabled={!hasInlineQty}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
