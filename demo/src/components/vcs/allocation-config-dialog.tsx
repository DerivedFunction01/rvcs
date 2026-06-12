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
  Edit2,
  Save,
  X,
} from "lucide-react";
import type { AllocationBlock, PaymentAllocation, ProjectedLineItem } from "@/lib/vcs/types";
import {
  getPaymentAllocDisplayName,
  getAssignmentAllocDisplayName,
  useVCSStore,
} from "@/store/vcs-store";

interface PaymentSplitEntry {
  entity: string;
  strategyType: "percentage" | "fixed" | "remaining";
  value: number; // 0-100 for percentage, dollar amount for fixed, 0 for remaining
}

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
    }>
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
  onSwitchItemPayment,
  onAddGuest,
}: AllocationConfigDialogProps) {
  const { updateAllocation, groupItemAllocation, groupItemPaymentConfig } = useVCSStore();

  const [assigneeOverride, setAssigneeOverride] = useState<string>("");
  const [splits, setSplits] = useState<PaymentSplitEntry[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [newSplitEntity, setNewSplitEntity] = useState("");
  const [dialogNewGuestName, setDialogNewGuestName] = useState("");

  // Edit individual allocation state
  const [editingAllocId, setEditingAllocId] = useState<string | null>(null);
  const [editEntity, setEditEntity] = useState("");
  const [editPayer, setEditPayer] = useState("");
  const [editMethod, setEditMethod] = useState("");
  const [editStrategyType, setEditStrategyType] = useState<"percentage" | "fixed" | "remaining">("percentage");
  const [editStrategyValue, setEditStrategyValue] = useState(0);

  // Current item's allocation info
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

  const currentPaymentMethod = useMemo(() => {
    if (currentPayments.length === 1) {
      return currentPayments[0].method || "";
    }
    return "";
  }, [currentPayments]);

  const hasSplitPayment = currentPayments.length > 1;
  const hasNonDefaultPayment = currentPayments.some(
    (p) => p.allocationId !== defaultPaymentAllocId
  );
  const correlationId = currentPayments[0]?.correlationId;

  // Group consolidation options
  const existingAssignments = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of Object.values(allocations)) {
      if (a.type === "assignment" && a.entity) {
        map.set(a.entity, a.allocationId);
      }
    }
    return Array.from(map.entries()).map(([entity, id]) => ({ entity, id }));
  }, [allocations]);

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

  // Validation for splits
  const totalPercentage = useMemo(
    () => splits.filter(s => s.strategyType === "percentage").reduce((sum, s) => sum + s.value, 0),
    [splits]
  );

  const totalFixed = useMemo(
    () => splits.filter(s => s.strategyType === "fixed").reduce((sum, s) => sum + s.value, 0),
    [splits]
  );

  const hasRemaining = useMemo(
    () => splits.some(s => s.strategyType === "remaining"),
    [splits]
  );

  const isValidSplit = useMemo(() => {
    if (splits.length < 2) return false;
    if (hasRemaining) return true;
    if (totalFixed > 0 && totalPercentage > 0) {
      const originalPrice = item?.totalPrice ?? 0;
      return totalFixed + originalPrice * (totalPercentage / 100) <= originalPrice;
    }
    if (totalFixed > 0) {
      const originalPrice = item?.totalPrice ?? 0;
      return Math.abs(totalFixed - originalPrice) < 0.01;
    }
    return totalPercentage === 100;
  }, [splits, hasRemaining, totalPercentage, totalFixed, item]);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open && item) {
      setAssigneeOverride("");
      setIsSplitting(false);
      setSplits([]);
      setNewSplitEntity("");
      setDialogNewGuestName("");
      setEditingAllocId(null);
    }
  }, [open, item]);

  // Inline editing actions
  const startEditing = (allocId: string) => {
    const a = allocations[allocId];
    if (!a) return;
    setEditingAllocId(allocId);
    if (a.type === "assignment") {
      setEditEntity(a.entity);
    } else if (a.type === "payment") {
      const p = a as PaymentAllocation;
      setEditPayer(p.payer);
      setEditMethod(p.method || "cash");
      setEditStrategyType(p.paymentStrategy?.strategyType || "percentage");
      const stratVal = p.paymentStrategy?.value ?? 0;
      setEditStrategyValue(p.paymentStrategy?.strategyType === "percentage" ? Math.round(stratVal * 100) : stratVal);
    }
  };

  const saveEditing = () => {
    if (!editingAllocId) return;
    const a = allocations[editingAllocId];
    if (a.type === "assignment") {
      updateAllocation(editingAllocId, { entity: editEntity });
    } else if (a.type === "payment") {
      const val = editStrategyType === "percentage" ? editStrategyValue / 100 : editStrategyValue;
      updateAllocation(editingAllocId, {
        payer: editPayer,
        method: editMethod || null,
        paymentStrategy: {
          strategyType: editStrategyType,
          value: editStrategyType === "remaining" ? null : val,
        },
      });
    }
    setEditingAllocId(null);
  };

  const handleReassign = useCallback(() => {
    if (!item || !assigneeOverride) return;
    onReassign(item.lineId, assigneeOverride);
    setAssigneeOverride("");
    onOpenChange(false);
  }, [item, assigneeOverride, onReassign, onOpenChange]);

  const handleStartSplit = useCallback(() => {
    if (!item) return;
    setSplits([{ entity: currentAssignee, strategyType: "percentage", value: 100 }]);
    setIsSplitting(true);
  }, [item, currentAssignee]);

  const handleAddNewGuest = useCallback(() => {
    const name = dialogNewGuestName.trim();
    if (!name) return;
    onAddGuest(name);
    setDialogNewGuestName("");
    if (isSplitting) {
      setSplits((prev) => {
        if (prev.some((s) => s.entity.toLowerCase() === name.toLowerCase())) return prev;
        const n = prev.length + 1;
        const newSplits = [...prev, { entity: name, strategyType: "percentage" as const, value: Math.floor(100 / n) }];
        const allPercentage = newSplits.every(s => s.strategyType === "percentage");
        if (allPercentage) {
          const base = Math.floor(100 / n);
          newSplits.forEach((s) => { s.value = base; });
          const remainder = 100 - base * n;
          newSplits[0].value += remainder;
        }
        return newSplits;
      });
    }
  }, [dialogNewGuestName, onAddGuest, isSplitting]);

  const handleAddSplitEntry = useCallback(() => {
    const entity = newSplitEntity.trim();
    if (!entity) return;
    if (splits.some((s) => s.entity.toLowerCase() === entity.toLowerCase())) return;

    const n = splits.length + 1;
    const newSplits = [...splits, { entity, strategyType: "percentage" as const, value: Math.floor(100 / n) }];
    const allPercentage = newSplits.every(s => s.strategyType === "percentage");
    if (allPercentage) {
      const base = Math.floor(100 / n);
      newSplits.forEach((s) => { s.value = base; });
      const remainder = 100 - base * n;
      newSplits[0].value += remainder;
    }

    setSplits(newSplits);
    setNewSplitEntity("");
  }, [newSplitEntity, splits]);

  const handleRemoveSplitEntry = useCallback(
    (index: number) => {
      if (splits.length <= 2) return;
      const newSplits = splits.filter((_, i) => i !== index);
      const allPercentage = newSplits.every(s => s.strategyType === "percentage");
      if (allPercentage) {
        const base = Math.floor(100 / newSplits.length);
        newSplits.forEach((s) => {
          s.value = base;
        });
        const remainder = 100 - base * newSplits.length;
        newSplits[0].value += remainder;
      }
      setSplits(newSplits);
    },
    [splits]
  );

  const handleSplitTypeChange = (index: number, type: "percentage" | "fixed" | "remaining") => {
    setSplits((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        strategyType: type,
        value: type === "remaining" ? 0 : type === "percentage" ? 50 : 5,
      };
      return updated;
    });
  };

  const handleSplitValueChange = (index: number, val: number) => {
    setSplits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: Math.max(0, val) };
      return updated;
    });
  };

  const handleApplySplit = useCallback(() => {
    if (!item || !isValidSplit) return;
    const mappedSplits = splits.map((s) => ({
      entity: s.entity,
      strategyType: s.strategyType,
      value: s.strategyType === "percentage" ? s.value / 100 : s.value,
    }));
    onSplitPayment(item.lineId, mappedSplits);
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
            Manage assignment and payment allocations for this item.
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

        {/* Current Allocations */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Current Allocations
          </div>

          {/* Assignment */}
          {currentAssignment && (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              {editingAllocId === currentAssignment.allocationId ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Edit Assignment</div>
                  <div className="space-y-1.5">
                    <Input
                      value={editEntity}
                      onChange={(e) => setEditEntity(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Search or type name..."
                    />
                    <div className="max-h-28 overflow-y-auto border rounded-md p-1.5 bg-popover text-popover-foreground space-y-1">
                      {guests
                        .filter((g) => g.toLowerCase().includes(editEntity.toLowerCase()))
                        .map((g) => (
                          <button
                            key={g}
                            type="button"
                            className="w-full text-left px-2 py-1 text-xs rounded hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
                            onClick={() => setEditEntity(g)}
                          >
                            {g}
                          </button>
                        ))}
                      {editEntity.trim() && !guests.some(g => g.toLowerCase() === editEntity.trim().toLowerCase()) && (
                        <button
                          type="button"
                          className="w-full text-left px-2 py-1 text-xs rounded hover:bg-primary/10 text-primary font-semibold flex items-center gap-1 transition-colors"
                          onClick={() => {
                            onAddGuest(editEntity.trim());
                            setEditEntity(editEntity.trim());
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          Create guest: "{editEntity.trim()}"
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1 border-t">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingAllocId(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="h-8 text-xs gap-1" onClick={saveEditing}>
                      <Save className="w-3 h-3" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Assignment:</span>
                    <Badge variant="secondary" className="text-xs">
                      {currentAssignee}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => startEditing(currentAssignment.allocationId)}
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Payment(s) */}
          {currentPayments.map((payAlloc) => (
            <div
              key={payAlloc.allocationId}
              className="flex flex-col gap-2 rounded-lg border p-3"
            >
              {editingAllocId === payAlloc.allocationId ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">Edit Payment Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-semibold">Payer</label>
                      <Select value={editPayer} onValueChange={setEditPayer}>
                        <SelectTrigger className="h-8 text-xs">
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

                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-semibold">Method</label>
                      <Select value={editMethod} onValueChange={setEditMethod}>
                        <SelectTrigger className="h-8 text-xs capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["cash", "visa", "mastercard", "amex"].map((m) => (
                            <SelectItem key={m} value={m} className="text-xs capitalize">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-semibold">Strategy Type</label>
                      <Select
                        value={editStrategyType}
                        onValueChange={(val) => {
                          setEditStrategyType(val as "percentage" | "fixed" | "remaining");
                          if (val === "remaining") setEditStrategyValue(0);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage" className="text-xs">Percentage</SelectItem>
                          <SelectItem value="fixed" className="text-xs">Fixed Amount</SelectItem>
                          <SelectItem value="remaining" className="text-xs">Remaining</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editStrategyType !== "remaining" && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-semibold">
                          {editStrategyType === "percentage" ? "Value (%)" : "Value ($)"}
                        </label>
                        <Input
                          type="number"
                          value={editStrategyValue}
                          onChange={(e) => setEditStrategyValue(Number(e.target.value) || 0)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1.5 border-t">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingAllocId(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="h-8 text-xs gap-1" onClick={saveEditing}>
                      <Save className="w-3 h-3" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground shrink-0">Payment:</span>
                    <Badge
                      variant={payAlloc.allocationId === defaultPaymentAllocId ? "default" : "outline"}
                      className="text-xs truncate"
                    >
                      {getPaymentAllocDisplayName(payAlloc, allocations)}
                    </Badge>
                    {payAlloc.correlationId && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
                        <Split className="w-2.5 h-2.5 mr-0.5" />
                        split
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {payAlloc.paymentStrategy.value !== null && payAlloc.paymentStrategy.value !== 1 && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {payAlloc.paymentStrategy.strategyType === "fixed" ? "$" : ""}
                        {payAlloc.paymentStrategy.strategyType === "percentage"
                          ? Math.round(payAlloc.paymentStrategy.value * 100)
                          : payAlloc.paymentStrategy.value}
                        {payAlloc.paymentStrategy.strategyType === "percentage" ? "%" : ""}
                      </span>
                    )}
                    {payAlloc.paymentStrategy.strategyType === "remaining" && (
                      <span className="text-xs font-mono text-muted-foreground">rem</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => startEditing(payAlloc.allocationId)}
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Correlation ID (if split) */}
          {correlationId && (
            <div className="text-[10px] font-mono text-muted-foreground/60 px-3">
              correlation: {correlationId}
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Actions
          </div>

          {/* Add Guest */}
          {!isSplitting && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Add Guest:</span>
              <Input
                placeholder="Type new guest name..."
                value={dialogNewGuestName}
                onChange={(e) => setDialogNewGuestName(e.target.value)}
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddNewGuest();
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={!dialogNewGuestName.trim()}
                onClick={handleAddNewGuest}
              >
                Add
              </Button>
            </div>
          )}

          {/* Reassign (Move Assignment) */}
          {!isSplitting && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Reassign to:</span>
              <Select value={assigneeOverride} onValueChange={setAssigneeOverride}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Select guest..." />
                </SelectTrigger>
                <SelectContent>
                  {guests
                    .filter((g) => g !== currentAssignee)
                    .map((g) => (
                      <SelectItem key={g} value={g} className="text-xs">
                        {g}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!assigneeOverride}
                onClick={handleReassign}
              >
                Apply
              </Button>
            </div>
          )}

          {/* Switch Payment Method */}
          {!isSplitting && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">Payment:</span>
              <Select
                value={currentPaymentMethod || undefined}
                onValueChange={(val) => {
                  onSwitchItemPayment(item.lineId, val);
                  onOpenChange(false);
                }}
              >
                <SelectTrigger className="h-8 text-xs flex-1 capitalize">
                  <SelectValue placeholder="Select payment method..." />
                </SelectTrigger>
                <SelectContent>
                  {["cash", "visa", "mastercard", "amex"].map((m) => (
                    <SelectItem key={m} value={m} className="text-xs capitalize">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Group / Consolidate with existing */}
          {!isSplitting && (
            <div className="space-y-2 border rounded-lg p-3 bg-muted/10">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Group / Consolidate
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground font-semibold">Group Assignment</label>
                  <Select
                    onValueChange={(val) => {
                      groupItemAllocation(item.lineId, val, "assignment");
                      onOpenChange(false);
                    }}
                  >
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingAssignments.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.entity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground font-semibold">Group Payment</label>
                  <Select
                    onValueChange={(val) => {
                      groupItemPaymentConfig(item.lineId, val);
                      onOpenChange(false);
                    }}
                  >
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingPayments.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Split Payment Button */}
          {!isSplitting && !hasSplitPayment && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleStartSplit}
              >
                <Split className="w-3 h-3 mr-1" />
                Split Payment
              </Button>
            </div>
          )}

          {/* Reset to Default */}
          {!isSplitting && hasNonDefaultPayment && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleResetToDefault}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset to default ({defaultPaymentMethod})
              </Button>
            </div>
          )}

          {/* Split Editor */}
          {isSplitting && (
            <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Payment Split Editor</span>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsSplitting(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-2.5">
                {splits.map((split, idx) => (
                  <div key={split.entity} className="flex flex-col gap-1.5 border-b pb-2 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground truncate w-32" title={split.entity}>
                        {split.entity}
                      </span>
                      {splits.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveSplitEntry(idx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <Select
                        value={split.strategyType}
                        onValueChange={(val) => handleSplitTypeChange(idx, val as any)}
                      >
                        <SelectTrigger className="h-7 text-[10px] capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage" className="text-xs">Percentage</SelectItem>
                          <SelectItem value="fixed" className="text-xs">Fixed Amount</SelectItem>
                          <SelectItem value="remaining" className="text-xs">Remaining</SelectItem>
                        </SelectContent>
                      </Select>

                      {split.strategyType !== "remaining" && (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={split.value}
                            onChange={(e) => handleSplitValueChange(idx, Number(e.target.value) || 0)}
                            className="h-7 text-xs text-center font-mono w-16"
                          />
                          <span className="text-xs text-muted-foreground">
                            {split.strategyType === "percentage" ? "%" : "$"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add split member */}
              <div className="flex items-center gap-2 pt-1.5 border-t">
                <Select value={newSplitEntity} onValueChange={setNewSplitEntity}>
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Add person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {guests
                      .filter(
                        (g) =>
                          !splits.some(
                            (s) => s.entity.toLowerCase() === g.toLowerCase()
                          )
                      )
                      .map((g) => (
                        <SelectItem key={g} value={g} className="text-xs">
                          {g}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!newSplitEntity}
                  onClick={handleAddSplitEntry}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {/* Add guest inline within split editor */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Or type new guest name..."
                  value={dialogNewGuestName}
                  onChange={(e) => setDialogNewGuestName(e.target.value)}
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddNewGuest();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={!dialogNewGuestName.trim()}
                  onClick={handleAddNewGuest}
                >
                  Add
                </Button>
              </div>

              {/* Total indicator */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground text-[10px] truncate max-w-[280px]">
                  Auto-name:{" "}
                  <span className="font-mono text-primary font-semibold">
                    {splits
                      .map((s) => {
                        const name = s.entity.split(" ")[0];
                        if (s.strategyType === "fixed") return `${name} $${s.value.toFixed(2)}`;
                        if (s.strategyType === "remaining") return `${name} remaining`;
                        return `${name} ${s.value}%`;
                      })
                      .join(" / ")}
                  </span>
                </span>
                <span
                  className={`font-mono font-semibold ${
                    isValidSplit ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {hasRemaining ? "rem ready" : totalFixed > 0 ? `$${totalFixed.toFixed(2)}` : `${totalPercentage}%`}
                </span>
              </div>

              {/* Preview correlation ID */}
              {splits.length >= 2 && (
                <div className="text-[9px] font-mono text-muted-foreground/60 truncate">
                  correlation: split-{splits
                    .map((s) => `${s.entity}-${s.strategyType}-${s.value}`)
                    .join("-")}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
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
              <Button
                size="sm"
                disabled={!isValidSplit}
                onClick={handleApplySplit}
              >
                Apply Split
              </Button>
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