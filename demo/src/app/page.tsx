"use client";

import React, { useCallback } from "react";
import { useVCSStore } from "@/store/vcs-store";
import {
  getPaymentAllocDisplayName,
  getAssignmentAllocDisplayName,
  formatFulfillmentTime,
} from "@/lib/pos/utils";
import { buildCommitGraph } from "@/lib/vcs/graph";
import { OrderInitScreen } from "@/components/pos/order-init-screen";
import { AllocationConfigDialog } from "@/components/pos/allocation-config-dialog";
import { PaymentAllocationDialog } from "@/components/pos/payment-allocation-dialog";
import { FulfillmentAllocationDialog } from "@/components/pos/fulfillment-allocation-dialog";
import { ModifierAddDialog } from "@/components/pos/modifier-add-dialog";
import { NumberPadDialog } from "@/components/pos/number-pad-dialog";
import { ChoiceDialog } from "@/components/pos/choice-dialog";
import { BranchConfigDialog } from "@/components/pos/branch-config-dialog";
import { BranchManagerDialog } from "@/components/pos/branch-manager-dialog";
import { MergeBranchDialog } from "@/components/pos/merge-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { generateAllocationId } from "@/lib/vcs/id";
import type {
  ProjectedLineItem,
  AllocationBlock,
  PaymentAllocation,
  FulfillmentAllocation,
  CatalogItemEntry,
  Delta,
} from "@/lib/vcs/types";
import {
  ShoppingCart,
  Plus,
  Minus,
  Copy,
  Trash2,
  GitCommitHorizontal,
  Clock,
  User,
  CreditCard,
  Sparkles,
  AlertCircle,
  Layers,
  RotateCcw,
  ArrowLeftRight,
  XCircle,
  Phone,
  MapPin,
  UserPlus,
  Settings2,
  Split,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Lightbulb,
  Search,
  PanelRightClose,
  PanelRightOpen,
  Lock,
  Store,
  PackageCheck,
  Truck,
  ChevronsUpDown,
  Eraser,
  LayoutList,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator as SeparatorUI } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ─── Constants & Types ──────────────────────────────────────────────────────

export interface Guest {
  id: string; // Stable identifier (e.g. "__vcs_guest_1__", "__vcs_guest_2__")
  number: number; // Stable sequential number
  alias?: string; // Optional custom name/alias
}

const PAYMENT_METHODS = ["cash", "visa", "mastercard", "amex"];

const ORDER_TYPE_ICONS: Record<string, React.ElementType> = {
  "walk-in": Store,
  pickup: PackageCheck,
  delivery: Truck,
};

// Guest color palette — cycled by index. Deterministic: same name at same index = same color.
const GUEST_PALETTE = [
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-indigo-500",
];

/**
 * Resolve a guest name to a color.
 * `guests` is the ordered guest list; the index determines the color.
 * Falls back to zinc if the name isn't in the list (e.g. from time-travel).
 */
function getGuestColor(name: string, guests: Guest[]): string {
  const idx = guests.findIndex((g) => g.id === name);
  if (idx >= 0) return GUEST_PALETTE[idx % GUEST_PALETTE.length];
  // Fallback: hash the name to a stable index for historical commits
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GUEST_PALETTE[Math.abs(hash) % GUEST_PALETTE.length];
}

function getUniqueGuestLabel(name: string, allGuests: string[]): string {
  if (name.toLowerCase().startsWith("guest")) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name;

  const firstName = parts[0];
  const rest = parts.slice(1).join(" ");

  const sameFirst = allGuests.filter((g) => {
    if (g === name || g.toLowerCase().startsWith("guest")) return false;
    return g.trim().split(/\s+/)[0].toLowerCase() === firstName.toLowerCase();
  });

  if (sameFirst.length === 0) return firstName;

  for (let i = 1; i <= rest.length; i++) {
    const candidate = `${firstName} ${rest.substring(0, i)}`;
    const conflict = sameFirst.some((other) => {
      return other.toLowerCase().startsWith(candidate.toLowerCase());
    });
    if (!conflict) return candidate;
  }

  return name;
}

function getPatchedAllocations(
  allocations: Record<string, AllocationBlock>,
): Record<string, AllocationBlock> {
  const patched: Record<string, AllocationBlock> = {};
  for (const [id, alloc] of Object.entries(allocations)) {
    if (alloc.type === "payment") {
      const p = alloc as PaymentAllocation;
      const stratType = p.paymentStrategy.strategyType as string;
      if (stratType === "fixed_item" || stratType === "fixed_global") {
        patched[id] = {
          ...p,
          paymentStrategy: { ...p.paymentStrategy, strategyType: "fixed" },
        } as any;
        continue;
      }
    }
    patched[id] = alloc;
  }
  return patched;
}

// ─── Allocation Badge ──────────────────────────────────────────────────────

function AllocationBadges({
  allocationIds,
  allocations,
  defaultPaymentAllocId,
  guests,
}: {
  allocationIds: string[];
  allocations: Record<string, AllocationBlock>;
  defaultPaymentAllocId: string | null;
  guests: Guest[];
}) {
  const initiatedAt = useVCSStore((state) => state.orderContext?.initiatedAt);

  if (allocationIds.length === 0) return null;

  const seenPaymentGroups = new Set<string>();
  const patchedAllocs = getPatchedAllocations(allocations);

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {allocationIds.map((id) => {
        const alloc = allocations[id];
        if (!alloc) return null;

        if (alloc.type === "assignment") {
          const entity = getAssignmentAllocDisplayName(alloc);
          return (
            <Badge
              key={id}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-medium"
            >
              <User className="w-2.5 h-2.5 mr-0.5" />
              {entity}
            </Badge>
          );
        }
        if (alloc.type === "payment") {
          const payAlloc = alloc as PaymentAllocation;
          const paymentGroupId =
            payAlloc.correlationId || payAlloc.allocationId;
          if (seenPaymentGroups.has(paymentGroupId)) return null;
          seenPaymentGroups.add(paymentGroupId);
          const displayName = getPaymentAllocDisplayName(
            patchedAllocs[payAlloc.allocationId] as PaymentAllocation,
            patchedAllocs,
          );
          const isDefault = id === defaultPaymentAllocId;
          const siblings = payAlloc.correlationId
            ? Object.values(patchedAllocs).filter(
                (a) =>
                  a.type === "payment" &&
                  a.correlationId === payAlloc.correlationId &&
                  a.allocationId !== payAlloc.allocationId,
              )
            : [];
          const isSplit = siblings.length > 0;
          return (
            <Badge
              key={id}
              variant={isDefault ? "default" : "outline"}
              className={`text-[10px] px-1.5 py-0 h-4 font-medium ${isSplit ? "border-primary/50" : ""}`}
            >
              {isSplit && <Split className="w-2.5 h-2.5 mr-0.5" />}
              {!isSplit && <CreditCard className="w-2.5 h-2.5 mr-0.5" />}
              {displayName}
            </Badge>
          );
        }
        if (alloc.type === "fulfillment") {
          const fulAlloc = alloc as FulfillmentAllocation;
          const isImmediate =
            fulAlloc.time.type === "immediate" || !fulAlloc.time.calculatedAt;
          const displayLabel = isImmediate
            ? `${fulAlloc.method} (On Confirmation)`
            : `${fulAlloc.method} @ ${formatFulfillmentTime(fulAlloc.time.calculatedAt!, initiatedAt)}`;
          return (
            <Badge
              key={id}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 font-medium border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
            >
              <Clock className="w-2.5 h-2.5 mr-0.5" />
              {displayLabel}
            </Badge>
          );
        }
        return null;
      })}
    </div>
  );
}

// ─── Line Item Node (Recursive Tree) ──────────────────────────────────────

function LineItemNode({
  item,
  allocations,
  defaultPaymentAllocId,
  onRemove,
  onAddModifier,
  onAddNote,
  onAllocConfig,
  depth,
  modifiers,
  guests,
  isSelected = false,
  onSelectToggle,
  isCollapsed,
  onToggleCollapse,
  collapsedItems,
  detailLevel = "balanced",
  hideCanceled = false,
}: {
  item: ProjectedLineItem;
  allocations: Record<string, AllocationBlock>;
  defaultPaymentAllocId: string | null;
  onRemove: (lineId: string) => void;
  onAddModifier: (item: ProjectedLineItem) => void;
  onAddNote: (item: ProjectedLineItem) => void;
  onAllocConfig: (item: ProjectedLineItem) => void;
  depth: number;
  modifiers: CatalogItemEntry[];
  guests: Guest[];
  isSelected?: boolean;
  onSelectToggle?: (lineId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (lineId: string) => void;
  collapsedItems?: Set<string>;
  detailLevel?: "simple" | "balanced" | "full";
  hideCanceled: boolean;
}) {
  const isRoot = !item.parentLineId;
  const isModifier = item.basePrice === 0 || item.parentLineId;
  const assignee = getAssigneeFromItem(item, allocations, guests);
  const isCanceled = item.status === "canceled";
  const isPending = item.status === "pending";
  const isChanged = item.status === "changed";
  const isConfirmed = item.status === "confirmed";
  const hasSplitPayment =
    item.allocations.filter((id) => allocations[id]?.type === "payment")
      .length > 1;
  const hasNonDefaultPayment = item.allocations.some(
    (id) => allocations[id]?.type === "payment" && id !== defaultPaymentAllocId,
  );

  const catalogEntry = useVCSStore.getState().catalog[item.sku];
  const sizeGroup = catalogEntry?.appliedSizeGroup;
  const sizeOptions = sizeGroup?.options || [];

  const allowedModifierSkus = catalogEntry?.allowedModifiers || [];
  const filteredModifiers = modifiers.filter((mod) =>
    allowedModifierSkus.includes(mod.sku),
  );

  const activeSizeChild = item.children.find((child) => {
    const childEntry = useVCSStore.getState().catalog[child.sku];
    return childEntry && childEntry.sizeGroupId === sizeGroup?.id;
  });
  const activeSku = activeSizeChild?.sku;

  const showSku = detailLevel === "full";
  const showAllocations = detailLevel !== "simple";

  return (
    <>
      <div
        className={`group relative ${depth > 0 ? "ml-4 border-l-2 border-muted pl-3" : ""}`}
      >
        <div
          className={`rounded-lg border p-3 transition-all ${
            isRoot
              ? isSelected && !isCanceled
                ? "border-primary bg-primary/5 dark:bg-primary/10/20 cursor-pointer shadow-xs hover:bg-primary/10"
                : `border-border cursor-pointer ${
                    isCanceled
                      ? "bg-muted/20 hover:bg-muted/30"
                      : isConfirmed
                        ? "bg-muted/30 hover:bg-muted/50"
                        : "bg-card hover:bg-accent/50"
                  }`
              : "border-transparent bg-muted/40"
          }`}
          onClick={
            isRoot && !isCanceled
              ? (e) => {
                  e.stopPropagation();
                  onSelectToggle?.(item.lineId);
                }
              : undefined
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isRoot && !isCanceled && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelectToggle?.(item.lineId)}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-1 h-3.5 w-3.5 border-muted-foreground/30 data-[state=checked]:border-primary"
                  />
                )}
                {!isModifier && !isCanceled && (
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${getGuestColor(
                      assignee,
                      guests,
                    )}`}
                  />
                )}
                {item.children.some((child) => child.name !== "") ? (
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
                {isRoot && !isCanceled ? (
                  <div className="flex items-center gap-1 border rounded-md px-1 py-0.5 bg-muted/40 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.qty > 1) {
                          useVCSStore
                            .getState()
                            .modifyItemQty(item.lineId, item.qty, item.qty - 1);
                        } else {
                          useVCSStore.getState().removeItem(item.lineId);
                        }
                      }}
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </Button>
                    <span className="text-[10px] text-foreground font-mono font-semibold min-w-2.5 text-center select-none">
                      {item.qty}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        useVCSStore
                          .getState()
                          .modifyItemQty(item.lineId, item.qty, item.qty + 1);
                      }}
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                ) : isRoot && isCanceled ? (
                  <div className="flex items-center gap-1 border rounded-md px-1 py-0.5 bg-destructive/10 border-destructive/20 shrink-0">
                    <span className="text-[10px] text-destructive font-mono font-semibold min-w-2.5 px-2 text-center select-none">
                      {item.canceledQty}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    x{isCanceled ? item.canceledQty : item.qty}
                  </span>
                )}
                <span
                  className={`font-medium truncate ${isModifier ? "text-muted-foreground text-sm" : "text-foreground"} ${isCanceled ? "line-through opacity-50" : ""}`}
                >
                  {item.name}
                </span>
                {item.basePrice === 0 && (
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
                    mod
                  </Badge>
                )}
                {isCanceled && (
                  <Badge
                    variant="destructive"
                    className="text-[9px] h-3.5 px-1"
                  >
                    Void
                  </Badge>
                )}
                {isPending && !isCanceled && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] h-3.5 px-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  >
                    *new*
                  </Badge>
                )}
                {isChanged && !isCanceled && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] h-3.5 px-1 bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  >
                    *changed*
                  </Badge>
                )}
                {item.qty > 0 && item.canceledQty > 0 && (
                  <Badge
                    variant="destructive"
                    className="text-[9px] h-3.5 px-1"
                  >
                    -{item.canceledQty} Void
                  </Badge>
                )}
                {hasSplitPayment && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-3.5 px-1 border-primary/40 text-primary"
                  >
                    <Split className="w-2.5 h-2.5 mr-0.5" />
                    split
                  </Badge>
                )}
                {hasNonDefaultPayment && !hasSplitPayment && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-3.5 px-1 border-amber-300 text-amber-600"
                  >
                    <CreditCard className="w-2.5 h-2.5 mr-0.5" />
                    custom
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
              {isRoot &&
                sizeGroup &&
                !isCanceled &&
                sizeOptions.length > 0 &&
                activeSizeChild && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-[10px] text-muted-foreground mr-1">
                      Size:
                    </span>
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
                                  .modifyItemSku(
                                    activeSizeChild.lineId,
                                    activeSizeChild.sku,
                                    opt.sku,
                                  );
                              }
                            }}
                          >
                            {opt.name}
                            {opt.basePrice > 0 &&
                              ` (+$${opt.basePrice.toFixed(2)})`}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              {!isRoot &&
                catalogEntry &&
                !isCanceled &&
                catalogEntry.allowedStates &&
                catalogEntry.allowedStates.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <div className="flex items-center rounded border p-0.5 bg-muted/20">
                      {catalogEntry.allowedStates.map((stateOpt) => {
                        const isActive =
                          item.selectedModifierState === stateOpt.state;
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
                                  .modifyModifierState(
                                    item.lineId,
                                    item.selectedModifierState,
                                    stateOpt.state,
                                  );
                              }
                            }}
                          >
                            {stateOpt.state}
                            {priceDiff !== 0 && (
                              <span className="opacity-70 font-mono ml-0.5 text-[8px]">
                                ({priceDiff > 0 ? "+" : ""}$
                                {priceDiff.toFixed(2)})
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex flex-col items-end shrink-0 gap-1.5">
              {isCanceled && item.basePrice > 0 ? (
                <span className="font-mono font-semibold tabular-nums text-muted-foreground line-through opacity-70">
                  ${(item.basePrice * item.canceledQty).toFixed(2)}
                </span>
              ) : item.totalPrice > 0 ? (
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  ${item.totalPrice.toFixed(2)}
                </span>
              ) : null}
              {!isCanceled && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isRoot && filteredModifiers.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddModifier(item);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        Add modifiers
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {(isRoot || item.sku === "custom_note") && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddNote(item);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        {item.sku === "custom_note" ? "Edit note" : "Add note"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {isRoot && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            useVCSStore.getState().duplicateItem(item.lineId);
                            toast.success("Item duplicated");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        Duplicate item
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAllocConfig(item);
                        }}
                      >
                        <Settings2 className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      Allocation config
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.lineId);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {!isCollapsed &&
        item.children
          .filter((child) => child.name !== "")
          .map((child) => (
            <LineItemNode
              key={child.lineId}
              item={child}
              allocations={allocations}
              defaultPaymentAllocId={defaultPaymentAllocId}
              onRemove={onRemove}
              onAddModifier={onAddModifier}
              onAddNote={onAddNote}
              onAllocConfig={onAllocConfig}
              depth={depth + 1}
              modifiers={modifiers}
              guests={guests}
              isCollapsed={collapsedItems?.has(child.lineId)}
              onToggleCollapse={onToggleCollapse}
              collapsedItems={collapsedItems}
              detailLevel={detailLevel}
              hideCanceled={hideCanceled}
            />
          ))}
    </>
  );
}

function getAssigneeFromItem(
  item: ProjectedLineItem,
  allocations: Record<string, AllocationBlock>,
  guests?: Guest[],
): string {
  let assignee = "";
  for (const allocId of item.allocations) {
    const alloc = allocations[allocId];
    if (alloc?.type === "assignment") {
      assignee = (alloc as { entity: string }).entity;
      break;
    }
  }
  if (
    guests &&
    guests.length > 0 &&
    (!assignee || !guests.some((g) => g.id === assignee))
  ) {
    return guests[0].id;
  }
  return assignee;
}

// ─── Order Context Banner ───────────────────────────────────────────────────

function OrderContextBanner({
  context,
  onEditClick,
}: {
  context: {
    orderType: string;
    orderTypeLabel: string;
    customerFields: Record<string, string>;
    estimatedTimeLabel?: string | null;
  };
  onEditClick?: () => void;
}) {
  const TypeIcon = ORDER_TYPE_ICONS[context.orderType] ?? ShoppingCart;

  return (
    <div className="px-6 py-2 bg-primary/5 border-b flex items-center gap-4 text-xs shrink-0">
      <div className="flex items-center gap-1.5">
        <Select
          value={context.orderType}
          onValueChange={(val) => {
            const labels: Record<string, string> = {
              "walk-in": "Walk In",
              pickup: "Pickup",
              delivery: "Delivery",
            };
            useVCSStore.getState().updateOrderType(val, labels[val] || val);
            toast.success(`Order type changed to ${labels[val] || val}`);
          }}
        >
          <SelectTrigger className="h-6 px-1.5 border-primary/20 bg-background/50 hover:bg-background text-primary font-semibold text-[11px] gap-1.5 rounded-md focus:ring-0">
            <div className="flex items-center gap-1.5">
              {React.createElement(
                ORDER_TYPE_ICONS[context.orderType] ?? ShoppingCart,
                { className: "w-3 h-3 text-primary shrink-0" },
              )}
              <SelectValue placeholder="Select type..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="walk-in">Walk In</SelectItem>
            <SelectItem value="pickup">Pickup</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Clickable customer detail group ── */}
      <button
        type="button"
        onClick={onEditClick}
        className="flex items-center gap-3 rounded-md px-2 py-1 -my-0.5 transition-colors hover:bg-primary/10 cursor-pointer group"
      >
        <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
          <User className="w-3 h-3" />
          <span className="font-medium">
            {context.customerFields.name || "Guest"}
          </span>
        </div>
        {context.customerFields.phone && (
          <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
            <Phone className="w-3 h-3" />
            <span>{context.customerFields.phone}</span>
          </div>
        )}
        {context.customerFields.address && (
          <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-40">
              {context.customerFields.address}
            </span>
          </div>
        )}
        <UserPlus className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </button>

      {context.estimatedTimeLabel && (
        <div className="ml-auto flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{context.estimatedTimeLabel}</span>
        </div>
      )}
    </div>
  );
}

// ─── POS Terminal (rendered after init) ────────────────────────────────────

function POSTerminalInner() {
  const {
    engine,
    projectedState,
    viewingHash,
    catalog,
    catalogLoaded,
    activeBranch,
    commitLog,
    headHash,
    addItemWithDefaults,
    addModifier,
    removeItem,
    mimicOrder,
    createBranch,
    checkoutBranch,
    viewRevision,
    setMainActiveBranch,
    mainActiveBranch,
    updateBranchConfig,
    renameBranch,
    orderContext,
    resetOrder,
    defaultPaymentMethod,
    defaultPaymentAllocId,
    defaultAssignmentAllocId,
    changeDefaultPayment,
    splitItemPayment,
    reassignItem,
    updateFulfillmentAllocation,
    resetItemPaymentToDefault,
    switchItemPayment,
    activePaymentConfigId,
    activeFulfillmentConfigId,
    selectPaymentConfig,
    selectFulfillmentConfig,
    createTableSplitConfig,
    duplicateItems,
    duplicateAndReassignItems,
    removeItems,
    modifyItemsQty,
    setItemsQty,
    reassignItems,
    groupItemsPaymentConfig,
    groupItemsFulfillmentConfig,
    addGroupModifier,
    removeGroupModifier,
    previewMerge,
    commitMerge,
    addGuestPaymentAllocation,
    squashPendingCommits,
    resetToCommit,
  } = useVCSStore();

  // ─── Dynamic Guest List ─────────────────────────────────────────────
  const customerName = orderContext?.customerFields.name || "Guest";
  const initialGuests: Guest[] = React.useMemo(() => {
    const raw = orderContext?.customerFields.name || "Guest";
    const primaryAlias = raw.toLowerCase() === "guest" ? undefined : raw;
    const primary: Guest = {
      id: "__vcs_guest_1__",
      number: 1,
      alias: primaryAlias,
    };
    if (orderContext?.initialGuestNames?.length) {
      return orderContext.initialGuestNames.map((name) => {
        const match = name.match(/^Guest\s+(\d+)(?:\s+\((.+)\))?$/i);
        if (match) {
          return {
            id: `__vcs_guest_${match[1]}__`,
            number: parseInt(match[1], 10),
            alias: match[2] || undefined,
          };
        }
        const gMatch = name.match(/^__vcs_guest_(\d+)__$/i);
        if (gMatch) {
          return {
            id: name,
            number: parseInt(gMatch[1], 10),
            alias: undefined,
          };
        }
        return { id: "__vcs_guest_1__", number: 1, alias: undefined };
      });
    }
    return [primary];
  }, [orderContext]);

  const [guests, setGuests] = React.useState<Guest[]>(initialGuests);

  const resolveGuestName = useCallback(
    (idOrName: string): string => {
      const g = guests.find((g) => g.id === idOrName);
      if (g) return g.alias || `Guest ${g.number}`;

      const match = idOrName.match(/^__vcs_guest_(\d+)__$/i);
      if (match) return `Guest ${match[1]}`;

      const legacyMatch = idOrName.match(/^Guest\s+(\d+)(?:\s+\((.+)\))?$/i);
      if (legacyMatch) return legacyMatch[2] || `Guest ${legacyMatch[1]}`;

      return idOrName;
    },
    [guests],
  );

  const getGuestStableId = useCallback(
    (displayNameOrId: string): string => {
      const g = guests.find(
        (g) =>
          g.id === displayNameOrId ||
          (g.alias && g.alias === displayNameOrId) ||
          `Guest ${g.number}` === displayNameOrId,
      );
      return g ? g.id : displayNameOrId;
    },
    [guests],
  );

  const guestStrings = React.useMemo(() => {
    return guests.map((g) => g.alias || `Guest ${g.number}`);
  }, [guests]);

  const resolvedAllocations = React.useMemo(() => {
    const resolved: Record<string, AllocationBlock> = {};
    for (const [id, alloc] of Object.entries(projectedState.allocations)) {
      if (alloc.type === "assignment") {
        resolved[id] = {
          ...alloc,
          entity: resolveGuestName(alloc.entity),
        };
      } else if (alloc.type === "payment") {
        resolved[id] = {
          ...alloc,
          payer: resolveGuestName(alloc.payer),
        };
      } else {
        resolved[id] = alloc;
      }
    }
    return resolved;
  }, [projectedState.allocations, resolveGuestName]);

  // Bulk actions selection state
  const [selectedLineIds, setSelectedLineIds] = React.useState<Set<string>>(
    new Set(),
  );

  const handleSelectToggle = useCallback((lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }, []);

  // Refs for tracking click outside selection
  const checklistRef = React.useRef<HTMLDivElement | null>(null);
  const bulkActionsBarRef = React.useRef<HTMLDivElement | null>(null);

  // Dropdown key states
  const [selectedPerson, setSelectedPerson] = React.useState(
    initialGuests[0].id,
  );
  const [addGuestOpen, setAddGuestOpen] = React.useState(false);
  const [addGuestCount, setAddGuestCount] = React.useState(1);
  const [addGuestAlias, setAddGuestAlias] = React.useState("");
  const [editGuestOpen, setEditGuestOpen] = React.useState(false);
  const [guestToEdit, setGuestToEdit] = React.useState<Guest | null>(null);
  const [editGuestAlias, setEditGuestAlias] = React.useState("");
  const [guestPickerOpen, setGuestPickerOpen] = React.useState(false);
  const [guestSearchQuery, setGuestSearchQuery] = React.useState("");
  const [catalogFilter, setCatalogFilter] = React.useState("");
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [isLedgerCollapsed, setIsLedgerCollapsed] = React.useState(false);
  const [qtyPadOpen, setQtyPadOpen] = React.useState(false);
  const [dupMoveDialogOpen, setDupMoveDialogOpen] = React.useState(false);
  const [assignGuestDialogOpen, setAssignGuestDialogOpen] =
    React.useState(false);
  const [removeModDialogOpen, setRemoveModDialogOpen] = React.useState(false);

  const [collapsedItems, setCollapsedItems] = React.useState<Set<string>>(
    new Set(),
  );

  const handleToggleCollapse = React.useCallback((lineId: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }, []);

  const [detailLevel, setDetailLevel] = React.useState<
    "simple" | "balanced" | "full"
  >("balanced");
  const [hideCanceled, setHideCanceled] = React.useState(false);

  const hasCollapsedItems = collapsedItems.size > 0;
  const toggleAllCollapsed = React.useCallback(() => {
    if (hasCollapsedItems) {
      setCollapsedItems(new Set()); // Expand all
    } else {
      const allParentIds = new Set<string>();
      const findParents = (items: ProjectedLineItem[]) => {
        for (const item of items) {
          if (item.children.some((c) => c.name !== "")) {
            allParentIds.add(item.lineId);
            findParents(item.children);
          }
        }
      };
      findParents(Object.values(projectedState.items));
      setCollapsedItems(allParentIds);
    }
  }, [hasCollapsedItems, projectedState.items]);

  // ─── History Operation Confirm Dialog State ───────────────────────────────
  const [historyOpDialog, setHistoryOpDialog] = React.useState<{
    type: "squash" | "reset";
    targetHash: string;
    label: string;
    description: string;
  } | null>(null);

  const handleConfirmHistoryOp = React.useCallback(() => {
    if (!historyOpDialog) return;
    try {
      if (historyOpDialog.type === "squash") {
        squashPendingCommits(historyOpDialog.targetHash);
        toast.success("Commits squashed successfully");
      } else if (historyOpDialog.type === "reset") {
        resetToCommit(historyOpDialog.targetHash);
        toast.success("Branch reset to selected commit");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setHistoryOpDialog(null);
    }
  }, [historyOpDialog, squashPendingCommits, resetToCommit]);

  // ─── Customer Edit Dialog State ────────────────────────────────────────
  const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false);
  const [editedCustomerFields, setEditedCustomerFields] = React.useState<
    Record<string, string>
  >({});

  const handleOpenCustomerDialog = React.useCallback(() => {
    setEditedCustomerFields(
      orderContext?.customerFields ? { ...orderContext.customerFields } : {},
    );
    setCustomerDialogOpen(true);
  }, [orderContext]);

  const handleSaveCustomerFields = React.useCallback(() => {
    useVCSStore.getState().updateOrderContext({
      customerFields: editedCustomerFields,
    });
    // Sync guest display name if the primary customer name changed
    const newNameRaw = editedCustomerFields.name?.trim();
    if (newNameRaw) {
      const primaryAlias =
        newNameRaw.toLowerCase() === "guest" ? undefined : newNameRaw;
      setGuests((prev) => {
        const next = [...prev];
        if (next[0]) {
          next[0] = { ...next[0], alias: primaryAlias };
        }
        return next;
      });
    }
    setCustomerDialogOpen(false);
    toast.success("Customer info updated");
  }, [editedCustomerFields]);

  // Active check view filter state
  const [visibleGuests, setVisibleGuests] = React.useState<Set<string>>(
    new Set(initialGuests.map((g) => g.id)),
  );

  // Synchronize visibleGuests with guests on add/remove/reset
  React.useEffect(() => {
    setVisibleGuests((prev) => {
      const next = new Set<string>();
      for (const g of guests) {
        if (prev.has(g.id)) {
          next.add(g.id);
        } else {
          // If the guest is brand new (not in prev), make it visible by default
          next.add(g.id);
        }
      }
      return next;
    });
  }, [guests]);

  const [newBranchFromHistoryName, setNewBranchFromHistoryName] =
    React.useState("");

  // Branch manager / configuration dialog state
  const [isBranchManagerOpen, setIsBranchManagerOpen] = React.useState(false);
  const [isBranchConfigOpen, setIsBranchConfigOpen] = React.useState(false);
  const [branchToConfig, setBranchToConfig] = React.useState<string | null>(
    null,
  );

  // Merge dialog state
  const [isMergeOpen, setIsMergeOpen] = React.useState(false);

  const handleSaveBranchConfig = useCallback(
    (newName: string, type: "parallel" | "hypothetical", label: string) => {
      if (!branchToConfig) return;
      try {
        if (newName !== branchToConfig) {
          renameBranch(branchToConfig, newName);
          toast.success(`Branch "${branchToConfig}" renamed to "${newName}"`);
        }
        updateBranchConfig(newName, { type, label });
        toast.success(`Branch configuration saved`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [branchToConfig, renameBranch, updateBranchConfig],
  );

  const handleBranchFromHistory = React.useCallback(() => {
    if (!newBranchFromHistoryName.trim() || !viewingHash) return;
    try {
      createBranch(newBranchFromHistoryName.trim(), viewingHash);
      toast.success(
        `Branch "${newBranchFromHistoryName.trim()}" created at commit ${viewingHash.substring(0, 7)}`,
      );
      setNewBranchFromHistoryName("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [createBranch, newBranchFromHistoryName, viewingHash]);

  const [expandedCommits, setExpandedCommits] = React.useState<Set<string>>(
    new Set(),
  );

  const toggleCommitExpanded = React.useCallback((hash: string) => {
    setExpandedCommits((prev) => {
      const next = new Set(prev);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }
      return next;
    });
  }, []);

  // ─── Dialog State ────────────────────────────────────────────────────
  const [allocConfigItem, setAllocConfigItem] =
    React.useState<ProjectedLineItem | null>(null);

  // Unified Payment Allocation State
  const [paymentAllocationOpen, setPaymentAllocationOpen] =
    React.useState(false);
  const [paymentAllocationContext, setPaymentAllocationContext] =
    React.useState<"item" | "group" | "header">("item");
  const [paymentAllocationItems, setPaymentAllocationItems] = React.useState<
    ProjectedLineItem[]
  >([]);

  // Unified Fulfillment Allocation State
  const [fulfillmentAllocationOpen, setFulfillmentAllocationOpen] =
    React.useState(false);
  const [fulfillmentAllocationContext, setFulfillmentAllocationContext] =
    React.useState<"item" | "group" | "global">("item");
  const [fulfillmentAllocationItems, setFulfillmentAllocationItems] =
    React.useState<ProjectedLineItem[]>([]);

  // Modifier Add Dialog State
  const [modifierAddOpen, setModifierAddOpen] = React.useState(false);
  const [modifierAddItem, setModifierAddItem] =
    React.useState<ProjectedLineItem | null>(null);

  const handleOpenModifierDialog = React.useCallback(
    (item: ProjectedLineItem) => {
      setModifierAddItem(item);
      setModifierAddOpen(true);
    },
    [],
  );

  // Note Add Dialog State
  const [noteDialogOpen, setNoteDialogOpen] = React.useState(false);
  const [noteItem, setNoteItem] = React.useState<ProjectedLineItem | null>(
    null,
  );
  const [noteText, setNoteText] = React.useState("");

  const handleOpenNoteDialog = React.useCallback((item: ProjectedLineItem) => {
    setNoteItem(item);
    if (item.sku === "custom_note") {
      setNoteText(item.selectedModifierState || "");
    } else {
      setNoteText("");
    }
    setNoteDialogOpen(true);
  }, []);

  const handleAddNote = React.useCallback(() => {
    if (!noteItem || !noteText.trim()) return;
    if (noteItem.sku === "custom_note") {
      useVCSStore
        .getState()
        .modifyModifierState(
          noteItem.lineId,
          noteItem.selectedModifierState,
          noteText.trim(),
        );
      toast.success("Note updated");
    } else {
      useVCSStore
        .getState()
        .addModifier(noteItem.lineId, "custom_note", noteText.trim());
      toast.success("Note added");
    }
    setNoteDialogOpen(false);
  }, [noteItem, noteText]);

  // ─── Guest Management ──────────────────────────────────────────────────

  const addGuests = useCallback(
    (newGuests: Guest[]) => {
      const valid = newGuests.filter((ng) => {
        return !guests.some(
          (g) =>
            g.id === ng.id ||
            (ng.alias &&
              g.alias &&
              g.alias.toLowerCase() === ng.alias.toLowerCase()),
        );
      });

      if (valid.length === 0) return;

      setGuests((prev) => [...prev, ...valid]);
      for (const g of valid) {
        addGuestPaymentAllocation(g.id);
      }

      if (valid.length === 1) {
        const displayName = valid[0].alias || `Guest ${valid[0].number}`;
        toast.success(`${displayName} added to the order`);
      } else {
        toast.success(`${valid.length} guests added to the order`);
      }
    },
    [guests, addGuestPaymentAllocation],
  );

  const removeGuest = useCallback(
    (id: string) => {
      const guest = guests.find((g) => g.id === id);
      if (!guest) return;
      if (id === guests[0].id) {
        toast.error("Cannot remove the primary customer");
        return;
      }
      setGuests((prev) => prev.filter((g) => g.id !== id));
      if (selectedPerson === id) setSelectedPerson(guests[0].id);
      toast.success(`${guest.alias || `Guest ${guest.number}`} removed`);
    },
    [guests, selectedPerson],
  );

  const handleSaveRenameGuest = useCallback(() => {
    if (!guestToEdit) return;
    const trimmed = editGuestAlias.trim();
    setGuests((prev) =>
      prev.map((g) =>
        g.id === guestToEdit.id ? { ...g, alias: trimmed || undefined } : g,
      ),
    );
    toast.success(
      `Guest renamed to ${trimmed || `Guest ${guestToEdit.number}`}`,
    );
    setEditGuestOpen(false);
    setGuestToEdit(null);
    setEditGuestAlias("");
  }, [guestToEdit, editGuestAlias]);

  // ─── Derived State ──────────────────────────────────────────────────────

  const catalogItems = Object.values(catalog).filter(
    (i) => i.active && i.type === "item",
  );
  const modifierItems = Object.values(catalog).filter(
    (i) => i.active && i.type === "modifier",
  );

  const groupedCatalog = catalogItems.reduce<
    Record<string, typeof catalogItems>
  >((acc, item) => {
    const cat = item.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const rootItems = Object.values(projectedState.items).filter(
    (i) => !i.parentLineId,
  );

  const filteredRootItems = React.useMemo(() => {
    return rootItems.filter((item) => {
      if (hideCanceled && item.status === "canceled") return false;
      const assignee = getAssigneeFromItem(
        item,
        projectedState.allocations,
        guests,
      );
      return visibleGuests.has(assignee);
    });
  }, [
    rootItems,
    visibleGuests,
    projectedState.allocations,
    guests,
    hideCanceled,
  ]);

  const canceledCount = React.useMemo(() => {
    let count = 0;
    const countCanceled = (item: ProjectedLineItem) => {
      if (item.status === "canceled") {
        count++;
      } else {
        item.children.forEach(countCanceled);
      }
    };
    for (const item of rootItems) {
      const assignee = getAssigneeFromItem(
        item,
        projectedState.allocations,
        guests,
      );
      if (visibleGuests.has(assignee)) {
        countCanceled(item);
      }
    }
    return count;
  }, [rootItems, projectedState.allocations, guests, visibleGuests]);

  // Sync selection with current filteredRootItems (prune deleted ones)
  React.useEffect(() => {
    setSelectedLineIds((prev) => {
      const next = new Set<string>();
      for (const item of filteredRootItems) {
        if (prev.has(item.lineId)) {
          next.add(item.lineId);
        }
      }
      if (next.size !== prev.size) {
        return next;
      }
      return prev;
    });
  }, [filteredRootItems]);

  // Clear selection when filter changes
  React.useEffect(() => {
    setSelectedLineIds(new Set());
  }, [visibleGuests]);

  // Clear selection when branch or revision changes
  const currentBranchName = activeBranch();
  React.useEffect(() => {
    setSelectedLineIds(new Set());
  }, [currentBranchName, viewingHash]);

  // Click away listener
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedLineIds.size === 0) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Do not clear if click is inside the checklist scroll area or bulk actions bar
      if (
        checklistRef.current?.contains(target) ||
        bulkActionsBarRef.current?.contains(target)
      ) {
        return;
      }

      // Do not clear if click is inside portal elements (e.g. Radix Select contents, dialogs, popovers)
      if (
        target.closest("[data-radix-portal]") ||
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]') ||
        target.closest(".bg-popover") ||
        target.closest(".radix-select-content")
      ) {
        return;
      }

      // Clicked away!
      setSelectedLineIds(new Set());
    };

    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [selectedLineIds]);

  const selectedItems = React.useMemo(() => {
    return rootItems.filter((item) => selectedLineIds.has(item.lineId));
  }, [rootItems, selectedLineIds]);

  const compatibleModifiers = React.useMemo(() => {
    if (selectedItems.length === 0) return [];
    const firstEntry = catalog[selectedItems[0].sku];
    let commonSkus = firstEntry?.allowedModifiers || [];
    for (let i = 1; i < selectedItems.length; i++) {
      const entry = catalog[selectedItems[i].sku];
      const allowed = entry?.allowedModifiers || [];
      commonSkus = commonSkus.filter((sku) => allowed.includes(sku));
    }
    return modifierItems.filter((mod) => commonSkus.includes(mod.sku));
  }, [selectedItems, catalog, modifierItems]);

  const singleItemCompatibleModifiers = React.useMemo(() => {
    if (!modifierAddItem) return [];
    const entry = catalog[modifierAddItem.sku];
    const allowed = entry?.allowedModifiers || [];
    return modifierItems.filter((mod) => allowed.includes(mod.sku));
  }, [modifierAddItem, catalog, modifierItems]);

  const activeModifiersOnSelected = React.useMemo(() => {
    if (selectedItems.length === 0) return [];
    const activeModifierSkus = new Set<string>();
    for (const item of selectedItems) {
      for (const child of item.children) {
        const childEntry = catalog[child.sku];
        if (childEntry && childEntry.type === "modifier") {
          activeModifierSkus.add(child.sku);
        }
      }
    }
    return modifierItems.filter((mod) => activeModifierSkus.has(mod.sku));
  }, [selectedItems, catalog, modifierItems]);

  // Count items on the active payment configuration group
  const itemsOnActiveConfig = React.useMemo(() => {
    if (!activePaymentConfigId) return 0;

    const activeAllocations = Object.values(projectedState.allocations).filter(
      (a): a is PaymentAllocation =>
        a.type === "payment" &&
        (a.allocationId === activePaymentConfigId ||
          (a.correlationId !== null &&
            a.correlationId === activePaymentConfigId)),
    );
    const activePayIds = activeAllocations.map((a) => a.allocationId);

    return Object.values(projectedState.items).filter((item) =>
      item.allocations.some((id) => activePayIds.includes(id)),
    ).length;
  }, [projectedState.items, projectedState.allocations, activePaymentConfigId]);

  // Dynamically derive the list of all available payment configs
  const paymentConfigs = React.useMemo(() => {
    const configs: Array<{ id: string; name: string; isSplit: boolean }> = [];
    const allocations = projectedState.allocations;

    const referencedIds = new Set<string>();
    for (const item of Object.values(projectedState.items)) {
      for (const id of item.allocations) referencedIds.add(id);
    }

    const singlePayers = new Map<string, PaymentAllocation>();
    const splitGroups = new Map<string, PaymentAllocation[]>();

    for (const alloc of Object.values(allocations)) {
      if (alloc.type === "payment") {
        const pay = alloc as PaymentAllocation;

        const isReferenced = referencedIds.has(alloc.allocationId);
        const isActive =
          activePaymentConfigId === alloc.allocationId ||
          activePaymentConfigId === alloc.correlationId;
        const isDefault = pay.correlationId?.startsWith("group-default-");

        if (!isReferenced && !isActive && !isDefault) {
          continue;
        }

        if (pay.correlationId) {
          // Exclude the standard defaults
          if (pay.correlationId.startsWith("group-default-")) {
            continue;
          }
          const group = splitGroups.get(pay.correlationId) || [];
          group.push(pay);
          splitGroups.set(pay.correlationId, group);
        } else {
          if (pay.allocationId !== defaultPaymentAllocId) {
            singlePayers.set(pay.allocationId, pay);
          }
        }
      }
    }

    const patchedAllocs = getPatchedAllocations(allocations);
    singlePayers.forEach((pay, id) => {
      const displayName = `Single: ${getPaymentAllocDisplayName(patchedAllocs[id] as PaymentAllocation, patchedAllocs)}`;
      configs.push({
        id,
        name: displayName,
        isSplit: false,
      });
    });

    splitGroups.forEach((group, correlationId) => {
      const isTrueSplit = group.length > 1;
      const prefix = isTrueSplit ? "Split" : "Single";
      const displayName = `${prefix}: ${getPaymentAllocDisplayName(patchedAllocs[group[0].allocationId] as PaymentAllocation, patchedAllocs)}`;
      configs.push({
        id: correlationId,
        name: displayName,
        isSplit: isTrueSplit,
      });
    });

    return configs;
  }, [
    projectedState.allocations,
    projectedState.items,
    defaultPaymentAllocId,
    activePaymentConfigId,
  ]);

  const currentConfigName = React.useMemo(() => {
    if (
      activePaymentConfigId &&
      activePaymentConfigId.startsWith("group-default-")
    ) {
      const method = activePaymentConfigId.replace("group-default-", "");
      return `${customerName} (${method.toUpperCase()})`;
    }
    const allocations = projectedState.allocations;
    const activeAlloc = Object.values(allocations).find(
      (a) =>
        a.type === "payment" &&
        (a.allocationId === activePaymentConfigId ||
          a.correlationId === activePaymentConfigId),
    );
    if (activeAlloc) {
      const patchedAllocs = getPatchedAllocations(allocations);
      const siblings = activeAlloc.correlationId
        ? Object.values(patchedAllocs).filter(
            (a) =>
              a.type === "payment" &&
              a.correlationId === activeAlloc.correlationId &&
              a.allocationId !== activeAlloc.allocationId,
          )
        : [];
      const typeLabel = siblings.length > 0 ? "Split" : "Single";
      return `${typeLabel}: ${getPaymentAllocDisplayName(patchedAllocs[activeAlloc.allocationId] as PaymentAllocation, patchedAllocs)}`;
    }
    return "Default Config";
  }, [
    activePaymentConfigId,
    defaultPaymentAllocId,
    defaultPaymentMethod,
    projectedState.allocations,
    customerName,
  ]);
  const currentFulfillmentConfigName = React.useMemo(() => {
    const activeId = activeFulfillmentConfigId;
    if (!activeId) return "On Confirmation";
    const alloc = projectedState.allocations[activeId];
    if (alloc?.type === "fulfillment") {
      const f = alloc as FulfillmentAllocation;
      if (f.time.type === "immediate" || !f.time.calculatedAt) {
        return `${f.method} (On Confirmation)`;
      }
      return `${f.method} @ ${formatFulfillmentTime(f.time.calculatedAt, orderContext?.initiatedAt)}`;
    }
    return "On Confirmation";
  }, [
    activeFulfillmentConfigId,
    projectedState.allocations,
    orderContext?.initiatedAt,
  ]);
  const log = commitLog();
  const confirmedHash = engine.getConfirmedHash();
  const branches = useVCSStore.getState().engine.getRepo().branches;

  const mainBranchName = mainActiveBranch();
  const isMergedToMain = React.useMemo(() => {
    if (currentBranchName === mainBranchName) return false;
    const currentHead = branches[currentBranchName]?.headHash;
    const mainHead = branches[mainBranchName]?.headHash;
    if (!currentHead || !mainHead) return false;
    if (currentHead === mainHead) return false;
    return useVCSStore.getState().engine.isAncestorOf(currentHead, mainHead);
  }, [currentBranchName, mainBranchName, branches]);

  const graphData = React.useMemo(() => {
    return buildCommitGraph(
      log,
      activeBranch(),
      mainActiveBranch(),
      expandedCommits,
      branches,
    );
  }, [log, activeBranch, mainActiveBranch, expandedCommits, branches]);
  const isViewingHistory = viewingHash !== null && viewingHash !== headHash();

  // ─── Handlers (all hooks before any conditional returns) ─────────────────

  const handleAddItem = useCallback(
    (sku: string) => {
      addItemWithDefaults(sku, 1, selectedPerson);
      toast.success(`Added to ${resolveGuestName(selectedPerson)}'s order`);
    },
    [addItemWithDefaults, selectedPerson, resolveGuestName],
  );

  const handleReassign = useCallback(
    (lineId: string, newAssignee: string) => {
      const stableId = getGuestStableId(newAssignee);
      reassignItem(lineId, stableId);
      toast.success(`Reassigned to ${newAssignee}`);
    },
    [reassignItem, getGuestStableId],
  );

  const handleUpdateFulfillment = useCallback(
    (
      lineId: string,
      timeType: "immediate" | "scheduled" | "deferred",
      calculatedAt: string | null,
    ) => {
      updateFulfillmentAllocation(lineId, timeType, calculatedAt);
      toast.success(
        timeType === "immediate"
          ? "Fulfillment scheduled: on confirmation"
          : `Fulfillment scheduled for ${formatFulfillmentTime(calculatedAt!, orderContext?.initiatedAt)}`,
      );
    },
    [updateFulfillmentAllocation, orderContext?.initiatedAt],
  );

  const handleSplitPayment = useCallback(
    (
      lineId: string,
      splits: Array<{
        entity: string;
        strategyType:
          | "percentage"
          | "fixed_item"
          | "fixed_global"
          | "remaining";
        value: number;
        method?: string | null;
      }>,
      mode: "group" | "item" = "group",
    ) => {
      const mappedSplits = splits.map((s) => ({
        ...s,
        entity: getGuestStableId(s.entity),
      }));
      splitItemPayment(lineId, mappedSplits, mode);
      const splitName = [...splits]
        .sort((a, b) => b.value - a.value)
        .map((s) => {
          const valLabel =
            s.strategyType === "percentage"
              ? `${Math.round(s.value * 100)}%`
              : `$${s.value}`;
          return `${s.entity} ${s.strategyType === "remaining" ? "rem" : valLabel}`;
        })
        .join(" / ");
      toast.success(`Payment split: ${splitName}`);
    },
    [splitItemPayment, getGuestStableId],
  );

  const handleResetToDefault = useCallback(
    (lineId: string) => {
      resetItemPaymentToDefault(lineId);
      toast.success(`Payment reset to ${defaultPaymentMethod}`);
    },
    [resetItemPaymentToDefault, defaultPaymentMethod],
  );

  const handleSwitchItemPayment = useCallback(
    (lineId: string, newMethod: string, mode: "group" | "item" = "item") => {
      // Find the current assignee of this item to use as payer
      const state = useVCSStore.getState().projectedState;
      const item = state.items[lineId];
      let payer = selectedPerson;
      if (item) {
        for (const allocId of item.allocations) {
          const alloc = state.allocations[allocId];
          if (alloc?.type === "assignment") {
            payer = (alloc as { entity: string }).entity;
            break;
          }
        }
      }
      switchItemPayment(lineId, newMethod, payer, mode);
      toast.success(
        `Payment switched to ${newMethod} for ${mode === "group" ? "group" : "this item"}`,
      );
    },
    [switchItemPayment, selectedPerson],
  );

  // Expose addGuest for the allocation config dialog
  const handleAddGuestFromDialog = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const currentMax =
        guests.length > 0 ? Math.max(...guests.map((g) => g.number)) : 0;
      const nextNum = currentMax + 1;
      const newGuestId = `__vcs_guest_${nextNum}__`;

      const isGuestFormat = /^guest\s*\d*$/i.test(trimmed);
      const alias = isGuestFormat ? undefined : trimmed;

      if (
        guests.some(
          (g) => g.alias?.toLowerCase() === alias?.toLowerCase() && alias,
        )
      ) {
        // Already exists — just silently accept
        return;
      }

      const newGuest: Guest = {
        id: newGuestId,
        number: nextNum,
        alias,
      };

      addGuests([newGuest]);
    },
    [guests, addGuests],
  );

  const handleOpenAddGuestDialog = useCallback(() => {
    setAddGuestCount(1);
    setAddGuestAlias("");
    setAddGuestOpen(true);
  }, []);

  const handleSubmitAddGuest = useCallback(() => {
    const currentMax =
      guests.length > 0 ? Math.max(...guests.map((g) => g.number)) : 0;

    const newGuests: Guest[] = [];
    if (addGuestCount === 1) {
      const alias = addGuestAlias.trim() || undefined;
      const nextNum = currentMax + 1;
      newGuests.push({
        id: `__vcs_guest_${nextNum}__`,
        number: nextNum,
        alias,
      });
    } else {
      for (let i = 0; i < addGuestCount; i++) {
        const nextNum = currentMax + 1 + i;
        newGuests.push({
          id: `__vcs_guest_${nextNum}__`,
          number: nextNum,
          alias: undefined,
        });
      }
    }

    addGuests(newGuests);

    setAddGuestOpen(false);
    setAddGuestCount(1);
    setAddGuestAlias("");
  }, [addGuests, addGuestCount, addGuestAlias, guests]);

  const handleSetBulkQty = useCallback(
    (qty: number) => {
      if (selectedLineIds.size === 0) return;
      setItemsQty(Array.from(selectedLineIds), qty);
      toast.success(`Set quantity to ${qty}`);
    },
    [selectedLineIds, setItemsQty],
  );

  const guestChoiceOptions = React.useMemo(
    () =>
      guests.map((guest) => ({
        id: guest.id,
        label: guest.alias || `Guest ${guest.number}`,
        description: guest.id === guests[0]?.id ? "Primary guest" : "Guest",
      })),
    [guests],
  );

  const removeModChoiceOptions = React.useMemo(
    () =>
      activeModifiersOnSelected.map((mod) => ({
        id: mod.sku,
        label: mod.name,
        description: mod.sku,
      })),
    [activeModifiersOnSelected],
  );

  const filteredGuests = React.useMemo(() => {
    const query = guestSearchQuery.trim().toLowerCase();
    if (!query) return guests;
    return guests.filter((guest) => {
      const label = guest.alias || `Guest ${guest.number}`;
      return label.toLowerCase().includes(query);
    });
  }, [guests, guestSearchQuery]);

  const selectedGuestCount = guests.length;
  const selectedGuestLabel = getUniqueGuestLabel(
    resolveGuestName(selectedPerson),
    guestStrings,
  );

  const handleAllocConfig = useCallback((item: ProjectedLineItem) => {
    setAllocConfigItem((prev) => (prev === item ? null : item));
  }, []);

  const handleCreateBranch = useCallback(
    (name: string, startFromEmpty: boolean) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      try {
        let fromHash = viewingHash;
        if (startFromEmpty) {
          const fullLog = useVCSStore.getState().commitLog();
          const rootCommit =
            fullLog.find((c) => c.authorId === "system-init") ||
            fullLog[fullLog.length - 1];
          fromHash = rootCommit?.commitHash || null;
        }
        createBranch(trimmed, fromHash);
        const fromLabel = startFromEmpty
          ? " from empty root"
          : fromHash
            ? ` at commit ${fromHash.substring(0, 7)}`
            : "";
        toast.success(`Branch "${trimmed}" created${fromLabel}`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [createBranch, viewingHash],
  );

  const handleResetOrder = useCallback(() => {
    resetOrder();
    setShowResetConfirm(false);
    setAddGuestCount(1);
    setAddGuestAlias("");
    setAddGuestOpen(false);
    setCatalogFilter("");
    toast.success("Order reset — ready for a new order");
  }, [resetOrder]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <header className="border-b bg-card px-4 py-2.5 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <GitCommitHorizontal className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                Retail VCS Terminal
              </h1>
              <p className="text-[10px] text-muted-foreground">
                Version-Controlled POS — Order as Repository
              </p>
            </div>
          </div>

          {/* Active branch — compact; full list in dialog */}
          <div className="flex items-center gap-2">
            {(() => {
              const active = activeBranch();
              const main = mainActiveBranch();
              const pointer = branches[active];
              const isHypothetical = pointer?.type === "hypothetical";
              const displayName = pointer?.label || active;
              const branchCount = Object.keys(branches).length;
              const isMain = active === main;
              const isMerged =
                !isMain &&
                pointer?.headHash &&
                branches[main]?.headHash &&
                pointer.headHash !== branches[main].headHash &&
                useVCSStore
                  .getState()
                  .engine.isAncestorOf(
                    pointer.headHash,
                    branches[main].headHash,
                  );

              return (
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-7 gap-1.5 pr-2 ${
                    isMain
                      ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                      : isMerged
                        ? "border-muted-foreground/30 bg-muted/50 hover:bg-muted/70 text-muted-foreground"
                        : isHypothetical
                          ? "border-amber-400/50 bg-amber-500/5 hover:bg-amber-500/10"
                          : "border-emerald-400/50 bg-emerald-500/5 hover:bg-emerald-500/10"
                  }`}
                  onClick={() => setIsBranchManagerOpen(true)}
                >
                  {isMain ? (
                    <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
                  ) : isMerged ? (
                    <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  ) : isHypothetical ? (
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <GitBranch className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold max-w-30 truncate">
                    {displayName}
                  </span>
                  {main !== active && (
                    <span className="text-[10px] text-muted-foreground font-normal">
                      · main: {branches[main]?.label || main}
                    </span>
                  )}
                  {branchCount > 1 && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] h-4 px-1.5 ml-0.5"
                    >
                      {branchCount}
                    </Badge>
                  )}
                  <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                </Button>
              );
            })()}
          </div>

          {/* Guest Selector + Payment + New Order */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Guest:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2.5 max-w-52.5"
              onClick={() => {
                setGuestSearchQuery("");
                setGuestPickerOpen(true);
              }}
              title="Select guest"
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-xs">{selectedGuestLabel}</span>
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                {selectedGuestCount}
              </Badge>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 px-2.5 max-w-52.5"
              onClick={() => {
                setPaymentAllocationItems([]);
                setPaymentAllocationContext("header");
                setPaymentAllocationOpen(true);
              }}
              title="Configure order default payment"
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{currentConfigName}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 px-2.5 max-w-52.5"
              onClick={() => {
                setFulfillmentAllocationItems([]);
                setFulfillmentAllocationContext("global");
                setFulfillmentAllocationOpen(true);
              }}
              title="Configure order default fulfillment"
            >
              <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">{currentFulfillmentConfigName}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            </Button>
            <SeparatorUI orientation="vertical" className="h-6" />
            {showResetConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-destructive">
                  End this order?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={handleResetOrder}
                >
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 text-muted-foreground"
                onClick={() => setShowResetConfirm(true)}
              >
                <XCircle className="w-3 h-3 mr-1" />
                New Order
              </Button>
            )}
          </div>
        </header>

        {/* ─── Order Context Banner ────────────────────────────────────── */}
        {orderContext && (
          <OrderContextBanner
            context={orderContext}
            onEditClick={handleOpenCustomerDialog}
          />
        )}

        {/* ─── Customer Info Edit Dialog ──────────────────────────────── */}
        <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Edit Customer Info
              </DialogTitle>
              <DialogDescription>
                Update the customer details for this order. Changes apply
                immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Name
                </label>
                <Input
                  id="customer-name"
                  placeholder="e.g. John Smith"
                  value={editedCustomerFields.name ?? ""}
                  onChange={(e) =>
                    setEditedCustomerFields((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="h-9 text-sm"
                  autoComplete="name"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3 h-3" />
                  Phone
                </label>
                <Input
                  id="customer-phone"
                  type="tel"
                  placeholder="e.g. (555) 123-4567"
                  value={editedCustomerFields.phone ?? ""}
                  onChange={(e) =>
                    setEditedCustomerFields((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="h-9 text-sm"
                  autoComplete="tel"
                />
              </div>

              {/* Address — shown for delivery */}
              {orderContext?.orderType === "delivery" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    Delivery Address
                  </label>
                  <Input
                    id="customer-address"
                    placeholder="e.g. 123 Main St, City, State"
                    value={editedCustomerFields.address ?? ""}
                    onChange={(e) =>
                      setEditedCustomerFields((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="h-9 text-sm"
                    autoComplete="street-address"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Settings2 className="w-3 h-3" />
                  Order Notes
                </label>
                <Textarea
                  id="customer-notes"
                  placeholder="Allergies, special requests, etc."
                  value={editedCustomerFields.notes ?? ""}
                  onChange={(e) =>
                    setEditedCustomerFields((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomerDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveCustomerFields}>
                <User className="w-3.5 h-3.5 mr-1.5" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Main Content: 3-Panel Layout ─────────────────────────────── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* ─── LEFT PANEL: Catalog ─────────────────────────────────── */}
          <aside className="w-64 border-r bg-card flex flex-col shrink-0">
            <div className="p-3 border-b">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Catalog
              </h2>
              <Input
                placeholder="Search items..."
                value={catalogFilter}
                onChange={(e) => setCatalogFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {Object.entries(groupedCatalog).map(([category, items]) => (
                  <div key={category}>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5 mt-1">
                      {category}
                    </div>
                    {items
                      .filter(
                        (i) =>
                          !catalogFilter ||
                          i.name
                            .toLowerCase()
                            .includes(catalogFilter.toLowerCase()) ||
                          i.sku
                            .toLowerCase()
                            .includes(catalogFilter.toLowerCase()),
                      )
                      .map((item) => (
                        <Tooltip key={item.sku}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleAddItem(item.sku)}
                              className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-accent transition-colors group flex justify-between items-center"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                  {item.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {item.sku}
                                </div>
                              </div>
                              <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
                                ${item.basePrice.toFixed(2)}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            <div>{item.name}</div>
                            <div className="text-muted-foreground">
                              {item.sku}
                            </div>
                            {item.dietaryFlags.length > 0 && (
                              <div className="text-emerald-500">
                                {item.dietaryFlags.join(", ")}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* ─── CENTER PANEL: Active Check Projection ────────────────── */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* Financial Summary Bar */}
            <div className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold">Active Check</h2>
                <Badge variant="secondary" className="text-[10px]">
                  <Layers className="w-2.5 h-2.5 mr-1" />
                  {activeBranch()}
                </Badge>
                {isViewingHistory && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-amber-600 border-amber-300 bg-amber-50"
                  >
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    Viewing history
                  </Badge>
                )}

                {/* Guest Filter Popover Grid */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1.5 ml-2 bg-background border hover:bg-accent"
                    >
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>
                        {visibleGuests.size === guests.length
                          ? "All Guests"
                          : visibleGuests.size === 0
                            ? "No Guests"
                            : `${visibleGuests.size}/${guests.length} Guests`}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                          Filter Guests
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="link"
                            className="h-auto p-0 text-[10px] font-semibold text-primary hover:no-underline"
                            onClick={() =>
                              setVisibleGuests(new Set(guests.map((g) => g.id)))
                            }
                          >
                            Select All
                          </Button>
                          <Button
                            variant="link"
                            className="h-auto p-0 text-[10px] font-semibold text-destructive hover:no-underline"
                            onClick={() => setVisibleGuests(new Set())}
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {guests.map((g, idx) => {
                          const isVisible = visibleGuests.has(g.id);
                          const color =
                            GUEST_PALETTE[idx % GUEST_PALETTE.length];
                          return (
                            <button
                              key={g.id}
                              onClick={() => {
                                setVisibleGuests((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(g.id)) {
                                    next.delete(g.id);
                                  } else {
                                    next.add(g.id);
                                  }
                                  return next;
                                });
                              }}
                              className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-lg text-left text-xs transition-all ${
                                isVisible
                                  ? "border-primary bg-primary/5 font-medium"
                                  : "border-border bg-card opacity-60 hover:opacity-100"
                              }`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full shrink-0 ${color}`}
                              />
                              <span className="truncate flex-1">
                                {g.alias || `Guest ${g.number}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 ml-1 text-muted-foreground hover:bg-accent"
                      onClick={toggleAllCollapsed}
                    >
                      <ChevronsUpDown className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {hasCollapsedItems
                      ? "Expand all items"
                      : "Collapse all items"}
                  </TooltipContent>
                </Tooltip>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 ml-1 text-muted-foreground hover:bg-accent relative"
                    >
                      <LayoutList className="w-4 h-4" />
                      {hideCanceled && canceledCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1.5 -right-1.5 h-4 min-w-4 flex items-center justify-center px-1 text-[8px] border-background"
                        >
                          {canceledCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 text-[10px]">
                        Item Detail Level
                      </p>
                      {(["simple", "balanced", "full"] as const).map(
                        (level) => (
                          <button
                            key={level}
                            onClick={() => setDetailLevel(level)}
                            className={`w-full flex flex-col px-2 py-1.5 rounded transition-colors text-left ${
                              detailLevel === level
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-accent text-foreground"
                            }`}
                          >
                            <span className="font-medium capitalize">
                              {level}
                            </span>
                            <span className="text-[9px] opacity-70">
                              {level === "simple" && "Hide SKUs & allocations"}
                              {level === "balanced" && "Standard view"}
                              {level === "full" && "Show SKUs & full details"}
                            </span>
                          </button>
                        ),
                      )}
                      <div className="my-1 border-t" />
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer transition-colors">
                        <Checkbox
                          checked={hideCanceled}
                          onCheckedChange={(v) => setHideCanceled(!!v)}
                          className="w-3.5 h-3.5"
                        />
                        <span className="font-medium text-foreground">
                          Hide voided items
                        </span>
                        {canceledCount > 0 && (
                          <span className="ml-auto text-[10px] font-mono font-medium text-destructive">
                            ({canceledCount})
                          </span>
                        )}
                      </label>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const breakdown = projectedState.financials.personBreakdown;
                  const nonZeroBreakdown = breakdown.filter(
                    (pb) => pb.subtotal > 0 || pb.person === selectedPerson,
                  );
                  const sortedBreakdown = [...nonZeroBreakdown].sort((a, b) => {
                    if (a.person === selectedPerson) return -1;
                    if (b.person === selectedPerson) return 1;
                    return b.subtotal - a.subtotal;
                  });
                  const MAX_VISIBLE = 3;
                  const visibleBreakdowns = sortedBreakdown.slice(
                    0,
                    MAX_VISIBLE,
                  );
                  const hiddenBreakdowns = sortedBreakdown.slice(MAX_VISIBLE);

                  return (
                    <>
                      {visibleBreakdowns.map((pb) => (
                        <div key={pb.person} className="text-right">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${getGuestColor(pb.person, guests)}`}
                            />
                            <span className="truncate max-w-[70px]">
                              {resolveGuestName(pb.person)}
                            </span>
                          </div>
                          <div className="font-mono font-bold text-sm tabular-nums">
                            ${pb.subtotal.toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {hiddenBreakdowns.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 flex flex-col items-center justify-center gap-0.5 hover:bg-accent border border-muted"
                            >
                              <span className="text-[10px] text-muted-foreground leading-none">
                                +{hiddenBreakdowns.length}
                              </span>
                              <span className="text-[8px] text-muted-foreground leading-none">
                                more
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-52 p-3" align="end">
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Other Payers
                              </h4>
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {hiddenBreakdowns.map((pb) => (
                                  <div
                                    key={pb.person}
                                    className="flex justify-between items-center text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-2 h-2 rounded-full shrink-0 ${getGuestColor(pb.person, guests)}`}
                                      />
                                      <span className="truncate max-w-[120px] text-xs font-medium">
                                        {resolveGuestName(pb.person)}
                                      </span>
                                    </div>
                                    <span className="font-mono font-semibold text-xs tabular-nums">
                                      ${pb.subtotal.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </>
                  );
                })()}
                <SeparatorUI orientation="vertical" className="h-8" />
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Total
                  </div>
                  <div className="font-mono font-bold text-lg tabular-nums text-primary">
                    ${projectedState.financials.subtotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Warning */}
            {(currentBranchName === mainBranchName || isMergedToMain) &&
              !isViewingHistory && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/50 px-6 py-2.5 flex items-start gap-2.5 shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong className="font-semibold uppercase tracking-wider text-[10px] mr-1.5">
                      {currentBranchName === mainBranchName
                        ? "Read-Only Trunk:"
                        : "Merged Branch:"}
                    </strong>
                    {currentBranchName === mainBranchName
                      ? "Main is purely a read-only place. Any modifications made here will automatically create a new draft branch to protect the main ledger."
                      : "This branch has already been merged into main and is read-only. Any modifications made here will automatically create a new draft branch."}
                  </p>
                </div>
              )}

            {/* Cart Items */}
            <div ref={checklistRef} className="flex-1 overflow-y-auto">
              {filteredRootItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
                  <ShoppingCart className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">No items in check</p>
                  <p className="text-xs mt-1">
                    Select items from the catalog to begin
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {filteredRootItems.map((item) => (
                    <LineItemNode
                      key={item.lineId}
                      item={item}
                      allocations={resolvedAllocations}
                      defaultPaymentAllocId={defaultPaymentAllocId}
                      onRemove={removeItem}
                      onAddModifier={handleOpenModifierDialog}
                      onAddNote={handleOpenNoteDialog}
                      onAllocConfig={handleAllocConfig}
                      depth={0}
                      modifiers={modifierItems}
                      guests={guests}
                      isSelected={selectedLineIds.has(item.lineId)}
                      onSelectToggle={handleSelectToggle}
                      isCollapsed={collapsedItems.has(item.lineId)}
                      onToggleCollapse={handleToggleCollapse}
                      collapsedItems={collapsedItems}
                      detailLevel={detailLevel}
                      hideCanceled={hideCanceled}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bulk Actions Bar */}
            {selectedLineIds.size > 0 && (
              <div
                ref={bulkActionsBarRef}
                className="mx-4 my-2 p-3 bg-card/85 backdrop-blur-md border rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      selectedLineIds.size > 0 &&
                      selectedLineIds.size === filteredRootItems.length
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedLineIds(
                          new Set(filteredRootItems.map((i) => i.lineId)),
                        );
                      } else {
                        setSelectedLineIds(new Set());
                      }
                    }}
                  />
                  <span className="text-xs font-semibold text-foreground select-none">
                    {selectedLineIds.size} selected
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Quantity bulk increase/decrease */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-medium hover:bg-accent"
                    onClick={() => {
                      modifyItemsQty(Array.from(selectedLineIds), -1);
                      toast.success("Selected items quantity decreased");
                    }}
                  >
                    <Minus className="w-3.5 h-3.5 mr-1" />- Qty
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-medium hover:bg-accent"
                    onClick={() => {
                      modifyItemsQty(Array.from(selectedLineIds), 1);
                      toast.success("Selected items quantity increased");
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />+ Qty
                  </Button>

                  {/* Quantity bulk set */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-medium hover:bg-accent"
                    onClick={() => setQtyPadOpen(true)}
                  >
                    Set Qty
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-medium hover:bg-accent"
                    onClick={() => {
                      duplicateItems(Array.from(selectedLineIds));
                      toast.success("Selected items duplicated");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Duplicate
                  </Button>

                  {/* Duplicate and Move */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-medium hover:bg-accent"
                    onClick={() => setDupMoveDialogOpen(true)}
                  >
                    Dup & Move
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-medium hover:bg-destructive/90"
                    onClick={() => {
                      removeItems(Array.from(selectedLineIds));
                      setSelectedLineIds(new Set());
                      toast.success("Selected items removed");
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Remove
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-medium hover:bg-accent"
                    onClick={() => setAssignGuestDialogOpen(true)}
                  >
                    Assign Guest
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-medium hover:bg-accent w-31.25"
                    onClick={() => {
                      const selectedItems = Array.from(selectedLineIds)
                        .map((id) => projectedState.items[id])
                        .filter(Boolean);
                      setPaymentAllocationItems(selectedItems);
                      setPaymentAllocationContext("group");
                      setPaymentAllocationOpen(true);
                    }}
                  >
                    Allocate Payment
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-medium hover:bg-accent w-31.25"
                    onClick={() => {
                      const selectedItems = Array.from(selectedLineIds)
                        .map((id) => projectedState.items[id])
                        .filter(Boolean);
                      setFulfillmentAllocationItems(selectedItems);
                      setFulfillmentAllocationContext("group");
                      setFulfillmentAllocationOpen(true);
                    }}
                  >
                    Set Fulfillment
                  </Button>

                  {compatibleModifiers.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2.5 font-medium bg-background border border-primary/30 text-primary hover:bg-primary/5 gap-1"
                      onClick={() => {
                        setModifierAddItem(null);
                        setModifierAddOpen(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />+ Modifier
                    </Button>
                  )}

                  {activeModifiersOnSelected.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2.5 font-medium bg-background border border-destructive/30 text-destructive hover:bg-destructive/5 gap-1"
                      onClick={() => setRemoveModDialogOpen(true)}
                    >
                      <Minus className="w-3.5 h-3.5" />- Modifier
                    </Button>
                  )}

                  <SeparatorUI
                    orientation="vertical"
                    className="h-6 mx-1 shrink-0"
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => setSelectedLineIds(new Set())}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </main>

          {/* ─── RIGHT PANEL: Commit Ledger (DAG) ─────────────────────── */}
          <aside
            className={`border-l bg-card flex flex-col shrink-0 transition-all duration-200 ${
              isLedgerCollapsed ? "w-12" : "w-72"
            }`}
          >
            <div className="p-3 border-b flex items-center justify-between gap-2">
              {!isLedgerCollapsed && (
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GitCommitHorizontal className="w-3.5 h-3.5" />
                  Ledger
                </h2>
              )}
              <div className="flex items-center gap-1">
                {!isLedgerCollapsed && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {log.length}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsLedgerCollapsed((prev) => !prev)}
                  title={
                    isLedgerCollapsed ? "Expand ledger" : "Minimize ledger"
                  }
                >
                  {isLedgerCollapsed ? (
                    <PanelRightOpen className="w-3.5 h-3.5" />
                  ) : (
                    <PanelRightClose className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {!isLedgerCollapsed && (
              <>
                {isViewingHistory && (
                  <div className="px-3 py-2 border-b bg-amber-50 dark:bg-amber-950/20 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      Time-traveling
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] px-2 text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 shrink-0"
                      onClick={() => viewRevision(null)}
                    >
                      <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
                      Back to HEAD
                    </Button>
                  </div>
                )}

                <ScrollArea className="flex-1 min-h-0">
                  {log.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground/50">
                      <GitCommitHorizontal className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs">No commits yet</p>
                    </div>
                  ) : (
                    <div className="relative flex min-h-full">
                      {/* Left panel: SVG Commit Graph */}
                      <div
                        style={{ width: graphData.width }}
                        className="relative shrink-0 select-none overflow-hidden"
                      >
                        <svg
                          width={graphData.width}
                          height={graphData.height}
                          className="absolute top-0 left-0"
                        >
                          {/* Render Connecting Lines */}
                          {graphData.lines.map((line) => (
                            <g key={line.id}>
                              {line.isMain && (
                                <line
                                  x1={line.startX}
                                  y1={line.startY}
                                  x2={line.endX}
                                  y2={line.endY}
                                  stroke={line.color}
                                  strokeWidth={6}
                                  strokeOpacity={0.2}
                                  strokeLinecap="round"
                                />
                              )}
                              <line
                                x1={line.startX}
                                y1={line.startY}
                                x2={line.endX}
                                y2={line.endY}
                                stroke={line.color}
                                strokeWidth={line.isMain ? 3 : 2}
                                strokeLinecap="round"
                                strokeDasharray={
                                  line.dashed ? "4,4" : undefined
                                }
                              />
                            </g>
                          ))}
                          {/* Render Node Dots */}
                          {graphData.nodes.map((node) => {
                            const isActive =
                              viewingHash === node.commitHash ||
                              (viewingHash === null &&
                                node.commitHash === headHash());
                            return (
                              <g key={node.commitHash}>
                                {isActive && (
                                  <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={7}
                                    fill="none"
                                    stroke={node.color}
                                    strokeWidth={1.5}
                                    className="animate-pulse"
                                  />
                                )}
                                <circle
                                  cx={node.x}
                                  cy={node.y}
                                  r={isActive ? 4.5 : 3.5}
                                  fill={node.color}
                                  className="transition-all duration-200"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Right panel: Commit List */}
                      <div className="flex-1 min-w-0 pr-2">
                        {log.map((commit, idx) => {
                          const isActive =
                            viewingHash === commit.commitHash ||
                            (viewingHash === null &&
                              commit.commitHash === headHash());
                          const isAI = commit.authorId === "ai-agent";
                          const isSystem = commit.authorId === "system-init";
                          const isSquash = commit.authorId === "pos-squash";
                          const isExpanded = expandedCommits.has(
                            commit.commitHash,
                          );
                          const node = graphData.nodes[idx];
                          // A commit is confirmed if it has merge parents or is system-init,
                          // or is an ancestor of such a commit.
                          const isHead = commit.commitHash === headHash();
                          const isConfirmed = !!(
                            confirmedHash &&
                            (commit.commitHash === confirmedHash ||
                              engine.isAncestorOf(
                                commit.commitHash,
                                confirmedHash,
                              ))
                          );

                          return (
                            <div
                              key={commit.commitHash}
                              style={{ height: node.rowHeight }}
                              className="flex flex-col justify-start py-0.75 group/commit"
                            >
                              <div
                                onClick={() => viewRevision(commit.commitHash)}
                                className={`w-full text-left rounded-lg border p-1.5 transition-all text-xs cursor-pointer select-none flex flex-col justify-center h-12.5 relative ${
                                  isActive
                                    ? "border-primary bg-primary/5 shadow-xs"
                                    : "border-transparent hover:border-border hover:bg-accent/40"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[9px] font-semibold text-muted-foreground truncate max-w-12.5">
                                    {commit.commitHash.substring(0, 7)}
                                  </span>
                                  <Badge
                                    variant={
                                      isAI
                                        ? "default"
                                        : isSystem
                                          ? "secondary"
                                          : "secondary"
                                    }
                                    className={`text-[8px] h-3.5 px-1 shrink-0 scale-90 ${
                                      isAI
                                        ? "bg-amber-500 text-white hover:bg-amber-500"
                                        : isSystem
                                          ? "bg-muted text-muted-foreground"
                                          : isSquash
                                            ? "bg-sky-500 text-white hover:bg-sky-500"
                                            : ""
                                    }`}
                                  >
                                    {isSquash
                                      ? "squash"
                                      : commit.authorId.split("-")[0]}
                                  </Badge>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCommitExpanded(commit.commitHash);
                                    }}
                                    className="p-0.5 rounded hover:bg-muted shrink-0 ml-auto"
                                    title="Toggle details"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                  </button>
                                </div>
                                <div className="flex items-center justify-between text-[8px] text-muted-foreground/75 mt-0.5 font-mono">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                              activeBranch() !== commit.branch
                                            ) {
                                              checkoutBranch(commit.branch);
                                              toast.success(
                                                `Switched active branch to "${commit.branch}"`,
                                              );
                                            }
                                          }}
                                          className={`text-[8px] px-1 py-0 h-4 font-semibold cursor-pointer shrink-0 transition-all flex items-center gap-0.5 select-none ${
                                            activeBranch() === commit.branch
                                              ? "border-primary text-primary bg-primary/5 ring-[0.5px] ring-primary/20"
                                              : branches[commit.branch]
                                                    ?.type === "hypothetical"
                                                ? "border-amber-400/40 text-amber-600 bg-amber-500/4 hover:bg-amber-500/10 hover:border-amber-500"
                                                : "border-emerald-400/40 text-emerald-600 bg-emerald-500/4 hover:bg-emerald-500/10 hover:border-emerald-500"
                                          }`}
                                        >
                                          {branches[commit.branch]?.type ===
                                          "hypothetical" ? (
                                            <Lightbulb className="w-2.5 h-2.5" />
                                          ) : (
                                            <GitBranch className="w-2.5 h-2.5" />
                                          )}
                                          <span className="truncate max-w-15">
                                            {branches[commit.branch]?.label ||
                                              commit.branch}
                                          </span>
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="text-[10px]"
                                      >
                                        {activeBranch() === commit.branch
                                          ? `Current active branch: ${commit.branch}`
                                          : `Click to switch active branch to "${commit.branch}"`}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <span>
                                    {new Date(
                                      commit.timestamp,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </span>
                                </div>

                                {/* Per-commit hover actions for non-confirmed, non-HEAD commits */}
                                {!isConfirmed &&
                                  !isHead &&
                                  !commit.authorId.startsWith("system-") && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/commit:opacity-100 transition-opacity pointer-events-none group-hover/commit:pointer-events-auto">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // squash = collapse this commit up to HEAD
                                                setHistoryOpDialog({
                                                  type: "squash",
                                                  targetHash: commit.commitHash,
                                                  label: "Squash to HEAD",
                                                  description: `Collapse the pending commits from ${commit.commitHash.substring(0, 7)} up to HEAD into a single commit. Confirmed history is preserved.`,
                                                });
                                              }}
                                              className="h-5 w-5 rounded flex items-center justify-center bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 border border-sky-500/20"
                                              title="Squash to HEAD"
                                            >
                                              <ChevronsUpDown className="w-3 h-3" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent
                                            side="left"
                                            className="text-[10px]"
                                          >
                                            Squash from here to HEAD
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setHistoryOpDialog({
                                                  type: "reset",
                                                  targetHash: commit.commitHash,
                                                  label: "Reset to here",
                                                  description: `Reset the branch HEAD to ${commit.commitHash.substring(0, 7)}, discarding all pending commits after it. Confirmed history is preserved.`,
                                                });
                                              }}
                                              className="h-5 w-5 rounded flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20"
                                              title="Reset to here"
                                            >
                                              <Eraser className="w-3 h-3" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent
                                            side="left"
                                            className="text-[10px]"
                                          >
                                            Reset branch to here
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  )}
                              </div>

                              {/* Expanded Deltas details list */}
                              {isExpanded && (
                                <div className="mt-1 pl-2 pr-1 space-y-1 overflow-y-auto max-h-45 border-l-2 border-primary/20 ml-2 animate-in fade-in duration-100">
                                  {commit.deltas.map((d, i) => (
                                    <div
                                      key={i}
                                      className="text-[9px] text-muted-foreground flex items-center gap-1.5"
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                          d.action === "declare_allocation"
                                            ? "bg-violet-500"
                                            : d.action === "add_item"
                                              ? "bg-emerald-500"
                                              : d.action === "remove_item"
                                                ? "bg-red-500"
                                                : d.action.startsWith("modify")
                                                  ? "bg-amber-500"
                                                  : "bg-sky-500"
                                        }`}
                                      />
                                      <span className="font-mono font-medium truncate shrink-0">
                                        {d.action}
                                      </span>
                                      {"sku" in d && d.sku && (
                                        <span className="truncate text-muted-foreground/60 font-mono">
                                          {String(d.sku)}
                                        </span>
                                      )}
                                      {d.action === "modify_item_allocations" &&
                                        "lineId" in d && (
                                          <span className="truncate text-muted-foreground/60 font-mono">
                                            {(
                                              d as { lineId: string }
                                            ).lineId.substring(0, 8)}
                                          </span>
                                        )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </>
            )}

            {/* Sync Status */}
            <div className="p-3 border-t">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Offline-ready
                </span>
                <span>{log.length} local commits</span>
              </div>
            </div>
          </aside>
        </div>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
          <span>VCS-Retail v2.0.0-PRO MVP</span>
          <span>
            Shared Allocations · Payment Splits · Late-Bound Pricing ·
            Append-Only Ledger
          </span>
        </footer>
      </div>

      {/* ─── History Op Confirm Dialog ───────────────────────────────────── */}
      <Dialog
        open={!!historyOpDialog}
        onOpenChange={(open) => {
          if (!open) setHistoryOpDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {historyOpDialog?.type === "squash" ? (
                <ChevronsUpDown className="w-4 h-4 text-sky-500" />
              ) : (
                <Eraser className="w-4 h-4 text-rose-500" />
              )}
              {historyOpDialog?.label}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {historyOpDialog?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-1">
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 flex items-start gap-2">
              <Lock className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
              Confirmed orders are never modified. Only pending (unconfirmed)
              commits are affected.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpDialog(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={
                historyOpDialog?.type === "reset" ? "destructive" : "default"
              }
              onClick={handleConfirmHistoryOp}
            >
              {historyOpDialog?.type === "squash"
                ? "Squash Commits"
                : "Reset Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Allocation Config Dialog ───────────────────────────────────── */}
      <AllocationConfigDialog
        open={!!allocConfigItem}
        onOpenChange={(open) => {
          if (!open) setAllocConfigItem(null);
        }}
        item={allocConfigItem}
        allocations={resolvedAllocations}
        guests={guestStrings}
        defaultPaymentAllocId={defaultPaymentAllocId}
        defaultPaymentMethod={defaultPaymentMethod}
        onReassign={handleReassign}
        onResetToDefault={handleResetToDefault}
        onAddGuest={handleAddGuestFromDialog}
        onTriggerPaymentAllocation={(item) => {
          setPaymentAllocationItems([item]);
          setPaymentAllocationContext("item");
          setPaymentAllocationOpen(true);
        }}
        onTriggerFulfillmentAllocation={(item) => {
          setFulfillmentAllocationItems([item]);
          setFulfillmentAllocationContext("item");
          setFulfillmentAllocationOpen(true);
        }}
        initiatedAt={orderContext?.initiatedAt}
      />

      {/* ─── Unified Payment Allocation Dialog ──────────────────────────── */}
      <PaymentAllocationDialog
        open={paymentAllocationOpen}
        onOpenChange={setPaymentAllocationOpen}
        context={paymentAllocationContext}
        items={paymentAllocationItems}
        allocations={resolvedAllocations}
        guests={guestStrings}
        defaultPaymentAllocId={defaultPaymentAllocId}
        defaultPaymentMethod={defaultPaymentMethod}
        paymentConfigs={paymentConfigs}
        activePaymentConfigId={activePaymentConfigId}
        selectedGuestName={resolveGuestName(selectedPerson)}
        allItems={Object.values(projectedState.items)}
        onApplyConfig={(configIdOrMethod, mode) => {
          if (paymentAllocationContext === "item") {
            groupItemsPaymentConfig(
              [paymentAllocationItems[0].lineId],
              configIdOrMethod,
            );
            toast.success("Payment config updated for item");
          } else if (paymentAllocationContext === "group") {
            groupItemsPaymentConfig(
              paymentAllocationItems.map((i) => i.lineId),
              configIdOrMethod,
            );
            toast.success(
              `Payment config updated for ${paymentAllocationItems.length} selected items`,
            );
            setSelectedLineIds(new Set());
          } else {
            // header context
            if (configIdOrMethod.startsWith("group-default-")) {
              const m = configIdOrMethod.replace("group-default-", "");
              changeDefaultPayment(m, mode as "change-existing" | "new-only");
            } else {
              selectPaymentConfig(
                configIdOrMethod,
                mode as "change-existing" | "new-only",
              );
            }
            // Resolve display name: check paymentConfigs first, then derive from allocations
            let targetName = configIdOrMethod.startsWith("group-default-")
              ? `${customerName} (${configIdOrMethod.replace("group-default-", "").toUpperCase()})`
              : paymentConfigs.find((c) => c.id === configIdOrMethod)?.name;
            if (!targetName) {
              // Guest-specific config: find an allocation in the group
              const representativeAlloc = Object.values(
                projectedState.allocations,
              ).find(
                (a) =>
                  a.type === "payment" &&
                  ((a as PaymentAllocation).allocationId === configIdOrMethod ||
                    (a as PaymentAllocation).correlationId ===
                      configIdOrMethod),
              ) as PaymentAllocation | undefined;
              if (representativeAlloc) {
                const methodLabel = (
                  representativeAlloc.method || ""
                ).toUpperCase();
                targetName = `${resolveGuestName(representativeAlloc.payer)} (${methodLabel})`;
              } else {
                targetName = "Selected Config";
              }
            }
            if (mode === "change-existing") {
              toast.success(`All items switched to ${targetName}`);
            } else {
              toast.success(`Default set to ${targetName} for new items`);
            }
          }
        }}
        onApplyCustomSplit={(splits, mode) => {
          if (paymentAllocationContext === "item") {
            handleSplitPayment(
              paymentAllocationItems[0].lineId,
              splits,
              mode as "group" | "item",
            );
          } else if (paymentAllocationContext === "group") {
            const corrId = createTableSplitConfig(splits);
            groupItemsPaymentConfig(
              paymentAllocationItems.map((i) => i.lineId),
              corrId,
            );
            toast.success(
              `Custom split applied to ${paymentAllocationItems.length} selected items`,
            );
            setSelectedLineIds(new Set());
          } else {
            // header context
            const corrId = createTableSplitConfig(splits);
            selectPaymentConfig(corrId, mode as "change-existing" | "new-only");
            if (mode === "change-existing") {
              toast.success("Custom split applied to all existing items");
            } else {
              toast.success("Custom split set as default for new items");
            }
          }
        }}
        onAddGuest={handleAddGuestFromDialog}
      />

      <FulfillmentAllocationDialog
        open={fulfillmentAllocationOpen}
        onOpenChange={setFulfillmentAllocationOpen}
        context={fulfillmentAllocationContext}
        items={fulfillmentAllocationItems}
        allocations={projectedState.allocations}
        activeFulfillmentConfigId={activeFulfillmentConfigId}
        allItems={Object.values(projectedState.items)}
        onApplyConfig={(config, mode) => {
          if (fulfillmentAllocationContext === "item") {
            updateFulfillmentAllocation(
              fulfillmentAllocationItems[0].lineId,
              config.timeType,
              config.calculatedAt,
            );
            toast.success("Fulfillment timing updated for item");
          } else if (fulfillmentAllocationContext === "group") {
            const newFulId = generateAllocationId("fulfillment");
            const method = orderContext?.orderType || "dine_in";
            const destinationLabel = orderContext?.tableConfigId
              ? `Table ${orderContext.tableConfigId}`
              : "Guest";
            const destinationId = orderContext?.tableConfigId || null;

            const newFulAlloc: FulfillmentAllocation = {
              allocationId: newFulId,
              type: "fulfillment",
              method,
              time: {
                type: config.timeType,
                calculatedAt: config.calculatedAt,
              },
              fulfillmentMetadata: {
                destinationLabel,
                destinationId,
              },
            };

            const targetItemIds = fulfillmentAllocationItems.map(
              (i) => i.lineId,
            );
            const deltas: Delta[] = [
              { action: "declare_allocation", allocation: newFulAlloc },
            ];

            for (const lineId of targetItemIds) {
              const item = projectedState.items[lineId];
              if (item) {
                const nonFulAllocs = item.allocations.filter(
                  (id) =>
                    projectedState.allocations[id]?.type !== "fulfillment",
                );
                deltas.push({
                  action: "modify_item_allocations",
                  lineId,
                  beforeAllocations: item.allocations,
                  afterAllocations: [...nonFulAllocs, newFulId],
                });
              }
            }

            useVCSStore.getState().commitDeltas(deltas, "pos-ui");
            toast.success(
              `Fulfillment updated for ${fulfillmentAllocationItems.length} items`,
            );
            setSelectedLineIds(new Set());
          } else {
            // global context
            const newFulId = generateAllocationId("default-fulfillment");
            const method = orderContext?.orderType || "dine_in";
            const destinationLabel = orderContext?.tableConfigId
              ? `Table ${orderContext.tableConfigId}`
              : "Guest";
            const destinationId = orderContext?.tableConfigId || null;

            const newFulAlloc: FulfillmentAllocation = {
              allocationId: newFulId,
              type: "fulfillment",
              method,
              time: {
                type: config.timeType,
                calculatedAt: config.calculatedAt,
              },
              fulfillmentMetadata: {
                destinationLabel,
                destinationId,
              },
            };

            const deltas: Delta[] = [
              { action: "declare_allocation", allocation: newFulAlloc },
            ];
            useVCSStore.getState().commitDeltas(deltas, "pos-ui");

            selectFulfillmentConfig(
              newFulId,
              mode as "change-existing" | "new-only",
            );

            const timeLabel =
              config.timeType === "immediate"
                ? "On Confirmation"
                : `Scheduled @ ${formatFulfillmentTime(config.calculatedAt!, orderContext?.initiatedAt)}`;

            if (mode === "change-existing") {
              toast.success(
                `Default fulfillment switched to ${timeLabel} for all items`,
              );
            } else {
              toast.success(
                `Default fulfillment set to ${timeLabel} for new items`,
              );
            }
          }
        }}
      />

      <Dialog
        open={addGuestOpen}
        onOpenChange={(open) => {
          setAddGuestOpen(open);
          if (!open) {
            setAddGuestCount(1);
            setAddGuestAlias("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Guests
            </DialogTitle>
            <DialogDescription>
              Add one or more guests to the order. Guests are automatically
              numbered.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Number of guests to add
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setAddGuestCount(Math.max(1, addGuestCount - 1))
                  }
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <Input
                  type="number"
                  value={addGuestCount}
                  onChange={(e) =>
                    setAddGuestCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="h-8 w-20 text-center text-xs font-mono"
                  min={1}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAddGuestCount(addGuestCount + 1)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {addGuestCount === 1 && (
              <div className="space-y-1.5 mt-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Alias / Name (Optional)
                </label>
                <Input
                  autoFocus
                  value={addGuestAlias}
                  onChange={(e) => setAddGuestAlias(e.target.value)}
                  placeholder="e.g. John"
                  className="h-9 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setAddGuestOpen(false);
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSubmitAddGuest();
                    }
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddGuestOpen(false);
                setAddGuestCount(1);
                setAddGuestAlias("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitAddGuest}>
              Add {addGuestCount} Guest{addGuestCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={guestPickerOpen}
        onOpenChange={(open) => {
          setGuestPickerOpen(open);
          if (!open) setGuestSearchQuery("");
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Select Guest
            </DialogTitle>
            <DialogDescription>
              Choose a guest from the grid or add a new one if they are not
              listed.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={guestSearchQuery}
              onChange={(e) => setGuestSearchQuery(e.target.value)}
              placeholder="Search guests..."
              className="pl-9"
            />
          </div>

          <ScrollArea className="max-h-[52vh] pr-2">
            {filteredGuests.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No guests match "{guestSearchQuery.trim()}".
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredGuests.map((guest) => {
                  const idx = guests.findIndex((g) => g.id === guest.id);
                  const color = GUEST_PALETTE[idx % GUEST_PALETTE.length];
                  const isActive = selectedPerson === guest.id;
                  const displayName = guest.alias || `Guest ${guest.number}`;
                  return (
                    <div
                      key={guest.id}
                      onClick={() => {
                        setSelectedPerson(guest.id);
                        setGuestPickerOpen(false);
                      }}
                      className={`relative group flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/40 cursor-pointer ${
                        isActive ? "border-primary bg-primary/5" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGuestToEdit(guest);
                            setEditGuestAlias(guest.alias || "");
                            setEditGuestOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </div>
                      <span className="w-full truncate text-sm font-semibold">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {guest.id === guests[0]?.id
                          ? "Primary guest"
                          : `Guest ${guest.number}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setGuestPickerOpen(false);
                setGuestSearchQuery("");
              }}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setGuestPickerOpen(false);
                setGuestSearchQuery("");
                handleOpenAddGuestDialog();
              }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Rename Guest Dialog ────────────────────────────────────────── */}
      <Dialog
        open={editGuestOpen}
        onOpenChange={(open) => {
          setEditGuestOpen(open);
          if (!open) {
            setGuestToEdit(null);
            setEditGuestAlias("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Rename Guest
            </DialogTitle>
            <DialogDescription>
              Change the display name / alias for Guest {guestToEdit?.number}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label
                htmlFor="rename-guest-input"
                className="text-xs font-medium text-muted-foreground uppercase"
              >
                Guest Name
              </label>
              <Input
                id="rename-guest-input"
                autoFocus
                value={editGuestAlias}
                onChange={(e) => setEditGuestAlias(e.target.value)}
                placeholder={`Guest ${guestToEdit?.number}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveRenameGuest();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditGuestOpen(false);
                setGuestToEdit(null);
                setEditGuestAlias("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRenameGuest}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={noteDialogOpen}
        onOpenChange={(open) => {
          setNoteDialogOpen(open);
          if (!open) setNoteText("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              {noteItem?.sku === "custom_note" ? "Edit Note" : "Add Note"}
            </DialogTitle>
            <DialogDescription>
              {noteItem?.sku === "custom_note"
                ? "Edit the custom note."
                : "Add a custom note to this item."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Textarea
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note here..."
              className="min-h-24 resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setNoteDialogOpen(false);
                  setNoteText("");
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
            />
            <div className="text-[10px] text-muted-foreground">
              Tip: press{" "}
              <span className="font-medium text-foreground">Ctrl+Enter</span> or{" "}
              <span className="font-medium text-foreground">Cmd+Enter</span> to
              save.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNoteDialogOpen(false);
                setNoteText("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddNote}>
              {noteItem?.sku === "custom_note" ? "Save Note" : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModifierAddDialog
        open={modifierAddOpen}
        onOpenChange={setModifierAddOpen}
        itemName={
          modifierAddItem
            ? modifierAddItem.name
            : `${selectedLineIds.size} selected items`
        }
        modifiers={
          modifierAddItem ? singleItemCompatibleModifiers : compatibleModifiers
        }
        onAdd={(sku, defaultState) => {
          if (modifierAddItem) {
            addModifier(modifierAddItem.lineId, sku, defaultState);
          } else {
            addGroupModifier(Array.from(selectedLineIds), sku, defaultState);
          }
        }}
      />

      <NumberPadDialog
        open={qtyPadOpen}
        onOpenChange={setQtyPadOpen}
        title="Set Quantity"
        description="Enter the quantity to apply to all selected items."
        confirmLabel="Set Qty"
        initialValue={null}
        min={1}
        onConfirm={handleSetBulkQty}
      />

      <ChoiceDialog
        open={dupMoveDialogOpen}
        onOpenChange={setDupMoveDialogOpen}
        title="Duplicate and Move"
        description="Choose a guest to duplicate the selected items to."
        searchPlaceholder="Search guests..."
        options={guestChoiceOptions}
        onChoose={(option) => {
          duplicateAndReassignItems(Array.from(selectedLineIds), option.id);
          setSelectedLineIds(new Set());
          setDupMoveDialogOpen(false);
          toast.success(
            `Selected items duplicated and moved to ${option.label}`,
          );
        }}
      />

      <ChoiceDialog
        open={assignGuestDialogOpen}
        onOpenChange={setAssignGuestDialogOpen}
        title="Assign Guest"
        description="Choose a guest for the selected items."
        searchPlaceholder="Search guests..."
        options={guestChoiceOptions}
        onChoose={(option) => {
          reassignItems(Array.from(selectedLineIds), option.id);
          setAssignGuestDialogOpen(false);
          toast.success(`Selected items assigned to ${option.label}`);
        }}
      />

      <ChoiceDialog
        open={removeModDialogOpen}
        onOpenChange={setRemoveModDialogOpen}
        title="Remove Modifier"
        description="Choose a modifier to remove from all selected items."
        searchPlaceholder="Search modifiers..."
        options={removeModChoiceOptions}
        onChoose={(option) => {
          removeGroupModifier(Array.from(selectedLineIds), option.id);
          toast.success(`Removed modifier ${option.label} in bulk`);
        }}
      />

      <BranchManagerDialog
        open={isBranchManagerOpen}
        onOpenChange={setIsBranchManagerOpen}
        branches={branches}
        activeBranch={activeBranch()}
        viewingHash={viewingHash}
        serverName={orderContext?.serverName || "default"}
        onCheckout={(branch) => {
          checkoutBranch(branch);
          toast.success(`Switched to "${branch}"`);
        }}
        onConfigure={(branch) => {
          setIsBranchManagerOpen(false);
          setBranchToConfig(branch);
          setIsBranchConfigOpen(true);
        }}
        onCreateBranch={handleCreateBranch}
        onOpenMerge={() => {
          setIsBranchManagerOpen(false);
          setIsMergeOpen(true);
        }}
      />

      <BranchConfigDialog
        open={isBranchConfigOpen}
        onOpenChange={setIsBranchConfigOpen}
        branchName={branchToConfig || ""}
        currentType={
          branchToConfig
            ? branches[branchToConfig]?.type || "parallel"
            : "parallel"
        }
        currentLabel={
          branchToConfig ? branches[branchToConfig]?.label || "" : ""
        }
        existingBranches={Object.keys(branches)}
        onSave={handleSaveBranchConfig}
      />

      <MergeBranchDialog
        open={isMergeOpen}
        onOpenChange={setIsMergeOpen}
        branches={branches}
        activeBranch={activeBranch()}
        isAlreadyMerged={(sourceBranch, targetBranch) => {
          const sourceHead = branches[sourceBranch]?.headHash;
          const targetHead = branches[targetBranch]?.headHash;
          if (!sourceHead || !targetHead) return false;
          return useVCSStore
            .getState()
            .engine.isAncestorOf(sourceHead, targetHead);
        }}
        onPreview={previewMerge}
        onCommit={(sourceBranches, targetBranch, resolutionDeltas) => {
          commitMerge(sourceBranches, targetBranch, resolutionDeltas);
          if (targetBranch === "main") {
            checkoutBranch("main");
            toast.success("Order confirmed on main and ready for checkout");
          }
        }}
      />
    </TooltipProvider>
  );
}

// ─── Main Page (gates Init Screen vs POS Terminal) ─────────────────────────

export default function POSTerminal() {
  const {
    isInitialized,
    orderContext,
    initRepo,
    loadCatalog,
    catalogLoaded,
    hydrate,
  } = useVCSStore();

  const [storeLabel, setStoreLabel] = React.useState("Main Location");
  const [defaultPaymentFromConfig, setDefaultPaymentFromConfig] =
    React.useState("cash");

  // ─── Initialize (runs always, no conditional hooks) ─────────────────────

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!catalogLoaded) {
      fetch("/api/catalog")
        .then((r) => r.json())
        .then((data) => {
          if (data.catalog) {
            loadCatalog(data.catalog);
          }
        })
        .catch(console.error);
    }
  }, [catalogLoaded, loadCatalog]);

  React.useEffect(() => {
    fetch("/api/pos-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.label) setStoreLabel(data.label);
        if (data.defaultPaymentMethod) {
          setDefaultPaymentFromConfig(data.defaultPaymentMethod);
        }
      })
      .catch(() => {});
  }, []);

  // ─── Handle Order Init (stable callback) ───────────────────────────────

  const handleOrderStart = useCallback(
    (context: Parameters<typeof initRepo>[0]) => {
      initRepo(context, defaultPaymentFromConfig);
      toast.success(
        `${context.orderTypeLabel} order started for ${context.customerFields.name || "customer"} on ${context.serverName}`,
      );
    },
    [initRepo, defaultPaymentFromConfig],
  );

  // ─── Gate: Init Screen vs POS Terminal ─────────────────────────────────

  if (!isInitialized) {
    return (
      <OrderInitScreen
        onOrderStart={handleOrderStart}
        storeLabel={storeLabel}
      />
    );
  }

  return <POSTerminalInner />;
}
