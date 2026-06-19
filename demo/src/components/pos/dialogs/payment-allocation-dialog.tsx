"use client";

import { Badge } from "@/components/ui/badge";
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
import {
  AllocationContext,
  ConfigType,
  ConfigUpdateMode,
  PaymentUpdateMode,
} from "@/lib/pos/types";
import { PAYMENT_METHODS } from "@/lib/pos/ui-utils";
import {
  AllocationBlock,
  AllocationType,
  PaymentAllocation,
  PaymentStrategyType,
  ProjectedLineItem,
} from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  Split,
  User,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { PaymentSplitEntry, SplitEditor, validateSplit } from "./split-editor";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";

interface PaymentAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AllocationContext;
  items: ProjectedLineItem[]; // 1 item for "item", multiple for "group", empty for "header"
  allocations: Record<string, AllocationBlock>;
  defaultPaymentAllocId: string | null;
  defaultPaymentMethod: string;
  paymentConfigs: Array<{ id: string; name: string; isSplit: boolean }>;
  activePaymentConfigId: string | null;
  selectedGuestName?: string | null;
  allItems?: ProjectedLineItem[];

  onApplyConfig: (
    configIdOrMethod: string,
    mode: PaymentUpdateMode | ConfigUpdateMode,
  ) => void;

  onApplyCustomSplit: (
    splits: Array<{
      entity: string;
      strategyType: PaymentStrategyType;
      value: number;
      method?: string | null;
    }>,
    mode: PaymentUpdateMode | ConfigUpdateMode,
  ) => void;
}

export function PaymentAllocationDialog({
  open,
  onOpenChange,
  context,
  items,
  allocations,
  defaultPaymentAllocId,
  defaultPaymentMethod,
  paymentConfigs,
  activePaymentConfigId,
  selectedGuestName,
  allItems = [],
  onApplyConfig,
  onApplyCustomSplit,
}: PaymentAllocationDialogProps) {
  const allocationsState = useVCSStore((s) => s.projectedState.allocations);
  const getGuests = useVCSStore((s) => s.guests);
  const guests = useMemo(() => {
    return getGuests().map((g) => g.name);
  }, [getGuests, allocationsState]);

  type ViewState = "main" | "guest-methods" | "splits" | "custom-split";
  const [view, setView] = useState<ViewState>("main");
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [splits, setSplits] = useState<PaymentSplitEntry[]>([]);

  const formatNumber = useFormatNumber();

  // For the header confirmation flow
  const [pendingSelection, setPendingSelection] = useState<{
    type: ConfigType;
    configIdOrMethod?: string;
    customSplits?: PaymentSplitEntry[];
  } | null>(null);

  // Compute total price of items in context
  const totalContextPrice = useMemo(() => {
    if (context === AllocationContext.Header) return undefined;
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [context, items]);

  // Helper to get active ID, fallback to global default method if activePaymentConfigId is null
  const resolvedActiveId = useMemo(() => {
    if (activePaymentConfigId) return activePaymentConfigId;
    if (defaultPaymentMethod) return `group-default-${defaultPaymentMethod}`;
    return null;
  }, [activePaymentConfigId, defaultPaymentMethod]);

  // Find all allocation IDs belonging to the active configuration
  const activeAllocIds = useMemo(() => {
    if (!resolvedActiveId) return [];
    return Object.values(allocations)
      .filter(
        (a) =>
          a.type === AllocationType.Payment &&
          (a.allocationId === resolvedActiveId ||
            a.correlationId === resolvedActiveId),
      )
      .map((a) => a.allocationId);
  }, [resolvedActiveId, allocations]);

  // Find existing items affected when swapping this default configuration
  const affectedItems = useMemo(() => {
    if (activeAllocIds.length === 0) return [];
    return allItems.filter((item) =>
      item.allocations.some((id) => activeAllocIds.includes(id)),
    );
  }, [allItems, activeAllocIds]);

  const primaryGuest = useMemo(() => {
    return guests[0] || "Guest";
  }, [guests]);

  // Primary guest built-in defaults (group-default-{method})
  const primaryDefaults = useMemo(() => {
    return PAYMENT_METHODS.map((method) => ({
      id: `group-default-${method}`,
      label: `${primaryGuest} (${method.toUpperCase()})`,
      description: "Built-in default payment config",
      badge: method.toUpperCase(),
      isSplit: false,
    }));
  }, [primaryGuest]);

  // Additional guest specific choices derived from allocations or fallback
  const guestMethods = useMemo(() => {
    if (!selectedGuest) return [];
    const methods: Array<{
      id: string;
      label: string;
      description: string;
      badge: string;
      isSplit: boolean;
    }> = [];
    const seenIds = new Set<string>();
    const seenMethods = new Set<string>();

    for (const alloc of Object.values(allocations)) {
      if (alloc.type !== AllocationType.Payment) continue;
      const pay = alloc as PaymentAllocation;
      if (pay.payer === selectedGuest && pay.correlationId) {
        const id = pay.correlationId;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const siblings = Object.values(allocations).filter(
          (a) => a.type === AllocationType.Payment && a.correlationId === id
        );
        const isSplit = siblings.length > 1;

        if (isSplit) {
          const otherPayers = siblings
            .map((a) => (a as PaymentAllocation).payer)
            .filter((p) => p !== selectedGuest);
          const uniqueOthers = Array.from(new Set(otherPayers));
          let splitName = "Split with ";
          if (uniqueOthers.length === 1) {
            splitName += uniqueOthers[0];
          } else if (uniqueOthers.length > 1) {
            splitName += `${uniqueOthers.length} others`;
          } else {
            splitName = "Split";
          }

          methods.push({
            id,
            label: splitName,
            description: `Split payment involving ${selectedGuest}`,
            badge: "SPLIT",
            isSplit: true,
          });
        } else {
          const method = pay.method || "cash";
          if (seenMethods.has(method)) continue;
          seenMethods.add(method);
          methods.push({
            id,
            label: `${selectedGuest} (${method.toUpperCase()})`,
            description: `Default payment config for ${selectedGuest}`,
            badge: method.toUpperCase(),
            isSplit: false,
          });
        }
      }
    }

    if (methods.length === 0) {
      const sanitized =
        selectedGuest
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "guest";
      for (const m of PAYMENT_METHODS) {
        methods.push({
          id: `group-${sanitized}-${m}`,
          label: `${selectedGuest} (${m.toUpperCase()})`,
          description: `Default payment config for ${selectedGuest}`,
          badge: m.toUpperCase(),
          isSplit: false,
        });
      }
    }
    return methods;
  }, [selectedGuest, allocations]);

  const computedPaymentConfigs = useMemo(() => {
    const configs = new Map<string, { id: string; name: string; isSplit: boolean }>();

    for (const cfg of paymentConfigs) {
      configs.set(cfg.id, cfg);
    }

    const groups = new Map<string, PaymentAllocation[]>();
    for (const alloc of Object.values(allocations)) {
      if (alloc.type === AllocationType.Payment) {
        const p = alloc as PaymentAllocation;
        if (p.correlationId?.startsWith("group-default-") || p.correlationId?.startsWith("group-guest-") || p.correlationId?.startsWith("group-")) {
          continue;
        }

        const id = p.correlationId || p.allocationId;
        if (!groups.has(id)) {
          groups.set(id, []);
        }
        groups.get(id)!.push(p);
      }
    }

    for (const [id, allocs] of groups.entries()) {
      if (configs.has(id)) continue;

      const isSplit = allocs.length > 1;
      let name = "";
      if (isSplit) {
        const groupMap = new Map<string, { payers: string[]; strat: string; sortValue: number }>();
        for (const a of allocs) {
          const stratType = a.paymentStrategy.strategyType;
          let key = "";
          let stratLabel = "";
          let sortValue = 0;
          if (stratType === PaymentStrategyType.Fixed || stratType === PaymentStrategyType.FixedItem || PaymentStrategyType.FixedGlobal) {
            key = `fixed-${a.paymentStrategy.value}`;
            stratLabel = `$${formatNumber(a.paymentStrategy.value ?? 0, 2)}`;
            sortValue = a.paymentStrategy.value ?? 0;
          } else if (stratType === PaymentStrategyType.Remaining) {
            key = "remaining";
            stratLabel = "rem";
            sortValue = -1;
          } else {
            const pct = Math.round((a.paymentStrategy.value ?? 1) * 100);
            key = `pct-${pct}`;
            stratLabel = `${pct}%`;
            sortValue = pct;
          }
          if (!groupMap.has(key)) {
            groupMap.set(key, { payers: [], strat: stratLabel, sortValue });
          }
          groupMap.get(key)!.payers.push(a.payer);
        }

        name = Array.from(groupMap.values())
          .sort((a, b) => b.sortValue - a.sortValue)
          .map((g) => {
            const payerStr = g.payers.length > 2 ? `${g.payers.length} Guests` : g.payers.join(", ");
            return `${payerStr} ${g.strat}`;
          })
          .join(" / ");
      } else {
        const a = allocs[0];
        name = `${a.payer} (${a.method ? a.method.toUpperCase() : "ANY"})`;
      }
      configs.set(id, { id, name, isSplit });
    }

    return Array.from(configs.values());
  }, [paymentConfigs, allocations]);

  // Splits & saved configs
  const savedSplits = useMemo(() => {
    return computedPaymentConfigs
      .filter((cfg) => cfg.isSplit)
      .map((cfg) => ({
        id: cfg.id,
        label: cfg.name,
        description: "Split payment config",
        badge: "Split",
        isSplit: true,
      }));
  }, [computedPaymentConfigs]);

  const savedSingles = useMemo(() => {
    return computedPaymentConfigs
      .filter((cfg) => !cfg.isSplit)
      .map((cfg) => ({
        id: cfg.id,
        label: cfg.name,
        description: "Single payment config",
        badge: "Saved",
        isSplit: false,
      }));
  }, [computedPaymentConfigs]);

  // Find if there is an active guest selected (other than the primary guest)
  const activeGuestName = useMemo(() => {
    if (selectedGuestName && selectedGuestName !== primaryGuest) {
      return selectedGuestName;
    }
    return null;
  }, [selectedGuestName, primaryGuest]);

  // Methods for the active guest (if not primary guest) to show as another row on top
  const activeGuestMethods = useMemo(() => {
    if (!activeGuestName) return [];
    const methods: Array<{
      id: string;
      label: string;
      description: string;
      badge: string;
      isSplit: boolean;
    }> = [];
    const seenIds = new Set<string>();
    const seenMethods = new Set<string>();

    for (const alloc of Object.values(allocations)) {
      if (alloc.type !== AllocationType.Payment) continue;
      const pay = alloc as PaymentAllocation;
      if (pay.payer === activeGuestName && pay.correlationId) {
        const id = pay.correlationId;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const siblings = Object.values(allocations).filter(
          (a) => a.type === AllocationType.Payment && a.correlationId === id
        );
        const isSplit = siblings.length > 1;

        if (isSplit) {
          const otherPayers = siblings
            .map((a) => (a as PaymentAllocation).payer)
            .filter((p) => p !== activeGuestName);
          const uniqueOthers = Array.from(new Set(otherPayers));
          let splitName = "Split with ";
          if (uniqueOthers.length === 1) {
            splitName += uniqueOthers[0];
          } else if (uniqueOthers.length > 1) {
            splitName += `${uniqueOthers.length} others`;
          } else {
            splitName = "Split";
          }

          methods.push({
            id,
            label: splitName,
            description: `Split payment involving ${activeGuestName}`,
            badge: "SPLIT",
            isSplit: true,
          });
        } else {
          const method = pay.method || "cash";
          if (seenMethods.has(method)) continue;
          seenMethods.add(method);
          methods.push({
            id,
            label: `${activeGuestName} (${method.toUpperCase()})`,
            description: `Default payment config for ${activeGuestName}`,
            badge: method.toUpperCase(),
            isSplit: false,
          });
        }
      }
    }

    if (methods.length === 0) {
      const sanitized =
        activeGuestName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "guest";
      for (const m of PAYMENT_METHODS) {
        methods.push({
          id: `group-${sanitized}-${m}`,
          label: `${activeGuestName} (${m.toUpperCase()})`,
          description: `Default payment config for ${activeGuestName}`,
          badge: m.toUpperCase(),
          isSplit: false,
        });
      }
    }
    return methods;
  }, [activeGuestName, allocations]);

  // Filters
  const filteredPrimaryDefaults = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return primaryDefaults;
    return primaryDefaults.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.badge.toLowerCase().includes(query),
    );
  }, [primaryDefaults, debouncedQuery]);

  const filteredActiveGuestMethods = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return activeGuestMethods;
    return activeGuestMethods.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.badge.toLowerCase().includes(query),
    );
  }, [activeGuestMethods, debouncedQuery]);

  const filteredOtherGuests = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    // Exclude both primary guest and the current active guest (since the active guest has their own detailed row)
    const otherGuests = guests.slice(1).filter((g) => g !== activeGuestName);
    if (!query) return otherGuests;
    return otherGuests.filter((g) => g.toLowerCase().includes(query));
  }, [guests, debouncedQuery, activeGuestName]);

  const filteredSavedSplits = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return savedSplits;
    return savedSplits.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.badge.toLowerCase().includes(query),
    );
  }, [savedSplits, debouncedQuery]);

  const filteredSavedSingles = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return savedSingles;
    return savedSingles.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.badge.toLowerCase().includes(query),
    );
  }, [savedSingles, debouncedQuery]);

  // Reset state when opening/closing
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setDebouncedQuery("");
      setView("main");
      setSelectedGuest(null);
      setSplits([]);
      setPendingSelection(null);
    }
  }, [open]);

  // Load split config details to populate custom split editor (Edit / Duplicate)
  const loadSplitConfig = useCallback(
    (configId: string) => {
      const matchedAllocs = Object.values(allocations).filter(
        (a) =>
          a.type === AllocationType.Payment &&
          (a.allocationId === configId || a.correlationId === configId),
      ) as PaymentAllocation[];

      if (matchedAllocs.length > 0) {
        const loadedSplits: PaymentSplitEntry[] = matchedAllocs.map((a) => {
          const strat = a.paymentStrategy;
          let strategyType = strat.strategyType as PaymentStrategyType;
          if (strategyType === PaymentStrategyType.Fixed) {
            strategyType = PaymentStrategyType.FixedItem;
          }
          const val =
            strategyType === PaymentStrategyType.Percentage
              ? (strat.value ?? 1) * 100
              : (strat.value ?? 0);
          return {
            entity: a.payer,
            strategyType,
            value: val,
            method: a.method || null,
          };
        });
        setSplits(loadedSplits);
        setView("custom-split");
      }
    },
    [allocations],
  );

  // Initialize splits for custom split editor
  const handleStartCustomSplit = useCallback(() => {
    if (guests.length > 0) {
      setSplits([
        {
          entity: guests[0],
          strategyType: PaymentStrategyType.Percentage,
          value: 100,
          method: null,
        },
      ]);
    } else {
      setSplits([]);
    }
    setView("custom-split");
  }, [guests]);

  // Handle choice selection
  const handleSelectConfig = (choiceId: string) => {
    if (context === AllocationContext.Header) {
      // Transition to switch confirmation
      setPendingSelection({
        type: ConfigType.Config,
        configIdOrMethod: choiceId,
      });
    } else if (context === AllocationContext.Item) {
      onApplyConfig(choiceId, PaymentUpdateMode.Item);
      onOpenChange(false);
    } else {
      // group context
      onApplyConfig(choiceId, PaymentUpdateMode.Group);
      onOpenChange(false);
    }
  };

  // Check split validity
  const isValidSplit = validateSplit(splits, totalContextPrice);

  // Apply custom split logic
  const handleSaveCustomSplit = (
    mode: PaymentUpdateMode | ConfigUpdateMode,
  ) => {
    if (!isValidSplit) return;
    const mappedSplits = splits.map((s) => ({
      entity: s.entity,
      strategyType: s.strategyType,
      value:
        s.strategyType === PaymentStrategyType.Percentage
          ? s.value / 100
          : s.value,
      method: s.method,
    }));
    onApplyCustomSplit(mappedSplits, mode);
    onOpenChange(false);
  };

  const handleSaveConfigOnly = () => {
    if (!isValidSplit) return;
    const mappedSplits = splits.map((s) => ({
      entity: s.entity,
      strategyType: s.strategyType,
      value: s.strategyType === PaymentStrategyType.Percentage ? s.value / 100 : s.value,
      method: s.method,
    }));
    useVCSStore.getState().createTableSplitConfig(mappedSplits);
    setView("splits");
  };

  const handleCustomSplitClick = () => {
    if (context === AllocationContext.Header) {
      setPendingSelection({
        type: ConfigType.Custom,
        customSplits: splits,
      });
    } else if (context === AllocationContext.Group) {
      handleSaveCustomSplit(PaymentUpdateMode.Group);
    }
  };

  // Header Switch choice final application
  const handleApplyHeaderChoice = (mode: ConfigUpdateMode) => {
    if (!pendingSelection) return;
    if (
      pendingSelection.type === ConfigType.Config &&
      pendingSelection.configIdOrMethod
    ) {
      onApplyConfig(pendingSelection.configIdOrMethod, mode);
    } else if (
      pendingSelection.type === ConfigType.Custom &&
      pendingSelection.customSplits
    ) {
      const mappedSplits = pendingSelection.customSplits.map((s) => ({
        entity: s.entity,
        strategyType: s.strategyType,
        value:
          s.strategyType === PaymentStrategyType.Percentage
            ? s.value / 100
            : s.value,
        method: s.method,
      }));
      onApplyCustomSplit(mappedSplits, mode);
    }
    onOpenChange(false);
  };

  // Render context header info
  const renderHeaderDetails = () => {
    if (context === AllocationContext.Item && items[0]) {
      return (
        <div className="rounded-lg border bg-muted/30 p-2.5 mb-2.5 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-foreground">
              {items[0].name}
            </span>
            <span className="text-muted-foreground ml-1.5 font-mono">
              ({items[0].sku})
            </span>
          </div>
          <span className="font-mono font-bold">
            ${formatNumber(items[0].totalPrice, 2)}
          </span>
        </div>
      );
    }
    if (context === AllocationContext.Group) {
      return (
        <div className="rounded-lg border bg-muted/30 p-2.5 mb-2.5 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-foreground">
              Allocate {items.length} Selected Items
            </span>
          </div>
          <span className="font-mono font-bold">
            ${totalContextPrice !== undefined ? formatNumber(totalContextPrice, 2) : "0.00"}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl landscape:sm:max-w-5xl landscape:md:max-w-6xl max-h-[95vh] landscape:max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
            <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
            {context === AllocationContext.Header
              ? "Order Default Payment Configuration"
              : context === AllocationContext.Group
                ? "Allocate Payment (Bulk)"
                : "Allocate Payment"}
          </DialogTitle>
          <DialogDescription className="text-sm md:text-base">
            {context === AllocationContext.Header
              ? "Configure the default payment allocation for new items on the order."
              : "Set payment configuration or create custom splits for the selected item(s)."}
          </DialogDescription>
        </DialogHeader>

        {renderHeaderDetails()}

        {/* Header Mode Confirmation Flow */}
        {pendingSelection ? (
          <div className="space-y-4 py-4 animate-in fade-in zoom-in duration-200">
            <div className="rounded-lg border p-4 bg-primary/5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-primary">
                <HelpCircle className="w-4 h-4" />
                Apply Payment Allocation
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Do you want to switch all existing items in the order to this
                configuration, or set it as default for new items only?
              </p>

              {affectedItems.length > 0 ? (
                <div className="space-y-1.5 pt-2 border-t border-primary/10">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Affected Items ({affectedItems.length})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 bg-background/50 p-2 rounded border border-primary/5 text-xs font-medium text-foreground">
                    {affectedItems.map((item) => (
                      <div
                        key={item.lineId}
                        className="flex justify-between items-center gap-2"
                      >
                        <span className="truncate">
                          {item.name}{" "}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({item.sku})
                          </span>
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground font-bold shrink-0">
                          ${formatNumber(item.totalPrice, 2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground pt-1.5 italic border-t border-primary/10">
                  No existing items will be affected (none are currently using
                  the default configuration).
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingSelection(null)}
              >
                Go Back
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  handleApplyHeaderChoice(ConfigUpdateMode.NewOnly)
                }
              >
                New Items Only
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  handleApplyHeaderChoice(ConfigUpdateMode.ChangeExisting)
                }
                className="gap-1"
              >
                Apply to Affected Items
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : view === "custom-split" ? (
          /* Custom Split Creator View */
          <div className="space-y-4 py-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                Customize Splits & Payers
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setView("splits")}
              >
                Back to Splits
              </Button>
            </div>

            <SplitEditor
              splits={splits}
              onChange={setSplits}
              itemTotalPrice={totalContextPrice}
            />

            <DialogFooter className="pt-2 gap-2 sm:justify-between border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setView("splits");
                  setSplits([]);
                }}
              >
                Cancel
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isValidSplit}
                  onClick={handleSaveConfigOnly}
                >
                  Save Config
                </Button>
                {context === AllocationContext.Item ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!isValidSplit}
                      onClick={() =>
                        handleSaveCustomSplit(PaymentUpdateMode.Item)
                      }
                    >
                      Apply to Item Only
                    </Button>
                    <Button
                      size="sm"
                      disabled={!isValidSplit}
                      onClick={() =>
                        handleSaveCustomSplit(PaymentUpdateMode.Group)
                      }
                    >
                      Update Entire Group
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    disabled={!isValidSplit}
                    onClick={handleCustomSplitClick}
                  >
                    {context === AllocationContext.Header
                      ? "Continue..."
                      : "Apply to Selected"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        ) : view === "guest-methods" ? (
          /* Guest Methods View */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 md:pb-3 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 md:h-12 gap-1.5 pl-2 pr-3 text-xs md:text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setView("main")}
                >
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                  Back
                </Button>
                <span className="text-sm md:text-base font-semibold text-foreground">
                  Methods for {selectedGuest}
                </span>
              </div>
            </div>

            <div className="min-h-55 max-h-[50vh] md:max-h-[55vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 py-1 md:py-2">
                {guestMethods.map((choice) => {
                  const isActive = choice.id === resolvedActiveId;
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleSelectConfig(choice.id)}
                      className={`flex flex-col items-start gap-1.5 md:gap-2 rounded-lg border p-3 md:p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/40 w-full ${isActive
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "bg-card"
                        }`}
                    >
                      <div className="flex w-full items-start justify-between gap-1.5">
                        <span className="min-w-0 truncate text-xs md:text-sm font-semibold text-foreground flex items-center gap-1">
                          {isActive && (
                            <Check className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
                          )}
                          {choice.badge}
                        </span>
                      </div>
                      <span className="text-[9px] md:text-xs text-muted-foreground leading-normal">
                        {choice.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 md:pt-5 border-t gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-12 md:h-16 text-sm md:text-base"
              >
                Close
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-12 md:h-16 text-xs md:text-sm"
                onClick={() => setView("main")}
              >
                Back to Main
              </Button>
            </div>
          </div>
        ) : view === "splits" ? (
          /* Splits and Custom Configs View */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 md:pb-3 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 md:h-12 gap-1.5 pl-2 pr-3 text-xs md:text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setView("main")}
                >
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                  Back
                </Button>
                <span className="text-sm md:text-base font-semibold text-foreground">
                  Splits & Custom Configurations
                </span>
              </div>
            </div>

            <Button
              className="w-full gap-1.5 justify-center h-10 md:h-12 text-xs md:text-sm"
              variant="secondary"
              size="sm"
              onClick={handleStartCustomSplit}
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              Create Custom Split / Payer...
            </Button>

            <div className="min-h-55 max-h-[45vh] overflow-y-auto pr-1">
              {filteredSavedSplits.length === 0 &&
                filteredSavedSingles.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No saved configurations. Create a custom split above.
                </div>
              ) : (
                <div className="space-y-4 py-1">
                  {filteredSavedSplits.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Saved Splits
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredSavedSplits.map((choice) => {
                          const isActive = choice.id === resolvedActiveId;
                          return (
                            <div
                              key={choice.id}
                              onClick={() => handleSelectConfig(choice.id)}
                              className={`group flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/40 w-full cursor-pointer ${isActive
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "bg-card"
                                }`}
                            >
                              <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
                                <div className="flex w-full items-start justify-between gap-2">
                                  <span className="min-w-0 truncate text-xs font-semibold text-foreground flex items-center gap-1">
                                    {isActive && (
                                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                    )}
                                    {choice.label}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground leading-normal mt-0.5 font-mono">
                                  {choice.description}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-accent/60 shrink-0 text-muted-foreground hover:text-foreground"
                                  title="Edit configuration"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadSplitConfig(choice.id);
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-accent/60 shrink-0 text-muted-foreground hover:text-foreground"
                                  title="Duplicate configuration"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadSplitConfig(choice.id);
                                  }}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                                <Badge
                                  variant="outline"
                                  className="text-[8px] h-4 shrink-0 px-1 font-mono uppercase bg-muted/40 hidden sm:block"
                                >
                                  Split
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filteredSavedSingles.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Saved Single-Payer Configs
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredSavedSingles.map((choice) => {
                          const isActive = choice.id === resolvedActiveId;
                          return (
                            <div
                              key={choice.id}
                              onClick={() => handleSelectConfig(choice.id)}
                              className={`group flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/40 w-full cursor-pointer ${isActive
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "bg-card"
                                }`}
                            >
                              <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
                                <div className="flex w-full items-start justify-between gap-2">
                                  <span className="min-w-0 truncate text-xs font-semibold text-foreground flex items-center gap-1">
                                    {isActive && (
                                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                    )}
                                    {choice.label}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground leading-normal mt-0.5 font-mono">
                                  {choice.description}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-accent/60 shrink-0 text-muted-foreground hover:text-foreground"
                                  title="Edit configuration"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadSplitConfig(choice.id);
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-accent/60 shrink-0 text-muted-foreground hover:text-foreground"
                                  title="Duplicate configuration"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadSplitConfig(choice.id);
                                  }}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                                <Badge
                                  variant="outline"
                                  className="text-[8px] h-4 shrink-0 px-1 font-mono uppercase bg-muted/40"
                                >
                                  Saved
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setView("main")}
              >
                Back to Main
              </Button>
            </div>
          </div>
        ) : (
          /* Main Search & Grid Selector View */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search default payer methods or guest names..."
                className="pl-10 pr-9 h-10 md:h-12 text-xs md:text-sm"
              />
              {searchQuery !== debouncedQuery && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="min-h-55 max-h-[45vh] overflow-y-auto pr-1">
              {filteredPrimaryDefaults.length === 0 &&
                filteredActiveGuestMethods.length === 0 &&
                filteredOtherGuests.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No matching payment methods or guests found.
                </div>
              ) : (
                <div className="space-y-4 py-1">
                  {/* Active Guest Section */}
                  {activeGuestName && filteredActiveGuestMethods.length > 0 && (
                    <div className="space-y-2 md:space-y-3">
                      <div className="text-[10px] md:text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Badge className="text-[8px] md:text-[9px] h-5 md:h-6 scale-95 shrink-0 px-1.5 md:px-2 font-mono uppercase bg-primary/10 text-primary border-primary/20">
                          Active
                        </Badge>
                        Guest: {activeGuestName}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                        {filteredActiveGuestMethods.map((choice) => {
                          const isActive = choice.id === resolvedActiveId;
                          return (
                            <button
                              key={choice.id}
                              onClick={() => handleSelectConfig(choice.id)}
                              className={`flex flex-col items-start gap-1.5 md:gap-2 rounded-lg border p-3 md:p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/40 w-full ${isActive
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "bg-card"
                                }`}
                            >
                              <div className="flex w-full items-start justify-between gap-1.5">
                                <span className="min-w-0 truncate text-xs md:text-sm font-semibold text-foreground flex items-center gap-1">
                                  {isActive && (
                                    <Check className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
                                  )}
                                  {choice.badge}
                                </span>
                              </div>
                              <span className="text-[9px] md:text-xs text-muted-foreground leading-normal">
                                {choice.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Default Payer Section */}
                  {filteredPrimaryDefaults.length > 0 && (
                    <div className="space-y-2 md:space-y-3">
                      <div className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Default Payer ({primaryGuest})
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                        {filteredPrimaryDefaults.map((choice) => {
                          const isActive = choice.id === resolvedActiveId;
                          return (
                            <button
                              key={choice.id}
                              onClick={() => handleSelectConfig(choice.id)}
                              className={`flex flex-col items-start gap-1.5 md:gap-2 rounded-lg border p-3 md:p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/40 w-full ${isActive
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "bg-card"
                                }`}
                            >
                              <div className="flex w-full items-start justify-between gap-1.5">
                                <span className="min-w-0 truncate text-xs md:text-sm font-semibold text-foreground flex items-center gap-1">
                                  {isActive && (
                                    <Check className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
                                  )}
                                  {choice.badge}
                                </span>
                              </div>
                              <span className="text-[9px] md:text-xs text-muted-foreground leading-normal">
                                {choice.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Other Guests Section */}
                  {filteredOtherGuests.length > 0 && (
                    <div className="space-y-2 md:space-y-3">
                      <div className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Other Guests ({guests.length - 1})
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                        {filteredOtherGuests.map((guest) => (
                          <button
                            key={guest}
                            onClick={() => {
                              setSelectedGuest(guest);
                              setView("guest-methods");
                              setSearchQuery("");
                            }}
                            className="flex items-center gap-2 rounded-lg border bg-card p-3 md:p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/40 w-full min-h-14 md:min-h-16"
                          >
                            <User className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
                            <span className="min-w-0 truncate text-xs md:text-sm font-semibold text-foreground">
                              {guest}
                            </span>
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0 ml-auto" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 md:pt-5 border-t gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-12 md:h-16 text-sm md:text-base"
              >
                Close
              </Button>

              <Button
                size="sm"
                className="h-12 md:h-16 text-xs md:text-sm gap-1.5"
                variant="outline"
                onClick={() => {
                  setView("splits");
                  setSearchQuery("");
                }}
              >
                <Split className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Splits & Saved Configs...
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}