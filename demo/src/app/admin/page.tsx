"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useVCSStore } from "@/store/vcs-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { ViewMode } from "@/lib/pos/types";
import { NumberPadDialog } from "@/components/pos/dialogs/number-pad-dialog";
import { CatalogDetailDialog } from "@/components/pos/dialogs/catalog-detail-dialog";
import {
  ArrowLeft,
  Settings,
  ShieldAlert,
  Database,
  Store,
  Terminal,
  AlertCircle,
  Plus,
  X,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const { isInitialized, hydrate } = useVCSStore();
  const { defaultPrefs, updateDefaultPreferences } = usePreferencesStore();
  const router = useRouter();

  const [localPrefs, setLocalPrefs] = useState<any>(null);
  const [splitWarnPadOpen, setSplitWarnPadOpen] = useState(false);
  const [catalogDetailOpen, setCatalogDetailOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isInitialized) {
      router.push("/");
    }
  }, [isInitialized, router]);

  useEffect(() => {
    if (defaultPrefs && !localPrefs) {
      setLocalPrefs(defaultPrefs);
    }
  }, [defaultPrefs, localPrefs]);

  useEffect(() => {
    if (localPrefs) {
      const t = setTimeout(() => updateDefaultPreferences(localPrefs), 300);
      return () => clearTimeout(t);
    }
  }, [localPrefs, updateDefaultPreferences]);

  if (!isInitialized || !localPrefs) {
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

          {/* Card 3: Global Terminal Preferences */}
          <Card className="border rounded-2xl overflow-hidden bg-card md:col-span-2">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Global Terminal Preferences
              </CardTitle>
              <CardDescription className="text-xs">
                Configure interface presets, behavior flags, and custom color mappings applied globally.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 divide-y divide-border/60">
              {/* Section 1: UI Layout Switches */}
              <div className="space-y-4 pt-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Layout Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="detail-level" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Default Detail Level
                      </label>
                      <p className="text-[10px] text-muted-foreground">Sets default detail rendering mode</p>
                    </div>
                    <Select
                      value={localPrefs.detailLevel}
                      onValueChange={(val) => setLocalPrefs((prev: any) => ({ ...prev, detailLevel: val as ViewMode }))}
                    >
                      <SelectTrigger id="detail-level" className="w-40 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ViewMode).map(mode => (
                          <SelectItem key={mode} value={mode}>
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="ledger-collapsed" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Ledger Panel Collapsed
                      </label>
                      <p className="text-[10px] text-muted-foreground">Collapse checkout log panel by default</p>
                    </div>
                    <Checkbox
                      id="ledger-collapsed"
                      checked={localPrefs.isLedgerCollapsed}
                      onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, isLedgerCollapsed: !!checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="group-notes-collapsed" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Group Notes Collapsed
                      </label>
                      <p className="text-[10px] text-muted-foreground">Collapse group annotation sidebar</p>
                    </div>
                    <Checkbox
                      id="group-notes-collapsed"
                      checked={localPrefs.isGroupNotesCollapsed}
                      onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, isGroupNotesCollapsed: !!checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="compact-mode" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Compact Mode
                      </label>
                      <p className="text-[10px] text-muted-foreground">Render tighter element paddings</p>
                    </div>
                    <Checkbox
                      id="compact-mode"
                      checked={localPrefs.isCompactMode}
                      onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, isCompactMode: !!checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="use-comma-decimal" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Use Comma for Decimal
                      </label>
                      <p className="text-[10px] text-muted-foreground">Format numbers using commas (e.g., 12,34)</p>
                    </div>
                    <Checkbox
                      id="use-comma-decimal"
                      checked={localPrefs.useCommaDecimal}
                      onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, useCommaDecimal: !!checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="catalog-detail-level" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Catalog Layout Configuration
                      </label>
                      <p className="text-[10px] text-muted-foreground">Customize columns, rows, navigation details</p>
                    </div>
                    <Button
                      id="catalog-detail-level"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-3"
                      onClick={() => setCatalogDetailOpen(true)}
                    >
                      Customize Layout
                    </Button>
                  </div>
                </div>
              </div>

              {/* Section 2: Order Behavior & Validation Defaults */}
              <div className="space-y-4 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Order & POS Logic Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="inline-mod-price-display" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Inline Modifier Price Display
                      </label>
                      <p className="text-[10px] text-muted-foreground">Toggle delta vs net price visualization</p>
                    </div>
                    <div className="inline-flex items-stretch rounded-full border bg-background p-1 shadow-sm">
                      <button
                        id="inline-mod-price-display"
                        type="button"
                        onClick={() => setLocalPrefs((prev: any) => ({ ...prev, inlineModifierPriceDisplayDelta: true }))}
                        className={`min-w-16 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${localPrefs.inlineModifierPriceDisplayDelta ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Delta
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalPrefs((prev: any) => ({ ...prev, inlineModifierPriceDisplayDelta: false }))}
                        className={`min-w-16 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${!localPrefs.inlineModifierPriceDisplayDelta ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Net
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="default-multi-select" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Default to Multi-Select
                      </label>
                      <p className="text-[10px] text-muted-foreground">Select multiple tickets by default</p>
                    </div>
                    <Checkbox
                      id="default-multi-select"
                      checked={localPrefs.defaultMultiSelectMode}
                      onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, defaultMultiSelectMode: !!checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="auto-select-last-clicked" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Auto-Select Last Clicked Item
                      </label>
                      <p className="text-[10px] text-muted-foreground">Focus automatically on newly added items</p>
                    </div>
                    <Checkbox
                      id="auto-select-last-clicked"
                      checked={localPrefs.autoSelectLastClickedItem}
                      onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, autoSelectLastClickedItem: !!checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="split-warn-threshold" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
                        Split Line Warn Threshold
                      </label>
                      <p className="text-[10px] text-muted-foreground">Line quantity triggering split warn dialogs</p>
                    </div>
                    <button
                      id="split-warn-threshold"
                      onClick={() => setSplitWarnPadOpen(true)}
                      className="w-20 h-8 text-xs text-right px-2 font-mono font-medium bg-background border shadow-sm hover:bg-accent rounded-md cursor-pointer flex items-center justify-end"
                    >
                      {localPrefs.splitLineWarnThreshold ?? 10}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Palettes & Customized Colors */}
              <div className="space-y-6 pt-6">
                {/* Palette 1: Depth Colors */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Depth Colors Palette
                      </label>
                      <p className="text-[10px] text-muted-foreground">Colors for ticket nested modifiers layout hierarchy depth levels</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setLocalPrefs((prev: any) => ({ ...prev, globalDepthColors: ["#94a3b8", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e"] }))}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {localPrefs.globalDepthColors?.map((color: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border shadow-sm">
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const newColors = [...(localPrefs.globalDepthColors || [])];
                            newColors[idx] = e.target.value;
                            setLocalPrefs((prev: any) => ({ ...prev, globalDepthColors: newColors }));
                          }}
                          className="w-8 h-8 p-0.5 cursor-pointer border-none bg-transparent"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => {
                            const newColors = (localPrefs.globalDepthColors || []).filter((_: any, i: number) => i !== idx);
                            setLocalPrefs((prev: any) => ({ ...prev, globalDepthColors: newColors.length > 0 ? newColors : ["#94a3b8"] }));
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 text-xs border-dashed gap-1"
                      onClick={() => setLocalPrefs((prev: any) => ({ ...prev, globalDepthColors: [...(prev.globalDepthColors || []), "#cccccc"] }))}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>

                {/* Palette 2: Guest Palette */}
                <div className="flex flex-col gap-3 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Guest Palette
                      </label>
                      <p className="text-[10px] text-muted-foreground">Color designations for guest/seat tracking tags</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setLocalPrefs((prev: any) => ({ ...prev, globalGuestPalette: ["#10b981", "#8b5cf6", "#f59e0b", "#0ea5e9", "#f43f5e", "#14b8a6", "#f97316", "#6366f1", "#d946ef", "#84cc16", "#06b6d4", "#ec4899", "#eab308", "#3b82f6", "#a855f7", "#ef4444", "#22c55e", "#64748b"] }))}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {localPrefs.globalGuestPalette?.map((color: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border shadow-sm">
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const newColors = [...(localPrefs.globalGuestPalette || [])];
                            newColors[idx] = e.target.value;
                            setLocalPrefs((prev: any) => ({ ...prev, globalGuestPalette: newColors }));
                          }}
                          className="w-8 h-8 p-0.5 cursor-pointer border-none bg-transparent"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => {
                            const newColors = (localPrefs.globalGuestPalette || []).filter((_: any, i: number) => i !== idx);
                            setLocalPrefs((prev: any) => ({ ...prev, globalGuestPalette: newColors.length > 0 ? newColors : ["#10b981"] }));
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 text-xs border-dashed gap-1"
                      onClick={() => setLocalPrefs((prev: any) => ({ ...prev, globalGuestPalette: [...(prev.globalGuestPalette || []), "#cccccc"] }))}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>

                {/* Palette 3: Branch Colors */}
                <div className="flex flex-col gap-3 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Branch Colors
                      </label>
                      <p className="text-[10px] text-muted-foreground">VCS branching visualization branch line tags</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setLocalPrefs((prev: any) => ({ ...prev, globalBranchColors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"] }))}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {localPrefs.globalBranchColors?.map((color: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border shadow-sm">
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const newColors = [...(localPrefs.globalBranchColors || [])];
                            newColors[idx] = e.target.value;
                            setLocalPrefs((prev: any) => ({ ...prev, globalBranchColors: newColors }));
                          }}
                          className="w-8 h-8 p-0.5 cursor-pointer border-none bg-transparent"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => {
                            const newColors = (localPrefs.globalBranchColors || []).filter((_: any, i: number) => i !== idx);
                            setLocalPrefs((prev: any) => ({ ...prev, globalBranchColors: newColors.length > 0 ? newColors : ["#3b82f6"] }));
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 text-xs border-dashed gap-1"
                      onClick={() => setLocalPrefs((prev: any) => ({ ...prev, globalBranchColors: [...(prev.globalBranchColors || []), "#cccccc"] }))}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>
              </div>
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

      {/* Dialogs */}
      <NumberPadDialog
        open={splitWarnPadOpen}
        onOpenChange={setSplitWarnPadOpen}
        title="Split Line Warning Threshold"
        description="Set the number of new lines that will trigger a warning during a split operation."
        initialValue={localPrefs.splitLineWarnThreshold ?? 10}
        min={2}
        increment={1}
        onConfirm={(val) => {
          setLocalPrefs((prev: any) => ({ ...prev, splitLineWarnThreshold: val }));
        }}
      />
      <CatalogDetailDialog
        open={catalogDetailOpen}
        onOpenChange={setCatalogDetailOpen}
        value={{
          detailDisplay: localPrefs.catalogDetailDisplay,
          navigationMode: localPrefs.catalogNavigationMode,
          gridRows: localPrefs.catalogGridRows,
          gridCols: localPrefs.catalogGridCols,
          categoryMode: localPrefs.catalogCategoryMode,
        }}
        onChange={(next) =>
          setLocalPrefs((prev: any) => ({
            ...prev,
            catalogDetailDisplay: next.detailDisplay,
            catalogNavigationMode: next.navigationMode,
            catalogGridRows: next.gridRows,
            catalogGridCols: next.gridCols,
            catalogCategoryMode: next.categoryMode,
          }))
        }
      />
    </div>
  );
}
