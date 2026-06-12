"use client";

import React from "react";
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
import { CreditCard, RefreshCw, PlusCircle, ArrowRight } from "lucide-react";

interface PaymentSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfigName: string;
  newConfigName: string;
  /** How many items currently use the old payment configuration */
  affectedItemCount: number;
  onChooseExisting: () => void;
  onChooseNewOnly: () => void;
}

export function PaymentSwitchDialog({
  open,
  onOpenChange,
  currentConfigName,
  newConfigName,
  affectedItemCount,
  onChooseExisting,
  onChooseNewOnly,
}: PaymentSwitchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Switch Default Payment Config
          </DialogTitle>
          <DialogDescription>
            You are changing the default payment configuration group.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-2 py-3 bg-muted/40 rounded-lg border">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">
            Configuration Change
          </div>
          <div className="flex items-center gap-3 px-4">
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5 truncate max-w-[150px]">
              {currentConfigName}
            </Badge>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <Badge className="text-xs px-2.5 py-0.5 truncate max-w-[150px]">
              {newConfigName}
            </Badge>
          </div>
        </div>

        <div className="space-y-3 mt-2">
          <button
            onClick={() => {
              onChooseExisting();
              onOpenChange(false);
            }}
            className="w-full text-left rounded-lg border p-4 hover:bg-accent/50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                <RefreshCw className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Change all existing items</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Updates <span className="font-semibold text-foreground">{affectedItemCount}</span> item{affectedItemCount !== 1 ? "s" : ""} from{" "}
                  <span className="font-semibold text-foreground truncate">{currentConfigName}</span> to{" "}
                  <span className="font-semibold text-foreground truncate">{newConfigName}</span>.
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                  batch modify_item_allocations
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onChooseNewOnly();
              onOpenChange(false);
            }}
            className="w-full text-left rounded-lg border p-4 hover:bg-accent/50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2 group-hover:bg-muted/80 transition-colors">
                <PlusCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">New allocation for future items</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Existing items keep <span className="font-semibold">{currentConfigName}</span>.
                  New items will use <span className="font-semibold">{newConfigName}</span>.
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                  declare_allocation (new default)
                </div>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}