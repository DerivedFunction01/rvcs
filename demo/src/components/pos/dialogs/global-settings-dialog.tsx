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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Plus, X } from "lucide-react";
import { usePreferencesStore } from "@/store/preferences-store";
import { ViewMode } from "@/lib/pos/types";
import { useVCSStore } from "@/store/vcs-store";
import { useEffect, useRef, useState } from "react";

export function GlobalSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { defaultPrefs, updateDefaultPreferences } = usePreferencesStore();
  const { globalDepthColors, setGlobalDepthColors } = useVCSStore();

  const [localPrefs, setLocalPrefs] = useState<any>(defaultPrefs);
  const [localColors, setLocalColors] = useState<string[]>(globalDepthColors);

  const prevOpen = useRef(open);
  useEffect(() => {
    // Only snap the state from global when transitioning from closed to open
    if (open && !prevOpen.current) {
      setLocalPrefs(defaultPrefs);
      setLocalColors(globalDepthColors);
    }
    prevOpen.current = open;
  }, [open, defaultPrefs, globalDepthColors]);

  useEffect(() => {
    const t = setTimeout(() => updateDefaultPreferences(localPrefs), 300);
    return () => clearTimeout(t);
  }, [localPrefs, updateDefaultPreferences]);

  useEffect(() => {
    const t = setTimeout(() => setGlobalDepthColors(localColors), 300);
    return () => clearTimeout(t);
  }, [localColors, setGlobalDepthColors]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" /> Global Settings
          </DialogTitle>
          <DialogDescription>
            Modify default fallback settings applied to all new repositories.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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
            <label htmlFor="split-warn-threshold" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Split Line Warn Threshold
            </label>
            <Input
              id="split-warn-threshold"
              type="number"
              min={2}
              value={localPrefs.splitLineWarnThreshold ?? 10}
              onChange={(e) => setLocalPrefs((prev: any) => ({ ...prev, splitLineWarnThreshold: Number(e.target.value) || 10 }))}
              className="w-20 h-8 text-xs text-right"
            />
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Depth Colors
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {localColors.map((color, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border shadow-sm">
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...localColors];
                      newColors[idx] = e.target.value;
                      setLocalColors(newColors);
                    }}
                    className="w-8 h-8 p-0.5 cursor-pointer border-none bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => {
                      const newColors = localColors.filter((_, i) => i !== idx);
                      setLocalColors(newColors.length > 0 ? newColors : ["#94a3b8"]);
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
                onClick={() => setLocalColors([...localColors, "#cccccc"])}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}