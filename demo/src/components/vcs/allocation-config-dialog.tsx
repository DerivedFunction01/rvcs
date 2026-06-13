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
  Trash2,
  Link2,
  X,
} from "lucide-react";
import type { AllocationBlock, PaymentAllocation, ProjectedLineItem } from "@/lib/vcs/types";
import {
  getPaymentAllocDisplayName,
  getAssignmentAllocDisplayName,
} from "@/lib/pos/utils";
import { useVCSStore } from "@/store/vcs-store";
import { SplitEditor, PaymentSplitEntry, validateSplit } from "./split-editor";

interface AllocationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProjectedLineItem | null;
  allocations: Record<string, AllocationBlock>;
  guests: string[];
  defaultPaymentAllocId: string | null;
  defaultPaymentMethod: string;
  totalItemsOnDefault: number;
  onReassign: (lineId: string, newAssignee: string) => void;
  onSplitPayment: (
    lineId: string,
    splits: Array<{
      entity: string;
      strategyType: "percentage" | "fixed" | "remaining";
      value: number;
      method?: string | null;
    }>,
    mode: "group" | "item"
  ) => void;
  onResetToDefault: (lineId: string) => void;
  onSwitchItemPayment: (lineId: string, newMethod: string) => void;
  onAddGuest: (name: string) => void;
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
  onSplitPayment,
  onResetToDefault,
  onAddGuest,
}: AllocationConfigDialogProps) {
  const { groupItemPaymentConfig } = useVCSStore();

  const [splits, setSplits] = useState<PaymentSplitEntry[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);
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

  const hasSplitPayment = currentPayments.length > 1;
  const hasNonDefaultPayment = currentPayments.some(
    (p) => p.allocationId !== defaultPaymentAllocId
  );
  const correlationId = currentPayments[0]?.correlationId;

  // Group consolidation options
  const existingPayments = useMemo(() => {
    const map = new Map<string, string>(); // display name -> ID (either allocationId or correlationId)
    const processedCorrelations = new Set<string>();

    for (const a of Object.values(allocations)) {
      if (a.type === "payment" && a.allocationId !== defaultPaymentAllocId) {
        const pay = a as PaymentAllocation;
        if (pay.correlationId) {
          if (!processedCorrelations.has(pay.correlationId)) {
            processedCorrelations.add(pay.correlationId);
            const name = getPaymentAllocDisplayName(pay, allocations);
            if (name) map.set(name, pay.correlationId);
          }
        } else {
          const name = getPaymentAllocDisplayName(pay, allocations);
          if (name) map.set(name, pay.allocationId);
        }
      }
    }
    return Array.from(map.entries()).map(([display, id]) => ({ display, id }));
  }, [allocations, defaultPaymentAllocId]);

  const isValidSplit = validateSplit(splits, item?.totalPrice);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open && item) {
      setIsSplitting(false);
      setSplits([]);
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

  const handleStartSplit = useCallback(() => {
    if (!item) return;
    
    if (currentPayments.length > 0) {
      const initialSplits = currentPayments.map((p) => {
        const strat = p.paymentStrategy;
        const val = strat?.strategyType === "percentage" ? Math.round((strat.value ?? 1) * 100) : (strat?.value ?? 0);
        return {
          entity: p.payer || currentAssignee,
          strategyType: strat?.strategyType || "percentage",
          value: val,
          method: p.method || null,
        };
      });
      setSplits(initialSplits);
    } else {
      setSplits([{ entity: currentAssignee, strategyType: "percentage", value: 100, method: null }]);
    }
    setIsSplitting(true);
  }, [item, currentAssignee, currentPayments]);

  const handleApplySplit = useCallback((mode: "group" | "item") => {
    if (!item || !isValidSplit) return;
    const mappedSplits = splits.map((s) => ({
      entity: s.entity,
      strategyType: s.strategyType,
      value: s.strategyType === "percentage" ? s.value / 100 : s.value,
      method: s.method,
    }));
    onSplitPayment(item.lineId, mappedSplits, mode);
    setIsSplitting(false);
    setSplits([]);
    onOpenChange(false);
  }, [item, isValidSplit, splits, onSplitPayment, onOpenChange]);

  const handleResetToDefault = useCallback(() => {
    if (!item) return;
    onResetToDefault(item.lineId);
    onOpenChange(false);
  }, [item, onResetToDefault, onOpenChange]);

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
            Manage assignment and payment splits for this item.
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
        {!isSplitting && (
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
        )}

        {/* Payment Configuration */}
        <div className="space-y-3">
          {!isSplitting && (
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
                        {getPaymentAllocDisplayName(payAlloc, allocations)}
                      </span>
                      {payAlloc.correlationId && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
                          <Split className="w-2.5 h-2.5 mr-0.5" />
                          split
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs font-mono font-semibold text-muted-foreground shrink-0">
                      {payAlloc.paymentStrategy.strategyType === "percentage"
                        ? `${Math.round((payAlloc.paymentStrategy.value ?? 1) * 100)}%`
                        : payAlloc.paymentStrategy.strategyType === "fixed"
                        ? `$${(payAlloc.paymentStrategy.value ?? 0).toFixed(2)}`
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

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                  onClick={handleStartSplit}
                >
                  <Split className="w-3.5 h-3.5 text-primary" />
                  Customize splits / custom payer
                </Button>

                <Select
                  onValueChange={(val) => {
                    groupItemPaymentConfig(item.lineId, val);
                    onOpenChange(false);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs w-48 bg-background">
                    <Link2 className="w-3.5 h-3.5 mr-1 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Link to group config..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingPayments.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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
          )}

          {/* Unified Split Editor */}
          {isSplitting && (
            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Customize Splits & Payers</span>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => setIsSplitting(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <SplitEditor
                splits={splits}
                onChange={setSplits}
                guests={guests}
                onAddGuest={onAddGuest}
                itemTotalPrice={item?.totalPrice}
              />
            </div>
          )}
        </div>

        <DialogFooter className={isSplitting ? "sm:justify-between w-full" : ""}>
          {isSplitting && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSplitting(false);
                  setSplits([]);
                }}
              >
                Cancel
              </Button>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!isValidSplit}
                  onClick={() => handleApplySplit("item")}
                >
                  Apply to Item Only
                </Button>
                <Button
                  size="sm"
                  disabled={!isValidSplit}
                  onClick={() => handleApplySplit("group")}
                >
                  Update Entire Group
                </Button>
              </div>
            </>
          )}
          {!isSplitting && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}