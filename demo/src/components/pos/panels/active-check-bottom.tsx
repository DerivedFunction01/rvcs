import { Button } from "@/components/ui/button";
import {
  NumberFractionOverflow,
  useFormatNumber,
} from "@/components/pos/hooks/use-format-number";
import type { CatalogItemEntry, ProjectedLineItem } from "@/lib/vcs/types";
import { ItemStatus, SquashType, DeltaActionType } from "@/lib/vcs/types";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  ChevronDown,
  ArrowUpDown,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";
import { useVCSStore } from "@/store/vcs-store";
import { useEffect, useState, useRef, useMemo } from "react";
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
  onEditModifiers: (item: ProjectedLineItem) => void;
  onRemoveModifier: (lineId: string) => void;
}

export function ActiveCheckBottom({
  selectedItems,
  catalog,
  compatibleModifiers,
  onUpdateInlineQty,
  projectedState,
  onEditModifiers,
  onRemoveModifier,
}: ActiveCheckBottomProps) {
  const formatNumber = useFormatNumber();
  const [padTarget, setPadTarget] = useState<"main" | "inline" | null>(null);
  const [qtyMode, setQtyMode] = useState<"main" | "inline">("main");
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoSquash, setAutoSquash] = useState(true);
  const lastQtyChangeCommitRef = useRef<string | null>(null);
  const squashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const item = selectedItems.length === 1 ? selectedItems[0] : null;
  const catalogEntry = item ? catalog[item.sku] : null;

  const parentItem = item?.parentLineId
    ? projectedState.items[item.parentLineId]
    : null;
  const isComboLinkedChild =
    !!parentItem && !!catalog[parentItem.sku]?.comboChoices?.length;

  const hasEditableModifiers = useMemo(() => {
    if (!item || !catalogEntry) return false;
    return (
      (catalogEntry.allowedModifiers?.length ?? 0) > 0 ||
      compatibleModifiers.length > 0 ||
      item.children.some((child) => {
        const childEntry = catalog[child.sku];
        return !!childEntry && childEntry.basePrice === 0;
      })
    );
  }, [item, catalogEntry, compatibleModifiers, catalog]);

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

  const triggerAutoSquash = (newHead: string | null) => {
    if (!autoSquash || !newHead) return;

    if (!lastQtyChangeCommitRef.current) {
      lastQtyChangeCommitRef.current = newHead;
    }

    if (squashTimeoutRef.current) {
      clearTimeout(squashTimeoutRef.current);
    }

    squashTimeoutRef.current = setTimeout(() => {
      squashTimeoutRef.current = null;
      const startHash = lastQtyChangeCommitRef.current;
      lastQtyChangeCommitRef.current = null;
      if (startHash) {
        const store = useVCSStore.getState();
        const currentHead = store.headHash();
        const log = store.commitLog();
        if (currentHead && startHash !== currentHead) {
          let current: string | null = currentHead;
          let isChainSafe = true;
          while (current && current !== startHash) {
            const commit = log.find((c) => c.commitHash === current);
            if (!commit) {
              isChainSafe = false;
              break;
            }
            const isQtyChange = commit.deltas.every(
              (d) =>
                d.action === DeltaActionType.ModifyQty ||
                d.action === DeltaActionType.ModifyInlineQty,
            );
            if (!isQtyChange) {
              isChainSafe = false;
              break;
            }
            current = commit.parentHash;
          }

          if (isChainSafe) {
            try {
              store.squashPendingCommits(startHash, SquashType.Full);
              toast.success("Auto-squashed quantity adjustments");
            } catch (err) {
              console.error("Auto-squash failed:", err);
            }
          }
        }
      }
    }, 800);
  };

  const canUndo = (() => {
    const store = useVCSStore.getState();
    const log = store.commitLog();
    const headHash = store.headHash();
    if (!headHash) return false;
    const headCommit = log.find((c) => c.commitHash === headHash);
    if (!headCommit) return false;
    if (
      headCommit.authorId === "system-init" ||
      headCommit.authorId.startsWith("system-")
    ) {
      return false;
    }
    return !!headCommit.parentHash;
  })();

  useEffect(() => {
    setQtyMode(shouldDefaultToInline ? "inline" : "main");
  }, [shouldDefaultToInline, item?.lineId, item?.sku]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="border-t bg-card flex flex-col justify-between shrink-0 shadow-sm h-64 overflow-hidden"
      id="active-check-bottom"
    >
      {/* Top Section: Stacked Financials */}
      <div className="space-y-1.5 px-6 pt-3 pb-1 text-sm font-semibold select-none">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground uppercase tracking-wider">
            Subtotal
          </span>
          <span className="font-mono font-bold text-muted-foreground">
            ${formatNumber(projectedState.financials.subtotal, 2, 10)}
          </span>
        </div>

        {/* Taxes & Fees */}
        <div className="flex justify-between items-center text-xs">
          {projectedState.financials.chargeTotal > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground uppercase tracking-wider hover:underline cursor-pointer flex items-center gap-1">
                  Taxes, Fees <ChevronDown className="w-3 h-3" />
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
          ) : (
            <span className="text-muted-foreground uppercase tracking-wider">
              Taxes, Fees
            </span>
          )}
          <span className="font-mono font-bold text-muted-foreground">
            ${formatNumber(projectedState.financials.chargeTotal, 2, 10)}
          </span>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center border-t pt-1 border-border/80">
          <span className="text-primary uppercase tracking-wider font-bold">
            Total
          </span>
          <span className="font-mono font-bold text-base text-primary">
            ${formatNumber(projectedState.financials.grandTotal, 2, 10)}
          </span>
        </div>
      </div>

      {/* Bottom Section: Quantity Controls */}
      <div className="flex-1 flex flex-col justify-end gap-1.5">
        <div className="grid grid-cols-3 grid-rows-2 gap-px bg-border/80 border-t overflow-hidden w-full h-32 rounded-none">
          {/* Row 1, Col 1: Minus Button */}
          <Button
            variant="outline"
            disabled={
              selectedItems.length === 0 ||
              (selectedItems.length === 1 &&
                (item?.status === ItemStatus.Canceled ||
                  (qtyMode === "main" && (!isRootItem || mainQtyLocked))))
            }
            className="h-full w-full rounded-none border-0 shadow-none hover:bg-muted bg-background cursor-pointer flex flex-col items-center justify-center gap-0.5"
            onClick={(e) => {
              e.stopPropagation();
              if (selectedItems.length === 1 && item) {
                if (qtyMode === "inline") {
                  onUpdateInlineQty(item.sku, -inlineStep);
                  triggerAutoSquash(useVCSStore.getState().headHash());
                } else {
                  const step = catalogEntry?.mainQtyIncrement ?? 1;
                  if (item.qty > step) {
                    useVCSStore
                      .getState()
                      .modifyItemQty(
                        item.lineId,
                        item.qty,
                        Math.round((item.qty - step) * 1000) / 1000,
                      );
                    triggerAutoSquash(useVCSStore.getState().headHash());
                  } else {
                    useVCSStore.getState().removeItem(item.lineId);
                    if (squashTimeoutRef.current) {
                      clearTimeout(squashTimeoutRef.current);
                      squashTimeoutRef.current = null;
                    }
                    lastQtyChangeCommitRef.current = null;
                  }
                }
              } else if (selectedItems.length > 1) {
                const ids = selectedItems.map((i) => i.lineId);
                useVCSStore.getState().modifyItemsQty(ids, -1);
                triggerAutoSquash(useVCSStore.getState().headHash());
              }
            }}
          >
            <Minus className="w-5 h-5" />
            <span className="text-[9px] uppercase font-bold text-muted-foreground">
              Minus / -
            </span>
          </Button>

          {/* Row 1, Col 2: Plus Button */}
          <Button
            variant="outline"
            disabled={
              selectedItems.length === 0 ||
              (selectedItems.length === 1 &&
                (item?.status === ItemStatus.Canceled ||
                  (qtyMode === "main" && (!isRootItem || mainQtyLocked))))
            }
            className="h-full w-full rounded-none border-0 shadow-none hover:bg-muted bg-background cursor-pointer flex flex-col items-center justify-center gap-0.5"
            onClick={(e) => {
              e.stopPropagation();
              if (selectedItems.length === 1 && item) {
                if (qtyMode === "inline") {
                  onUpdateInlineQty(item.sku, inlineStep);
                  triggerAutoSquash(useVCSStore.getState().headHash());
                } else {
                  const step = catalogEntry?.mainQtyIncrement ?? 1;
                  useVCSStore
                    .getState()
                    .modifyItemQty(
                      item.lineId,
                      item.qty,
                      Math.round((item.qty + step) * 1000) / 1000,
                    );
                  triggerAutoSquash(useVCSStore.getState().headHash());
                }
              } else if (selectedItems.length > 1) {
                const ids = selectedItems.map((i) => i.lineId);
                useVCSStore.getState().modifyItemsQty(ids, 1);
                triggerAutoSquash(useVCSStore.getState().headHash());
              }
            }}
          >
            <Plus className="w-5 h-5" />
            <span className="text-[9px] uppercase font-bold text-muted-foreground">
              Plus / +
            </span>
          </Button>

          {/* Row 1, Col 3: Qty display/trigger */}
          <Button
            variant="outline"
            disabled={
              selectedItems.length === 0 ||
              (selectedItems.length === 1 &&
                item?.status === ItemStatus.Canceled)
            }
            className="h-full w-full rounded-none border-0 shadow-none hover:bg-muted bg-background font-mono font-bold text-xs cursor-pointer flex flex-col justify-center items-center py-1.5 select-none"
            onClick={(e) => {
              e.stopPropagation();
              if (selectedItems.length === 0) return;

              if (
                selectedItems.length === 1 &&
                hasInlineQty &&
                !mainQtyLocked
              ) {
                if (clickTimeoutRef.current) {
                  clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = null;
                  // Double click: Toggle mode
                  setQtyMode((prev) => (prev === "main" ? "inline" : "main"));
                } else {
                  clickTimeoutRef.current = setTimeout(() => {
                    clickTimeoutRef.current = null;
                    // Single click: Open number pad
                    setPadTarget(qtyMode);
                  }, 250);
                }
              } else {
                setPadTarget(qtyMode);
              }
            }}
          >
            {selectedItems.length === 0 ? (
              <span>qty: -</span>
            ) : selectedItems.length === 1 && item ? (
              hasInlineQty && !mainQtyLocked ? (
                qtyMode === "main" ? (
                  <>
                    <span>qty: {formatNumber(item.qty)}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5 font-normal">
                      <ArrowUpDown className="w-2.5 h-2.5" />
                      {formatNumber(currentInlineQty, precision)}
                      {inlineQtyUnit}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      qty: {formatNumber(currentInlineQty, precision)}
                      {inlineQtyUnit}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5 font-normal">
                      <ArrowUpDown className="w-2.5 h-2.5" />
                      main: {formatNumber(item.qty)}
                    </span>
                  </>
                )
              ) : qtyMode === "inline" ? (
                <span>
                  qty: {formatNumber(currentInlineQty, precision)}
                  {inlineQtyUnit}
                </span>
              ) : (
                <span>qty: {formatNumber(item.qty)}</span>
              )
            ) : (
              <span>qty: ({selectedItems.length})</span>
            )}
          </Button>

          {/* Row 2: Action buttons */}
          <Button
            variant="outline"
            disabled={selectedItems.length !== 1 || !hasEditableModifiers}
            className="h-full w-full rounded-none border-0 shadow-none text-[10px] font-bold uppercase tracking-wider bg-background hover:bg-muted cursor-pointer flex flex-col justify-center items-center py-1.5 select-none"
            onClick={(e) => {
              e.stopPropagation();
              if (selectedItems.length === 1 && item) {
                onEditModifiers(item);
              }
            }}
          >
            <Pencil className="w-4 h-4 mb-1" />
            <span>Modifiers</span>
          </Button>
          <Button
            variant="outline"
            disabled={
              selectedItems.length === 0 ||
              (selectedItems.length === 1 && isComboLinkedChild)
            }
            className="h-full w-full rounded-none border-0 shadow-none text-[10px] font-bold uppercase tracking-wider bg-background hover:bg-destructive/15 text-destructive disabled:text-muted-foreground/40 cursor-pointer flex flex-col justify-center items-center py-1.5 select-none"
            onClick={(e) => {
              e.stopPropagation();
              selectedItems.forEach((i) => onRemoveModifier(i.lineId));
            }}
          >
            <Trash2 className="w-4 h-4 mb-1" />
            <span>Remove</span>
          </Button>
          <Button
            variant="outline"
            disabled={!canUndo}
            className="h-full w-full rounded-none border-0 shadow-none text-[10px] font-bold uppercase tracking-wider bg-background hover:bg-muted cursor-pointer flex flex-col justify-center items-center py-1.5 select-none"
            onClick={(e) => {
              e.stopPropagation();
              if (undoClickTimeoutRef.current) {
                clearTimeout(undoClickTimeoutRef.current);
                undoClickTimeoutRef.current = null;
                setAutoSquash((prev) => {
                  const newVal = !prev;
                  toast.success(`Auto-squash is now ${newVal ? "ON" : "OFF"}`);
                  return newVal;
                });
              } else {
                undoClickTimeoutRef.current = setTimeout(() => {
                  undoClickTimeoutRef.current = null;
                  const store = useVCSStore.getState();
                  const log = store.commitLog();
                  const headHash = store.headHash();
                  if (!headHash) return;
                  const headCommit = log.find((c) => c.commitHash === headHash);
                  if (headCommit && headCommit.parentHash) {
                    try {
                      store.resetToCommit(headCommit.parentHash);
                      toast.success("Undo successful");
                      if (squashTimeoutRef.current) {
                        clearTimeout(squashTimeoutRef.current);
                        squashTimeoutRef.current = null;
                      }
                      lastQtyChangeCommitRef.current = null;
                    } catch (err: any) {
                      toast.error(err.message || "Cannot undo");
                    }
                  }
                }, 250);
              }
            }}
          >
            <Undo2 className="w-4 h-4 mb-1" />
            <span>Undo</span>
            {/* <span className="text-[8px] text-muted-foreground/60 font-normal mt-0.5 normal-case">
              Auto: {autoSquash ? "ON" : "OFF"}
            </span> */}
          </Button>
        </div>
      </div>

      {selectedItems.length > 0 && padTarget && (
        <NumberPadDialog
          open={padTarget !== null}
          onOpenChange={(open) => {
            if (!open) setPadTarget(null);
          }}
          title={padTarget === "main" ? "Quantity" : "Measurement"}
          description={
            selectedItems.length === 1 && item
              ? `Set the ${padTarget === "main" ? "quantity" : "measurement"} for ${item.name}`
              : `Set the quantity for ${selectedItems.length} selected items`
          }
          initialValue={
            padTarget === "main"
              ? item
                ? item.qty
                : 1
              : (item?.inlineQty ?? 1)
          }
          min={
            padTarget === "main"
              ? (catalogEntry?.mainQtyIncrement ?? 1)
              : inlineStep
          }
          increment={
            padTarget === "main"
              ? (catalogEntry?.mainQtyIncrement ?? 1)
              : inlineStep
          }
          onConfirm={(val) => {
            if (padTarget === "main") {
              if (selectedItems.length === 1 && item) {
                useVCSStore
                  .getState()
                  .modifyItemQty(item.lineId, item.qty, val);
              } else {
                const store = useVCSStore.getState();
                for (const i of selectedItems) {
                  store.modifyItemQty(i.lineId, i.qty, val);
                }
              }
            } else {
              if (item) {
                useVCSStore
                  .getState()
                  .modifyItemInlineQty(item.lineId, item.inlineQty ?? 1, val);
              }
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
