"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Clock, ChevronRight, Settings } from "lucide-react";

interface OrderDefaultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGuestLabel: string;
  selectedGuestDescription: string | null;
  selectedGuestCount: number;
  currentConfigName: string;
  currentFulfillmentConfigName: string;
  onOpenGuestPicker: () => void;
  onOpenPaymentAllocation: () => void;
  onOpenFulfillmentAllocation: () => void;
}

export function OrderDefaultsDialog({
  open,
  onOpenChange,
  selectedGuestLabel,
  selectedGuestDescription,
  selectedGuestCount,
  currentConfigName,
  currentFulfillmentConfigName,
  onOpenGuestPicker,
  onOpenPaymentAllocation,
  onOpenFulfillmentAllocation,
}: OrderDefaultsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="space-y-1.5 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Settings className="w-5 h-5 text-primary animate-pulse" />
            Order Defaults
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure default allocations applied automatically to new items added to this order.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Active Guest */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card/50 hover:bg-accent/40 hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <User className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Guest / Assignee
                </span>
                <span className="text-sm font-semibold truncate max-w-[200px] mt-0.5">
                  {selectedGuestLabel}
                </span>
                {selectedGuestDescription && (
                  <span className="text-[10px] text-muted-foreground/75 italic mt-0.5 truncate max-w-[200px]">
                    {selectedGuestDescription}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {selectedGuestCount}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 hover:bg-primary/15 group-hover:text-primary transition-all"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(onOpenGuestPicker, 150);
                }}
              >
                Change
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Default Payment Strategy */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card/50 hover:bg-accent/40 hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Default Payment
                </span>
                <span className="text-sm font-semibold truncate max-w-[200px] mt-0.5">
                  {currentConfigName}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 hover:bg-primary/15 group-hover:text-primary transition-all"
              onClick={() => {
                onOpenChange(false);
                setTimeout(onOpenPaymentAllocation, 150);
              }}
            >
              Configure
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Default Fulfillment Strategy */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card/50 hover:bg-accent/40 hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Default Fulfillment
                </span>
                <span className="text-sm font-semibold truncate max-w-[200px] mt-0.5">
                  {currentFulfillmentConfigName}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 hover:bg-primary/15 group-hover:text-primary transition-all"
              onClick={() => {
                onOpenChange(false);
                setTimeout(onOpenFulfillmentAllocation, 150);
              }}
            >
              Configure
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold px-4"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
