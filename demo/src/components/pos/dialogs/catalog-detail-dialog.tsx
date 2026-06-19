"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CatalogNavigationMode, type CatalogDetailDisplayPrefs } from "@/lib/pos/types";
import { useMemo } from "react";

export interface CatalogLayoutPrefs {
  detailDisplay: CatalogDetailDisplayPrefs;
  navigationMode: CatalogNavigationMode;
  gridRows: number;
  gridCols: number;
}

export function CatalogDetailDialog({
  open,
  onOpenChange,
  value,
  onChange,
  title = "Catalog Layout",
  description = "Choose which catalog fields appear and how the panel is navigated.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: CatalogLayoutPrefs;
  onChange: (next: CatalogLayoutPrefs) => void;
  title?: string;
  description?: string;
}) {
  const summary = useMemo(() => {
    const displayParts = ["Name"];
    if (value.detailDisplay.showSku) displayParts.push("SKU");
    if (value.detailDisplay.showIcons) displayParts.push("Icons");
    if (value.detailDisplay.showPrice) displayParts.push("Price");
    return `${displayParts.join(", ")} · ${value.navigationMode}`;
  }, [value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[95vh] landscape:sm:max-w-5xl landscape:md:max-w-6xl flex flex-col overflow-y-auto">
        <div className="flex flex-col landscape:flex-row gap-4 landscape:gap-6 flex-1 min-h-0 mt-2">
          <div className="flex flex-col gap-3 flex-1 min-w-0 landscape:overflow-y-auto landscape:min-h-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
                {title}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Catalog Detail
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-background/50 px-3 py-3">
                  <label className="text-xs md:text-sm font-semibold uppercase text-muted-foreground cursor-pointer">
                    Show SKU
                  </label>
                  <Checkbox
                    checked={value.detailDisplay.showSku}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...value,
                        detailDisplay: {
                          ...value.detailDisplay,
                          showSku: !!checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-background/50 px-3 py-3">
                  <label className="text-xs md:text-sm font-semibold uppercase text-muted-foreground cursor-pointer">
                    Show Icons
                  </label>
                  <Checkbox
                    checked={value.detailDisplay.showIcons}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...value,
                        detailDisplay: {
                          ...value.detailDisplay,
                          showIcons: !!checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-background/50 px-3 py-3">
                  <label className="text-xs md:text-sm font-semibold uppercase text-muted-foreground cursor-pointer">
                    Show Price
                  </label>
                  <Checkbox
                    checked={value.detailDisplay.showPrice}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...value,
                        detailDisplay: {
                          ...value.detailDisplay,
                          showPrice: !!checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="rounded-lg border bg-background/50 px-3 py-3 text-[10px] md:text-xs text-muted-foreground flex items-center justify-center text-center leading-tight">
                  {summary}
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 landscape:w-80 landscape:md:w-96 landscape:mt-4 flex flex-col gap-3">
            <div className="rounded-xl border bg-card p-4 md:p-5 space-y-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Navigation
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 px-3 py-3">
                <label className="text-xs md:text-sm font-semibold uppercase text-muted-foreground cursor-pointer">
                  Mode
                </label>
                <Select
                  value={value.navigationMode}
                  onValueChange={(val) =>
                    onChange({
                      ...value,
                      navigationMode: val as CatalogNavigationMode,
                    })
                  }
                >
                  <SelectTrigger className="w-32 h-9 text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CatalogNavigationMode).map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-background/50 px-3 py-3">
                  <label className="text-xs md:text-sm font-semibold uppercase text-muted-foreground cursor-pointer">
                    Grid Rows
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={value.gridRows}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        gridRows: Math.max(1, Math.min(8, Math.floor(Number(e.target.value) || 1))),
                      })
                    }
                    className="h-9 w-18 text-xs md:text-sm font-mono"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-background/50 px-3 py-3">
                  <label className="text-xs md:text-sm font-semibold uppercase text-muted-foreground cursor-pointer">
                    Grid Cols
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={value.gridCols}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        gridCols: Math.max(1, Math.min(8, Math.floor(Number(e.target.value) || 1))),
                      })
                    }
                    className="h-9 w-18 text-xs md:text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end landscape:hidden">
          <button
            type="button"
            className="h-12 rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>

        {/* Large button for landscape/desktop touchscreens */}
        <div className="hidden landscape:flex justify-end mt-2">
          <button
            type="button"
            className="h-16 md:h-20 rounded-md border bg-background px-6 md:px-8 text-base md:text-lg font-medium hover:bg-accent"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}