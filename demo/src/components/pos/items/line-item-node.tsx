import { Badge } from "@/components/ui/badge";
import { type Guest, getGuestColor } from "@/lib/pos/ui-utils";
import type {
  AllocationBlock,
  ProjectedLineItem,
  PaymentAllocation,
} from "@/lib/vcs/types";
import { AllocationType, ItemStatus } from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import { ChevronDown, ChevronRight, Split } from "lucide-react";
import { AllocationBadges } from "./allocation-badges";
import { ViewMode } from "@/lib/pos/types";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { usePreferencesStore } from "@/store/preferences-store";

export function LineItemNode({
  item,
  allocations,
  defaultPaymentAllocId,
  depth,
  guests,
  isSelected = false,
  onSelectToggle,
  isCollapsed,
  onToggleCollapse,
  collapsedItems,
  detailLevel = ViewMode.Simple,
  hideCanceled = false,
  selectedLineIds = new Set(),
}: {
  item: ProjectedLineItem;
  allocations: Record<string, AllocationBlock>;
  defaultPaymentAllocId: string | null;
  depth: number;
  guests: Guest[];
  isSelected?: boolean;
  selectedLineIds?: Set<string>;
  onSelectToggle?: (lineId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (lineId: string) => void;
  collapsedItems?: Set<string>;
  detailLevel?: ViewMode;
  hideCanceled: boolean;
}) {
  const isRoot = !item.parentLineId;
  const isModifier = item.basePrice === 0 || item.parentLineId;

  const catalog = useVCSStore((state) => state.catalog);
  const projectedState = useVCSStore((state) => state.projectedState);
  const globalDepthColors = usePreferencesStore(
    (state) => state.defaultPrefs.globalDepthColors,
  ) || ["#94a3b8"];
  const rawAllocations = projectedState.allocations;
  const formatNumber = useFormatNumber();

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
  const hasSplitPayment =
    item.allocations.filter(
      (id) => allocations[id]?.type === AllocationType.Payment,
    ).length > 1;

  // --- Catalog-derived config ---
  const catalogEntry = catalog[item.sku];
  const isSelectable = !isCanceled;

  const inlineQtyLabel = catalogEntry?.inlineQtyLabel ?? "Qty";
  const inlineQtyUnit = catalogEntry?.inlineQtyUnit ?? "";
  const inlineQtyDisplayUnit =
    catalogEntry?.inlineQtyType === "int"
      ? inlineQtyLabel.toLowerCase()
      : inlineQtyUnit || inlineQtyLabel.toLowerCase();

  const showSku = detailLevel === ViewMode.Full;
  const showAllocations = detailLevel !== ViewMode.Simple;

  const validChildren = item.children.filter((child) => child.name !== "");

  const childConnectorColor =
    globalDepthColors.length > 0
      ? globalDepthColors[depth % globalDepthColors.length]
      : "#94a3b8";

  return (
    <div className="group relative">
      <div
        className={`border pr-3 pl-3 pt-1.5 pb-1.5 transition-all ${
          isSelectable
            ? isSelected
              ? "border-primary bg-primary/5 dark:bg-primary/10/20 cursor-pointer shadow-xs hover:bg-primary/10"
              : `border-border cursor-pointer ${
                  item.status === ItemStatus.Confirmed
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
        <div className="flex items-center justify-between gap-3 min-h-8">
          {/* ── Left: identity + qty + name ── */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {!isModifier && !isCanceled && (
              <div
                className="flex -space-x-1 shrink-0 items-center mr-1"
                title={`Assignee: ${assigneeName || "Guest"}\nPayer: ${
                  paymentAllocs.length > 1
                    ? "Multiple (Split)"
                    : payerName || "Guest"
                }`}
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

            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {formatNumber(isCanceled ? item.canceledQty : item.qty)}
            </span>

            <span
              className={`font-semibold truncate ${
                isModifier ? "text-muted-foreground text-sm" : "text-foreground"
              } ${isCanceled ? "line-through opacity-50" : ""}`}
            >
              {item.name}
              {catalogEntry?.inlineQtyPricePerUnit &&
              catalogEntry?.basePrice !== undefined ? (
                <span className="font-semibold text-muted-foreground text-xs ml-2">
                  @{`$${formatNumber(catalogEntry.basePrice, 2)}`}
                </span>
              ) : null}
              {item.inlineQty && item.inlineQty !== 1 ? (
                <span className="font-bold text-primary/80 ml-1">
                  ({formatNumber(item.inlineQty)} {inlineQtyDisplayUnit})
                </span>
              ) : null}
            </span>

            {item.basePrice === 0 && (
              <Badge
                variant="secondary"
                className="text-[9px] h-3.5 px-1 shrink-0"
              >
                mod
              </Badge>
            )}
            {isCanceled && (
              <Badge
                variant="destructive"
                className="text-[9px] h-3.5 px-1 shrink-0"
              >
                Void
              </Badge>
            )}
            {isChanged && !isCanceled && (
              <Badge
                variant="secondary"
                className="text-[9px] h-3.5 px-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0"
              >
                *changed*
              </Badge>
            )}
            {item.qty > 0 && item.canceledQty > 0 && (
              <Badge
                variant="destructive"
                className="text-[9px] h-3.5 px-1 shrink-0"
              >
                -{formatNumber(item.canceledQty)} Void
              </Badge>
            )}
            {hasSplitPayment && (
              <Badge
                variant="outline"
                className="text-[9px] h-3.5 px-1 border-primary/40 text-primary shrink-0"
              >
                split
              </Badge>
            )}
          </div>

          {/* ── Right: price ── */}
          <div className="flex flex-col items-end shrink-0">
            {isCanceled && item.basePrice > 0 ? (
              <span className="font-mono font-bold tabular-nums text-muted-foreground line-through opacity-70 text-xs">
                ${formatNumber(item.basePrice * item.canceledQty, 2, 30)}
              </span>
            ) : item.totalPrice > 0 ? (
              <span className="font-mono font-bold text-foreground tabular-nums text-xs">
                ${formatNumber(item.totalPrice, 2, 30)}
              </span>
            ) : null}
          </div>
        </div>

        {showSku && (
          <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate pl-12">
            {item.sku}
          </div>
        )}
        {showAllocations && (isRoot || item.allocations.length > 0) && (
          <div className="pl-12">
            <AllocationBadges
              allocationIds={item.allocations}
              allocations={allocations}
              defaultPaymentAllocId={defaultPaymentAllocId}
              guests={guests}
            />
          </div>
        )}
      </div>

      {/* ── Children ── */}
      {!isCollapsed && validChildren.length > 0 && (
        <div className="ml-4 relative pl-4">
          <div className="flex flex-col">
            {validChildren.map((child, index) => {
              const isLast = index === validChildren.length - 1;
              return (
                <div
                  key={child.lineId}
                  className="relative"
                  style={{ marginBottom: !isLast ? "6px" : 0 }}
                >
                  {!isLast && (
                    <div
                      className="absolute -left-4 top-4 w-0.5"
                      style={{
                        backgroundColor: childConnectorColor,
                        height: "calc(100% + 6px)",
                      }}
                      aria-hidden
                    />
                  )}

                  {isLast ? (
                    <span
                      className="pointer-events-none absolute -left-4 top-0 h-6 w-4 border-b-2 border-l-2 rounded-bl-md"
                      style={{ borderColor: childConnectorColor }}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="pointer-events-none absolute -left-4 top-4 h-px w-4 border-t-2"
                      style={{ borderColor: childConnectorColor }}
                      aria-hidden
                    />
                  )}

                  <LineItemNode
                    item={child}
                    allocations={allocations}
                    defaultPaymentAllocId={defaultPaymentAllocId}
                    depth={depth + 1}
                    guests={guests}
                    isSelected={selectedLineIds?.has(child.lineId)}
                    selectedLineIds={selectedLineIds}
                    onSelectToggle={onSelectToggle}
                    isCollapsed={collapsedItems?.has(child.lineId)}
                    onToggleCollapse={onToggleCollapse}
                    collapsedItems={collapsedItems}
                    detailLevel={detailLevel}
                    hideCanceled={hideCanceled}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
