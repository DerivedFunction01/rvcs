"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVCSStore } from "@/store/vcs-store";
import { PosScreen, OrderType } from "@/lib/pos/types";
import { evaluateBusinessRules } from "@/lib/pos/evaluate";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import {
  ArrowLeft,
  Trash2,
  FolderOpen,
  Plus,
  ShoppingCart,
  Phone,
  MapPin,
  Clock,
  User,
  Server,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function OrderHistoryScreen() {
  const store = useVCSStore();
  const formatNumber = useFormatNumber();
  const router = useRouter();

  const branches = store.engine.getRepo().branches;
  const activeBranchName = store.engine.getActiveBranch();
  const branchContexts = (store.preferences.branchContexts as Record<string, any>) || {};

  const orderCards = useMemo(() => {
    return Object.entries(branches)
      .filter(([name]) => name !== "system")
      .map(([name, branch]) => {
        const headHash = branch.headHash;
        let grandTotal = 0;
        let subtotal = 0;
        let itemCount = 0;

        if (headHash) {
          try {
            const projected = store.engine.projectAt(headHash);
            const evaluated = evaluateBusinessRules(
              projected,
              store.chargeRules,
              store.catalog
            );
            grandTotal = evaluated.financials.grandTotal;
            subtotal = evaluated.financials.subtotal;
            itemCount = Object.values(evaluated.items).filter(
              (item) => !item.parentLineId && item.status !== "canceled"
            ).length;
          } catch (e) {
            console.error("Failed to project branch state:", e);
          }
        }

        const context = branchContexts[name] || null;

        // Try to get timestamp of the latest commit for this branch
        let lastUpdated = "Unknown";
        if (headHash) {
          const commit = store.engine.getRepo().log.find(
            (c) => c.commitHash === headHash
          );
          if (commit?.timestamp) {
            lastUpdated = new Date(commit.timestamp).toLocaleString();
          }
        }

        return {
          name,
          headHash,
          grandTotal,
          subtotal,
          itemCount,
          lastUpdated,
          context,
        };
      })
      .sort((a, b) => {
        // Sort active branch first, then sort by last updated timestamp
        if (a.name === activeBranchName) return -1;
        if (b.name === activeBranchName) return 1;
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      });
  }, [branches, activeBranchName, branchContexts, store.chargeRules, store.catalog, store.engine]);

  const handleStartNewOrder = () => {
    store.resetOrder();
    toast.success("Ready to configure a new order");
  };

  const getOrderIcon = (orderType?: OrderType) => {
    switch (orderType) {
      case OrderType.Pickup:
        return <Phone className="w-4 h-4" />;
      case OrderType.Delivery:
        return <MapPin className="w-4 h-4" />;
      default:
        return <ShoppingCart className="w-4 h-4" />;
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
                Order History & Drafts
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Version-Controlled Saved States
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
                variant="secondary"
                size="sm"
                className="h-6 text-[10px] font-bold px-2 rounded-md"
                onClick={() => router.push("/history")}
              >
                Drafts
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] font-bold px-2 rounded-md hover:bg-background/80"
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
              size="sm"
              className="h-9 text-xs gap-1.5 font-bold"
              onClick={handleStartNewOrder}
            >
              <Plus className="w-4 h-4" />
              New Order
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orderCards.map((card) => {
            const isActive = card.name === activeBranchName;
            return (
              <Card
                key={card.name}
                className={`relative flex flex-col justify-between transition-all duration-200 border rounded-xl overflow-hidden hover:shadow-md ${
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className="text-[9px] uppercase font-bold tracking-wider rounded-md"
                    >
                      {isActive ? "Active Order" : "Draft"}
                    </Badge>
                    {card.context?.orderType && (
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider gap-1 font-bold">
                        {getOrderIcon(card.context.orderType)}
                        {card.context.orderTypeLabel || card.context.orderType}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base font-bold tracking-tight mt-2.5 truncate">
                    {card.context?.customerFields?.name || "Guest Order"}
                  </CardTitle>
                  <CardDescription className="font-mono text-[10px] truncate max-w-full">
                    branch: {card.name}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-3 text-xs space-y-2.5">
                  {/* Meta details */}
                  <div className="grid grid-cols-2 gap-2 border-y py-2.5 my-1 border-border/60">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {card.context?.customerFields?.phone || "No Phone"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                      <Server className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {card.context?.serverName || "Tom"}
                      </span>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-muted-foreground text-xs font-normal">
                      Items ({card.itemCount})
                    </span>
                    <span className="font-mono font-bold">
                      ${formatNumber(card.grandTotal, 2, 10)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 gap-2 border-t bg-muted/10 shrink-0">
                  <Button
                    variant={isActive ? "secondary" : "default"}
                    className="flex-1 text-xs gap-1.5 h-9 font-bold"
                    onClick={() => {
                      store.checkoutBranch(card.name);
                      toast.success(`Switched to order: ${card.context?.customerFields?.name || "Guest"}`);
                      router.push("/");
                    }}
                  >
                    <FolderOpen className="w-4 h-4" />
                    {isActive ? "Resume" : "Open"}
                  </Button>
                  {card.name !== "main" && (
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isActive}
                      className="h-9 w-9 text-destructive border-destructive/20 hover:bg-destructive/10"
                      onClick={() => store.deleteBranch(card.name)}
                      title="Delete saved order draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card px-6 py-3 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 select-none">
        <span>VCS-Retail v2.0.0-PRO</span>
        <div className="flex items-center gap-1">
          <Terminal className="w-3 h-3 text-muted-foreground" />
          <span>Active screen: Order History</span>
        </div>
      </footer>
    </div>
  );
}
