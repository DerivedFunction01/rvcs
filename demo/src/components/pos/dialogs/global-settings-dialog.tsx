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
import { Settings2 } from "lucide-react";
import { usePreferencesStore } from "@/store/preferences-store";
import { ViewMode } from "@/lib/pos/types";

export function GlobalSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { defaultPrefs, updateDefaultPreferences } = usePreferencesStore();

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
              value={defaultPrefs.detailLevel} 
              onValueChange={(val) => updateDefaultPreferences({ detailLevel: val as ViewMode })}
            >
              <SelectTrigger id="detail-level" className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ViewMode.Simple}>Simple</SelectItem>
                <SelectItem value={ViewMode.Detailed}>Detailed</SelectItem>
                <SelectItem value={ViewMode.Full}>Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="ledger-collapsed" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Ledger Panel Collapsed
            </label>
            <Checkbox 
              id="ledger-collapsed" 
              checked={defaultPrefs.isLedgerCollapsed}
              onCheckedChange={(checked) => updateDefaultPreferences({ isLedgerCollapsed: !!checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="group-notes-collapsed" className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
              Group Notes Collapsed
            </label>
            <Checkbox 
              id="group-notes-collapsed" 
              checked={defaultPrefs.isGroupNotesCollapsed}
              onCheckedChange={(checked) => updateDefaultPreferences({ isGroupNotesCollapsed: !!checked })}
            />
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