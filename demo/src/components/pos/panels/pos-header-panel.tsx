import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator as SeparatorUI } from "@/components/ui/separator";
import { getGuestColor } from "@/lib/pos/ui-utils";
import { ChevronDown, User } from "lucide-react";
import React from "react";

export interface POSHeaderPanelProps {
  projectedState: any;
  guests: any[];
  resolveGuestName: (id: string) => string;
  formatNumber: (val: number, minDecimals?: number, maxDecimals?: number) => string;
}

export function POSHeaderPanel({
  projectedState,
  guests,
  resolveGuestName,
  formatNumber,
}: POSHeaderPanelProps) {
  return (
    <div className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold">Active Check</h2>
      </div>
      <div className="flex items-center gap-4">
        {(() => {
          const breakdown = projectedState.financials.personBreakdown;
          const sorted = [
            ...breakdown.filter((pb: any) => pb.subtotal > 0),
          ].sort((a, b) => b.subtotal - a.subtotal);
          if (sorted.length === 0) return null;
          return (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1.5 bg-background border hover:bg-accent"
                >
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Paying Guests ({sorted.length})</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Paying Guests Breakdown</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {sorted.map((pb: any) => (
                    <div
                      key={pb.person}
                      className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: getGuestColor(pb.person, guests) }}
                        />
                        <span className="truncate font-medium">
                          {resolveGuestName(pb.person)}
                        </span>
                      </div>
                      <span className="font-mono font-semibold tabular-nums ml-2">
                        ${formatNumber(pb.subtotal, 2, 10)}
                      </span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}
        <SeparatorUI orientation="vertical" className="h-8" />
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Subtotal
          </div>
          <div className="font-mono font-bold text-sm tabular-nums text-muted-foreground">
            ${formatNumber(projectedState.financials.subtotal, 2, 10)}
          </div>
        </div>
        {projectedState.financials.chargeTotal > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-right hover:bg-accent px-1 rounded transition-colors cursor-pointer flex flex-col items-end">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
                  Tax & Fees <ChevronDown className="w-2.5 h-2.5" />
                </div>
                <div className="font-mono font-bold text-sm tabular-nums text-muted-foreground">
                  ${formatNumber(projectedState.financials.chargeTotal, 2, 10)}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-l p-3" align="end">
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Charge Breakdown
                </h4>
                <div className="space-y-1">
                  {projectedState.financials.chargeBreakdown.map(
                    (charge: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-xs"
                      >
                        <span className="truncate pr-2 text-muted-foreground">
                          {charge.label}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          ${formatNumber(charge.chargeAmount, 2, 10)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        <div className="text-right bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
          <div className="text-[10px] text-primary/80 uppercase tracking-wider font-bold">
            Total
          </div>
          <div className="font-mono font-bold text-lg tabular-nums text-primary leading-tight">
            ${formatNumber(projectedState.financials.grandTotal, 2, 10)}
          </div>
        </div>
      </div>
    </div>
  );
}