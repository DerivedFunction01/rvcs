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
import { ConfigType, FloorConfig, FloorObjectKind } from "@/lib/pos/types";
import { AllocationContext, ConfigUpdateMode, OrderType } from "@/lib/pos/types";
import type { Guest } from "@/lib/pos/ui-utils";
import { formatFulfillmentTime } from "@/lib/pos/utils";
import {
  AllocationBlock,
  AllocationType,
  FulfillmentAllocation,
  ProjectedLineItem,
  TimeBlockType,
} from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Grid2x2,
  HelpCircle,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Store,
  Truck,
  User,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface FulfillmentAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AllocationContext;
  items: ProjectedLineItem[];
  allocations: Record<string, AllocationBlock>;
  activeFulfillmentConfigId: string | null;
  allItems: ProjectedLineItem[];
  floorConfigs: FloorConfig[];
  guests: Guest[];
  onApplyFulfillmentConfig: (
    selection: {
      type: ConfigType;
      configId?: string;
      customConfig?: {
        method: string;
        timeType: TimeBlockType;
        calculatedAt: string | null;
        destinationLabel: string;
        destinationId: string | null;
      };
    },
    mode?: ConfigUpdateMode,
  ) => void;
}

const formatLocalDate = (isoString: string | null) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const date = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${date}T${hours}:${minutes}`;
};

export function FulfillmentAllocationDialog({
  open,
  onOpenChange,
  context,
  items,
  allocations,
  activeFulfillmentConfigId,
  allItems,
  floorConfigs,
  guests,
  onApplyFulfillmentConfig,
}: FulfillmentAllocationDialogProps) {
  type ViewState = "main" | "customize";
  const [view, setView] = useState<ViewState>("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Custom configuration states
  const [method, setMethod] = useState<OrderType>(OrderType.WalkIn);
  const [timeType, setTimeType] = useState<TimeBlockType>(
    TimeBlockType.Immediate,
  );
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null);

  const [destType, setDestType] = useState<ConfigType | FloorObjectKind>(
   ConfigType.Guest,
  );
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [customDestLabel, setCustomDestLabel] = useState<string>("");

  // For global switch confirmation flow
  const [pendingSelection, setPendingSelection] = useState<{
    type: ConfigType;
    configId?: string;
    customConfig?: {
      method: string;
      timeType: TimeBlockType;
      calculatedAt: string | null;
      destinationLabel: string;
      destinationId: string | null;
    };
  } | null>(null);

  // Initialize/reset states
  useEffect(() => {
    if (open) {
      setView("main");
      setSearchQuery("");
      setDebouncedQuery("");
      setPendingSelection(null);

      // Try to read active settings to prepopulate customize view
      let target: FulfillmentAllocation | null = null;
      if (context === AllocationContext.Global) {
        if (activeFulfillmentConfigId) {
          const alloc = Object.values(allocations).find(
            (a) =>
              a.type === AllocationType.Fulfillment &&
              (a.allocationId === activeFulfillmentConfigId ||
                a.correlationId === activeFulfillmentConfigId),
          );
          if (alloc) target = alloc as FulfillmentAllocation;
        }
      } else if (items.length > 0) {
        for (const id of items[0].allocations) {
          const alloc = allocations[id];
          if (alloc?.type === AllocationType.Fulfillment) {
            target = alloc as FulfillmentAllocation;
            break;
          }
        }
      }

      if (target) {
        setMethod(target.method as OrderType);
        setTimeType(target.time.type);
        setCalculatedAt(target.time.calculatedAt);
        const meta = target.fulfillmentMetadata;
        if (
          meta.destinationId &&
          guests.some((g) => g.id === meta.destinationId)
        ) {
          setDestType(ConfigType.Guest);
          setSelectedGuestId(meta.destinationId);
          setCustomDestLabel("");
        } else if (meta.destinationId) {
          setDestType(FloorObjectKind.Table);
          setSelectedTableId(meta.destinationId);
          setCustomDestLabel("");
        } else {
          setDestType(ConfigType.Custom);
          setCustomDestLabel(meta.destinationLabel || "");
        }
      } else {
        setMethod(OrderType.WalkIn);
        setTimeType(TimeBlockType.Immediate);
        setCalculatedAt(null);
        setDestType(ConfigType.Guest);
        setSelectedGuestId(guests[0]?.id || null);
        setSelectedTableId(null);
        setCustomDestLabel("");
      }
    }
  }, [open, context, items, allocations, activeFulfillmentConfigId, guests]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Extract all tables from layouts
  const allTables = useMemo(() => {
    const tables: Array<{ id: string; label: string }> = [];
    for (const floor of floorConfigs) {
      for (const obj of floor.objects) {
        if (obj.kind === FloorObjectKind.Table) {
          tables.push({
            id: obj.id,
            label: obj.displayName || obj.label || `Table ${obj.id}`,
          });
        }
      }
    }
    return tables;
  }, [floorConfigs]);

  // Set default selections based on destination type change
  useEffect(() => {
    if (destType === FloorObjectKind.Table && !selectedTableId && allTables.length > 0) {
      setSelectedTableId(allTables[0].id);
    }
    if (destType === ConfigType.Guest && !selectedGuestId && guests.length > 0) {
      setSelectedGuestId(guests[0].id);
    }
  }, [destType, allTables, selectedTableId, guests, selectedGuestId]);

  // List of active default configurations
  const builtInConfigs = useMemo(() => {
    return [
      {
        id: "group-default-walk-in",
        label: "Walk In / Dine In",
        method: OrderType.WalkIn,
        description: "Standard table or counter service default config",
        icon: Store,
      },
      {
        id: "group-default-pickup",
        label: "Pickup",
        method: OrderType.Pickup,
        description: "Counter pickup default configuration",
        icon: PackageCheck,
      },
      {
        id: "group-default-delivery",
        label: "Delivery",
        method: OrderType.Delivery,
        description: "Delivery tracking default configuration",
        icon: Truck,
      },
    ];
  }, []);

  // Filtered built-in configs
  const filteredBuiltIns = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return builtInConfigs;
    return builtInConfigs.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.method.toLowerCase().includes(q),
    );
  }, [builtInConfigs, debouncedQuery]);

  // Find other saved fulfillment configs in the repo allocations
  const savedConfigs = useMemo(() => {
    const configs: Array<{
      id: string;
      label: string;
      description: string;
      method: string;
      destLabel: string;
      timeLabel: string;
      icon: React.ElementType;
    }> = [];
    const seen = new Set<string>();

    for (const alloc of Object.values(allocations)) {
      if (alloc.type === AllocationType.Fulfillment) {
        const f = alloc as FulfillmentAllocation;
        const isDefault = f.correlationId?.startsWith("group-default-");
        if (isDefault) continue;

        const id = f.correlationId || f.allocationId;
        if (seen.has(id)) continue;
        seen.add(id);

        const methodLabel =
          f.method === OrderType.WalkIn
            ? "Walk In"
            : f.method === OrderType.Pickup
              ? "Pickup"
              : f.method === OrderType.Delivery
                ? "Delivery"
                : f.method;

        const destLabel = f.fulfillmentMetadata.destinationLabel || ConfigType.Guest;
        const timeLabel =
          f.time.type === TimeBlockType.Immediate || !f.time.calculatedAt
            ? "Immediate"
            : formatFulfillmentTime(f.time.calculatedAt);

        const Icon =
          f.method === OrderType.Delivery
            ? Truck
            : f.method === OrderType.Pickup
              ? PackageCheck
              : Store;

        configs.push({
          id,
          label: `${methodLabel} to ${destLabel}`,
          description: `Timing: ${timeLabel}`,
          method: f.method,
          destLabel,
          timeLabel,
          icon: Icon,
        });
      }
    }
    return configs;
  }, [allocations]);

  // Filtered saved configs
  const filteredSavedConfigs = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return savedConfigs;
    return savedConfigs.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.method.toLowerCase().includes(q),
    );
  }, [savedConfigs, debouncedQuery]);

  // Retrieve current active config details for UI header
  const activeConfigDetails = useMemo(() => {
    if (!activeFulfillmentConfigId) return null;
    const alloc = Object.values(allocations).find(
      (a) =>
        a.type === AllocationType.Fulfillment &&
        (a.allocationId === activeFulfillmentConfigId ||
          a.correlationId === activeFulfillmentConfigId),
    ) as FulfillmentAllocation | undefined;

    if (!alloc) return null;

    const methodLabel =
      alloc.method === OrderType.WalkIn
        ? "Walk In"
        : alloc.method === OrderType.Pickup
          ? "Pickup"
          : alloc.method === OrderType.Delivery
            ? "Delivery"
            : alloc.method;

    return {
      id: activeFulfillmentConfigId,
      methodLabel,
      destLabel: alloc.fulfillmentMetadata.destinationLabel || ConfigType.Guest,
      timeLabel:
        alloc.time.type === TimeBlockType.Immediate || !alloc.time.calculatedAt
          ? "Immediate"
          : formatFulfillmentTime(alloc.time.calculatedAt),
      icon:
        alloc.method === OrderType.Delivery
          ? Truck
          : alloc.method === OrderType.Pickup
            ? PackageCheck
            : Store,
    };
  }, [activeFulfillmentConfigId, allocations]);

  // Resolve destination details based on state
  const resolvedDestination = useMemo(() => {
    let label: FloorObjectKind | ConfigType | string = ConfigType.Guest;
    let id: string | null = null;

    if (destType === FloorObjectKind.Table) {
      const t = allTables.find((x) => x.id === selectedTableId);
      label = t ? t.label : FloorObjectKind.Table;
      id = selectedTableId;
    } else if (destType === ConfigType.Guest) {
      const g = guests.find((x) => x.id === selectedGuestId);
      label = g ? g.alias || `Guest ${g.number}` : ConfigType.Guest;
      id = selectedGuestId;
    } else {
      label = customDestLabel.trim() || "Guest Address";
      id = null;
    }

    return { label, id };
  }, [
    destType,
    allTables,
    selectedTableId,
    guests,
    selectedGuestId,
    customDestLabel,
  ]);

  // Save changes handler
  const handleSelectConfig = (configId: string) => {
    if (context === AllocationContext.Global) {
      setPendingSelection({ type: ConfigType.Config, configId });
    } else {
      onApplyFulfillmentConfig({ type: ConfigType.Config, configId });
      onOpenChange(false);
    }
  };

  const handleApplyCustom = () => {
    const customConfig = {
      method,
      timeType,
      calculatedAt: timeType === TimeBlockType.Immediate ? null : calculatedAt,
      destinationLabel: resolvedDestination.label,
      destinationId: resolvedDestination.id,
    };

    if (context === AllocationContext.Global) {
      setPendingSelection({ type: ConfigType.Custom, customConfig });
    } else {
      onApplyFulfillmentConfig(
        { type: ConfigType.Custom, customConfig },
        ConfigUpdateMode.ChangeExisting,
      );
      onOpenChange(false);
    }
  };

  const handleConfirmPending = (mode: ConfigUpdateMode) => {
    if (!pendingSelection) return;
    if (pendingSelection.type === ConfigType.Config && pendingSelection.configId) {
      onApplyFulfillmentConfig(
        { type: ConfigType.Config, configId: pendingSelection.configId },
        mode,
      );
    } else if (
      pendingSelection.type === ConfigType.Custom &&
      pendingSelection.customConfig
    ) {
      onApplyFulfillmentConfig(
        { type: ConfigType.Custom, customConfig: pendingSelection.customConfig },
        mode,
      );
    }
    onOpenChange(false);
  };

  const handleSaveConfigOnly = useCallback(() => {
    const customConfig = {
      method,
      timeType,
      calculatedAt: timeType === TimeBlockType.Immediate ? null : calculatedAt,
      destinationLabel: resolvedDestination.label,
      destinationId: resolvedDestination.id,
    };
    useVCSStore.getState().createFulfillmentConfig(customConfig);
    toast.success("Fulfillment configuration saved.");
    setView("main");
  }, [method, timeType, calculatedAt, resolvedDestination]);

  const loadFulfillmentConfig = useCallback(
    (configId: string) => {
      const alloc = Object.values(allocations).find(
        (a) =>
          a.type === AllocationType.Fulfillment &&
          (a.allocationId === configId || a.correlationId === configId),
      ) as FulfillmentAllocation | undefined;

      if (alloc) {
        setMethod(alloc.method as OrderType);
        setTimeType(alloc.time.type);
        setCalculatedAt(alloc.time.calculatedAt);
        const meta = alloc.fulfillmentMetadata;
        if (
          meta.destinationId &&
          guests.some((g) => g.id === meta.destinationId)
        ) {
          setDestType(ConfigType.Guest);
          setSelectedGuestId(meta.destinationId);
          setCustomDestLabel("");
        } else if (meta.destinationId) {
          setDestType(FloorObjectKind.Table);
          setSelectedTableId(meta.destinationId);
          setCustomDestLabel("");
        } else {
          setDestType(ConfigType.Custom);
          setCustomDestLabel(meta.destinationLabel || "");
        }
        setView("customize");
      }
    },
    [allocations, guests],
  );

  // Find affected items list for global change warning
  const affectedItems = useMemo(() => {
    if (context !== AllocationContext.Global || !activeFulfillmentConfigId)
      return [];

    // Find all old allocations associated with active configuration ID
    const oldAllocs = Object.values(allocations).filter(
      (a) =>
        a.type === AllocationType.Fulfillment &&
        (a.allocationId === activeFulfillmentConfigId ||
          a.correlationId === activeFulfillmentConfigId),
    );
    const oldIds = oldAllocs.map((a) => a.allocationId);

    return allItems.filter((item) =>
      item.allocations.some((id) => oldIds.includes(id)),
    );
  }, [context, activeFulfillmentConfigId, allocations, allItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl flex flex-col max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
            {context === AllocationContext.Global
              ? "Default Fulfillment Settings"
              : context === AllocationContext.Group
                ? "Fulfillment (Bulk)"
                : AllocationType.Fulfillment}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {context === AllocationContext.Global
              ? "Set default fulfillment methods, timing, and destinations for new order items."
              : "Set fulfillment details for the selected items."}
          </DialogDescription>
        </DialogHeader>

        {/* 1. Global Confirmation Flow */}
        {pendingSelection ? (
          <div className="space-y-4 py-3 animate-in fade-in zoom-in duration-200">
            <div className="rounded-lg border p-4 bg-emerald-50/40 dark:bg-emerald-950/10 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <HelpCircle className="w-4 h-4" />
                Apply Default Fulfillment
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Do you want to switch all existing items in the order to this
                configuration, or set it as default for new items only?
              </p>

              {affectedItems.length > 0 ? (
                <div className="space-y-1.5 pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Affected Items ({affectedItems.length})
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 bg-background/50 p-2 rounded border border-emerald-100/30 text-xs font-mono">
                    {affectedItems.map((item) => (
                      <div
                        key={item.lineId}
                        className="flex justify-between items-center text-muted-foreground"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="shrink-0 text-[10px]">
                          qty {item.qty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground pt-1.5 italic border-t border-emerald-100 dark:border-emerald-900/40">
                  No existing items will be affected (none are currently using
                  the default configuration).
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
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
                onClick={() => handleConfirmPending(ConfigUpdateMode.NewOnly)}
              >
                New Items Only
              </Button>
              <Button
                size="sm"
                onClick={() => handleConfirmPending(ConfigUpdateMode.ChangeExisting)}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Apply to Affected Items
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </div>
        ) : view === "customize" ? (
          /* 2. Custom Configurator View */
          <div className="space-y-4 py-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1 border-b">
              <span className="text-sm font-semibold">
                Custom Fulfillment Details
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setView("main")}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to Configs
              </Button>
            </div>

            {/* Method Select */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Fulfillment Method
              </label>
              <div className="flex gap-2">
                {[
                  { id: OrderType.WalkIn, label: "Walk In", icon: Store },
                  { id: OrderType.Pickup, label: "Pickup", icon: PackageCheck },
                  { id: OrderType.Delivery, label: "Delivery", icon: Truck },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = method === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant={active ? "default" : "outline"}
                      className={`flex-1 gap-1.5 h-9 text-xs ${active ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                      onClick={() => setMethod(item.id)}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Time Settings */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Timing
              </label>
              <div className="flex gap-2">
                {[
                  { id: TimeBlockType.Immediate, label: "Immediate" },
                  { id: TimeBlockType.Scheduled, label: "Scheduled" },
                  { id: TimeBlockType.Deferred, label: "Deferred" },
                ].map((item) => {
                  const active = timeType === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant={active ? "default" : "outline"}
                      className={`flex-1 h-8 text-xs ${active ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                      onClick={() => {
                        setTimeType(item.id);
                        if (
                          item.id === TimeBlockType.Scheduled &&
                          !calculatedAt
                        ) {
                          setCalculatedAt(
                            new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                          );
                        }
                      }}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>

              {timeType === TimeBlockType.Scheduled && (
                <div className="mt-2 rounded-lg border p-3 bg-muted/10">
                  <input
                    type="datetime-local"
                    value={formatLocalDate(calculatedAt)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setCalculatedAt(new Date(val).toISOString());
                      }
                    }}
                    className="w-full bg-background border rounded px-3 py-2 text-xs focus-visible:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Destination Settings */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Destination Target
              </label>
              <div className="flex gap-2">
                {[
                  { id: ConfigType.Guest, label: "Guest", icon: User },
                  { id: FloorObjectKind.Table, label: "Table", icon: Grid2x2 },
                  { id: ConfigType.Custom, label: "Custom", icon: Truck },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = destType === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant={active ? "default" : "outline"}
                      className={`flex-1 gap-1 h-8 text-[11px] ${active ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                      onClick={() => setDestType(item.id as any)}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>

              {/* Destination Detail Picker */}
              <div className="mt-2 rounded-lg border p-3 bg-muted/10 space-y-2">
                {destType === ConfigType.Guest && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Select Guest
                    </span>
                    <select
                      value={selectedGuestId || ""}
                      onChange={(e) =>
                        setSelectedGuestId(e.target.value || null)
                      }
                      className="w-full bg-background border rounded px-3 py-1.5 text-xs focus-visible:outline-none"
                    >
                      {guests.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.alias || `Guest ${g.number}`}
                        </option>
                      ))}
                      {guests.length === 0 && (
                        <option value="">No guests defined</option>
                      )}
                    </select>
                  </div>
                )}

                {destType === FloorObjectKind.Table && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Select Table
                    </span>
                    <select
                      value={selectedTableId || ""}
                      onChange={(e) =>
                        setSelectedTableId(e.target.value || null)
                      }
                      className="w-full bg-background border rounded px-3 py-1.5 text-xs focus-visible:outline-none"
                    >
                      {allTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                      {allTables.length === 0 && (
                        <option value="">No tables on floor plan</option>
                      )}
                    </select>
                  </div>
                )}

                {destType === ConfigType.Custom && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Custom Destination / Instructions
                    </span>
                    <Input
                      placeholder="e.g. 123 Main St, curbside spot #3..."
                      value={customDestLabel}
                      onChange={(e) => setCustomDestLabel(e.target.value)}
                      className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2 border-t mt-4 gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("main")}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveConfigOnly}
                >
                  Save Config
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyCustom}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {context === AllocationContext.Global
                    ? "Apply default..."
                    : "Apply to Items"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        ) : (
          /* 3. Main Swap Configurations View */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Active Config Header */}
            {activeConfigDetails ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/15 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 shrink-0">
                    <activeConfigDetails.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Active Default Configuration
                    </span>
                    <h4 className="text-sm font-bold truncate text-foreground leading-snug">
                      {activeConfigDetails.methodLabel} to{" "}
                      {activeConfigDetails.destLabel}
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      Timing: {activeConfigDetails.timeLabel}
                    </span>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white select-none gap-1 border-transparent text-[10px] py-0.5 px-2">
                  <Check className="w-3 h-3 shrink-0" />
                  Active
                </Badge>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic text-center p-3 rounded-lg border border-dashed">
                No active default fulfillment config
              </div>
            )}

            {/* Search and Toolbar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search fulfillment configs..."
                  className="pl-8 pr-8 h-8.5 text-xs focus-visible:ring-1 focus-visible:ring-emerald-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery !== debouncedQuery && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button
                size="sm"
                className="h-8.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                onClick={() => setView("customize")}
              >
                <Plus className="w-3.5 h-3.5" />
                Custom...
              </Button>
            </div>

            {/* Options List */}
            <div className="space-y-4 max-h-[42vh] overflow-y-auto pr-1">
              {/* Built-ins */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Built-in Default Configurations
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredBuiltIns.map((choice) => {
                    const isActive = choice.id === activeFulfillmentConfigId;
                    const Icon = choice.icon;
                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleSelectConfig(choice.id)}
                        className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all hover:border-emerald-500/50 hover:bg-accent/40 w-full cursor-pointer ${
                          isActive
                            ? "border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/10 ring-1 ring-emerald-500/20"
                            : "bg-card"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" : "bg-muted text-muted-foreground"}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col">
                          <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                            {choice.label}
                            {isActive && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-normal mt-0.5 truncate">
                            {choice.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredBuiltIns.length === 0 && (
                    <div className="text-[11px] text-muted-foreground italic col-span-2">
                      No matching built-in configs
                    </div>
                  )}
                </div>
              </div>

              {/* Saved custom configs */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Custom & Saved Configurations
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredSavedConfigs.map((choice) => {
                    const isActive = choice.id === activeFulfillmentConfigId;
                    const Icon = choice.icon;
                    return (
                      <div
                        key={choice.id}
                        onClick={() => handleSelectConfig(choice.id)}
                        className={`group flex items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition-all hover:border-emerald-500/50 hover:bg-accent/40 w-full cursor-pointer ${
                          isActive
                            ? "border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/10 ring-1 ring-emerald-500/20"
                            : "bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950" : "bg-muted text-muted-foreground"}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col">
                            <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1 font-mono">
                              {choice.label}
                              {isActive && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground leading-normal mt-0.5 truncate font-mono">
                              {choice.description}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:bg-accent/60 shrink-0 text-muted-foreground hover:text-foreground"
                            title="Edit configuration"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadFulfillmentConfig(choice.id);
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
                              loadFulfillmentConfig(choice.id);
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Badge
                            variant="outline"
                            className="text-[8px] h-4 shrink-0 px-1 font-mono uppercase bg-muted/40 hidden sm:block"
                          >
                            Saved
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {filteredSavedConfigs.length === 0 && (
                    <div className="text-xs text-muted-foreground italic py-4 text-center col-span-2 border rounded-lg bg-muted/5 border-dashed">
                      No custom fulfillment configurations saved in the order
                      history.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
