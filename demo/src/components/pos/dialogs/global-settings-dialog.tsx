"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Plus, X, RotateCcw } from "lucide-react";
import { usePreferencesStore } from "@/store/preferences-store";
import { ViewMode } from "@/lib/pos/types";
import { useEffect, useRef, useState } from "react";
import { NumberPadDialog } from "./number-pad-dialog";
import { Input } from "@/components/ui/input";
import { CatalogDetailDialog } from "./catalog-detail-dialog";

export function GlobalSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { defaultPrefs, updateDefaultPreferences } = usePreferencesStore();

  const [localPrefs, setLocalPrefs] = useState<any>(defaultPrefs);
  const [splitWarnPadOpen, setSplitWarnPadOpen] = useState(false);
  const [catalogDetailOpen, setCatalogDetailOpen] = useState(false);

  const prevOpen = useRef(open);
  useEffect(() => {
    // Only snap the state from global when transitioning from closed to open
    if (open && !prevOpen.current) {
      setLocalPrefs(defaultPrefs);
    }
    prevOpen.current = open;
  }, [open, defaultPrefs]);

  useEffect(() => {
    const t = setTimeout(() => updateDefaultPreferences(localPrefs), 300);
    return () => clearTimeout(t);
  }, [localPrefs, updateDefaultPreferences]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" /> Global Settings
          </DialogTitle>
          <DialogDescription>
            Modify default fallback settings applied to all new repositories.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
          <div className="flex items-center justify-between">
            <label htmlFor="detail-level" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Default Detail Level
            </label>
            <Select 
              value={localPrefs.detailLevel} 
              onValueChange={(val) => setLocalPrefs((prev: any) => ({ ...prev, detailLevel: val as ViewMode }))}
            >
              <SelectTrigger id="detail-level" className="w-35 h-8 text-xs">
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
            <label htmlFor="ledger-collapsed" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Ledger Panel Collapsed
            </label>
            <Checkbox 
              id="ledger-collapsed" 
              checked={localPrefs.isLedgerCollapsed}
              onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, isLedgerCollapsed: !!checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="group-notes-collapsed" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Group Notes Collapsed
            </label>
            <Checkbox 
              id="group-notes-collapsed" 
              checked={localPrefs.isGroupNotesCollapsed}
              onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, isGroupNotesCollapsed: !!checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="compact-mode" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Compact Mode
            </label>
            <Checkbox 
              id="compact-mode" 
              checked={localPrefs.isCompactMode}
              onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, isCompactMode: !!checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="use-comma-decimal" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Use Comma for Decimal
            </label>
            <Checkbox 
              id="use-comma-decimal" 
              checked={localPrefs.useCommaDecimal}
              onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, useCommaDecimal: !!checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="inline-mod-price-display" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Inline Modifier Price Display
            </label>
            <div className="inline-flex items-stretch rounded-full border bg-background p-1 shadow-sm">
              <button
                id="inline-mod-price-display"
                type="button"
                onClick={() => setLocalPrefs((prev: any) => ({ ...prev, inlineModifierPriceDisplayDelta: true }))}
                className={`min-w-16 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${localPrefs.inlineModifierPriceDisplayDelta ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Delta
              </button>
              <button
                type="button"
                onClick={() => setLocalPrefs((prev: any) => ({ ...prev, inlineModifierPriceDisplayDelta: false }))}
                className={`min-w-16 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${!localPrefs.inlineModifierPriceDisplayDelta ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                Net
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="catalog-detail-level" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Catalog Layout
            </label>
            <Button
              id="catalog-detail-level"
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => setCatalogDetailOpen(true)}
            >
              Customize
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="default-multi-select" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Default to Multi-Select
            </label>
            <Checkbox 
              id="default-multi-select" 
              checked={localPrefs.defaultMultiSelectMode}
              onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, defaultMultiSelectMode: !!checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="auto-select-last-clicked" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Auto-Select Last Clicked Item
            </label>
            <Checkbox 
              id="auto-select-last-clicked" 
              checked={localPrefs.autoSelectLastClickedItem}
              onCheckedChange={(checked) => setLocalPrefs((prev: any) => ({ ...prev, autoSelectLastClickedItem: !!checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="split-warn-threshold" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Split Line Warn Threshold
            </label>
            <button
              id="split-warn-threshold"
              onClick={() => setSplitWarnPadOpen(true)}
              className="w-20 h-8 text-xs text-right px-2 font-mono font-medium bg-background border shadow-sm hover:bg-accent rounded-md cursor-pointer flex items-center justify-end"
            >
              {localPrefs.splitLineWarnThreshold ?? 10}
            </button>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Depth Colors
              </label>
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

          <div className="flex flex-col gap-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Guest Palette
              </label>
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

          <div className="flex flex-col gap-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Branch Colors
              </label>
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
        
        <DialogFooter className="shrink-0 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
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
        }}
        onChange={(next) =>
          setLocalPrefs((prev: any) => ({
            ...prev,
            catalogDetailDisplay: next.detailDisplay,
            catalogNavigationMode: next.navigationMode,
            catalogGridRows: next.gridRows,
            catalogGridCols: next.gridCols,
          }))
        }
      />
    </>
  );
}
