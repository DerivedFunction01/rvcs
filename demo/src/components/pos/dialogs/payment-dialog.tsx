"use client";

import React, { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import {
  CreditCard,
  Printer,
  Coins,
  CheckCircle2,
  DollarSign,
  Wallet,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectedState: any;
  guests: Array<{ id: string; name: string }>;
  onCompletePayment: () => void;
}

export function printReceipt(projectedState: any, formatNumber: any) {
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Popup blocked! Please allow popups to print receipt.");
    return;
  }

  let itemsHtml = "";
  const rootItems = Object.values(projectedState.items).filter(
    (i: any) => !i.parentLineId && i.status !== "canceled"
  );

  rootItems.forEach((item: any) => {
    itemsHtml += `
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 6px; font-size: 13px;">
        <span>${formatNumber(item.qty)}x ${item.name}</span>
        <span>$${formatNumber(item.qty * item.basePrice, 2)}</span>
      </div>
    `;
    item.children?.forEach((child: any) => {
      if (child.status !== "canceled") {
        const modifierPrice =
          child.basePrice > 0
            ? `(+$${formatNumber(child.qty * child.basePrice, 2)})`
            : "";
        itemsHtml += `
          <div style="display: flex; justify-content: space-between; padding-left: 15px; font-size: 11px; color: #555;">
            <span>+ ${child.name}</span>
            <span>${modifierPrice}</span>
          </div>
        `;
      }
    });
  });

  const customerName =
    projectedState.orderContext?.customerFields?.name || "Guest";
  const dateStr = new Date().toLocaleString();

  win.document.write(`
    <html>
      <head>
        <title>POS Receipt - ${customerName}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 290px;
            margin: 20px auto;
            padding: 12px;
            border: 1px dashed #555;
            background-color: #fff;
            color: #000;
          }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 12px 0; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 15px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="center">
          <h3 style="margin: 0; font-size: 16px; letter-spacing: 1px;">RETAIL VCS POS</h3>
          <div style="font-size: 11px; margin-top: 4px; font-weight: bold;">ORDER RECEIPT</div>
          <div style="font-size: 10px; color: #333; margin-top: 4px;">${dateStr}</div>
        </div>
        <div class="divider"></div>
        <div style="font-size: 11px; line-height: 1.4;">
          <strong>Server:</strong> ${projectedState.orderContext?.serverName || "Tom"}<br/>
          <strong>Customer:</strong> ${customerName}<br/>
          <strong>Type:</strong> ${projectedState.orderContext?.orderTypeLabel || "Walk-In"}<br/>
          <strong>Branch:</strong> ${projectedState.activeBranch || "main"}
        </div>
        <div class="divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-size: 12px;">
          <span>Subtotal:</span>
          <span>$${formatNumber(projectedState.financials.subtotal, 2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 3px;">
          <span>Taxes & Fees:</span>
          <span>$${formatNumber(projectedState.financials.chargeTotal, 2)}</span>
        </div>
        <div class="total-row">
          <span>TOTAL:</span>
          <span>$${formatNumber(projectedState.financials.grandTotal, 2)}</span>
        </div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 20px; line-height: 1.3;">
          Thank you for shopping with us!<br/>
          VCS TRANSACTION LOGGED & VERIFIED
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

export function PaymentDialog({
  open,
  onOpenChange,
  projectedState,
  guests,
  onCompletePayment,
}: PaymentDialogProps) {
  const formatNumber = useFormatNumber();

  // Track paid state for each guest name/ID
  const [paidGuests, setPaidGuests] = useState<Record<string, boolean>>({});
  const [guestMethods, setGuestMethods] = useState<Record<string, string>>({});

  const personBreakdown = projectedState?.financials?.personBreakdown || [];

  const resolveGuestName = (idOrName: string) => {
    const matched = guests.find((g) => g.id === idOrName);
    return matched ? matched.name : idOrName;
  };

  const activePayingGuests = personBreakdown.filter(
    (pb: any) => pb.subtotal > 0
  );

  const handlePayGuest = (person: string, amount: number) => {
    setPaidGuests((prev) => ({ ...prev, [person]: true }));
    toast.success(`Received payment of $${formatNumber(amount, 2)} from ${resolveGuestName(person)}`);
  };

  const isAllPaid = activePayingGuests.every(
    (pb: any) => paidGuests[pb.person]
  );

  const handlePrint = () => {
    printReceipt(projectedState, formatNumber);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-6 gap-6 rounded-2xl select-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Ticket Checkout</DialogTitle>
          <DialogDescription className="text-xs">
            Review guest allocations, select payment methods, and collect payment.
          </DialogDescription>
        </DialogHeader>

        {/* Totals Summary */}
        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Subtotal</span>
            <span className="font-mono">
              ${formatNumber(projectedState?.financials?.subtotal || 0, 2)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Taxes & Fees</span>
            <span className="font-mono">
              ${formatNumber(projectedState?.financials?.chargeTotal || 0, 2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold border-t pt-2 mt-1">
            <span className="text-primary uppercase tracking-wider">
              Total Due
            </span>
            <span className="font-mono text-base text-primary">
              ${formatNumber(projectedState?.financials?.grandTotal || 0, 2)}
            </span>
          </div>
        </div>

        {/* Guest Breakdown Scroll Area */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Guest Payment Breakdown
          </h4>
          <ScrollArea className="h-60 rounded-xl border p-3 bg-card">
            <div className="space-y-3">
              {activePayingGuests.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No guest allocations declared.
                </div>
              ) : (
                activePayingGuests.map((pb: any) => {
                  const guestName = resolveGuestName(pb.person);
                  const isPaid = paidGuests[pb.person];
                  const method = guestMethods[pb.person] || "card";
                  const guestTotal =
                    (pb.subtotal / (projectedState?.financials?.subtotal || 1)) *
                    (projectedState?.financials?.grandTotal || 0);

                  return (
                    <div
                      key={pb.person}
                      className={`flex flex-col p-3 rounded-lg border gap-3 transition-colors ${
                        isPaid
                          ? "bg-emerald-50/15 border-emerald-500/20"
                          : "bg-background border-border"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-bold text-sm">{guestName}</span>
                          {isPaid && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[9px] uppercase font-bold tracking-wider py-0.5 px-1.5 gap-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono font-bold text-sm">
                          ${formatNumber(guestTotal, 2)}
                        </span>
                      </div>

                      {!isPaid && (
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-dashed">
                          {/* Payment Method selector */}
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant={method === "card" ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-[10px] gap-1 px-2.5 rounded-md"
                              onClick={() =>
                                setGuestMethods((prev) => ({
                                  ...prev,
                                  [pb.person]: "card",
                                }))
                              }
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Card
                            </Button>
                            <Button
                              variant={method === "cash" ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-[10px] gap-1 px-2.5 rounded-md"
                              onClick={() =>
                                setGuestMethods((prev) => ({
                                  ...prev,
                                  [pb.person]: "cash",
                                }))
                              }
                            >
                              <Coins className="w-3.5 h-3.5" />
                              Cash
                            </Button>
                          </div>

                          {/* Collect Cash/Card trigger */}
                          <Button
                            size="sm"
                            className="h-7 text-[10px] font-bold px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                            onClick={() => handlePayGuest(pb.person, guestTotal)}
                          >
                            Collect
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Dialog footer actions */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="flex-1 text-xs gap-1.5 font-bold"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>

          <Button
            className="flex-1 text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground"
            disabled={!isAllPaid && activePayingGuests.length > 0}
            onClick={() => {
              onCompletePayment();
              onOpenChange(false);
              toast.success("Checkout successfully processed!");
            }}
          >
            Complete Checkout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
