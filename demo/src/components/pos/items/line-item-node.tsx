import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type Guest,
  getGuestColor,
} from "@/lib/pos/ui-utils";
import type {
  AllocationBlock,
  CatalogItemEntry,
  ProjectedLineItem,
  PaymentAllocation,
} from "@/lib/vcs/types";
import { AllocationType, CatalogItemType, ItemStatus } from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Split,
} from "lucide-react";
import { AllocationBadges } from "./allocation-badges";
import { ViewMode } from "@/lib/pos/types";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { useState } from "react";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";
import { LineItemActions } from "./line-item-actions";
import { LineItemMainQty, LineItemInlineQty } from "./line-item-qty-controls";
import { usePreferencesStore } from "@/store/preferences-store";

export function LineItemNode({
  item,
  allocations,
  defaultPaymentAllocId,
  onRemove,
  onAddModifier,
  onAddNote,
  onAllocConfig,
  onSwapComboChoice,
  onDuplicateItem,
  depth,
  modifiers,
  guests,
  isSelected = false,
  onSelectToggle,
  isCollapsed,
  onToggleCollapse,
  collapsedItems,
  detailLevel = ViewMode.Simple,
  isCompactMode = false,
  hideCanceled = false,
  selectedLineIds = new Set(),
}: {
  item: ProjectedLineItem;
  allocations: Record<string, AllocationBlock>;
  defaultPaymentAllocId: string | null;
  onRemove: (lineId: string) => void;
  onAddModifier: (item: ProjectedLineItem) => void;
  onAddNote: (item: ProjectedLineItem) => void;
  onAllocConfig: (item: ProjectedLineItem) => void;
  onSwapComboChoice?: (
    lineId: string,
    parentLineId: string,
    slotSku: string,
  ) => void;
  onDuplicateItem?: (lineId: string) => void;
  depth: number;
  modifiers: CatalogItemEntry[];
  guests: Guest[];
  isSelected?: boolean;
  selectedLineIds?: Set<string>;
  onSelectToggle?: (lineId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (lineId: string) => void;
  collapsedItems?: Set<string>;
  detailLevel?: ViewMode;
  isCompactMode?: boolean;
  hideCanceled: boolean;
}) {
  const isRoot = !item.parentLineId;
  const isModifier = item.basePrice === 0 || item.parentLineId;

  const catalog = useVCSStore((state) => state.catalog);
  const projectedState = useVCSStore((state) => state.projectedState);
  const globalDepthColors = usePreferencesStore((state) => state.defaultPrefs.globalDepthColors) || ["#94a3b8"];
  const rawAllocations = projectedState.allocations;
  const formatNumber = useFormatNumber();

  const [qtyPadTarget, setQtyPadTarget] = useState<"main" | "inline" | null>(null);

  // --- Alloc resolution ---
  const rawAssignAlloc = item.allocations
    .map((id) => rawAllocations[id])
    .find((a) => a?.type === AllocationType.Assignment) as any;
  const assigneeId = rawAssignAlloc
    ? rawAssignAlloc.allocationId
    : guests[0]?.id || "Guest";

  const rawPaymentAllocs = item.allocations
    .map((id) => rawAllocations[id])
    .filter((a) => a?.type === AllocationType.Payment) as PaymentAllocation[];
  let payerId = assigneeId;
  if (rawPaymentAllocs.length > 0) {
    const rawPayer = rawPaymentAllocs[0].payer;
    const matchedPayer = guests.find(
      (g) => g.id === rawPayer || g.alias === rawPayer,
    );
    payerId = matchedPayer ? matchedPayer.id : rawPayer;
  }

  const assignAlloc = item.allocations
    .map((id) => allocations[id])
    .find((a) => a?.type === AllocationType.Assignment) as any;
  const assigneeName = assignAlloc ? assignAlloc.entity : "Guest";

  const paymentAllocs = item.allocations
    .map((id) => allocations[id])
    .filter((a) => a?.type === AllocationType.Payment) as PaymentAllocation[];
  const payerName =
    paymentAllocs.length > 0 ? paymentAllocs[0].payer : assigneeName;

  // --- Status flags ---
  const isCanceled = item.status === ItemStatus.Canceled;
  const isPending = item.status === ItemStatus.Pending;
  const isChanged = item.status === ItemStatus.Changed;
  const isConfirmed = item.status === ItemStatus.Confirmed;
  const hasSplitPayment =
    item.allocations.filter(
      (id) => allocations[id]?.type === AllocationType.Payment,
    ).length > 1;

  // --- Catalog-derived config ---
  const catalogEntry = catalog[item.sku];
  const isSelectable = !isCanceled && (isRoot || catalogEntry?.type === CatalogItemType.Item);
  const step = catalogEntry?.mainQtyIncrement ?? 1;

  const hasInlineQty =
    catalogEntry?.inlineQtyType && catalogEntry.inlineQtyType !== "none";
  const inlineStep =
    catalogEntry?.inlineQtyIncrement ??
    (catalogEntry?.inlineQtyType === "float" ? 0.05 : 1);
  const inlineQtyLabel =
    catalogEntry?.inlineQtyLabel ??
    (catalogEntry?.inlineQtyType === "int"
      ? "Count"
      : catalogEntry?.inlineQtyType === "float"
        ? "Measurement"
        : "Qty");
  const inlineQtyUnit =
    catalogEntry?.inlineQtyUnit ??
    (catalogEntry?.inlineQtyType === "float" ? "units" : "");
  const inlineQtyRateUnit = inlineQtyUnit || inlineQtyLabel.toLowerCase();
  const inlineQtyDisplayUnit =
    catalogEntry?.inlineQtyType === "int"
      ? inlineQtyLabel.toLowerCase()
      : inlineQtyUnit || inlineQtyLabel.toLowerCase();
  const precision = (() => {
    const text = inlineStep.toString();
    if (text.includes("e-")) {
      const match = text.match(/e-(\d+)$/);
      return match ? Number(match[1]) : 0;
    }
    const decimals = text.split(".")[1];
    return decimals ? decimals.length : 0;
  })();
  const formatInlineQty = (value: number) =>
    formatNumber(value, precision > 0 ? precision : 0);
  const inlinePricePerUnit = catalogEntry?.inlineQtyPricePerUnit;
  const inlineQtyPricePerUnitShowPer =
    catalogEntry?.inlineQtyPricePerUnitShowPer ?? true;
  const inlineQtyMainQtyLocked = catalogEntry?.inlineQtyMainQtyLocked ?? false;
  const sizeGroup = catalogEntry?.appliedSizeGroup;
  const sizeOptions = sizeGroup?.options || [];

  const allowedModifierSkus = catalogEntry?.allowedModifiers || [];
  const filteredModifiers = modifiers.filter((mod) =>
    allowedModifierSkus.includes(mod.sku),
  );

  const activeSizeChild = item.children.find((child) => {
    const childEntry = catalog[child.sku];
    return childEntry && childEntry.sizeGroupId === sizeGroup?.id;
  });
  const activeSku = activeSizeChild?.sku;

  const showSku = detailLevel === ViewMode.Full;
  const showAllocations = detailLevel !== ViewMode.Simple;

  const parentItem = item.parentLineId
    ? projectedState.items[item.parentLineId]
    : null;
  const parentCatalogEntry = parentItem ? catalog[parentItem.sku] : null;
  const comboChoiceEntry = parentCatalogEntry?.comboChoices?.find(
    (choice) => choice.optionSku === item.sku,
  );
  const isComboChoice = !!comboChoiceEntry;
  const slotSku = comboChoiceEntry?.slotSku;

  const validChildren = item.children.filter((child) => child.name !== "");

  // Color for the connectors drawn by *this* node's children list.
  // Children at depth N+1 use the color for depth N.
  const childConnectorColor = globalDepthColors.length > 0 
    ? globalDepthColors[depth % globalDepthColors.length] 
    : "#94a3b8";

  return (
    <>
      <div className="group relative">
        <div
          className={`rounded-lg border p-3 transition-all ${isSelectable
              ? isSelected
                ? "border-primary bg-primary/5 dark:bg-primary/10/20 cursor-pointer shadow-xs hover:bg-primary/10"
                : `border-border cursor-pointer ${isConfirmed
                  ? "bg-muted/30 hover:bg-muted/50"
                  : isRoot
                    ? "bg-card hover:bg-accent/50"
                    : "border-transparent bg-muted/40 hover:bg-accent/30"
                }`
              : "border-transparent bg-muted/40"
            }`}
          onClick={
            isSelectable
              ? (e) => {
                e.stopPropagation();
                onSelectToggle?.(item.lineId);
              }
              : undefined
          }
        >
          <div className="flex items-start justify-between gap-3">
            {/* ── Left: identity + qty + name ── */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isSelectable && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelectToggle?.(item.lineId)}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-1 h-3.5 w-3.5 border-muted-foreground/30 data-[state=checked]:border-primary"
                  />
                )}
                {!isModifier && !isCanceled && (
                  <div
                    className="flex -space-x-1 shrink-0 items-center mr-1"
                    title={`Assignee: ${assigneeName || "Guest"}\nPayer: ${paymentAllocs.length > 1 ? "Multiple (Split)" : payerName || "Guest"}`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full border border-background z-10"
                      style={{ background: getGuestColor(assigneeId, guests) }}
                    />
                    <div
                      className="w-2.5 h-2.5 rounded-full border border-background"
                      style={{ background: getGuestColor(payerId, guests) }}
                    />
                  </div>
                )}
                {validChildren.length > 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCollapse?.(item.lineId);
                    }}
                    className="w-4 h-4 -ml-0.5 -mr-1 flex items-center justify-center rounded hover:bg-muted shrink-0 text-muted-foreground transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : (
                  <div className="w-4 h-4 -ml-0.5 -mr-1 shrink-0" />
                )}

                {/* ── Main qty controls ── */}
                {isRoot && (
                  <LineItemMainQty
                    lineId={item.lineId}
                    qty={item.qty}
                    step={step}
                    isCanceled={isCanceled}
                    canceledQty={item.canceledQty}
                    isLocked={inlineQtyMainQtyLocked || isCompactMode}
                    formatNumber={formatNumber}
                    onOpenPad={() => setQtyPadTarget("main")}
                  />
                )}
                {!isRoot && (
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    x{formatNumber(isCanceled ? item.canceledQty : item.qty)}
                  </span>
                )}

                <span
                  className={`font-medium truncate ${isModifier ? "text-muted-foreground text-sm" : "text-foreground"} ${isCanceled ? "line-through opacity-50" : ""}`}
                >
                  {item.name}
                  {inlinePricePerUnit && catalogEntry?.basePrice !== undefined ? (
                    <span className="font-semibold text-muted-foreground text-xs ml-2">
                      @
                      {`$${formatNumber(catalogEntry.basePrice, 2)}${inlineQtyRateUnit ? inlineQtyPricePerUnitShowPer ? ` per ${inlineQtyRateUnit}` : ` ${inlineQtyRateUnit}` : ""}`}
                    </span>
                  ) : null}
                  {item.inlineQty && item.inlineQty !== 1 ? (
                    <span className="font-semibold text-primary/80 ml-1">
                      ({formatInlineQty(item.inlineQty)} {inlineQtyDisplayUnit})
                    </span>
                  ) : null}
                </span>

                {isComboChoice && !isCanceled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 ml-1.5 inline-flex text-primary hover:text-primary hover:bg-primary/10 shrink-0 align-middle"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (slotSku) {
                        onSwapComboChoice?.(item.lineId, item.parentLineId!, slotSku);
                      }
                    }}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </Button>
                )}

                {item.basePrice === 0 && (
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1">mod</Badge>
                )}
                {isCanceled && (
                  <Badge variant="destructive" className="text-[9px] h-3.5 px-1">Void</Badge>
                )}
                {isPending && !isCanceled && (
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    *new*
                  </Badge>
                )}
                {isChanged && !isCanceled && (
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    *changed*
                  </Badge>
                )}
                {item.qty > 0 && item.canceledQty > 0 && (
                  <Badge variant="destructive" className="text-[9px] h-3.5 px-1">
                    -{formatNumber(item.canceledQty)} Void
                  </Badge>
                )}
                {hasSplitPayment && (
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-primary/40 text-primary">
                    <Split className="w-2.5 h-2.5 mr-0.5" />
                    split
                  </Badge>
                )}
              </div>

              {showSku && (
                <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate">
                  {item.sku}
                </div>
              )}
              {showAllocations && (isRoot || item.allocations.length > 0) && (
                <AllocationBadges
                  allocationIds={item.allocations}
                  allocations={allocations}
                  defaultPaymentAllocId={defaultPaymentAllocId}
                  guests={guests}
                />
              )}

              {/* ── Size picker ── */}
              {isRoot && sizeGroup && !isCanceled && sizeOptions.length > 0 && activeSizeChild && (
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[10px] text-muted-foreground mr-1">Size:</span>
                  <div className="flex items-center rounded border p-0.5 bg-muted/20">
                    {sizeOptions.map((opt) => {
                      const isActive = activeSku === opt.sku;
                      return (
                        <Button
                          key={opt.sku}
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          className={`h-5 text-[9px] px-1.5 font-medium ${isActive ? "bg-background shadow-xs hover:bg-background" : "hover:bg-accent"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeSizeChild && !isActive) {
                              useVCSStore
                                .getState()
                                .modifyItemSku(activeSizeChild.lineId, activeSizeChild.sku, opt.sku);
                            }
                          }}
                        >
                          {opt.name}
                          {opt.basePrice > 0 && ` (+$${formatNumber(opt.basePrice, 2)})`}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Inline qty controls ── */}
              {hasInlineQty && !isCanceled && (
                <LineItemInlineQty
                  lineId={item.lineId}
                  inlineQty={item.inlineQty ?? 1}
                  inlineStep={inlineStep}
                  inlineQtyLabel={inlineQtyLabel}
                  inlineQtyUnit={inlineQtyUnit}
                  formatInlineQty={formatInlineQty}
                  onOpenPad={() => setQtyPadTarget("inline")}
                />
              )}

              {/* ── Modifier state picker ── */}
              {!isRoot &&
                catalogEntry &&
                !isCanceled &&
                catalogEntry.allowedStates &&
                catalogEntry.allowedStates.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <div className="flex items-center rounded border p-0.5 bg-muted/20">
                      {catalogEntry.allowedStates.map((stateOpt) => {
                        const isActive = item.selectedModifierState === stateOpt.state;
                        const priceDiff =
                          stateOpt.priceOverride !== null
                            ? stateOpt.priceOverride - catalogEntry.basePrice
                            : 0;
                        return (
                          <Button
                            key={stateOpt.state}
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className={`h-5 text-[9px] px-1.5 font-medium ${isActive ? "bg-background shadow-xs hover:bg-background" : "hover:bg-accent"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isActive) {
                                useVCSStore
                                  .getState()
                                  .modifyModifierState(item.lineId, item.selectedModifierState, stateOpt.state);
                              }
                            }}
                          >
                            {stateOpt.state}
                            {priceDiff !== 0 && (
                              <span className="opacity-70 font-mono ml-0.5 text-[8px]">
                                ({priceDiff > 0 ? "+" : ""}${formatNumber(priceDiff, 2)})
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* ── Right: price + action buttons ── */}
            <div className="flex flex-col items-end shrink-0 gap-1.5">
              {isCanceled && item.basePrice > 0 ? (
                <span className="font-mono font-semibold tabular-nums text-muted-foreground line-through opacity-70">
                  ${formatNumber(item.basePrice * item.canceledQty, 2, 30)}
                </span>
              ) : item.totalPrice > 0 ? (
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  ${formatNumber(item.totalPrice, 2, 30)}
                </span>
              ) : null}
              {!isCanceled && !isCompactMode && (
                <LineItemActions
                  item={item}
                  catalogEntry={catalogEntry}
                  filteredModifiers={filteredModifiers}
                  isComboChoice={isComboChoice}
                  onRemove={onRemove}
                  onAddModifier={onAddModifier}
                  onAddNote={onAddNote}
                  onAllocConfig={onAllocConfig}
                  onDuplicateItem={onDuplicateItem}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Children ── */}
        {/*
          File-explorer connector strategy:
          - The children container has a left border = the vertical trunk line.
          - Each child gets a relative wrapper with an absolutely-positioned
            horizontal elbow that meets the trunk and the card edge.
          - The last child's elbow is an L-shape (no trunk below it), drawn
            with border-b + border-l + rounded-bl. Non-last children just get
            a horizontal tick (border-t) since the trunk continues beneath them.
          - All connector lines use the same color class so depth levels
            are visually distinct.
        */}
        {!isCollapsed && validChildren.length > 0 && (
          <div
            className="ml-4 mt-1 flex flex-col gap-1.5 border-l-2"
            style={{ borderColor: childConnectorColor }}
          >
            {validChildren.map((child, index) => {
              const isLast = index === validChildren.length - 1;
              return (
                <div key={child.lineId} className="relative pl-4">
                  {/*
                    Horizontal elbow connector.
                    - For non-last: a simple horizontal tick at mid-card-top (~12px down).
                    - For last: an L-shape that also terminates the vertical trunk.
                    Both are pinned to the left edge of pl-4 padding (left: -1px overlaps the trunk border).
                  */}
                  {isLast ? (
                    // L-shape: vertical segment from top down to mid, then horizontal to card
                    <span
                      className="pointer-events-none absolute -left-px top-0 h-4 w-4 border-b-2 border-l-2 rounded-bl-md"
                      style={{ borderColor: childConnectorColor }}
                      aria-hidden
                    />
                  ) : (
                    // Horizontal tick only; the trunk border continues vertically
                    <span
                      className="pointer-events-none absolute -left-px top-4 h-px w-4 border-t-2"
                      style={{ borderColor: childConnectorColor }}
                      aria-hidden
                    />
                  )}
                  <LineItemNode
                    item={child}
                    allocations={allocations}
                    defaultPaymentAllocId={defaultPaymentAllocId}
                    onRemove={onRemove}
                    onAddModifier={onAddModifier}
                    onAddNote={onAddNote}
                    onAllocConfig={onAllocConfig}
                    onSwapComboChoice={onSwapComboChoice}
                    onDuplicateItem={onDuplicateItem}
                    depth={depth + 1}
                    modifiers={modifiers}
                    guests={guests}
                    isSelected={selectedLineIds?.has(child.lineId)}
                    selectedLineIds={selectedLineIds}
                    onSelectToggle={onSelectToggle}
                    isCollapsed={collapsedItems?.has(child.lineId)}
                    onToggleCollapse={onToggleCollapse}
                    collapsedItems={collapsedItems}
                    detailLevel={detailLevel}
                    isCompactMode={isCompactMode}
                    hideCanceled={hideCanceled}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Number pad dialog ── */}
      {qtyPadTarget && (
        <NumberPadDialog
          open={qtyPadTarget !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setQtyPadTarget(null);
          }}
          title={qtyPadTarget === "main" ? "Quantity" : "Measurement"}
          description={`Set the ${qtyPadTarget === "main" ? "quantity" : "measurement"} for ${item.name}`}
          initialValue={qtyPadTarget === "main" ? item.qty : (item.inlineQty ?? 1)}
          min={qtyPadTarget === "main" ? step : inlineStep}
          increment={qtyPadTarget === "main" ? step : inlineStep}
          onConfirm={(val) => {
            if (qtyPadTarget === "main") {
              useVCSStore.getState().modifyItemQty(item.lineId, item.qty, val);
            } else {
              useVCSStore.getState().modifyItemInlineQty(item.lineId, item.inlineQty ?? 1, val);
            }
          }}
        />
      )}
    </>
  );
}