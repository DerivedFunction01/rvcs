"use client";

import React, { useCallback } from "react";
import { useVCSStore, getPaymentAllocDisplayName, getAssignmentAllocDisplayName } from "@/store/vcs-store";
import { OrderInitScreen } from "@/components/vcs/order-init-screen";
import { PaymentSwitchDialog } from "@/components/vcs/payment-switch-dialog";
import { AllocationConfigDialog } from "@/components/vcs/allocation-config-dialog";
import { TableSplitDialog } from "@/components/vcs/table-split-dialog";
import type {
  ProjectedLineItem,
  AllocationBlock,
  PaymentAllocation,
  CatalogItemEntry,
} from "@/lib/vcs/types";
import {
  ShoppingCart,
  Plus,
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator as SeparatorUI } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";

// ─── Constants ──────────────────────────────────────────────────────────────

const PAYMENT_METHODS = ["cash", "visa", "mastercard", "amex"];

const ORDER_TYPE_ICONS: Record<string, React.ElementType> = {
  "walk-in": ShoppingCart,
  pickup: Sparkles,
  delivery: ArrowLeftRight,
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
function getGuestColor(name: string, guests: string[]): string {
  const idx = guests.indexOf(name);
  if (idx >= 0) return GUEST_PALETTE[idx % GUEST_PALETTE.length];
  // Fallback: hash the name to a stable index for historical commits
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GUEST_PALETTE[Math.abs(hash) % GUEST_PALETTE.length];
}

// ─── Allocation Badge ──────────────────────────────────────────────────────

function AllocationBadges({
  allocationIds,
  allocations,
  defaultPaymentAllocId,
  guests,
  onItemClick,
}: {
  allocationIds: string[];
  allocations: Record<string, AllocationBlock>;
  defaultPaymentAllocId: string | null;
  guests: string[];
  onItemClick?: () => void;
}) {
  if (allocationIds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => { e.stopPropagation(); onItemClick?.(); }}>
      {allocationIds.map((id) => {
        const alloc = allocations[id];
        if (!alloc) return null;

        if (alloc.type === "assignment") {
          const entity = getAssignmentAllocDisplayName(alloc);
          return (
            <Badge
              key={id}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-medium cursor-pointer hover:bg-secondary/80"
            >
              <User className="w-2.5 h-2.5 mr-0.5" />
              {entity}
            </Badge>
          );
        }
        if (alloc.type === "payment") {
          const payAlloc = alloc as PaymentAllocation;
          const displayName = getPaymentAllocDisplayName(payAlloc, allocations);
          const isDefault = id === defaultPaymentAllocId;
          const isSplit = !!payAlloc.correlationId;
          return (
            <Badge
              key={id}
              variant={isDefault ? "default" : "outline"}
              className={`text-[10px] px-1.5 py-0 h-4 font-medium cursor-pointer hover:opacity-80 ${isSplit ? "border-primary/50" : ""}`}
            >
              {isSplit && <Split className="w-2.5 h-2.5 mr-0.5" />}
              {!isSplit && <CreditCard className="w-2.5 h-2.5 mr-0.5" />}
              {displayName}
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
  onAllocConfig,
  depth,
  modifiers,
  guests,
}: {
  item: ProjectedLineItem;
  allocations: Record<string, AllocationBlock>;
  defaultPaymentAllocId: string | null;
  onRemove: (lineId: string) => void;
  onAddModifier: (parentLineId: string, modSku: string, selectedModifierState?: string) => void;
  onAllocConfig: (item: ProjectedLineItem) => void;
  depth: number;
  modifiers: CatalogItemEntry[];
  guests: string[];
}) {
  const isRoot = !item.parentLineId;
  const isModifier = item.basePrice === 0 || item.parentLineId;
  const assignee = getAssigneeFromItem(item, allocations);
  const hasSplitPayment = item.allocations.filter(
    (id) => allocations[id]?.type === "payment"
  ).length > 1;
  const hasNonDefaultPayment = item.allocations.some(
    (id) =>
      allocations[id]?.type === "payment" && id !== defaultPaymentAllocId
  );

  const catalogEntry = useVCSStore.getState().catalog[item.sku];
  const sizeGroup = catalogEntry?.appliedSizeGroup;
  const sizeOptions = sizeGroup?.options || [];
  
  const activeSizeChild = item.children.find((child) => {
    const childEntry = useVCSStore.getState().catalog[child.sku];
    return childEntry && childEntry.sizeGroupId === sizeGroup?.id;
  });
  const activeSku = activeSizeChild?.sku;

  return (
    <>
      <div
        className={`group relative ${depth > 0 ? "ml-4 border-l-2 border-muted pl-3" : ""}`}
      >
        <div
          className={`rounded-lg border p-3 transition-colors ${
            isRoot
              ? "border-border bg-card cursor-pointer"
              : "border-transparent bg-muted/40"
          } hover:bg-accent/50`}
          onClick={isRoot ? (e) => { e.stopPropagation(); onAllocConfig(item); } : undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {!isModifier && (
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${getGuestColor(
                      assignee,
                      guests
                    )}`}
                  />
                )}
                <span
                  className={`font-medium truncate ${isModifier ? "text-muted-foreground text-sm" : "text-foreground"}`}
                >
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground font-mono shrink-0">
                  x{item.qty}
                </span>
                {item.basePrice === 0 && (
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
                    mod
                  </Badge>
                )}
                {hasSplitPayment && (
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-primary/40 text-primary">
                    <Split className="w-2.5 h-2.5 mr-0.5" />
                    split
                  </Badge>
                )}
                {hasNonDefaultPayment && !hasSplitPayment && (
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-amber-300 text-amber-600">
                    <CreditCard className="w-2.5 h-2.5 mr-0.5" />
                    custom
                  </Badge>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate">
                {item.sku}
              </div>
              {isRoot && (
                <AllocationBadges
                  allocationIds={item.allocations}
                  allocations={allocations}
                  defaultPaymentAllocId={defaultPaymentAllocId}
                  guests={guests}
                  onItemClick={() => onAllocConfig(item)}
                />
              )}
              {isRoot && sizeGroup && sizeOptions.length > 0 && activeSizeChild && (
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
                              useVCSStore.getState().modifyItemSku(
                                activeSizeChild.lineId,
                                activeSizeChild.sku,
                                opt.sku
                              );
                            }
                          }}
                        >
                          {opt.name}
                          {opt.basePrice > 0 && ` (+$${opt.basePrice.toFixed(2)})`}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end shrink-0 gap-1.5">
              {item.totalPrice > 0 && (
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  ${item.totalPrice.toFixed(2)}
                </span>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isRoot && modifiers.length > 0 && (
                  <Select
                    onValueChange={(val) => {
                      if (val.includes("::")) {
                        const [modSku, state] = val.split("::");
                        onAddModifier(item.lineId, modSku, state);
                      } else {
                        onAddModifier(item.lineId, val);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[32px] h-6 p-0 border-0 bg-transparent hover:bg-accent">
                      <Plus className="w-3 h-3" />
                    </SelectTrigger>
                    <SelectContent>
                      {modifiers.map((mod) => {
                        if (mod.allowedStates && mod.allowedStates.length > 0) {
                          return (
                            <React.Fragment key={mod.sku}>
                              <div className="text-[9px] font-semibold text-muted-foreground uppercase px-2 py-0.5 mt-1 select-none">
                                {mod.name}
                              </div>
                              {mod.allowedStates.map((stateOpt) => (
                                <SelectItem
                                  key={`${mod.sku}::${stateOpt.state}`}
                                  value={`${mod.sku}::${stateOpt.state}`}
                                  className="text-xs pl-4"
                                >
                                  {stateOpt.label} {stateOpt.priceOverride !== null ? `($${stateOpt.priceOverride.toFixed(2)})` : ""}
                                </SelectItem>
                              ))}
                            </React.Fragment>
                          );
                        }
                        return (
                          <SelectItem key={mod.sku} value={mod.sku} className="text-xs">
                            {mod.name} {mod.basePrice > 0 ? `+$${mod.basePrice.toFixed(2)}` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
                )}
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
            </div>
          </div>
        </div>
      </div>
      {item.children
        .filter((child) => child.name !== "")
        .map((child) => (
          <LineItemNode
            key={child.lineId}
            item={child}
            allocations={allocations}
            defaultPaymentAllocId={defaultPaymentAllocId}
            onRemove={onRemove}
            onAddModifier={onAddModifier}
            onAllocConfig={onAllocConfig}
            depth={depth + 1}
            modifiers={modifiers}
            guests={guests}
          />
        ))}
    </>
  );
}

function getAssigneeFromItem(
  item: ProjectedLineItem,
  allocations: Record<string, AllocationBlock>
): string {
  for (const allocId of item.allocations) {
    const alloc = allocations[allocId];
    if (alloc?.type === "assignment") {
      return (alloc as { entity: string }).entity;
    }
  }
  return "";
}

// ─── Order Context Banner ───────────────────────────────────────────────────

function OrderContextBanner({ context }: { context: { orderType: string; orderTypeLabel: string; customerFields: Record<string, string>; estimatedTimeLabel?: string | null } }) {
  const TypeIcon = ORDER_TYPE_ICONS[context.orderType] ?? ShoppingCart;

  return (
    <div className="px-6 py-2 bg-primary/5 border-b flex items-center gap-4 text-xs shrink-0">
      <div className="flex items-center gap-1.5">
        <TypeIcon className="w-3.5 h-3.5 text-primary" />
        <span className="font-semibold text-primary">{context.orderTypeLabel}</span>
      </div>
      {context.customerFields.name && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <User className="w-3 h-3" />
          <span>{context.customerFields.name}</span>
        </div>
      )}
      {context.customerFields.phone && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Phone className="w-3 h-3" />
          <span>{context.customerFields.phone}</span>
        </div>
      )}
      {context.customerFields.address && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[200px]">{context.customerFields.address}</span>
        </div>
      )}
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
    orderContext,
    resetOrder,
    defaultPaymentMethod,
    defaultPaymentAllocId,
    defaultAssignmentAllocId,
    changeDefaultPayment,
    splitItemPayment,
    reassignItem,
    resetItemPaymentToDefault,
    switchItemPayment,
    activePaymentConfigId,
    selectPaymentConfig,
    createTableSplitConfig,
  } = useVCSStore();

  // ─── Dynamic Guest List ─────────────────────────────────────────────
  const customerName = orderContext?.customerFields.name || "Guest";
  const [guests, setGuests] = React.useState<string[]>([customerName]);
  const [selectedPerson, setSelectedPerson] = React.useState(customerName);
  const [mimicTarget, setMimicTarget] = React.useState("");
  const [newGuestName, setNewGuestName] = React.useState("");
  const [showAddGuest, setShowAddGuest] = React.useState(false);
  const [newBranchName, setNewBranchName] = React.useState("");
  const [catalogFilter, setCatalogFilter] = React.useState("");
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  // ─── Dialog State ────────────────────────────────────────────────────
  const [paymentSwitchOpen, setPaymentSwitchOpen] = React.useState(false);
  const [pendingConfigId, setPendingConfigId] = React.useState("");
  const [pendingConfigName, setPendingConfigName] = React.useState("");
  const [pendingMethod, setPendingMethod] = React.useState("");
  const [tableSplitOpen, setTableSplitOpen] = React.useState(false);
  const [allocConfigItem, setAllocConfigItem] = React.useState<ProjectedLineItem | null>(null);

  // Auto-select mimic target to the first other guest
  React.useEffect(() => {
    if (!mimicTarget || !guests.includes(mimicTarget)) {
      const other = guests.find((g) => g !== selectedPerson);
      if (other) setMimicTarget(other);
    }
  }, [guests, selectedPerson]);

  // ─── Guest Management ──────────────────────────────────────────────────

  const addGuest = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (guests.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
        toast.error(`"${trimmed}" is already in the guest list`);
        return;
      }
      setGuests((prev) => [...prev, trimmed]);
      setNewGuestName("");
      setShowAddGuest(false);
      toast.success(`${trimmed} added to the order`);
    },
    [guests]
  );

  const removeGuest = useCallback(
    (name: string) => {
      if (name === guests[0]) {
        toast.error("Cannot remove the primary customer");
        return;
      }
      setGuests((prev) => prev.filter((g) => g !== name));
      if (selectedPerson === name) setSelectedPerson(guests[0]);
      if (mimicTarget === name) {
        const other = guests.find((g) => g !== name);
        if (other) setMimicTarget(other);
      }
      toast.success(`${name} removed`);
    },
    [guests, selectedPerson, mimicTarget]
  );

  // ─── Derived State ──────────────────────────────────────────────────────

  const catalogItems = Object.values(catalog).filter(
    (i) => i.active && i.type === "item"
  );
  const modifierItems = Object.values(catalog).filter(
    (i) => i.active && i.type === "modifier"
  );

  const groupedCatalog = catalogItems.reduce<Record<string, typeof catalogItems>>(
    (acc, item) => {
      const cat = item.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {}
  );

  const rootItems = Object.values(projectedState.items).filter(
    (i) => !i.parentLineId
  );

  // Count items on the active payment configuration group
  const itemsOnActiveConfig = React.useMemo(() => {
    if (!activePaymentConfigId) return 0;
    
    const activeAllocations = Object.values(projectedState.allocations).filter(
      (a): a is PaymentAllocation =>
        a.type === "payment" &&
        (a.allocationId === activePaymentConfigId || (a.correlationId !== null && a.correlationId === activePaymentConfigId))
    );
    const activePayIds = activeAllocations.map((a) => a.allocationId);

    return Object.values(projectedState.items).filter((item) =>
      item.allocations.some((id) => activePayIds.includes(id))
    ).length;
  }, [projectedState.items, projectedState.allocations, activePaymentConfigId]);

  // Dynamically derive the list of all available payment configs
  const paymentConfigs = React.useMemo(() => {
    const configs: Array<{ id: string; name: string; isSplit: boolean }> = [];
    const allocations = projectedState.allocations;
    
    const singlePayers = new Map<string, PaymentAllocation>();
    const splitGroups = new Map<string, PaymentAllocation[]>();

    for (const alloc of Object.values(allocations)) {
      if (alloc.type === "payment") {
        const pay = alloc as PaymentAllocation;
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

    singlePayers.forEach((pay, id) => {
      const displayName = `Single: ${getPaymentAllocDisplayName(pay, allocations)}`;
      configs.push({
        id,
        name: displayName,
        isSplit: false,
      });
    });

    splitGroups.forEach((group, correlationId) => {
      const displayName = `Split: ${getPaymentAllocDisplayName(group[0], allocations)}`;
      configs.push({
        id: correlationId,
        name: displayName,
        isSplit: true,
      });
    });

    return configs;
  }, [projectedState.allocations, defaultPaymentAllocId]);

  const currentConfigName = React.useMemo(() => {
    if (activePaymentConfigId && activePaymentConfigId.startsWith("group-default-")) {
      const method = activePaymentConfigId.replace("group-default-", "");
      return `Guest (${method.toUpperCase()})`;
    }
    const allocations = projectedState.allocations;
    const activeAlloc = Object.values(allocations).find(
      (a) =>
        a.type === "payment" &&
        (a.allocationId === activePaymentConfigId || a.correlationId === activePaymentConfigId)
    );
    if (activeAlloc) {
      const typeLabel = activeAlloc.correlationId ? "Split" : "Single";
      return `${typeLabel}: ${getPaymentAllocDisplayName(activeAlloc, allocations)}`;
    }
    return "Default Config";
  }, [activePaymentConfigId, defaultPaymentAllocId, defaultPaymentMethod, projectedState.allocations]);

  const log = commitLog();
  const isViewingHistory = viewingHash !== null && viewingHash !== headHash();

  // ─── Handlers (all hooks before any conditional returns) ─────────────────

  const handleAddItem = useCallback(
    (sku: string) => {
      // Reassign default assignment if selectedPerson differs from default
      if (selectedPerson !== customerName && defaultAssignmentAllocId) {
        // Need to create a new assignment for this guest
        // Use addItemWithDefaults first, then reassign
        addItemWithDefaults(sku, 1);

        // Get the line that was just added (last root item)
        const store = useVCSStore.getState();
        const state = store.projectedState;
        const items = Object.values(state.items).filter((i) => !i.parentLineId);
        const lastItem = items[items.length - 1];
        if (lastItem) {
          reassignItem(lastItem.lineId, selectedPerson);
        }

        toast.success(`Added to ${selectedPerson}'s order`);
      } else {
        addItemWithDefaults(sku, 1);
        toast.success(`Added to ${selectedPerson}'s order`);
      }
    },
    [addItemWithDefaults, selectedPerson, customerName, defaultAssignmentAllocId, reassignItem]
  );

  const handleConfigChange = useCallback(
    (value: string) => {
      if (value === "action-create-split") {
        setTableSplitOpen(true);
        return;
      }

      if (value.startsWith("config-")) {
        const configId = value.replace("config-", "");
        if (configId === activePaymentConfigId) return;
        const targetConfig = paymentConfigs.find((c) => c.id === configId);
        setPendingMethod("");
        setPendingConfigId(configId);
        setPendingConfigName(
          configId.startsWith("group-default-")
            ? `Guest (${configId.replace("group-default-", "").toUpperCase()})`
            : targetConfig?.name || "Selected Config"
        );
        setPaymentSwitchOpen(true);
      }
    },
    [activePaymentConfigId, paymentConfigs]
  );

  const handlePaymentSwitchExisting = useCallback(() => {
    if (pendingConfigId) {
      selectPaymentConfig(pendingConfigId, "change-existing");
      toast.success(`All items switched to ${pendingConfigName}`);
    }
    setPendingMethod("");
    setPendingConfigId("");
    setPendingConfigName("");
  }, [pendingConfigId, pendingConfigName, selectPaymentConfig]);

  const handlePaymentSwitchNewOnly = useCallback(() => {
    if (pendingConfigId) {
      selectPaymentConfig(pendingConfigId, "new-only");
      toast.success(`Default set to ${pendingConfigName} for new items`);
    }
    setPendingMethod("");
    setPendingConfigId("");
    setPendingConfigName("");
  }, [pendingMethod, pendingConfigId, pendingConfigName, changeDefaultPayment, selectPaymentConfig]);

  const handleCreateSplitConfig = useCallback(
    (splits: Array<{ entity: string; strategyType: "percentage" | "fixed" | "remaining"; value: number }>) => {
      const configId = createTableSplitConfig(splits, defaultPaymentMethod);
      
      const targetConfigName = `Split: ${splits
        .sort((a, b) => b.value - a.value)
        .map((s) => `${s.entity} ${s.strategyType === "percentage" ? Math.round(s.value * 100) : s.value}${s.strategyType === "percentage" ? "%" : ""}`)
        .join(" / ")}`;

      setPendingMethod("");
      setPendingConfigId(configId);
      setPendingConfigName(targetConfigName);
      setPaymentSwitchOpen(true);
    },
    [createTableSplitConfig, defaultPaymentMethod]
  );

  const handleReassign = useCallback(
    (lineId: string, newAssignee: string) => {
      reassignItem(lineId, newAssignee);
      toast.success(`Reassigned to ${newAssignee}`);
    },
    [reassignItem]
  );

  const handleSplitPayment = useCallback(
    (
      lineId: string,
      splits: Array<{
        entity: string;
        strategyType: "percentage" | "fixed" | "remaining";
        value: number;
      }>
    ) => {
      splitItemPayment(lineId, splits);
      const splitName = [...splits]
        .sort((a, b) => b.value - a.value)
        .map((s) => {
          const valLabel = s.strategyType === "percentage" ? `${Math.round(s.value * 100)}%` : `$${s.value}`;
          return `${s.entity} ${s.strategyType === "remaining" ? "rem" : valLabel}`;
        })
        .join(" / ");
      toast.success(`Payment split: ${splitName}`);
    },
    [splitItemPayment]
  );

  const handleResetToDefault = useCallback(
    (lineId: string) => {
      resetItemPaymentToDefault(lineId);
      toast.success(`Payment reset to ${defaultPaymentMethod}`);
    },
    [resetItemPaymentToDefault, defaultPaymentMethod]
  );

  const handleSwitchItemPayment = useCallback(
    (lineId: string, newMethod: string) => {
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
      switchItemPayment(lineId, newMethod, payer);
      toast.success(`Payment switched to ${newMethod} for this item`);
    },
    [switchItemPayment, selectedPerson]
  );

  // Expose addGuest for the allocation config dialog
  const handleAddGuestFromDialog = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (guests.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
        // Already exists — just silently accept
        return;
      }
      setGuests((prev) => [...prev, trimmed]);
      toast.success(`${trimmed} added to the order`);
    },
    [guests]
  );

  // Guarded version: only open config if dialog isn't already open
  const handleAllocConfig = useCallback(
    (item: ProjectedLineItem) => {
      setAllocConfigItem((prev) => (prev === item ? null : item));
    },
    []
  );

  const handleMimicOrder = useCallback(() => {
    try {
      mimicOrder(selectedPerson, mimicTarget, mimicTarget, defaultPaymentMethod);
      toast.success(`${mimicTarget} now has a copy of ${selectedPerson}'s order`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [mimicOrder, selectedPerson, mimicTarget, defaultPaymentMethod]);

  const handleCreateBranch = useCallback(() => {
    if (!newBranchName.trim()) return;
    try {
      createBranch(newBranchName.trim());
      toast.success(`Branch "${newBranchName.trim()}" created`);
      setNewBranchName("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [createBranch, newBranchName]);

  const handleResetOrder = useCallback(() => {
    resetOrder();
    setShowResetConfirm(false);
    setMimicTarget("");
    setNewGuestName("");
    setShowAddGuest(false);
    setNewBranchName("");
    setCatalogFilter("");
    toast.success("Order reset — ready for a new order");
  }, [resetOrder]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex flex-col bg-background">
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <header className="border-b bg-card px-4 py-2.5 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <GitCommitHorizontal className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">Retail VCS Terminal</h1>
              <p className="text-[10px] text-muted-foreground">
                Version-Controlled POS — Order as Repository
              </p>
            </div>
          </div>

          {/* Branch Tabs */}
          <div className="flex items-center gap-2">
            {Object.keys(useVCSStore.getState().engine.getBranches()).map((branch) => (
              <Button
                key={branch}
                variant={activeBranch() === branch ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 px-3"
                onClick={() => checkoutBranch(branch)}
              >
                {branch}
              </Button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="new-branch"
                className="w-28 h-7 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleCreateBranch()}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleCreateBranch}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Guest Selector + Payment + New Order */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Guest:</span>
            <div className="flex items-center gap-1">
              {guests.map((guest, idx) => {
                const color = GUEST_PALETTE[idx % GUEST_PALETTE.length];
                const isPrimary = idx === 0;
                const isActive = selectedPerson === guest;
                return (
                  <div
                    key={guest}
                    className={`group relative flex items-center ${isActive ? "" : "opacity-70 hover:opacity-100"} transition-opacity`}
                  >
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={`text-xs h-7 px-2.5 gap-1.5 ${isActive ? `${color} text-white border-transparent hover:${color} hover:text-white` : ""}`}
                      onClick={() => setSelectedPerson(guest)}
                    >
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="max-w-[60px] truncate">{guest.split(" ")[0]}</span>
                    </Button>
                    {!isPrimary && (
                      <button
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGuest(guest);
                        }}
                        title={`Remove ${guest}`}
                      >
                        <span className="text-[8px] leading-none">&times;</span>
                      </button>
                    )}
                  </div>
                );
              })}
              {showAddGuest ? (
                <div className="flex items-center gap-0.5">
                  <Input
                    autoFocus
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    placeholder="Name..."
                    className="w-20 h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newGuestName.trim()) {
                        addGuest(newGuestName);
                      }
                      if (e.key === "Escape") {
                        setShowAddGuest(false);
                        setNewGuestName("");
                      }
                    }}
                    onBlur={() => {
                      if (!newGuestName.trim()) {
                        setShowAddGuest(false);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={!newGuestName.trim()}
                    onClick={() => addGuest(newGuestName)}
                  >
                    <span className="text-xs">✓</span>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAddGuest(true)}
                  title="Add guest"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <Select
              value={`config-${activePaymentConfigId}`}
              onValueChange={handleConfigChange}
            >
              <SelectTrigger className="w-44 h-7 text-xs">
                <CreditCard className="w-3 h-3 mr-1 shrink-0" />
                <SelectValue placeholder="Select Payment Config..." />
              </SelectTrigger>
              <SelectContent>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1 select-none">
                  Guest Payment (100%)
                </div>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={`config-group-default-${m}`} value={`config-group-default-${m}`} className="text-xs capitalize">
                    {m}
                  </SelectItem>
                ))}

                {paymentConfigs.length > 0 && (
                  <>
                    <SeparatorUI className="my-1" />
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1 select-none">
                      Active / Custom Configs
                    </div>
                    {paymentConfigs.map((config) => (
                      <SelectItem key={`config-${config.id}`} value={`config-${config.id}`} className="text-xs">
                        {config.name}
                      </SelectItem>
                    ))}
                  </>
                )}

                <SeparatorUI className="my-1" />
                <SelectItem value="action-create-split" className="text-xs text-primary font-semibold">
                  <span className="flex items-center gap-1">
                    <Split className="w-3 h-3 text-primary shrink-0" />
                    + Create Table Split...
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <SeparatorUI orientation="vertical" className="h-6" />
            {showResetConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-destructive">End this order?</span>
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
        {orderContext && <OrderContextBanner context={orderContext} />}

        {/* ─── Main Content: 3-Panel Layout ─────────────────────────────── */}
        <div className="flex-1 flex min-h-0">
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
                          i.name.toLowerCase().includes(catalogFilter.toLowerCase()) ||
                          i.sku.toLowerCase().includes(catalogFilter.toLowerCase())
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
                            <div className="text-muted-foreground">{item.sku}</div>
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

            {/* AI Agent Panel */}
            <div className="p-3 border-t bg-muted/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  AI Agent
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <Select value={mimicTarget} onValueChange={setMimicTarget}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Target person" />
                    </SelectTrigger>
                    <SelectContent>
                      {guests.filter((g) => g !== selectedPerson).map(
                        (g) => (
                          <SelectItem key={g} value={g} className="text-xs">
                            {g}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 text-xs flex-1"
                    variant="secondary"
                    onClick={handleMimicOrder}
                    disabled={rootItems.length === 0 || !mimicTarget}
                  >
                    <ArrowLeftRight className="w-3 h-3 mr-1" />
                    Mimic Order
                  </Button>
                </div>
                <p className="text-[9px] text-muted-foreground leading-tight">
                  {mimicTarget
                    ? <>Clones all of {selectedPerson}&apos;s items for {mimicTarget} via <code className="text-primary">batch_duplicate_and_reallocate</code></>
                    : <>Add another guest to enable mimic</>
                  }
                </p>
              </div>
            </div>
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
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50">
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    Viewing history
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4">
                {projectedState.financials.personBreakdown.map((pb) => (
                  <div key={pb.person} className="text-right">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <div className={`w-1.5 h-1.5 rounded-full ${getGuestColor(pb.person, guests)}`} />
                      {pb.person}
                    </div>
                    <div className="font-mono font-bold text-sm tabular-nums">
                      ${pb.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
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

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto">
              {rootItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
                  <ShoppingCart className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">No items in check</p>
                  <p className="text-xs mt-1">
                    Select items from the catalog to begin
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {rootItems.map((item) => (
                    <LineItemNode
                      key={item.lineId}
                      item={item}
                      allocations={projectedState.allocations}
                      defaultPaymentAllocId={defaultPaymentAllocId}
                      onRemove={removeItem}
                      onAddModifier={addModifier}
                      onAllocConfig={handleAllocConfig}
                      depth={0}
                      modifiers={modifierItems}
                      guests={guests}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* ─── RIGHT PANEL: Commit Ledger (DAG) ─────────────────────── */}
          <aside className="w-72 border-l bg-card flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <GitCommitHorizontal className="w-3.5 h-3.5" />
                Ledger
              </h2>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {log.length}
              </Badge>
            </div>

            {isViewingHistory && (
              <div className="px-3 py-2 border-b bg-amber-50 flex items-center justify-between">
                <span className="text-[10px] text-amber-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Time-traveling
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] px-2 text-amber-700 hover:text-amber-900"
                  onClick={() => viewRevision(null)}
                >
                  <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
                  Back to HEAD
                </Button>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1.5">
                {log.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/50">
                    <GitCommitHorizontal className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs">No commits yet</p>
                  </div>
                ) : (
                  log.map((commit) => {
                    const isActive =
                      viewingHash === commit.commitHash ||
                      (viewingHash === null &&
                        commit.commitHash === headHash());
                    const isAI = commit.authorId === "ai-agent";
                    const isSystem = commit.authorId === "system-init";

                    return (
                      <button
                        key={commit.commitHash}
                        onClick={() => viewRevision(commit.commitHash)}
                        className={`w-full text-left rounded-lg border p-2.5 transition-all text-sm ${
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-transparent hover:border-border hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] font-medium text-muted-foreground truncate">
                            {commit.commitHash.substring(0, 12)}
                          </span>
                          <Badge
                            variant={isAI ? "default" : isSystem ? "secondary" : "secondary"}
                            className={`text-[9px] h-4 px-1.5 shrink-0 ${isAI ? "bg-amber-500 text-white hover:bg-amber-500" : isSystem ? "bg-muted text-muted-foreground" : ""}`}
                          >
                            {commit.authorId}
                          </Badge>
                        </div>
                        <div className="space-y-0.5">
                          {commit.deltas.slice(0, 4).map((d, i) => (
                            <div
                              key={i}
                              className="text-[10px] text-muted-foreground flex items-center gap-1.5"
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
                              <span className="font-mono truncate">{d.action}</span>
                              {"sku" in d && d.sku && (
                                <span className="truncate text-muted-foreground/60">
                                  {String(d.sku).substring(0, 18)}
                                </span>
                              )}
                              {d.action === "modify_item_allocations" && "lineId" in d && (
                                <span className="truncate text-muted-foreground/60">
                                  {(d as { lineId: string }).lineId.substring(0, 14)}
                                </span>
                              )}
                            </div>
                          ))}
                          {commit.deltas.length > 4 && (
                            <div className="text-[10px] text-muted-foreground/50 pl-3">
                              +{commit.deltas.length - 4} more
                            </div>
                          )}
                        </div>
                        <div className="text-[9px] text-muted-foreground/50 mt-1.5 font-mono">
                          {new Date(commit.timestamp).toLocaleTimeString()}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>

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

        {/* ─── Footer ────────────────────────────────────────────────────── */}
        <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
          <span>VCS-Retail v2.0.0-PRO MVP</span>
          <span>
            Shared Allocations · Payment Splits · Late-Bound Pricing ·
            Append-Only Ledger
          </span>
        </footer>
      </div>

      {/* ─── Payment Switch Dialog ──────────────────────────────────────── */}
      <PaymentSwitchDialog
        open={paymentSwitchOpen}
        onOpenChange={setPaymentSwitchOpen}
        currentConfigName={currentConfigName}
        newConfigName={pendingConfigName}
        affectedItemCount={itemsOnActiveConfig}
        onChooseExisting={handlePaymentSwitchExisting}
        onChooseNewOnly={handlePaymentSwitchNewOnly}
      />

      {/* ─── Table Split Dialog ─────────────────────────────────────────── */}
      <TableSplitDialog
        open={tableSplitOpen}
        onOpenChange={setTableSplitOpen}
        guests={guests}
        onAddGuest={handleAddGuestFromDialog}
        onCreateSplit={handleCreateSplitConfig}
      />

      {/* ─── Allocation Config Dialog ───────────────────────────────────── */}
      <AllocationConfigDialog
        open={!!allocConfigItem}
        onOpenChange={(open) => {
          if (!open) setAllocConfigItem(null);
        }}
        item={allocConfigItem}
        allocations={projectedState.allocations}
        guests={guests}
        defaultPaymentAllocId={defaultPaymentAllocId}
        defaultPaymentMethod={defaultPaymentMethod}
        totalItemsOnDefault={itemsOnActiveConfig}
        onReassign={handleReassign}
        onSplitPayment={handleSplitPayment}
        onSwitchItemPayment={handleSwitchItemPayment}
        onResetToDefault={handleResetToDefault}
        onAddGuest={handleAddGuestFromDialog}
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
  const [defaultPaymentFromConfig, setDefaultPaymentFromConfig] = React.useState("cash");

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
      toast.success(`${context.orderTypeLabel} order started for ${context.customerFields.name || "customer"}`);
    },
    [initRepo, defaultPaymentFromConfig]
  );

  // ─── Gate: Init Screen vs POS Terminal ─────────────────────────────────

  if (!isInitialized) {
    return <OrderInitScreen onOrderStart={handleOrderStart} storeLabel={storeLabel} />;
  }

  return <POSTerminalInner />;
}