"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import type {
  AllocationBlock,
  FulfillmentAllocation,
  ProjectedLineItem,
} from "@/lib/vcs/types";

interface FulfillmentAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: "item" | "group" | "global";
  items: ProjectedLineItem[];
  allocations: Record<string, AllocationBlock>;
  activeFulfillmentConfigId: string | null;
  allItems: ProjectedLineItem[];
  onApplyConfig: (
    config: {
      timeType: "immediate" | "scheduled" | "deferred";
      calculatedAt: string | null;
    },
    mode?: "change-existing" | "new-only",
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
  onApplyConfig,
}: FulfillmentAllocationDialogProps) {
  const [timeType, setTimeType] = useState<"immediate" | "scheduled" | "deferred">("immediate");
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null);

  // Initialize form state based on the current context allocations
  useEffect(() => {
    if (!open) return;

    let targetAllocation: FulfillmentAllocation | null = null;

    if (context === "global") {
      if (activeFulfillmentConfigId) {
        const alloc = allocations[activeFulfillmentConfigId];
        if (alloc?.type === "fulfillment") {
          targetAllocation = alloc as FulfillmentAllocation;
        }
      }
    } else if (items.length > 0) {
      // Find fulfillment allocation in first item
      for (const id of items[0].allocations) {
        const alloc = allocations[id];
        if (alloc?.type === "fulfillment") {
          targetAllocation = alloc as FulfillmentAllocation;
          break;
        }
      }
    }

    if (targetAllocation) {
      setTimeType(targetAllocation.time.type);
      setCalculatedAt(targetAllocation.time.calculatedAt);
    } else {
      setTimeType("immediate");
      setCalculatedAt(null);
    }
  }, [open, context, items, allocations, activeFulfillmentConfigId]);

  // For global context, trace which items will be affected by this swap
  const affectedItems = useMemo(() => {
    if (context !== "global" || !activeFulfillmentConfigId) return [];

    // Retrieve the active allocations of the old config
    const oldAllocs = Object.values(allocations).filter(
      (a) =>
        a.type === "fulfillment" &&
        (a.allocationId === activeFulfillmentConfigId ||
          a.correlationId === activeFulfillmentConfigId),
    );
    const oldIds = oldAllocs.map((a) => a.allocationId);

    // Find all items referencing those allocation IDs
    return allItems.filter((item) =>
      item.allocations.some((id) => oldIds.includes(id)),
    );
  }, [context, activeFulfillmentConfigId, allocations, allItems]);

  const handleSave = (mode?: "change-existing" | "new-only") => {
    onApplyConfig(
      {
        timeType,
        calculatedAt: timeType === "immediate" ? null : calculatedAt,
      },
      mode,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            {context === "global"
              ? "Default Fulfillment Settings"
              : "Fulfillment Scheduling"}
          </DialogTitle>
          <DialogDescription>
            {context === "global"
              ? "Set the default fulfillment timing for new order items."
              : `Configure when fulfillment occurs for ${
                  items.length === 1 ? `"${items[0].name}"` : `${items.length} items`
                }.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Main Select Buttons */}
          <div className="flex gap-2.5">
            <Button
              variant={timeType === "immediate" ? "default" : "outline"}
              className="flex-1 text-xs h-9 gap-1.5"
              onClick={() => {
                setTimeType("immediate");
                setCalculatedAt(null);
              }}
            >
              <Clock className="w-3.5 h-3.5" />
              On Confirmation
            </Button>
            <Button
              variant={timeType !== "immediate" ? "default" : "outline"}
              className="flex-1 text-xs h-9 gap-1.5"
              onClick={() => {
                setTimeType("scheduled");
                if (!calculatedAt) {
                  const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
                  setCalculatedAt(oneHourLater.toISOString());
                }
              }}
            >
              <Calendar className="w-3.5 h-3.5" />
              Scheduled Time
            </Button>
          </div>

          {/* DateTime local Picker */}
          {timeType !== "immediate" && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Scheduled Date & Time
              </label>
              <input
                type="datetime-local"
                value={formatLocalDate(calculatedAt)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setCalculatedAt(new Date(val).toISOString());
                  }
                }}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          {/* Affected Items list for Global Context */}
          {context === "global" && affectedItems.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/55 dark:bg-amber-950/20 dark:border-amber-900/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{affectedItems.length} items will be affected</span>
              </div>
              <p className="text-[10px] text-amber-600/90 dark:text-amber-400/80 leading-relaxed">
                Changing default fulfillment will overwrite the fulfillment timing of items using the current default settings.
              </p>
              <div className="max-h-20 overflow-y-auto border-t border-amber-200/50 pt-1.5 space-y-1">
                {affectedItems.map((item) => (
                  <div key={item.lineId} className="text-[10px] text-muted-foreground flex justify-between font-mono">
                    <span>{item.name}</span>
                    <span>qty {item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {context === "global" ? (
            <div className="flex gap-2 w-full sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave("new-only")}
              >
                New Items Only
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleSave("change-existing")}
              >
                Apply to Affected Items
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end w-full">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSave()}>
                Save Scheduling
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
