import React from "react";
import { useVCSStore } from "@/store/vcs-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Minus,
  Plus,
  ArrowLeftRight,
  Split,
  CreditCard,
  Pencil,
  Copy,
  Settings2,
  Trash2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type {
  ProjectedLineItem,
  AllocationBlock,
  CatalogItemEntry,
} from "@/lib/vcs/types";
import { AllocationType } from "@/lib/vcs/types";
import {
  type Guest,
  getGuestColor,
  getAssigneeFromItem,
} from "@/lib/pos/ui-utils";
import { AllocationBadges } from "./allocation-badges";
import { toast } from "sonner";

export function LineItemNode({
  item,
  allocations,
  defaultPaymentAllocId,
  onRemove,
  onAddModifier,
  onAddNote,
  onAllocConfig,
  onSwapComboChoice,
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
  onSwapComboChoice?: (
    lineId: string,
    parentLineId: string,
    slotSku: string,
  ) => void;
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
    item.allocations.filter((id) => allocations[id]?.type === AllocationType.Payment)
      .length > 1;
  const hasNonDefaultPayment = item.allocations.some(
    (id) => allocations[id]?.type === AllocationType.Payment && id !== defaultPaymentAllocId,
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

  const parentItem = item.parentLineId
    ? useVCSStore.getState().projectedState.items[item.parentLineId]
    : null;
  const parentCatalogEntry = parentItem
    ? useVCSStore.getState().catalog[parentItem.sku]
    : null;
  const comboChoiceEntry = parentCatalogEntry?.comboChoices?.find(
    (choice) => choice.optionSku === item.sku,
  );
  const isComboChoice = !!comboChoiceEntry;
  const slotSku = comboChoiceEntry?.slotSku;

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
                {isComboChoice && !isCanceled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 ml-1.5 inline-flex text-primary hover:text-primary hover:bg-primary/10 shrink-0 align-middle"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (slotSku) {
                        onSwapComboChoice?.(
                          item.lineId,
                          item.parentLineId!,
                          slotSku,
                        );
                      }
                    }}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </Button>
                )}
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
                  {(isRoot || catalogEntry?.type === "item") &&
                    filteredModifiers.length > 0 && (
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
                  {(isRoot ||
                    catalogEntry?.type === "item" ||
                    item.sku === "custom_note") && (
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
              onSwapComboChoice={onSwapComboChoice}
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