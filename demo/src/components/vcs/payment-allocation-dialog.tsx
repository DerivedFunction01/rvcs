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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Search,
  Split,
  X,
  Plus,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { SplitEditor, PaymentSplitEntry, validateSplit } from "./split-editor";
import type { AllocationBlock, PaymentAllocation, ProjectedLineItem } from "@/lib/vcs/types";

interface PaymentAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: "item" | "group" | "header";
  items: ProjectedLineItem[]; // 1 item for "item", multiple for "group", empty for "header"
  allocations: Record<string, AllocationBlock>;
  guests: string[];
  defaultPaymentAllocId: string | null;
  defaultPaymentMethod: string;
  paymentConfigs: Array<{ id: string; name: string; isSplit: boolean }>;
  
  onApplyConfig: (
    configIdOrMethod: string,
    mode: "item" | "group" | "change-existing" | "new-only"
  ) => void;
  
  onApplyCustomSplit: (
    splits: Array<{
      entity: string;
      strategyType: "percentage" | "fixed_item" | "fixed_global" | "remaining";
      value: number;
      method?: string | null;
    }>,
    mode: "item" | "group" | "change-existing" | "new-only"
  ) => void;
  
  onAddGuest: (name: string) => void;
}

export function PaymentAllocationDialog({
  open,
  onOpenChange,
  context,
  items,
  allocations,
  guests,
  defaultPaymentAllocId,
  defaultPaymentMethod,
  paymentConfigs,
  onApplyConfig,
  onApplyCustomSplit,
  onAddGuest,
}: PaymentAllocationDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingCustomSplit, setIsCreatingCustomSplit] = useState(false);
  const [splits, setSplits] = useState<PaymentSplitEntry[]>([]);
  
  // For the header confirmation flow
  const [pendingSelection, setPendingSelection] = useState<{
    type: "config" | "custom";
    configIdOrMethod?: string;
    customSplits?: PaymentSplitEntry[];
  } | null>(null);

  // Compute total price of items in context
  const totalContextPrice = useMemo(() => {
    if (context === "header") return undefined;
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [context, items]);

  const PAYMENT_METHODS = ["cash", "visa", "mastercard", "amex"];

  // Build the list of grid choices
  const gridChoices = useMemo(() => {
    const choices = [
      ...PAYMENT_METHODS.map((method) => ({
        id: `group-default-${method}`,
        label: `Guest (${method.toUpperCase()})`,
        description: "Built-in default payment config",
        badge: method.toUpperCase(),
        isSplit: false,
      })),
      ...paymentConfigs.map((cfg) => ({
        id: cfg.id,
        label: cfg.name,
        description: cfg.isSplit ? "Split payment config" : "Single payment config",
        badge: cfg.isSplit ? "Split" : "Saved",
        isSplit: cfg.isSplit,
      })),
    ];
    return choices;
  }, [paymentConfigs]);

  // Filter choices by search query
  const filteredChoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return gridChoices;
    return gridChoices.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.badge.toLowerCase().includes(query)
    );
  }, [gridChoices, searchQuery]);

  // Reset state when opening/closing
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setIsCreatingCustomSplit(false);
      setSplits([]);
      setPendingSelection(null);
    }
  }, [open]);

  // Initialize splits for custom split editor
  const handleStartCustomSplit = useCallback(() => {
    if (guests.length > 0) {
      setSplits([
        { entity: guests[0], strategyType: "percentage", value: 100, method: null },
      ]);
    } else {
      setSplits([]);
    }
    setIsCreatingCustomSplit(true);
  }, [guests]);

  // Handle choice selection
  const handleSelectConfig = (choiceId: string) => {
    if (context === "header") {
      // Transition to switch confirmation
      setPendingSelection({
        type: "config",
        configIdOrMethod: choiceId,
      });
    } else if (context === "item") {
      onApplyConfig(choiceId, "item");
      onOpenChange(false);
    } else {
      // group context
      onApplyConfig(choiceId, "group");
      onOpenChange(false);
    }
  };

  // Check split validity
  const isValidSplit = validateSplit(splits, totalContextPrice);

  // Apply custom split logic
  const handleSaveCustomSplit = (mode: "item" | "group" | "change-existing" | "new-only") => {
    if (!isValidSplit) return;
    const mappedSplits = splits.map((s) => ({
      entity: s.entity,
      strategyType: s.strategyType,
      value: s.strategyType === "percentage" ? s.value / 100 : s.value,
      method: s.method,
    }));
    onApplyCustomSplit(mappedSplits, mode);
    onOpenChange(false);
  };

  const handleCustomSplitClick = () => {
    if (context === "header") {
      setPendingSelection({
        type: "custom",
        customSplits: splits,
      });
    } else if (context === "group") {
      handleSaveCustomSplit("group");
    }
  };

  // Header Switch choice final application
  const handleApplyHeaderChoice = (mode: "change-existing" | "new-only") => {
    if (!pendingSelection) return;
    if (pendingSelection.type === "config" && pendingSelection.configIdOrMethod) {
      onApplyConfig(pendingSelection.configIdOrMethod, mode);
    } else if (pendingSelection.type === "custom" && pendingSelection.customSplits) {
      const mappedSplits = pendingSelection.customSplits.map((s) => ({
        entity: s.entity,
        strategyType: s.strategyType,
        value: s.strategyType === "percentage" ? s.value / 100 : s.value,
        method: s.method,
      }));
      onApplyCustomSplit(mappedSplits, mode);
    }
    onOpenChange(false);
  };

  // Render context header info
  const renderHeaderDetails = () => {
    if (context === "item" && items[0]) {
      return (
        <div className="rounded-lg border bg-muted/30 p-2.5 mb-2.5 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-foreground">{items[0].name}</span>
            <span className="text-muted-foreground ml-1.5 font-mono">({items[0].sku})</span>
          </div>
          <span className="font-mono font-bold">${items[0].totalPrice.toFixed(2)}</span>
        </div>
      );
    }
    if (context === "group") {
      return (
        <div className="rounded-lg border bg-muted/30 p-2.5 mb-2.5 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-foreground">Allocate {items.length} Selected Items</span>
          </div>
          <span className="font-mono font-bold">${totalContextPrice?.toFixed(2)}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-5 h-5 text-primary shrink-0" />
            {context === "header"
              ? "Order Default Payment Configuration"
              : context === "group"
              ? "Allocate Payment (Bulk)"
              : "Allocate Payment"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {context === "header"
              ? "Configure the default payment allocation for new items on the order."
              : "Set payment configuration or create custom splits for the selected item(s)."}
          </DialogDescription>
        </DialogHeader>

        {renderHeaderDetails()}

        {/* Header Mode Confirmation Flow */}
        {pendingSelection ? (
          <div className="space-y-4 py-4 animate-in fade-in zoom-in duration-200">
            <div className="rounded-lg border p-4 bg-primary/5 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-primary">
                <HelpCircle className="w-4 h-4" />
                Apply Payment Allocation
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Do you want to switch all existing items in the order to this configuration, or set it as default for new items only?
              </p>
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
                onClick={() => handleApplyHeaderChoice("new-only")}
              >
                New Items Only
              </Button>
              <Button
                size="sm"
                onClick={() => handleApplyHeaderChoice("change-existing")}
                className="gap-1"
              >
                Apply to All Items
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : isCreatingCustomSplit ? (
          /* Custom Split Creator View */
          <div className="space-y-4 py-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Customize Splits & Payers</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsCreatingCustomSplit(false)}
              >
                Back to List
              </Button>
            </div>

            <SplitEditor
              splits={splits}
              onChange={setSplits}
              guests={guests}
              onAddGuest={onAddGuest}
              itemTotalPrice={totalContextPrice}
            />

            <DialogFooter className="pt-2 gap-2 sm:justify-between border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreatingCustomSplit(false);
                  setSplits([]);
                }}
              >
                Cancel
              </Button>
              
              <div className="flex gap-2">
                {context === "item" ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!isValidSplit}
                      onClick={() => handleSaveCustomSplit("item")}
                    >
                      Apply to Item Only
                    </Button>
                    <Button
                      size="sm"
                      disabled={!isValidSplit}
                      onClick={() => handleSaveCustomSplit("group")}
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
                    {context === "header" ? "Continue..." : "Apply to Selected"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        ) : (
          /* Search & Grid Selector View */
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search payment configurations..."
                className="pl-9 h-10 text-xs"
              />
            </div>

            <div className="min-h-[220px] max-h-[45vh] overflow-y-auto pr-1">
              {filteredChoices.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No matching payment configurations.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredChoices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleSelectConfig(choice.id)}
                      className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/40"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-semibold text-foreground">
                          {choice.label}
                        </span>
                        <Badge variant="outline" className="text-[8px] h-4 scale-95 shrink-0 px-1 font-mono uppercase bg-muted/40">
                          {choice.badge}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                        {choice.description}
                      </span>
                    </button>
                  ))}
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
                size="sm"
                className="gap-1"
                onClick={handleStartCustomSplit}
              >
                <Split className="w-3.5 h-3.5" />
                Customize Split / Payer...
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
