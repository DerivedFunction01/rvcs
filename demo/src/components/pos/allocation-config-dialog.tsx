"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  CreditCard,
  Split,
  RotateCcw,
  Plus,
  Link2,
  X,
  Calendar,
  Clock,
} from "lucide-react";
import type {
  AllocationBlock,
  PaymentAllocation,
  FulfillmentAllocation,
  ProjectedLineItem,
  AssignmentAllocation,
} from "@/lib/vcs/types";
import {
  getPaymentAllocDisplayName,
  getAssignmentAllocDisplayName,
  formatFulfillmentTime,
} from "@/lib/pos/utils";
import type { Guest } from "@/lib/pos/ui-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface AllocationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProjectedLineItem | null;
  allocations: Record<string, AllocationBlock>;
  defaultPaymentAllocId: string | null;
  defaultPaymentMethod: string;
  onResetToDefault: (lineId: string) => void;
  onTriggerAssignmentAllocation: (item: ProjectedLineItem) => void;
  onTriggerPaymentAllocation: (item: ProjectedLineItem) => void;
  onTriggerFulfillmentAllocation: (item: ProjectedLineItem) => void;
  initiatedAt?: string;
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

export function AllocationConfigDialog({
  open,
  onOpenChange,
  item,
  allocations,
  defaultPaymentAllocId,
  defaultPaymentMethod,
  onResetToDefault,
  onTriggerAssignmentAllocation,
  onTriggerPaymentAllocation,
  onTriggerFulfillmentAllocation,
  initiatedAt,
}: AllocationConfigDialogProps) {
  // Current item's assignment info
  const currentAssignment = useMemo(() => {
    if (!item) return null;
    for (const id of item.allocations) {
      const a = allocations[id];
      if (a?.type === "assignment") return a as AssignmentAllocation;
    }
    return null;
  }, [item, allocations]);

  const currentAssignee = currentAssignment
    ? getAssignmentAllocDisplayName(currentAssignment)
    : "none";

  const currentPayments = useMemo(() => {
    if (!item) return [];
    return item.allocations
      .map((id) => allocations[id])
      .filter((a): a is PaymentAllocation => a?.type === "payment");
  }, [item, allocations]);

  const currentFulfillment = useMemo(() => {
    if (!item) return null;
    for (const id of item.allocations) {
      const a = allocations[id];
      if (a?.type === AllocationType.Fulfillment) return a as FulfillmentAllocation;
    }
    return null;
  }, [item, allocations]);

  const hasNonDefaultPayment = currentPayments.some(
    (p) => p.allocationId !== defaultPaymentAllocId,
  );
  const correlationId = currentPayments[0]?.correlationId;

  // Reset state when dialog opens
  React.useEffect(() => {
    // no-op
  }, [open, item]);

  const handleResetToDefault = useCallback(() => {
    if (!item) return;
    onResetToDefault(item.lineId);
  }, [item, onResetToDefault]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Allocation Config
          </DialogTitle>
          <DialogDescription>
            Manage assignment and payment allocation for this item.
          </DialogDescription>
        </DialogHeader>

        {/* Item Info */}
        <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{item.name}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {item.sku}
            </div>
          </div>
          <div className="font-mono font-bold text-sm">
            ${item.totalPrice.toFixed(2)}
          </div>
        </div>

        {/* Assignment (Who Consumes) */}
        <div className="space-y-3 rounded-lg border p-3.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Assigned Guests (Who Consumes)</span>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium px-1">
            <User className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{currentAssignee || "None"}</span>
          </div>

          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 font-medium"
              onClick={() => {
                onTriggerAssignmentAllocation(item);
                onOpenChange(false);
              }}
            >
              <User className="w-3.5 h-3.5 text-primary" />
              Change Assignment...
            </Button>
          </div>
        </div>

        {/* Fulfillment Configuration (When) */}
        <div className="space-y-3 rounded-lg border p-3.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Fulfillment (When)</span>
            <Badge
              variant="secondary"
              className="text-[10px] h-4 px-1.5 font-medium bg-emerald-50 text-emerald-600 border-none dark:bg-emerald-950/20 dark:text-emerald-400"
            >
              {currentFulfillment?.time.type === "immediate" ||
              !currentFulfillment
                ? "Immediate"
                : currentFulfillment.time.type.toUpperCase()}
            </Badge>
          </div>

          {currentFulfillment &&
            currentFulfillment.time.type !== "immediate" &&
            currentFulfillment.time.calculatedAt && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium px-1">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  Scheduled:{" "}
                  {formatFulfillmentTime(
                    currentFulfillment.time.calculatedAt,
                    initiatedAt,
                  )}
                </span>
              </div>
            )}

          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 font-medium"
              onClick={() => {
                onTriggerFulfillmentAllocation(item);
                onOpenChange(false);
              }}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Change Fulfillment Timing...
            </Button>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="space-y-3 rounded-lg border p-3.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Payment Breakdown
          </div>

          <div className="space-y-1.5">
            {currentPayments.map((payAlloc) => (
              <div
                key={payAlloc.allocationId}
                className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/10"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium truncate">
                    {getPaymentAllocDisplayName(
                      getPatchedAllocations(allocations)[
                        payAlloc.allocationId
                      ] as PaymentAllocation,
                      getPatchedAllocations(allocations),
                    )}
                  </span>
                  {(() => {
                    const siblings = payAlloc.correlationId
                      ? Object.values(allocations).filter(
                          (a) =>
                            a.type === "payment" &&
                            a.correlationId === payAlloc.correlationId &&
                            a.allocationId !== payAlloc.allocationId,
                        )
                      : [];
                    const isTrueSplit = siblings.length > 0;
                    return (
                      isTrueSplit && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-4 px-1 shrink-0"
                        >
                          <Split className="w-2.5 h-2.5 mr-0.5" />
                          split
                        </Badge>
                      )
                    );
                  })()}
                </div>
                <span className="text-xs font-mono font-semibold text-muted-foreground shrink-0">
                  {(payAlloc.paymentStrategy.strategyType as string) ===
                  "percentage"
                    ? `${Math.round((payAlloc.paymentStrategy.value ?? 1) * 100)}%`
                    : (payAlloc.paymentStrategy.strategyType as string) ===
                          "fixed_item" ||
                        (payAlloc.paymentStrategy.strategyType as string) ===
                          "fixed"
                      ? `$${(payAlloc.paymentStrategy.value ?? 0).toFixed(2)}/item`
                      : (payAlloc.paymentStrategy.strategyType as string) ===
                          "fixed_global"
                        ? `$${(payAlloc.paymentStrategy.value ?? 0).toFixed(2)} total`
                        : "remaining"}
                </span>
              </div>
            ))}
          </div>

          {(() => {
            if (!correlationId) return null;
            const groupAllocs = Object.values(allocations).filter(
              (a) => a.type === "payment" && a.correlationId === correlationId,
            );
            if (groupAllocs.length <= 1) return null;
            return (
              <div className="text-[9px] font-mono text-muted-foreground/60 px-1 truncate">
                correlation: {correlationId}
              </div>
            );
          })()}

          <Separator className="my-1" />

          <div className="flex flex-wrap gap-2 pt-1 justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 font-medium"
              onClick={() => {
                onTriggerPaymentAllocation(item);
                onOpenChange(false);
              }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Change Payment / Split...
            </Button>

            {hasNonDefaultPayment && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-muted-foreground hover:text-foreground"
                onClick={handleResetToDefault}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Revert to default ({defaultPaymentMethod})
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
