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
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export enum PaymentMethodType {
  Cash = "Cash",
  Visa = "Visa",
  Mastercard = "Mastercard",
  AMEX = "AMEX",
  Card = "Card",
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectedState: any;
  guests: Array<{ id: string; name: string }>;
  onCompletePayment: (method: string) => void;
}

export function printReceipt(projectedState: any, formatNumber: any) {
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Popup blocked! Please allow popups to print receipt.");
    return;
  }

  let itemsHtml = "";
  const rootItems = Object.values(projectedState.items).filter(
    (i: any) => !i.parentLineId && i.status !== "canceled",
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

  // Track remaining dues (initialized when dialog opens)
  const [remainingDues, setRemainingDues] = useState<Record<string, number>>(
    {},
  );

  // Track received and change amounts for display
  const [receivedAmounts, setReceivedAmounts] = useState<
    Record<string, number>
  >({});
  const [changeAmounts, setChangeAmounts] = useState<Record<string, number>>(
    {},
  );

  // Active guest being paid
  const [activePayingPersonId, setActivePayingPersonId] = useState<
    string | null
  >(null);
  const [cashInput, setCashInput] = useState<string>("");

  const personBreakdown = projectedState?.financials?.personBreakdown || [];

  const resolveGuestName = (idOrName: string) => {
    const matched = guests.find((g) => g.id === idOrName);
    return matched ? matched.name : idOrName;
  };

  const activePayingGuests = personBreakdown.filter(
    (pb: any) => pb.subtotal > 0,
  );

  // Helper: Retrieve default payment method from allocations if specified
  const getPayerDefaultMethod = (person: string): string => {
    if (!projectedState || !projectedState.allocations) return "card";
    const allocations = Object.values(projectedState.allocations);
    const paymentAlloc = allocations.find(
      (a: any) => a.type === "payment" && a.payer === person,
    ) as any;
    if (paymentAlloc && paymentAlloc.method) {
      const methodStr = paymentAlloc.method.toLowerCase();
      if (methodStr === "cash" || methodStr === "card") {
        return methodStr;
      }
    }
    return "card"; // fallback default
  };

  // Initialize remaining dues if not set or when dialog opens
  React.useEffect(() => {
    if (open && activePayingGuests.length > 0) {
      const initialDues: Record<string, number> = {};
      const initialMethods: Record<string, string> = {};
      activePayingGuests.forEach((pb: any) => {
        const guestTotal =
          (pb.subtotal / (projectedState?.financials?.subtotal || 1)) *
          (projectedState?.financials?.grandTotal || 0);
        initialDues[pb.person] = guestTotal;
        initialMethods[pb.person] = getPayerDefaultMethod(pb.person);
      });
      setRemainingDues(initialDues);
      setGuestMethods(initialMethods);
      setPaidGuests({});
      setReceivedAmounts({});
      setChangeAmounts({});
      setActivePayingPersonId(null);
      setCashInput("");
    }
  }, [open, projectedState]);

  const handlePayGuest = (
    person: string,
    method: string,
    amountPaid: number,
    totalDue: number,
  ) => {
    if (method === "cash") {
      if (amountPaid >= totalDue) {
        const change = amountPaid - totalDue;
        setChangeAmounts((prev) => ({ ...prev, [person]: change }));
        setReceivedAmounts((prev) => ({ ...prev, [person]: amountPaid }));
        setRemainingDues((prev) => ({ ...prev, [person]: 0 }));
        setPaidGuests((prev) => ({ ...prev, [person]: true }));
        toast.success(
          `Received cash of $${formatNumber(amountPaid, 2)} from ${resolveGuestName(person)}. Change: $${formatNumber(change, 2)}`,
        );
      } else {
        // Partial payment
        const newDue = totalDue - amountPaid;
        setRemainingDues((prev) => ({ ...prev, [person]: newDue }));
        setReceivedAmounts((prev) => ({
          ...prev,
          [person]: (receivedAmounts[person] || 0) + amountPaid,
        }));
        toast.info(
          `Received partial cash of $${formatNumber(amountPaid, 2)} from ${resolveGuestName(person)}. Remaining Due: $${formatNumber(newDue, 2)}`,
        );
      }
    } else {
      // Card payment
      if (amountPaid >= totalDue) {
        // Full card payment
        setReceivedAmounts((prev) => ({
          ...prev,
          [person]: (receivedAmounts[person] || 0) + totalDue,
        }));
        setChangeAmounts((prev) => ({ ...prev, [person]: 0 }));
        setRemainingDues((prev) => ({ ...prev, [person]: 0 }));
        setPaidGuests((prev) => ({ ...prev, [person]: true }));
        toast.success(
          `Processed card payment of $${formatNumber(totalDue, 2)} for ${resolveGuestName(person)}`,
        );
      } else {
        // Partial card payment
        const newDue = totalDue - amountPaid;
        setRemainingDues((prev) => ({ ...prev, [person]: newDue }));
        setReceivedAmounts((prev) => ({
          ...prev,
          [person]: (receivedAmounts[person] || 0) + amountPaid,
        }));
        toast.info(
          `Processed partial card payment of $${formatNumber(amountPaid, 2)} for ${resolveGuestName(person)}. Remaining Due: $${formatNumber(newDue, 2)}`,
        );
      }
    }
    setActivePayingPersonId(null);
  };

  const isAllPaid = activePayingGuests.every(
    (pb: any) => paidGuests[pb.person],
  );

  const handlePrint = () => {
    printReceipt(projectedState, formatNumber);
  };

  // Numpad key handlers
  const handleNumpadPress = (val: string) => {
    setCashInput((prev) => {
      if (val === ".") {
        if (prev.includes(".")) return prev;
        return prev === "" ? "0." : prev + ".";
      }
      if (prev.includes(".")) {
        const parts = prev.split(".");
        if (parts[1] && parts[1].length >= 2) {
          return prev; // Max 2 decimal places
        }
      }
      return prev + val;
    });
  };

  const handleBackspace = () => {
    setCashInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setCashInput("");
  };

  // Determine view screen
  const currentPayingPerson = activePayingPersonId
    ? activePayingGuests.find((pb) => pb.person === activePayingPersonId)
    : null;
  const currentDue = currentPayingPerson
    ? (remainingDues[currentPayingPerson.person] ?? 0)
    : 0;
  const selectedMethod = currentPayingPerson
    ? guestMethods[currentPayingPerson.person] ||
      getPayerDefaultMethod(currentPayingPerson.person)
    : "card";

  const parsedCashInput = parseFloat(cashInput) || 0;
  const cashChange =
    selectedMethod === "cash" && parsedCashInput >= currentDue
      ? parsedCashInput - currentDue
      : 0;
  const cashRemaining =
    selectedMethod === "cash" && parsedCashInput < currentDue
      ? currentDue - parsedCashInput
      : currentDue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-6 gap-6 rounded-2xl select-none">
        {currentPayingPerson ? (
          /* PAYMENT PROCESS SCREEN */
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b pb-3">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full"
                onClick={() => setActivePayingPersonId(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h3 className="font-bold text-base">Collect Payment</h3>
                <p className="text-xs text-muted-foreground">
                  Processing checkout for{" "}
                  {resolveGuestName(currentPayingPerson.person)}
                </p>
              </div>
            </div>

            {/* Billing details */}
            <div className="flex justify-between items-center bg-muted/20 p-3.5 rounded-xl border">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                  Amount Due
                </span>
                <div className="text-lg font-bold font-mono">
                  ${formatNumber(currentDue, 2)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedMethod === "card" ? "default" : "outline"}
                  className="h-10 text-xs px-4 gap-1.5 font-bold rounded-lg"
                  onClick={() => {
                    setGuestMethods((prev) => ({
                      ...prev,
                      [currentPayingPerson.person]: "card",
                    }));
                    setCashInput("");
                  }}
                >
                  <CreditCard className="w-4 h-4" />
                  Card
                </Button>
                <Button
                  variant={selectedMethod === "cash" ? "default" : "outline"}
                  className="h-10 text-xs px-4 gap-1.5 font-bold rounded-lg"
                  onClick={() => {
                    setGuestMethods((prev) => ({
                      ...prev,
                      [currentPayingPerson.person]: "cash",
                    }));
                    setCashInput("");
                  }}
                >
                  <Coins className="w-4 h-4" />
                  Cash
                </Button>
              </div>
            </div>

            {/* Granular payment breakdown if multiple types exist */}
            {currentPayingPerson?.paymentBreakdown && currentPayingPerson.paymentBreakdown.length > 1 && (
              <div className="bg-muted/15 border border-dashed p-3 rounded-xl space-y-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Suggested Breakdown (Click to Apply Preset)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {currentPayingPerson.paymentBreakdown.map((item: any, idx: number) => {
                    const scaledItemAmount = item.amount * (projectedState?.financials?.grandTotal || 0) / (projectedState?.financials?.subtotal || 1);
                    const methodKey = item.method.toLowerCase() === PaymentMethodType.Cash.toLowerCase() ? "cash" : "card";
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className="h-10 text-xs flex justify-between px-3 font-mono rounded-lg border border-primary/20 hover:bg-primary/5 hover:border-primary"
                        onClick={() => {
                          setGuestMethods((prev) => ({
                            ...prev,
                            [currentPayingPerson.person]: methodKey,
                          }));
                          setCashInput(scaledItemAmount.toFixed(2));
                        }}
                      >
                        <span className="capitalize font-sans font-semibold text-foreground">
                          {item.method.toLowerCase()}
                        </span>
                        <span className="font-bold text-primary">
                          ${formatNumber(scaledItemAmount, 2)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unified Cash & Card Numpad/Quick Charge Controls */}
            <div className="space-y-4">
              {/* Tender display & Change details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-xl p-3 bg-muted/10">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {selectedMethod === "cash"
                      ? "Amount Tendered"
                      : "Amount to Charge"}
                  </span>
                  <div className="text-xl font-bold font-mono text-primary mt-1">
                    $
                    {cashInput === ""
                      ? "0.00"
                      : formatNumber(parsedCashInput, 2)}
                  </div>
                </div>
                <div
                  className={`border rounded-xl p-3 ${
                    selectedMethod === "cash" && parsedCashInput >= currentDue
                      ? "bg-emerald-500/10 border-emerald-500/25"
                      : "bg-amber-500/10 border-amber-500/25"
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {selectedMethod === "cash" && parsedCashInput >= currentDue
                      ? "Change Due"
                      : "Remaining Due"}
                  </span>
                  <div
                    className={`text-xl font-bold font-mono mt-1 ${
                      selectedMethod === "cash" && parsedCashInput >= currentDue
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }`}
                  >
                    $
                    {selectedMethod === "cash" && parsedCashInput >= currentDue
                      ? formatNumber(cashChange, 2)
                      : formatNumber(cashRemaining, 2)}
                  </div>
                </div>
              </div>

              {/* Quick Cash/Charge Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  {selectedMethod === "cash"
                    ? "Quick Cash Received"
                    : "Quick Charge Presets"}
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {/* Contextual/smart quick buttons */}
                  <Button
                    variant="outline"
                    className="h-8 text-[11px] font-bold px-2 rounded-lg"
                    onClick={() => setCashInput(currentDue.toFixed(2))}
                  >
                    Exact
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-[11px] font-bold px-2 rounded-lg"
                    disabled={Math.ceil(currentDue / 5) * 5 === currentDue}
                    onClick={() =>
                      setCashInput((Math.ceil(currentDue / 5) * 5).toFixed(2))
                    }
                  >
                    Next $5
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-[11px] font-bold px-2 rounded-lg"
                    disabled={Math.ceil(currentDue / 10) * 10 === currentDue}
                    onClick={() =>
                      setCashInput((Math.ceil(currentDue / 10) * 10).toFixed(2))
                    }
                  >
                    Next $10
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-[11px] font-bold px-2 rounded-lg"
                    disabled={Math.ceil(currentDue / 20) * 20 === currentDue}
                    onClick={() =>
                      setCashInput((Math.ceil(currentDue / 20) * 20).toFixed(2))
                    }
                  >
                    Next $20
                  </Button>

                  {/* Standard bill denominations */}
                  {[5, 10, 20, 40, 50, 100, 200].map((bill) => (
                    <Button
                      key={bill}
                      variant="outline"
                      className="h-8 text-[11px] font-semibold rounded-lg"
                      onClick={() => setCashInput(bill.toString())}
                    >
                      ${bill}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Numeric Keypad Grid */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8 grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map(
                    (num) => (
                      <Button
                        key={num}
                        variant="secondary"
                        className="h-10 text-sm font-bold rounded-lg active:scale-95 transition-transform"
                        onClick={() => handleNumpadPress(num)}
                      >
                        {num}
                      </Button>
                    ),
                  )}
                  <Button
                    variant="secondary"
                    className="h-10 text-xs font-bold rounded-lg text-rose-500 active:scale-95 transition-transform"
                    onClick={handleBackspace}
                  >
                    ⌫
                  </Button>
                </div>
                <div className="col-span-4 flex flex-col gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1 font-bold text-xs rounded-lg active:scale-95 transition-transform"
                    onClick={handleClear}
                  >
                    Clear
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg active:scale-95 transition-transform"
                    disabled={parsedCashInput <= 0}
                    onClick={() =>
                      handlePayGuest(
                        currentPayingPerson.person,
                        selectedMethod,
                        parsedCashInput,
                        currentDue,
                      )
                    }
                  >
                    {selectedMethod === "card" ? "Charge Card" : "Confirm"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD GUEST CHECKOUT SCREEN */
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Ticket Checkout
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review guest allocations, select payment methods, and collect
                payment.
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
                  $
                  {formatNumber(
                    projectedState?.financials?.chargeTotal || 0,
                    2,
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold border-t pt-2 mt-1">
                <span className="text-primary uppercase tracking-wider">
                  Total Due
                </span>
                <span className="font-mono text-base text-primary">
                  $
                  {formatNumber(projectedState?.financials?.grandTotal || 0, 2)}
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
                      const currentDue = remainingDues[pb.person] ?? 0;
                      const hasPaidSome = (receivedAmounts[pb.person] ?? 0) > 0;
                      const ratio = (projectedState?.financials?.grandTotal || 0) / (projectedState?.financials?.subtotal || 1);
                      const breakdown = pb.paymentBreakdown || [];

                      return (
                        <div
                          key={pb.person}
                          className={`flex flex-col p-3 rounded-lg border gap-2 transition-colors ${
                            isPaid
                              ? "bg-emerald-50/15 border-emerald-500/20"
                              : hasPaidSome
                                ? "bg-amber-500/5 border-amber-500/20"
                                : "bg-background border-border"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-bold text-sm">
                                {guestName}
                              </span>
                              {isPaid ? (
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[9px] uppercase font-bold tracking-wider py-0.5 px-1.5 gap-0.5 rounded-md">
                                  <CheckCircle2 className="w-3 h-3" /> Paid
                                </Badge>
                              ) : hasPaidSome ? (
                                <Badge
                                  variant="outline"
                                  className="text-amber-500 border-amber-500/30 text-[9px] uppercase font-bold tracking-wider py-0.5 px-1.5 rounded-md"
                                >
                                  Partial Paid
                                </Badge>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="font-mono font-bold text-sm">
                                ${formatNumber(currentDue, 2)}
                              </span>
                              {hasPaidSome && !isPaid && (
                                <span className="text-[10px] text-muted-foreground">
                                  Paid: $
                                  {formatNumber(receivedAmounts[pb.person], 2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Granular payment breakdown if multiple types exist */}
                          {breakdown.length > 1 && (
                            <div className="pl-6 pr-2 py-1.5 bg-muted/10 rounded-md border border-dashed border-muted space-y-1">
                              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                                Payment Breakdown
                              </span>
                              {breakdown.map((item: any, idx: number) => {
                                const scaledItemAmount = item.amount * ratio;
                                return (
                                  <div key={idx} className="flex justify-between text-xs font-mono text-muted-foreground">
                                    <span className="capitalize">{item.method.toLowerCase()}</span>
                                    <span>${formatNumber(scaledItemAmount, 2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {!isPaid && (
                            <div className="flex items-center justify-end gap-4 pt-1.5 border-t border-dashed">
                              <Button
                                size="sm"
                                className="h-7 text-[10px] font-bold px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md gap-1"
                                onClick={() => {
                                  setActivePayingPersonId(pb.person);
                                  setCashInput("");
                                }}
                              >
                                <Wallet className="w-3.5 h-3.5" />
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
                  const methodsUsed = Array.from(
                    new Set(Object.values(guestMethods)),
                  );
                  const finalMethod =
                    methodsUsed.length > 1
                      ? "split"
                      : methodsUsed[0] || "card";
                  onCompletePayment(finalMethod);
                  onOpenChange(false);
                  toast.success("Checkout successfully processed!");
                }}
              >
                Complete Checkout
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
