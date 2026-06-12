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
  currentMethod: string;
  newMethod: string;
  /** How many items currently use the default payment allocation */
  affectedItemCount: number;
  onChooseExisting: () => void;
  onChooseNewOnly: () => void;
}

export function PaymentSwitchDialog({
  open,
  onOpenChange,
  currentMethod,
  newMethod,
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
            Switch Payment Method
          </DialogTitle>
          <DialogDescription>
            You are changing the default payment method.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-3 py-3">
          <Badge variant="secondary" className="text-sm px-3 py-1 capitalize">
            {currentMethod}
          </Badge>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <Badge className="text-sm px-3 py-1 capitalize">
            {newMethod}
          </Badge>
        </div>

        <div className="space-y-3">
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
                  <span className="capitalize">{currentMethod}</span> to{" "}
                  <span className="capitalize">{newMethod}</span>
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
                  Existing items keep <span className="capitalize">{currentMethod}</span>.
                  New items will use <span className="capitalize">{newMethod}</span>.
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