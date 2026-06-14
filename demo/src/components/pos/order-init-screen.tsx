"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Store,
  PackageCheck,
  Truck,
  GitCommitHorizontal,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Clock,
  User,
  Phone,
  MapPin,
  MessageSquare,
  AtSign,
  Grid2x2,
  Search,
} from "lucide-react";
import type {
  FloorConfig,
  FloorObject,
  OrderContext,
  OrderTypeConfig,
} from "@/lib/pos/types";
import { OrderType } from "@/lib/pos/types";
import { CustomerSearchDialog } from "@/components/pos/customer-search-dialog";
import { CustomerFieldInput } from "@/components/pos/customer-fields";

const ICON_MAP: Record<string, React.ElementType> = {
  Store,
  PackageCheck,
  Truck,
};

function getOrderIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] ?? Store;
}

function StepIndicator({
  step,
  totalSteps,
}: {
  step: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-muted-foreground/20"
            }`}
          />
          {i < totalSteps - 1 && (
            <div
              className={`w-8 h-0.5 transition-colors ${
                i < step ? "bg-primary" : "bg-muted-foreground/20"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

interface OrderInitScreenProps {
  onOrderStart: (context: OrderContext) => void;
  storeLabel: string;
}

type InitStep = "loading" | "order" | "floor" | "details";

function getSelectedGuestNames(table: FloorObject | null): string[] {
  if (!table || table.kind !== "table") return [];
  if (table.guestNames?.length) return table.guestNames;
  if (table.chairLabels?.length) {
    return table.chairLabels.map((label, idx) => label || `Guest ${idx + 1}`);
  }
  const count = table.seatCount || table.linkedChairIds?.length || 1;
  return Array.from({ length: count }, (_, idx) => `Guest ${idx + 1}`);
}

function getDisplayLabel(object: FloorObject): string {
  return object.displayName || object.label || "";
}

function getFontSize(object: FloorObject, label: string): number {
  let width = 2;
  let height = 2;

  if (object.shape === "circle") {
    width = height = (object.radius || 1) * 2;
  } else if (object.shape === "ellipse") {
    width = (object.radiusX || 2) * 2;
    height = (object.radiusY || 1) * 2;
  } else {
    width = object.width || 2;
    height = object.height || 2;
  }

  const baseFontSize = Math.min(width, height) * 0.25;
  if (!label) return baseFontSize;

  const charRatio = 0.55;
  const maxTextWidth = width * 0.85; // Leave 15% margins
  const estimatedTextWidth = label.length * baseFontSize * charRatio;

  if (estimatedTextWidth > maxTextWidth) {
    return baseFontSize * (maxTextWidth / estimatedTextWidth);
  }
  return baseFontSize;
}

export function OrderInitScreen({
  onOrderStart,
  storeLabel,
}: OrderInitScreenProps) {
  const [step, setStep] = useState<InitStep>("loading");
  const [orderTypes, setOrderTypes] = useState<OrderTypeConfig[]>([]);
  const [floorConfigs, setFloorConfigs] = useState<FloorConfig[]>([]);
  const [servers, setServers] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [selectedType, setSelectedType] = useState<OrderTypeConfig | null>(
    null,
  );
  const [selectedServer, setSelectedServer] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [customerFields, setCustomerFields] = useState<Record<string, string>>(
    {},
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [defaultPayerSeat, setDefaultPayerSeat] = useState<string | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  const handleSelectCustomer = (data: {
    name: string;
    phone: string;
    address: string;
  }) => {
    setCustomerFields((prev) => {
      const next = { ...prev };
      if (selectedType?.customerFields.some((f) => f.key === "name")) {
        next["name"] = data.name;
      }
      if (selectedType?.customerFields.some((f) => f.key === "phone")) {
        next["phone"] = data.phone;
      }
      if (selectedType?.customerFields.some((f) => f.key === "address")) {
        next["address"] = data.address;
      }
      return next;
    });

    // Clear validation errors for these keys
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next["name"];
      delete next["phone"];
      delete next["address"];
      return next;
    });
  };

  React.useEffect(() => {
    Promise.all([fetch("/api/pos-config"), fetch("/api/servers")])
      .then(async ([posRes, serverRes]) => {
        const posData = await posRes.json();
        const serverData = await serverRes.json();

        if (posData.orderTypes?.length) setOrderTypes(posData.orderTypes);
        if (posData.floorConfigs?.length) {
          setFloorConfigs(posData.floorConfigs);
          setSelectedFloorId(posData.floorConfigs[0].id);
        }
        if (serverData.servers?.length) {
          setServers(serverData.servers);
          setSelectedServer(serverData.servers[0].name);
        }

        setStep("order");
      })
      .catch((err) => {
        console.error("Failed to fetch init data:", err);
      });
  }, []);

  const selectedFloor = useMemo(
    () => floorConfigs.find((floor) => floor.id === selectedFloorId) ?? null,
    [floorConfigs, selectedFloorId],
  );

  const sortedObjects = useMemo(() => {
    if (!selectedFloor) return [];

    const DEFAULT_LAYERS: Record<string, number> = {
      deadspace: 0,
      wall: 10,
      table: 20,
      chair: 30,
    };

    return [...selectedFloor.objects].sort((a, b) => {
      const zA =
        a.zIndex !== undefined && a.zIndex !== null
          ? a.zIndex
          : (DEFAULT_LAYERS[a.kind] ?? 0);
      const zB =
        b.zIndex !== undefined && b.zIndex !== null
          ? b.zIndex
          : (DEFAULT_LAYERS[b.kind] ?? 0);
      return zA - zB;
    });
  }, [selectedFloor]);

  const selectedObjects = useMemo(() => {
    if (!selectedFloor) return [];
    const selectedIds = new Set(selectedObjectIds);
    return selectedFloor.objects.filter((object) => selectedIds.has(object.id));
  }, [selectedFloor, selectedObjectIds]);

  const selectedTables = useMemo(
    () => selectedObjects.filter((object) => object.kind === "table"),
    [selectedObjects],
  );

  const linkedChairIds = useMemo(() => {
    const ids = new Set<string>();
    for (const object of selectedTables) {
      if (object.kind === "table") {
        for (const chairId of object.linkedChairIds || []) {
          ids.add(chairId);
        }
      }
    }
    return ids;
  }, [selectedTables]);

  const selectedGuestNames = useMemo(() => {
    const names = new Set<string>();
    for (const object of selectedObjects) {
      if (object.kind === "chair") {
        names.add(object.label || object.id);
      }
    }
    return Array.from(names);
  }, [selectedObjects]);

  // Sync default payer when selected guest list changes
  React.useEffect(() => {
    if (selectedGuestNames.length > 0) {
      if (!defaultPayerSeat || !selectedGuestNames.includes(defaultPayerSeat)) {
        setDefaultPayerSeat(selectedGuestNames[0]);
      }
    } else {
      setDefaultPayerSeat(null);
    }
  }, [selectedGuestNames, defaultPayerSeat]);

  // Autoload default payer into customer details name field
  React.useEffect(() => {
    if (defaultPayerSeat) {
      setCustomerFields((prev) => ({
        ...prev,
        name: defaultPayerSeat,
      }));
    } else {
      setCustomerFields((prev) => {
        const currentName = prev.name || "";
        const isChairName = selectedFloor?.objects.some(
          (o) =>
            o.kind === "chair" &&
            (o.label === currentName || o.id === currentName),
        );
        if (!currentName || currentName === "Guest" || isChairName) {
          return { ...prev, name: "Guest" };
        }
        return prev;
      });
    }
  }, [defaultPayerSeat, selectedFloor]);

  const selectedObjectNames = selectedObjects.map((object) => ({
    id: object.id,
    label: object.label || object.id,
    kind: object.kind,
  }));

  const toggleObjectSelection = (object: FloorObject | null | undefined) => {
    if (!object || object.kind === "wall" || object.kind === "deadspace")
      return;
    setSelectedObjectIds((prev) => {
      const next = new Set(prev);
      const isSelected = next.has(object.id);
      if (object.kind === "table") {
        if (isSelected) {
          next.delete(object.id);
          for (const chairId of object.linkedChairIds || [])
            next.delete(chairId);
        } else {
          next.add(object.id);
          for (const chairId of object.linkedChairIds || []) next.add(chairId);
        }
      } else if (isSelected) {
        next.delete(object.id);
        if (object.kind === "chair" && "tableId" in object && object.tableId) {
          const parentTableId = object.tableId;
          const floorChairs =
            selectedFloor?.objects.filter(
              (o) =>
                o.kind === "chair" &&
                "tableId" in o &&
                o.tableId === parentTableId,
            ) || [];
          const anyChairsSelected = floorChairs.some(
            (c) => c.id !== object.id && next.has(c.id),
          );
          if (!anyChairsSelected) {
            next.delete(parentTableId);
          }
        }
      } else {
        next.add(object.id);
      }
      return Array.from(next);
    });
  };

  const handleSelectType = (type: OrderTypeConfig) => {
    setSelectedType(type);
    const initial: Record<string, string> = {};
    for (const field of type.customerFields) {
      initial[field.key] = field.key === "name" ? "Guest" : "";
    }
    setCustomerFields(initial);
    setFieldErrors({});
    setSelectedObjectIds([]);
    setStep(type.id === OrderType.WalkIn ? "floor" : "details");
  };

  const validateFields = (): boolean => {
    if (!selectedType) return false;
    const errors: Record<string, string> = {};

    for (const field of selectedType.customerFields) {
      const value = (customerFields[field.key] || "").trim();

      if (field.required && !value) {
        errors[field.key] = `${field.label} is required`;
        continue;
      }

      if (value && field.validation) {
        const v = field.validation;
        if (v.minLength && value.length < v.minLength) {
          errors[field.key] = `Minimum ${v.minLength} characters`;
        }
        if (v.maxLength && value.length > v.maxLength) {
          errors[field.key] = `Maximum ${v.maxLength} characters`;
        }
        if (v.pattern) {
          const regex = new RegExp(v.pattern);
          if (!regex.test(value)) {
            errors[field.key] = "Invalid format";
          }
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStartOrder = () => {
    if (!validateFields() || !selectedType) return;

    setSubmitting(true);
    setTimeout(() => {
      const trimmed: Record<string, string> = {};
      for (const [key, value] of Object.entries(customerFields)) {
        trimmed[key] = value.trim();
      }

      let guestNames = [...selectedGuestNames];
      if (defaultPayerSeat) {
        guestNames = [
          defaultPayerSeat,
          ...guestNames.filter((name) => name !== defaultPayerSeat),
        ];
      }

      onOrderStart({
        orderType: selectedType.id as OrderType,
        orderTypeLabel: selectedType.label,
        serverName: selectedServer || servers[0]?.name || "Tom",
        floorConfigId: selectedFloor?.id ?? null,
        tableConfigId: selectedTables[0]?.id ?? null,
        initialGuestNames:
          selectedType.id === OrderType.WalkIn && selectedObjects.length > 0
            ? guestNames
            : undefined,
        customerFields: trimmed,
        estimatedTimeLabel: selectedType.estimatedTimeLabel ?? null,
        initiatedAt: new Date().toISOString(),
      });
    }, 300);
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Fetching POS configuration...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Loading order types for {storeLabel}
              </p>
            </div>
          </div>
        </div>
        <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>VCS-Retail v2.0.0-PRO MVP</span>
          <span>Initializing terminal...</span>
        </footer>
      </div>
    );
  }

  if (step === "order") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-card px-6 py-4 shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <GitCommitHorizontal className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-sm font-bold tracking-tight">
                  Retail VCS Terminal
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {storeLabel} - Version-Controlled POS
                </p>
              </div>
            </div>
            <StepIndicator step={0} totalSteps={3} />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full space-y-6">
            <div className="rounded-xl border bg-card p-4">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Server Login
              </label>
              <Select value={selectedServer} onValueChange={setSelectedServer}>
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Choose server..." />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.name}>
                      {server.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-2">
                This is the account used for the draft branch name.
              </p>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight">
                How would you like to order?
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Select an order type to get started
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {orderTypes.map((type) => {
                const Icon = getOrderIcon(type.icon);
                return (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                    onClick={() => handleSelectType(type)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <CardTitle className="text-lg">{type.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {type.description}
                      </CardDescription>
                    </CardHeader>
                    {type.estimatedTimeLabel && (
                      <CardContent className="pt-0">
                        <Badge variant="secondary" className="text-[10px]">
                          <Clock className="w-3 h-3 mr-1" />
                          {type.estimatedTimeLabel}
                        </Badge>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </main>

        <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
          <span>VCS-Retail v2.0.0-PRO MVP</span>
          <span>Step 1 of 3 - Select Order Type</span>
        </footer>
      </div>
    );
  }

  if (step === "floor") {
    let vbX = 0;
    let vbY = 0;
    let vbW = 10;
    let vbH = 10;

    if (selectedFloor && selectedFloor.objects.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      selectedFloor.objects.forEach((o) => {
        let hw = 1;
        let hh = 1;

        if (o.shape === "circle") {
          hw = hh = o.radius || 1;
        } else if (o.shape === "ellipse") {
          hw = o.radiusX || 2;
          hh = o.radiusY || 1;
        } else if (o.shape === "rectangle" || !o.shape) {
          hw = (o.width || 2) / 2;
          hh = (o.height || 2) / 2;
        } else if (o.points && o.points.length > 0) {
          const pxs = o.points.map((p) => p[0]);
          const pys = o.points.map((p) => p[1]);
          minX = Math.min(minX, ...pxs);
          maxX = Math.max(maxX, ...pxs);
          minY = Math.min(minY, ...pys);
          maxY = Math.max(maxY, ...pys);
          return;
        }

        minX = Math.min(minX, o.x - hw);
        maxX = Math.max(maxX, o.x + hw);
        minY = Math.min(minY, o.y - hh);
        maxY = Math.max(maxY, o.y + hh);
      });

      const pad = 1;
      vbX = minX - pad;
      vbY = minY - pad;
      vbW = Math.max(1, maxX - minX + pad * 2);
      vbH = Math.max(1, maxY - minY + pad * 2);
    }

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-card px-6 py-4 shrink-0">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <GitCommitHorizontal className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-sm font-bold tracking-tight">
                  Retail VCS Terminal
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {storeLabel} - Version-Controlled POS
                </p>
              </div>
            </div>
            <StepIndicator step={1} totalSteps={3} />
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setStep("order")}
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Choose a table, or skip
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Optional for walk-in. If you pick a table, its guest names
                  will auto-load.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("details")}
              >
                Skip table config
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Floor
                  </label>
                  <Select
                    value={selectedFloorId}
                    onValueChange={(value) => {
                      setSelectedFloorId(value);
                      setSelectedObjectIds([]);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose floor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {floorConfigs.map((floor) => (
                        <SelectItem key={floor.id} value={floor.id}>
                          {floor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Selected objects
                  </p>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    {selectedObjectNames.length > 0
                      ? `${selectedObjectNames.length} selected`
                      : "None selected"}
                  </div>
                </div>

                <Button className="w-full" onClick={() => setStep("details")}>
                  Continue
                </Button>
              </div>

              <div className="rounded-xl border bg-card p-4">
                {selectedFloor ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                      <Grid2x2 className="w-3.5 h-3.5" />
                      {selectedFloor.name}
                    </div>
                    <div className="relative rounded-lg border bg-background overflow-hidden flex items-center justify-center min-h-[300px] p-4">
                      <svg
                        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                        className="w-full h-full max-h-[600px]"
                      >
                        {sortedObjects.map((object) => {
                          const selected = object
                            ? selectedObjectIds.includes(object.id)
                            : false;
                          const linkedToSelectedTable =
                            object?.kind === "chair" &&
                            linkedChairIds.has(object.id);

                          let fillClass = "fill-card text-muted-foreground";
                          let strokeClass = "stroke-muted-foreground";
                          let textColorClass = "fill-muted-foreground";

                          if (object?.kind === "wall") {
                            fillClass = "fill-zinc-800";
                            strokeClass = "stroke-zinc-800";
                            textColorClass = "fill-white";
                          } else if (object?.kind === "deadspace") {
                            fillClass = "fill-zinc-100 dark:fill-zinc-900";
                            strokeClass =
                              "stroke-zinc-300 dark:stroke-zinc-700";
                            textColorClass = "fill-zinc-400";
                          } else if (object?.kind === "chair") {
                            if (selected) {
                              fillClass = "fill-sky-200 dark:fill-sky-900";
                              strokeClass = "stroke-sky-500";
                              textColorClass = "fill-sky-900 dark:fill-sky-100";
                            } else if (linkedToSelectedTable) {
                              fillClass = "fill-sky-100 dark:fill-sky-900/50";
                              strokeClass = "stroke-sky-400";
                              textColorClass = "fill-sky-800 dark:fill-sky-200";
                            } else {
                              fillClass = "fill-sky-50 dark:fill-sky-950/30";
                              strokeClass =
                                "stroke-sky-300 dark:stroke-sky-800";
                              textColorClass = "fill-sky-700 dark:fill-sky-300";
                            }
                          } else if (object?.kind === "table") {
                            if (selected) {
                              fillClass =
                                "fill-emerald-200 dark:fill-emerald-900";
                              strokeClass = "stroke-emerald-500";
                              textColorClass =
                                "fill-emerald-900 dark:fill-emerald-100";
                            } else {
                              fillClass =
                                "fill-emerald-50 hover:fill-emerald-100 dark:fill-emerald-950/30 dark:hover:fill-emerald-900/50";
                              strokeClass =
                                "stroke-emerald-300 dark:stroke-emerald-800";
                              textColorClass =
                                "fill-emerald-800 dark:fill-emerald-200";
                            }
                          }

                          const renderShape = () => {
                            const rotation = object.rotation || 0;
                            const transform = rotation
                              ? `rotate(${rotation} ${object.x} ${object.y})`
                              : undefined;

                            switch (object.shape) {
                              case "circle":
                                return (
                                  <circle
                                    cx={object.x}
                                    cy={object.y}
                                    r={object.radius || 1}
                                    transform={transform}
                                  />
                                );
                              case "ellipse":
                                return (
                                  <ellipse
                                    cx={object.x}
                                    cy={object.y}
                                    rx={object.radiusX || 2}
                                    ry={object.radiusY || 1}
                                    transform={transform}
                                  />
                                );
                              case "triangle":
                              case "polygon":
                                if (object.points) {
                                  const pts = object.points
                                    .map((p) => `${p[0]},${p[1]}`)
                                    .join(" ");
                                  return (
                                    <polygon
                                      points={pts}
                                      transform={transform}
                                    />
                                  );
                                }
                                return null;
                              case "rectangle":
                              default:
                                const w = object.width || 2;
                                const h = object.height || 2;
                                return (
                                  <rect
                                    x={object.x - w / 2}
                                    y={object.y - h / 2}
                                    width={w}
                                    height={h}
                                    transform={transform}
                                    rx={0.2}
                                    ry={0.2}
                                  />
                                );
                            }
                          };

                          const displayLabel = getDisplayLabel(object);
                          const fontSize = getFontSize(object, displayLabel);

                          return (
                            <g
                              key={object.id}
                              onClick={() => toggleObjectSelection(object)}
                              className={`cursor-pointer transition-colors ${fillClass} ${strokeClass} ${object.kind === "wall" || object.kind === "deadspace" ? "pointer-events-none" : ""}`}
                              strokeWidth={0.05}
                            >
                              {renderShape()}
                              {displayLabel && (
                                <text
                                  x={object.x}
                                  y={object.y}
                                  fontSize={fontSize}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  className={`font-semibold select-none pointer-events-none ${textColorClass}`}
                                  transform={
                                    object.rotation
                                      ? `rotate(${object.rotation} ${object.x} ${object.y})`
                                      : undefined
                                  }
                                >
                                  {displayLabel}
                                </text>
                              )}
                              {object.kind === "table" &&
                                (object as any).seatCount &&
                                (object as any).seatCount > 0 && (
                                  <text
                                    x={object.x}
                                    y={object.y + fontSize * 1.5}
                                    fontSize={fontSize * 0.7}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className={`font-medium select-none pointer-events-none ${textColorClass} opacity-80`}
                                    transform={
                                      object.rotation
                                        ? `rotate(${object.rotation} ${object.x} ${object.y})`
                                        : undefined
                                    }
                                  >
                                    {(object as any).seatCount} seats
                                  </text>
                                )}
                            </g>
                          );
                        })}
                      </svg>
                      <div className="absolute top-3 right-3 rounded-md bg-background/90 border px-2 py-1 text-[10px] text-muted-foreground">
                        Tap a table to auto-load guests
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No floor configs available.
                  </div>
                )}
              </div>
            </div>

            {selectedObjectNames.length > 0 && (
              <div className="rounded-xl border bg-card p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {selectedObjectNames.length} selected
                    </Badge>
                    {selectedTables.length > 0 && (
                      <Badge variant="outline">
                        {selectedTables.length} table(s)
                      </Badge>
                    )}
                    {selectedObjectNames.map((object) => {
                      const isChair = object.kind === "chair";
                      const isPayer =
                        isChair && object.label === defaultPayerSeat;
                      return (
                        <Badge
                          key={object.id}
                          variant={isPayer ? "default" : "outline"}
                          className={`${
                            isChair ? "cursor-pointer transition-colors" : ""
                          } ${
                            isPayer
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold border-transparent"
                              : isChair
                                ? "hover:bg-muted-foreground/10"
                                : ""
                          }`}
                          onClick={() => {
                            if (isChair) {
                              setDefaultPayerSeat(object.label);
                            }
                          }}
                        >
                          {object.label} {isPayer && "★"}
                        </Badge>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setSelectedObjectIds([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {selectedTables.length > 0 && selectedGuestNames.length > 0 && (
              <div className="rounded-xl border bg-emerald-50/60 dark:bg-emerald-950/15 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Guests to auto-load (Click to select default payer)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedGuestNames.map((guest) => {
                    const isPayer = guest === defaultPayerSeat;
                    return (
                      <Badge
                        key={guest}
                        variant={isPayer ? "default" : "secondary"}
                        className={`cursor-pointer transition-colors ${
                          isPayer
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            : "hover:bg-muted-foreground/10"
                        }`}
                        onClick={() => setDefaultPayerSeat(guest)}
                      >
                        {guest} {isPayer && "★"}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
          <span>VCS-Retail v2.0.0-PRO MVP</span>
          <span>Step 2 of 3 - Optional Table Config</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-6 py-4 shrink-0">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <GitCommitHorizontal className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                Retail VCS Terminal
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {storeLabel} - Version-Controlled POS
              </p>
            </div>
          </div>
          <StepIndicator step={2} totalSteps={3} />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 text-xs text-muted-foreground"
            onClick={() =>
              setStep(selectedType?.id === OrderType.WalkIn ? "floor" : "order")
            }
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back
          </Button>

          {selectedType && (
            <div className="flex items-center gap-2 mb-6">
              {(() => {
                const Icon = getOrderIcon(selectedType.icon);
                return (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">
                      {selectedType.label}
                    </span>
                    {selectedType.estimatedTimeLabel && (
                      <Badge variant="secondary" className="text-[10px] ml-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedType.estimatedTimeLabel}
                      </Badge>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Customer Details
                </h2>
                <p className="text-sm text-muted-foreground">
                  Fill in the required information to start the order
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomerSearchOpen(true)}
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                <Search className="w-3.5 h-3.5" />
                Find Customer
              </Button>
            </div>

            {selectedType?.customerFields.map((field) => (
              <CustomerFieldInput
                key={field.key}
                field={field}
                value={customerFields[field.key] || ""}
                error={fieldErrors[field.key]}
                onChange={(val) => {
                  setCustomerFields((prev) => ({
                    ...prev,
                    [field.key]: val,
                  }));
                  if (fieldErrors[field.key]) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next[field.key];
                      return next;
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleStartOrder();
                  }
                }}
              />
            ))}
          </div>

          <div className="mt-8">
            <Button
              className="w-full h-11 text-sm font-semibold"
              size="lg"
              onClick={handleStartOrder}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initializing Repository...
                </>
              ) : (
                <>
                  <GitCommitHorizontal className="w-4 h-4 mr-2" />
                  Start Order - Initialize Repository
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              This will create a new VCS repository for this order
            </p>
          </div>
        </div>
      </main>

      <CustomerSearchDialog
        open={customerSearchOpen}
        onOpenChange={setCustomerSearchOpen}
        onSelectCustomer={handleSelectCustomer}
      />

      <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
        <span>VCS-Retail v2.0.0-PRO MVP</span>
        <span>Step 3 of 3 - Customer Details</span>
      </footer>
    </div>
  );
}
