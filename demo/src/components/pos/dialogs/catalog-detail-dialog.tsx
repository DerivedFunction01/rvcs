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
      <DialogContent className="sm:max-w-md md:max-w-lg landscape:sm:max-w-2xl landscape:md:max-w-3xl max-h-[95vh] landscape:max-h-[95vh] landscape:overflow-hidden flex flex-col p-6">
        <div className="flex flex-col landscape:flex-row gap-4 landscape:gap-6 h-full landscape:overflow-hidden">
          <div className="flex flex-col gap-3 flex-1 min-w-0 landscape:overflow-y-auto landscape:min-h-0">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Catalog Detail
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background/50 px-3 py-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
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
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background/50 px-3 py-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
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
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background/50 px-3 py-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
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
                <div className="rounded-md border bg-background/50 px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-center text-center leading-tight">
                  {summary}
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 landscape:w-70 landscape:md:w-96 landscape:mt-4 flex flex-col gap-3">
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Navigation
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border bg-background/50 px-3 py-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
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
                  <SelectTrigger className="w-28 h-8 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background/50 px-3 py-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
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
                    className="h-8 w-16 text-xs font-mono"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md border bg-background/50 px-3 py-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer">
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
                    className="h-8 w-16 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="h-8 rounded-md border bg-background px-3 text-xs font-medium hover:bg-accent"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
