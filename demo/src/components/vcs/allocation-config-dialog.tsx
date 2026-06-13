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
} from "lucide-react";
import type { AllocationBlock, PaymentAllocation, ProjectedLineItem } from "@/lib/vcs/types";
import {
  getPaymentAllocDisplayName,
  getAssignmentAllocDisplayName,
} from "@/lib/pos/utils";

interface AllocationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProjectedLineItem | null;
  allocations: Record<string, AllocationBlock>;
  guests: string[];
  defaultPaymentAllocId: string | null;
  defaultPaymentMethod: string;
  onReassign: (lineId: string, newAssignee: string) => void;
  onResetToDefault: (lineId: string) => void;
  onAddGuest: (name: string) => void;
  onTriggerPaymentAllocation: (item: ProjectedLineItem) => void;
}

function getPatchedAllocations(allocations: Record<string, AllocationBlock>): Record<string, AllocationBlock> {
  const patched: Record<string, AllocationBlock> = {};
  for (const [id, alloc] of Object.entries(allocations)) {
    if (alloc.type === "payment") {
      const p = alloc as PaymentAllocation;
      const stratType = p.paymentStrategy.strategyType as string;
      if (stratType === "fixed_item" || stratType === "fixed_global") {
        patched[id] = {
          ...p,
          paymentStrategy: { ...p.paymentStrategy, strategyType: "fixed" }
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
  guests,
  defaultPaymentAllocId,
  defaultPaymentMethod,
  onReassign,
  onResetToDefault,
  onAddGuest,
  onTriggerPaymentAllocation,
}: AllocationConfigDialogProps) {
  const [showAddGuestInput, setShowAddGuestInput] = useState(false);
  const [newGuestInputName, setNewGuestInputName] = useState("");

  // Current item's assignment info
  const currentAssignment = useMemo(() => {
    if (!item) return null;
    for (const id of item.allocations) {
      const a = allocations[id];
      if (a?.type === "assignment") return a;
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

  const hasNonDefaultPayment = currentPayments.some(
    (p) => p.allocationId !== defaultPaymentAllocId
  );
  const correlationId = currentPayments[0]?.correlationId;

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open && item) {
      setShowAddGuestInput(false);
      setNewGuestInputName("");
    }
  }, [open, item]);

  const handleAssigneeChange = useCallback(
    (newVal: string) => {
      if (!item) return;
      onReassign(item.lineId, newVal);
    },
    [item, onReassign]
  );

  const handleAddNewGuestForAssignment = useCallback(() => {
    const name = newGuestInputName.trim();
    if (!name) return;
    onAddGuest(name);
    if (item) {
      onReassign(item.lineId, name);
    }
    setNewGuestInputName("");
    setShowAddGuestInput(false);
  }, [newGuestInputName, onAddGuest, item, onReassign]);

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
            <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
          </div>
          <div className="font-mono font-bold text-sm">${item.totalPrice.toFixed(2)}</div>
        </div>

        {/* Assignment (Who Consumes) */}
        <div className="space-y-2.5 rounded-lg border p-3.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Guest
            </div>
            {!showAddGuestInput && (
              <Button
                variant="link"
                className="h-auto p-0 text-xs text-primary font-semibold flex items-center gap-1 hover:no-underline"
                onClick={() => setShowAddGuestInput(true)}
              >
                <Plus className="w-3 h-3" /> Add Guest
              </Button>
            )}
          </div>

          {showAddGuestInput ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="New guest name..."
                value={newGuestInputName}
                onChange={(e) => setNewGuestInputName(e.target.value)}
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddNewGuestForAssignment()}
              />
              <Button size="sm" className="h-8 text-xs" onClick={handleAddNewGuestForAssignment}>
                Add & Assign
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowAddGuestInput(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={currentAssignee} onValueChange={handleAssigneeChange}>
                <SelectTrigger className="h-8 text-xs flex-1 bg-background">
                  <User className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {guests.map((g) => (
                    <SelectItem key={g} value={g} className="text-xs">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
                    {getPaymentAllocDisplayName(getPatchedAllocations(allocations)[payAlloc.allocationId] as PaymentAllocation, getPatchedAllocations(allocations))}
                  </span>
                  {payAlloc.correlationId && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
                      <Split className="w-2.5 h-2.5 mr-0.5" />
                      split
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-mono font-semibold text-muted-foreground shrink-0">
                  {(payAlloc.paymentStrategy.strategyType as string) === "percentage"
                    ? `${Math.round((payAlloc.paymentStrategy.value ?? 1) * 100)}%`
                    : (payAlloc.paymentStrategy.strategyType as string) === "fixed_item" || (payAlloc.paymentStrategy.strategyType as string) === "fixed"
                    ? `$${(payAlloc.paymentStrategy.value ?? 0).toFixed(2)}/item`
                    : (payAlloc.paymentStrategy.strategyType as string) === "fixed_global"
                    ? `$${(payAlloc.paymentStrategy.value ?? 0).toFixed(2)} total`
                    : "remaining"}
                </span>
              </div>
            ))}
          </div>

          {correlationId && (
            <div className="text-[9px] font-mono text-muted-foreground/60 px-1 truncate">
              correlation: {correlationId}
            </div>
          )}

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