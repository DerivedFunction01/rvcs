"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { useVCSStore } from "@/store/vcs-store";
import { ArrowLeft, RefreshCw, ShoppingCart, User, CreditCard, Coins, Calendar, Terminal } from "lucide-react";

interface CompletedOrderItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  basePrice: number;
  totalPrice: number;
  modifiers: string;
}

interface CompletedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string | null;
  serverName: string;
  orderType: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  settledAt: string;
  items: CompletedOrderItem[];
}

export default function OrdersPage() {
  const { isInitialized, hydrate } = useVCSStore();
  const formatNumber = useFormatNumber();
  const router = useRouter();

  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch completed orders:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash":
        return <Coins className="w-3.5 h-3.5 inline mr-1" />;
      case "card":
        return <CreditCard className="w-3.5 h-3.5 inline mr-1" />;
      default:
        return <ShoppingCart className="w-3.5 h-3.5 inline mr-1" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background select-none">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 shrink-0 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                Settled Orders History
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Archived Transaction Ledger (Database)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border bg-background/50 p-0.5 rounded-lg mr-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] font-bold px-2 rounded-md hover:bg-background/80"
                onClick={() => router.push("/")}
              >
                Terminal
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] font-bold px-2 rounded-md hover:bg-background/80"
                onClick={() => router.push("/history")}
              >
                Drafts
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-6 text-[10px] font-bold px-2 rounded-md"
                onClick={() => router.push("/orders")}
              >
                Orders
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] font-bold px-2 rounded-md hover:bg-background/80"
                onClick={() => router.push("/admin")}
              >
                Admin
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5"
              onClick={fetchOrders}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-sm text-muted-foreground gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span>Loading orders database records...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-2xl bg-card/50">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-semibold text-base mb-1">No settled orders found</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Completed transactions will be archived here once they are checked out and paid.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border rounded-2xl overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Order Info</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="font-mono text-xs">{order.orderNumber}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.settledAt).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          {order.customerName}
                        </div>
                        {order.customerPhone && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                            {order.customerPhone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {order.serverName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider rounded-md">
                          {order.orderType.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-wider rounded-md">
                          {getMethodIcon(order.paymentMethod)}
                          {order.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm">
                        ${formatNumber(order.grandTotal, 2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card px-6 py-3 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 select-none">
        <span>VCS-Retail v2.0.0-PRO</span>
        <div className="flex items-center gap-1">
          <Terminal className="w-3 h-3 text-muted-foreground" />
          <span>Active screen: Settled Orders Ledger</span>
        </div>
      </footer>
    </div>
  );
}
