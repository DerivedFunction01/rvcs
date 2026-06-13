import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, ChevronsUpDown, Eraser } from "lucide-react";

export function HistoryOpDialog({
  open,
  onOpenChange,
  operation,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: { type: "squash" | "reset"; targetHash: string; label: string; description: string } | null;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {operation?.type === "squash" ? <ChevronsUpDown className="w-4 h-4 text-sky-500" /> : <Eraser className="w-4 h-4 text-rose-500" />}
            {operation?.label}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {operation?.description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-1">
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 flex items-start gap-2">
            <Lock className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
            Confirmed orders are never modified. Only pending (unconfirmed) commits are affected.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" variant={operation?.type === "reset" ? "destructive" : "default"} onClick={onConfirm}>
            {operation?.type === "squash" ? "Squash Commits" : "Reset Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}