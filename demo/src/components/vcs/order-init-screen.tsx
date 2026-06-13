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
} from "lucide-react";
import type {
  FloorConfig,
  FloorObject,
  OrderContext,
  OrderTypeConfig,
} from "@/lib/vcs/types";

const ICON_MAP: Record<string, React.ElementType> = {
  Store,
  PackageCheck,
  Truck,
};

function getOrderIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] ?? Store;
}

const FIELD_ICONS: Record<string, React.ElementType> = {
  name: User,
  phone: Phone,
  address: MapPin,
  notes: MessageSquare,
  email: AtSign,
};

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

export function OrderInitScreen({ onOrderStart, storeLabel }: OrderInitScreenProps) {
  const [step, setStep] = useState<InitStep>("loading");
  const [orderTypes, setOrderTypes] = useState<OrderTypeConfig[]>([]);
  const [floorConfigs, setFloorConfigs] = useState<FloorConfig[]>([]);
  const [servers, setServers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedType, setSelectedType] = useState<OrderTypeConfig | null>(null);
  const [selectedServer, setSelectedServer] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [customerFields, setCustomerFields] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const selectedObjects = useMemo(() => {
    if (!selectedFloor) return [];
    const selectedIds = new Set(selectedObjectIds);
    return selectedFloor.objects.filter((object) => selectedIds.has(object.id));
  }, [selectedFloor, selectedObjectIds]);

  const selectedTables = useMemo(
    () => selectedObjects.filter((object) => object.kind === "table"),
    [selectedObjects],
  );

  const selectedGuestNames = useMemo(() => {
    const names = new Set<string>();
    for (const object of selectedObjects) {
      if (object.kind === "table") {
        for (const guest of getSelectedGuestNames(object)) {
          names.add(guest);
        }
      } else if (object.kind === "chair") {
        names.add(object.label || object.id);
      }
    }
    return Array.from(names);
  }, [selectedObjects]);

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

  const selectedObjectNames = selectedObjects.map((object) => ({
    id: object.id,
    label: object.label || object.id,
  }));

  const toggleObjectSelection = (object: FloorObject | null | undefined) => {
    if (!object || object.kind === "wall" || object.kind === "deadspace") return;
    setSelectedObjectIds((prev) => {
      const next = new Set(prev);
      const isSelected = next.has(object.id);
      if (object.kind === "table") {
        if (isSelected) {
          next.delete(object.id);
          for (const chairId of object.linkedChairIds || []) next.delete(chairId);
        } else {
          next.add(object.id);
          for (const chairId of object.linkedChairIds || []) next.add(chairId);
        }
      } else if (isSelected) {
        next.delete(object.id);
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
    setStep(type.id === "walk-in" ? "floor" : "details");
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

      onOrderStart({
        orderType: selectedType.id,
        orderTypeLabel: selectedType.label,
        serverName: selectedServer || servers[0]?.name || "Tom",
        floorConfigId: selectedFloor?.id ?? null,
        tableConfigId: selectedTables[0]?.id ?? null,
        initialGuestNames:
          selectedType.id === "walk-in" && selectedObjects.length > 0
            ? selectedGuestNames
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
              <p className="text-sm font-medium">Fetching POS configuration...</p>
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
                <h1 className="text-sm font-bold tracking-tight">Retail VCS Terminal</h1>
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
              <h2 className="text-2xl font-bold tracking-tight">How would you like to order?</h2>
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
                      <CardDescription className="text-xs">{type.description}</CardDescription>
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
    const floorGrid = selectedFloor
      ? Array.from({ length: selectedFloor.gridWidth * selectedFloor.gridHeight }, (_, idx) => {
          const x = idx % selectedFloor.gridWidth;
          const y = Math.floor(idx / selectedFloor.gridWidth);
          const object = selectedFloor.objects.find(
            (item) => x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h,
          );
          return { x, y, object };
        })
      : [];

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-card px-6 py-4 shrink-0">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <GitCommitHorizontal className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-sm font-bold tracking-tight">Retail VCS Terminal</h1>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Choose a table, or skip</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Optional for walk-in. If you pick a table, its guest names will auto-load.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("details")}>
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
                    <div
                      className="relative rounded-lg border bg-background overflow-hidden"
                      style={{
                        aspectRatio: `${selectedFloor.gridWidth} / ${selectedFloor.gridHeight}`,
                      }}
                    >
                      <div
                        className="grid h-full w-full"
                        style={{
                          gridTemplateColumns: `repeat(${selectedFloor.gridWidth}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${selectedFloor.gridHeight}, minmax(0, 1fr))`,
                        }}
                      >
                        {floorGrid.map(({ x, y, object }) => {
                          const selected = object ? selectedObjectIds.includes(object.id) : false;
                          const linkedToSelectedTable =
                            object?.kind === "chair" && linkedChairIds.has(object.id);
                          const baseClass =
                            object?.kind === "wall"
                              ? "bg-zinc-800 text-white"
                              : object?.kind === "deadspace"
                                ? "bg-zinc-100 text-zinc-400"
                                : object?.kind === "chair"
                                  ? selected
                                    ? "bg-sky-200 text-sky-900 ring-2 ring-sky-500"
                                    : linkedToSelectedTable
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-sky-50 text-sky-700"
                                  : object?.kind === "table"
                                    ? selected
                                      ? "bg-emerald-200 text-emerald-900 ring-2 ring-emerald-500"
                                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                    : "bg-card text-muted-foreground";

                          return (
                            <button
                              key={`${x}-${y}`}
                              type="button"
                              className={`relative border border-dashed text-[10px] transition-colors ${baseClass}`}
                              onClick={() => toggleObjectSelection(object)}
                              disabled={object?.kind === "wall" || object?.kind === "deadspace" || !object}
                            >
                              <div className="absolute inset-0 flex items-center justify-center p-1 text-center whitespace-pre-line">
                                {object?.kind === "table"
                                  ? `${object.label || object.id}\n${object.shape || "table"}`
                                  : object?.kind === "chair"
                                    ? object.label || "Chair"
                                    : object?.kind === "wall"
                                      ? "Wall"
                                      : ""}
                              </div>
                            </button>
                          );
                        })}
                      </div>
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
                    <Badge variant="secondary">{selectedObjectNames.length} selected</Badge>
                    {selectedTables.length > 0 && (
                      <Badge variant="outline">{selectedTables.length} table(s)</Badge>
                    )}
                    {selectedObjectNames.map((object) => (
                      <Badge key={object.id} variant="outline">
                        {object.label}
                      </Badge>
                    ))}
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
                  Guests to auto-load
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedGuestNames.map((guest) => (
                    <Badge key={guest} variant="secondary">
                      {guest}
                    </Badge>
                  ))}
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
              <h1 className="text-sm font-bold tracking-tight">Retail VCS Terminal</h1>
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
            onClick={() => setStep(selectedType?.id === "walk-in" ? "floor" : "order")}
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
                    <span className="font-medium text-sm">{selectedType.label}</span>
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
            <h2 className="text-xl font-bold tracking-tight">Customer Details</h2>
            <p className="text-sm text-muted-foreground">
              Fill in the required information to start the order
            </p>

            {selectedType?.customerFields.map((field) => {
              const FieldIcon = FIELD_ICONS[field.key] ?? User;
              const hasError = !!fieldErrors[field.key];

              return (
                <div key={field.key} className="space-y-1.5">
                  <Label
                    htmlFor={`field-${field.key}`}
                    className="text-sm font-medium flex items-center gap-1.5"
                  >
                    <FieldIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    {field.label}
                    {field.required && <span className="text-destructive text-xs">*</span>}
                  </Label>

                  {field.type === "textarea" ? (
                    <Textarea
                      id={`field-${field.key}`}
                      placeholder={field.placeholder}
                      value={customerFields[field.key] || ""}
                      onChange={(e) => {
                        setCustomerFields((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }));
                        if (hasError) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next[field.key];
                            return next;
                          });
                        }
                      }}
                      className={`min-h-[80px] ${hasError ? "border-destructive" : ""}`}
                    />
                  ) : (
                    <Input
                      id={`field-${field.key}`}
                      type={field.type === "tel" ? "tel" : field.type === "email" ? "email" : "text"}
                      placeholder={field.placeholder}
                      value={customerFields[field.key] || ""}
                      onChange={(e) => {
                        setCustomerFields((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }));
                        if (hasError) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next[field.key];
                            return next;
                          });
                        }
                      }}
                      className={hasError ? "border-destructive" : ""}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleStartOrder();
                        }
                      }}
                    />
                  )}

                  {hasError && <p className="text-xs text-destructive">{fieldErrors[field.key]}</p>}
                </div>
              );
            })}
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

      <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
        <span>VCS-Retail v2.0.0-PRO MVP</span>
        <span>Step 3 of 3 - Customer Details</span>
      </footer>
    </div>
  );
}
