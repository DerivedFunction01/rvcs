"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVCSStore } from "@/store/vcs-store";
import { ArrowLeft, Settings, ShieldAlert, Database, Store, KeyRound, Terminal, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const { isInitialized, hydrate } = useVCSStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isInitialized) {
      router.push("/");
    }
  }, [isInitialized, router]);

  if (!isInitialized) {
    return null;
  }

  const handleMaintenanceAction = (action: string) => {
    toast.info(`Simulated administrative action: ${action}`);
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
              <h1 className="text-base font-bold tracking-tight flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Administrative Panel
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                POS System & Registry Configurator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 border bg-background/50 p-0.5 rounded-lg">
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
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] font-bold px-2 rounded-md hover:bg-background/80"
              onClick={() => router.push("/orders")}
            >
              Orders
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-[10px] font-bold px-2 rounded-md"
              onClick={() => router.push("/admin")}
            >
              Admin
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Store profile settings */}
          <Card className="border rounded-2xl overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" />
                General POS Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Configure basic terminal parameters and receipt custom text headers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Store Location Label</label>
                <input
                  type="text"
                  disabled
                  value="Main Location"
                  className="w-full text-sm h-10 px-3 border rounded-lg bg-muted/30 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Default Payment Method</label>
                <select
                  disabled
                  className="w-full text-sm h-10 px-3 border rounded-lg bg-muted/30 cursor-not-allowed"
                >
                  <option>Cash</option>
                  <option>Card</option>
                </select>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>Store configuration is loaded from `/api/pos-config` dynamic registry endpoint.</span>
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Database and Ledger Maintenance */}
          <Card className="border rounded-2xl overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Registry Maintenance
              </CardTitle>
              <CardDescription className="text-xs">
                Trigger system updates, database seeds, and version logs pruning.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-xs h-9 rounded-lg"
                onClick={() => handleMaintenanceAction("Re-index Product Catalog")}
              >
                Re-index Menu Catalog
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs h-9 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50/10"
                onClick={() => handleMaintenanceAction("Purge Active Workspace Branches")}
              >
                Prune Unused Workspace Branches
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs h-9 rounded-lg"
                onClick={() => handleMaintenanceAction("Rebuild Jurisdictional Surcharges")}
              >
                Sync Jurisdictional Tax Surcharges
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card px-6 py-3 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 select-none">
        <span>VCS-Retail v2.0.0-PRO</span>
        <div className="flex items-center gap-1">
          <Terminal className="w-3 h-3 text-muted-foreground" />
          <span>Active screen: Admin Dashboard</span>
        </div>
      </footer>
    </div>
  );
}
