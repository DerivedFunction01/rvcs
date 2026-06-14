"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CatalogItemEntry } from "@/lib/vcs/types";
import { Plus, Search } from "lucide-react";
import React, { useMemo, useState } from "react";

interface ModifierAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  modifiers: CatalogItemEntry[];
  onAdd: (sku: string, defaultState?: string) => void;
}

export function ModifierAddDialog({
  open,
  onOpenChange,
  itemName,
  modifiers,
  onAdd,
}: ModifierAddDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter modifiers by search query
  const filtered = useMemo(() => {
    return modifiers.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [modifiers, searchQuery]);

  // Reset search when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add Modifiers
          </DialogTitle>
          <DialogDescription>
            Select modifiers to add to <span className="font-semibold text-foreground">{itemName}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative mt-2 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modifiers (e.g. Cheese, Onions...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {/* Grid Scroll Area */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching modifiers found.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((mod) => {
                const defaultState = mod.allowedStates?.find(
                  (s) => s.state === "ADD" || s.state === "WITH"
                )?.state || mod.allowedStates?.[0]?.state || undefined;

                return (
                  <button
                    key={mod.sku}
                    onClick={() => onAdd(mod.sku, defaultState)}
                    className="flex flex-col items-start p-3 text-left border rounded-lg hover:border-primary/50 hover:bg-accent/40 transition-all group relative overflow-hidden bg-card/50"
                  >
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {mod.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {mod.sku}
                    </span>
                    <span className="text-xs font-bold text-foreground/80 mt-2 font-mono">
                      {mod.basePrice > 0 ? `+$${mod.basePrice.toFixed(2)}` : "Free"}
                    </span>
                    <span className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3.5 h-3.5 text-primary" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
