"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CatalogCategoryMode, CatalogNavigationMode, type CatalogDetailDisplayPrefs } from "@/lib/pos/types";
import { useMemo, useState } from "react";
import { NumberPadDialog } from "./number-pad-dialog";

export interface CatalogLayoutPrefs {
  detailDisplay: CatalogDetailDisplayPrefs;
  navigationMode: CatalogNavigationMode;
  categoryMode: CatalogCategoryMode;
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
  const [activeGridField, setActiveGridField] = useState<"rows" | "cols" | null>(null);
  const summary = useMemo(() => {
    const displayParts = ["Name"];
    if (value.detailDisplay.showSku) displayParts.push("SKU");
    if (value.detailDisplay.showIcons) displayParts.push("Icons");
    if (value.detailDisplay.showPrice) displayParts.push("Price");
    return `${displayParts.join(", ")} · ${value.navigationMode} · ${value.categoryMode}`;
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
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                <ToggleRow
                  label="Show SKU"
                  checked={value.detailDisplay.showSku}
                  onToggle={() =>
                    onChange({
                      ...value,
                      detailDisplay: {
                        ...value.detailDisplay,
                        showSku: !value.detailDisplay.showSku,
                      },
                    })
                  }
                />
                <ToggleRow
                  label="Show Icons"
                  checked={value.detailDisplay.showIcons}
                  onToggle={() =>
                    onChange({
                      ...value,
                      detailDisplay: {
                        ...value.detailDisplay,
                        showIcons: !value.detailDisplay.showIcons,
                      },
                    })
                  }
                />
                <ToggleRow
                  label="Show Price"
                  checked={value.detailDisplay.showPrice}
                  onToggle={() =>
                    onChange({
                      ...value,
                      detailDisplay: {
                        ...value.detailDisplay,
                        showPrice: !value.detailDisplay.showPrice,
                      },
                    })
                  }
                />
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
              <SegmentedToggle
                label="Mode"
                leftLabel="Paged Grid"
                rightLabel="Scroll Grid"
                leftSelected={value.navigationMode === CatalogNavigationMode.Page}
                rightSelected={value.navigationMode === CatalogNavigationMode.Scroll}
                onLeftClick={() =>
                  onChange({
                    ...value,
                    navigationMode: CatalogNavigationMode.Page,
                  })
                }
                onRightClick={() =>
                  onChange({
                    ...value,
                    navigationMode: CatalogNavigationMode.Scroll,
                  })
                }
              />

              <SegmentedToggle
                label="Categories"
                leftLabel="Buttons"
                rightLabel="Hidden"
                leftSelected={value.categoryMode === CatalogCategoryMode.Buttons}
                rightSelected={value.categoryMode === CatalogCategoryMode.Hidden}
                onLeftClick={() =>
                  onChange({
                    ...value,
                    categoryMode: CatalogCategoryMode.Buttons,
                  })
                }
                onRightClick={() =>
                  onChange({
                    ...value,
                    categoryMode: CatalogCategoryMode.Hidden,
                  })
                }
              />

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-16 justify-between px-3 py-3 bg-background/50 text-left"
                  onClick={() => setActiveGridField("rows")}
                >
                  <span className="text-xs md:text-sm font-semibold uppercase text-muted-foreground">
                    Grid Rows
                  </span>
                  <span className="font-mono text-base md:text-lg">{value.gridRows}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-16 justify-between px-3 py-3 bg-background/50 text-left"
                  onClick={() => setActiveGridField("cols")}
                >
                  <span className="text-xs md:text-sm font-semibold uppercase text-muted-foreground">
                    Grid Cols
                  </span>
                  <span className="font-mono text-base md:text-lg">{value.gridCols}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-start landscape:hidden">
          <button
            type="button"
            className="h-12 rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>

        {/* Large button for landscape/desktop touchscreens */}
        <div className="hidden landscape:flex justify-start mt-2">
          <button
            type="button"
            className="h-16 md:h-20 rounded-md border bg-background px-6 md:px-8 text-base md:text-lg font-medium hover:bg-accent"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </div>

        <NumberPadDialog
          open={activeGridField !== null}
          onOpenChange={(open) => {
            if (!open) setActiveGridField(null);
          }}
          title={activeGridField === "rows" ? "Grid Rows" : "Grid Cols"}
          description="Set the catalog grid size."
          confirmLabel="Apply"
          initialValue={activeGridField === "rows" ? value.gridRows : value.gridCols}
          min={1}
          max={8}
          increment={1}
          onConfirm={(next) => {
            const clamped = Math.max(1, Math.min(8, Math.round(next)));
            onChange({
              ...value,
              gridRows: activeGridField === "rows" ? clamped : value.gridRows,
              gridCols: activeGridField === "cols" ? clamped : value.gridCols,
            });
          }}
          resetDependency={activeGridField}
        />
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={checked}
      className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 px-3 py-4 text-left hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <span className="text-xs md:text-sm font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <Checkbox checked={checked} />
    </div>
  );
}

function SegmentedToggle({
  label,
  leftLabel,
  rightLabel,
  leftSelected,
  rightSelected,
  onLeftClick,
  onRightClick,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftSelected: boolean;
  rightSelected: boolean;
  onLeftClick: () => void;
  onRightClick: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-2 rounded-lg border overflow-hidden bg-background/50">
        <button
          type="button"
          className={`min-h-16 px-4 py-3 text-center text-sm md:text-base font-semibold transition-colors ${
            leftSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent/60 text-foreground"
          }`}
          onClick={onLeftClick}
        >
          {leftLabel}
        </button>
        <button
          type="button"
          className={`min-h-16 px-4 py-3 text-center text-sm md:text-base font-semibold transition-colors border-l ${
            rightSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent/60 text-foreground"
          }`}
          onClick={onRightClick}
        >
          {rightLabel}
        </button>
      </div>
    </div>
  );
}
