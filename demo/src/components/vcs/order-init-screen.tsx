"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type {
  OrderTypeConfig,
  CustomerFieldConfig,
  OrderContext,
} from "@/lib/vcs/types";

// ─── Icon Mapping ──────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Store,
  PackageCheck,
  Truck,
};

function getOrderIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] ?? Store;
}

// ─── Field Icon Mapping ────────────────────────────────────────────────────

const FIELD_ICONS: Record<string, React.ElementType> = {
  name: User,
  phone: Phone,
  address: MapPin,
  notes: MessageSquare,
  email: AtSign,
};

// ─── Step Indicator ────────────────────────────────────────────────────────

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

// ─── Order Init Screen ─────────────────────────────────────────────────────

interface OrderInitScreenProps {
  onOrderStart: (context: OrderContext) => void;
  storeLabel: string;
}

export function OrderInitScreen({ onOrderStart, storeLabel }: OrderInitScreenProps) {
  const [step, setStep] = useState(0); // 0 = loading, 1 = order type, 2 = customer details
  const [orderTypes, setOrderTypes] = useState<OrderTypeConfig[]>([]);
  const [selectedType, setSelectedType] = useState<OrderTypeConfig | null>(null);
  const [customerFields, setCustomerFields] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch POS Config ──────────────────────────────────────────────────

  React.useEffect(() => {
    fetch("/api/pos-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.orderTypes && data.orderTypes.length > 0) {
          setOrderTypes(data.orderTypes);
          setStep(1); // Move to order type selection
        }
      })
      .catch((err) => {
        console.error("Failed to fetch POS config:", err);
      });
  }, []);

  // ─── Handle Order Type Selection ───────────────────────────────────────

  const handleSelectType = (type: OrderTypeConfig) => {
    setSelectedType(type);
    // Pre-fill empty fields
    const initial: Record<string, string> = {};
    for (const field of type.customerFields) {
      initial[field.key] = "";
    }
    setCustomerFields(initial);
    setFieldErrors({});
    setStep(2);
  };

  // ─── Validate Customer Fields ─────────────────────────────────────────

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
            errors[field.key] = `Invalid format`;
          }
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Handle Start Order ───────────────────────────────────────────────

  const handleStartOrder = () => {
    if (!validateFields()) return;

    setSubmitting(true);

    // Small delay for visual feedback
    setTimeout(() => {
      const trimmed: Record<string, string> = {};
      for (const [key, value] of Object.entries(customerFields)) {
        trimmed[key] = value.trim();
      }

      const context: OrderContext = {
        orderType: selectedType!.id,
        orderTypeLabel: selectedType!.label,
        customerFields: trimmed,
        estimatedTimeLabel: selectedType!.estimatedTimeLabel ?? null,
        initiatedAt: new Date().toISOString(),
      };

      onOrderStart(context);
    }, 300);
  };

  // ─── Render: Loading State ────────────────────────────────────────────

  if (step === 0) {
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

  // ─── Render: Step 1 — Order Type Selection ─────────────────────────────

  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-card px-6 py-4 shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <GitCommitHorizontal className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-sm font-bold tracking-tight">Retail VCS Terminal</h1>
                <p className="text-[10px] text-muted-foreground">
                  {storeLabel} — Version-Controlled POS
                </p>
              </div>
            </div>
            <StepIndicator step={0} totalSteps={2} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
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

        {/* Footer */}
        <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
          <span>VCS-Retail v2.0.0-PRO MVP</span>
          <span>Step 1 of 2 — Select Order Type</span>
        </footer>
      </div>
    );
  }

  // ─── Render: Step 2 — Customer Details ─────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 shrink-0">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <GitCommitHorizontal className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">Retail VCS Terminal</h1>
              <p className="text-[10px] text-muted-foreground">
                {storeLabel} — Version-Controlled POS
              </p>
            </div>
          </div>
          <StepIndicator step={1} totalSteps={2} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 text-xs text-muted-foreground"
            onClick={() => setStep(1)}
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back to order types
          </Button>

          {/* Order Type Badge */}
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

          {/* Customer Form */}
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
                    {field.required && (
                      <span className="text-destructive text-xs">*</span>
                    )}
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

                  {hasError && (
                    <p className="text-xs text-destructive">{fieldErrors[field.key]}</p>
                  )}

                  {field.validation?.maxLength && (
                    <p className="text-[10px] text-muted-foreground/50">
                      {((customerFields[field.key] || "").length || 0)}/{field.validation.maxLength} characters
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Start Order Button */}
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
                  Start Order — Initialize Repository
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              This will create a new VCS repository for this order
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground mt-auto">
        <span>VCS-Retail v2.0.0-PRO MVP</span>
        <span>Step 2 of 2 — Customer Details</span>
      </footer>
    </div>
  );
}