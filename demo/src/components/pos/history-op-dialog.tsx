import React, { useState, useEffect } from "react";
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
  onConfirm: (squashType?: "light" | "full") => void;
}) {
  const [squashType, setSquashType] = useState<"light" | "full">("light");

  useEffect(() => {
    if (open) {
      setSquashType("light");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {operation?.type === "squash" ? <ChevronsUpDown className="w-4 h-4 text-sky-500" /> : <Eraser className="w-4 h-4 text-rose-500" />}
            {operation?.label}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {operation?.description}
          </DialogDescription>
        </DialogHeader>

        {operation?.type === "squash" && (
          <div className="py-2.5 space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Select Squash Type
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSquashType("light")}
                className={`p-3 rounded-lg border text-left text-xs transition-all space-y-1.5 ${
                  squashType === "light"
                    ? "border-sky-500 bg-sky-500/5 font-medium shadow-sm"
                    : "border-border bg-card opacity-70 hover:opacity-100"
                }`}
              >
                <div className="font-bold text-foreground">Light Squash</div>
                <div className="text-[10px] text-muted-foreground leading-normal font-normal">
                  Remove net-zero items, keeping original commit history structure.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSquashType("full")}
                className={`p-3 rounded-lg border text-left text-xs transition-all space-y-1.5 ${
                  squashType === "full"
                    ? "border-sky-500 bg-sky-500/5 font-medium shadow-sm"
                    : "border-border bg-card opacity-70 hover:opacity-100"
                }`}
              >
                <div className="font-bold text-foreground">Full Squash</div>
                <div className="text-[10px] text-muted-foreground leading-normal font-normal">
                  Remove net-zero items and compress range into a single commit.
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="py-1">
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 flex items-start gap-2">
            <Lock className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
            Confirmed orders are never modified. Only pending (unconfirmed) commits are affected.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            variant={operation?.type === "reset" ? "destructive" : "default"}
            onClick={() => onConfirm(operation?.type === "squash" ? squashType : undefined)}
          >
            {operation?.type === "squash"
              ? squashType === "light"
                ? "Apply Light Squash"
                : "Apply Full Squash"
              : "Reset Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}