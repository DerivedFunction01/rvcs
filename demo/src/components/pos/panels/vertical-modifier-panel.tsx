import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import type {
  CatalogItemEntry,
  ProjectedLineItem,
  SizeGroup,
} from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { Scaling, Settings2, Sparkles } from "lucide-react";

export interface VerticalModifierPanelProps {
  repoId: string;
  selectedItems: ProjectedLineItem[];
  catalog: Record<string, CatalogItemEntry>;
  compatibleModifiers: CatalogItemEntry[];
  onUpdateModifierState: (sku: string, state: string) => void;
}

export function VerticalModifierPanel({
  repoId,
  selectedItems,
  catalog,
  compatibleModifiers,
  onUpdateModifierState,
}: VerticalModifierPanelProps) {
  const formatNumber = useFormatNumber();
  const projectedState = useVCSStore((state) => state.projectedState);

  const getPreferences = usePreferencesStore((state) => state.getPreferences);
  const prefs = getPreferences(repoId);
  const showPrice = prefs.catalogDetailDisplay.showPrice;

  const defaultShowDeltaPrice = usePreferencesStore(
    (state) => state.defaultPrefs.inlineModifierPriceDisplayDelta,
  );
  const [showDeltaPrice, setShowDeltaPrice] = useState(defaultShowDeltaPrice);
  const [sizePage, setSizePage] = useState(0);
  const [statePage, setStatePage] = useState(0);

  useEffect(() => {
    setShowDeltaPrice(defaultShowDeltaPrice);
  }, [defaultShowDeltaPrice]);

  const item = selectedItems.length === 1 ? selectedItems[0] : null;
  const catalogEntry = item ? catalog[item.sku] : null;

  const sizeGroup = catalogEntry?.appliedSizeGroup;
  const sizeOptions = sizeGroup?.options || [];
  const activeSizeChild = item
    ? item.children.find(
        (child) => catalog[child.sku]?.sizeGroupId === sizeGroup?.id,
      )
    : undefined;

  const sizePageSize = 4; // 2 rows of 2 columns
  const statePageSize = 6; // 3 rows of 2 columns

  const pagedSizeOptions = useMemo(() => {
    const start = sizePage * sizePageSize;
    return sizeOptions.slice(start, start + sizePageSize);
  }, [sizeOptions, sizePage]);

  const allowedStates = catalogEntry?.allowedStates || [];
  const pagedStates = useMemo(() => {
    const start = statePage * statePageSize;
    return allowedStates.slice(start, start + statePageSize);
  }, [allowedStates, statePage]);

  useEffect(() => {
    setSizePage(0);
    setStatePage(0);
  }, [item?.lineId, item?.sku]);

  const handleSizeChange = (newSizeSku: string) => {
    if (activeSizeChild && activeSizeChild.sku !== newSizeSku) {
      useVCSStore
        .getState()
        .modifyItemSku(activeSizeChild.lineId, activeSizeChild.sku, newSizeSku);
    }
  };

  if (!item || !catalogEntry) {
    return (
      <aside
        id="vertical-modifier-panel"
        className="w-56 border-r bg-card flex flex-col shrink-0 h-full overflow-hidden shadow-sm"
      >
        <div className="p-3 border-b flex items-center gap-2 bg-muted/10">
          <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Modifiers
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-muted-foreground opacity-60">
          <Scaling className="w-8 h-8 mb-2 opacity-40 animate-pulse" />
          <span className="text-xs font-medium">Select item to edit</span>
        </div>
      </aside>
    );
  }

  const activeSizePrice = activeSizeChild
    ? (catalog[activeSizeChild.sku]?.basePrice ?? 0)
    : 0;

  // Ghost buttons to reserve rows/space and keep layout stable
  const ghostSizeCount = Math.max(0, sizePageSize - pagedSizeOptions.length);
  const ghostStateCount = Math.max(0, statePageSize - pagedStates.length);

  return (
    <aside
      id="vertical-modifier-panel"
      className="w-56 border-r bg-card flex flex-col shrink-0 h-full overflow-hidden shadow-sm"
    >
      <div className="flex-1 flex flex-col justify-start overflow-y-auto">
        {/* SIZE SECTION (TOP HALF) */}
        {sizeGroup && sizeOptions.length > 0 && (
          <div className="flex flex-col min-h-0">
            {/* Minimal Section Label */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/10 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
              <span>{sizeGroup?.name || "Sizing"}</span>
              {showPrice && showDeltaPrice && (
                <span className="text-[10px] font-mono text-muted-foreground/60 normal-case font-normal">
                  base ${formatNumber(activeSizePrice, 2)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-0 border-l overflow-hidden">
              {pagedSizeOptions.map((opt) => {
                const isActive = activeSizeChild?.sku === opt.sku;
                const netPrice = catalogEntry.basePrice + opt.basePrice;
                const delta = opt.basePrice - activeSizePrice;
                const priceLabel = showDeltaPrice
                  ? delta === 0
                    ? null
                    : `${delta > 0 ? "+" : "-"}$${formatNumber(
                        Math.abs(delta),
                        2,
                      )}`
                  : `$${formatNumber(netPrice, 2)}`;

                return (
                  <Button
                    key={opt.sku}
                    variant={isActive ? "default" : "outline"}
                    className={`h-16 flex flex-col items-center justify-center p-1.5 rounded-none border-b border-r border-t-0 border-l-0 shadow-none transition-all text-center cursor-pointer bg-background ${
                      isActive
                        ? "bg-primary text-primary-foreground font-bold"
                        : "hover:bg-accent/40"
                    }`}
                    onClick={() => handleSizeChange(opt.sku)}
                  >
                    <span className="text-xs font-semibold truncate w-full">
                      {opt.name}
                    </span>
                    {showPrice && priceLabel && (
                      <span className="text-[10px] font-mono opacity-80 mt-0.5 leading-none">
                        {priceLabel}
                      </span>
                    )}
                  </Button>
                );
              })}

              {/* Reserved ghost rows */}
              {Array.from({ length: ghostSizeCount }).map((_, idx) => (
                <div
                  key={`ghost-size-${idx}`}
                  className="h-16 bg-muted/5 border-b border-r pointer-events-none"
                />
              ))}
            </div>

            {/* Pagination */}
            {sizeOptions.length > sizePageSize && (
              <div className="grid grid-cols-2 gap-px bg-border/80 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[10px] uppercase font-bold rounded-none border-0 bg-background cursor-pointer"
                  onClick={() => setSizePage((prev) => Math.max(0, prev - 1))}
                  disabled={sizePage === 0}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[10px] uppercase font-bold rounded-none border-0 bg-background cursor-pointer"
                  onClick={() => setSizePage((prev) => prev + 1)}
                  disabled={(sizePage + 1) * sizePageSize >= sizeOptions.length}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {/* MODIFIER STATES SECTION (BOTTOM HALF) */}
        {allowedStates.length > 0 && (
          <div className="flex flex-col min-h-0">
            {/* Minimal Section Label */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/10 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
              <span>Modifier State</span>
              {showPrice && showDeltaPrice && (
                <span className="text-[10px] font-mono text-muted-foreground/60 normal-case font-normal">
                  base ${formatNumber(catalogEntry.basePrice, 2)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-0 border-l overflow-hidden">
              {pagedStates.map((stateOpt) => {
                const isActive = item.selectedModifierState === stateOpt.state;
                const hasPrice = stateOpt.priceOverride !== null;
                const netPrice =
                  stateOpt.priceOverride ?? catalogEntry.basePrice;
                const delta = hasPrice
                  ? netPrice - catalogEntry.basePrice
                  : null;
                const priceLabel = hasPrice
                  ? showDeltaPrice
                    ? delta === 0
                      ? null
                      : `${delta! > 0 ? "+" : "-"}$${formatNumber(
                          Math.abs(delta!),
                          2,
                        )}`
                    : `$${formatNumber(netPrice, 2)}`
                  : null;

                return (
                  <Button
                    key={stateOpt.state}
                    variant={isActive ? "default" : "outline"}
                    className={`h-16 flex flex-col items-center justify-center p-1.5 rounded-none border-b border-r border-t-0 border-l-0 shadow-none transition-all text-center cursor-pointer bg-background ${
                      isActive
                        ? "bg-primary text-primary-foreground font-bold"
                        : "hover:bg-accent/40"
                    }`}
                    onClick={() =>
                      onUpdateModifierState(item.sku, stateOpt.state)
                    }
                  >
                    <span className="text-xs font-semibold truncate w-full">
                      {stateOpt.state}
                    </span>
                    {showPrice && priceLabel && (
                      <span className="text-[10px] font-mono opacity-80 mt-0.5 leading-none">
                        {priceLabel}
                      </span>
                    )}
                  </Button>
                );
              })}

              {/* Reserved ghost rows */}
              {Array.from({ length: ghostStateCount }).map((_, idx) => (
                <div
                  key={`ghost-state-${idx}`}
                  className="h-16 bg-muted/5 border-b border-r pointer-events-none"
                />
              ))}
            </div>

            {/* Pagination */}
            {allowedStates.length > statePageSize && (
              <div className="grid grid-cols-2 gap-px bg-border/80 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[10px] uppercase font-bold rounded-none border-0 bg-background cursor-pointer"
                  onClick={() => setStatePage((prev) => Math.max(0, prev - 1))}
                  disabled={statePage === 0}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[10px] uppercase font-bold rounded-none border-0 bg-background cursor-pointer"
                  onClick={() => setStatePage((prev) => prev + 1)}
                  disabled={
                    (statePage + 1) * statePageSize >= allowedStates.length
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delta/Net Toggle at bottom */}
      {showPrice && item && (sizeGroup || allowedStates.length > 0) && (
        <div className="p-3 border-t bg-muted/10 flex items-center justify-between shrink-0">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Price Mode
          </span>
          <div className="inline-flex items-stretch rounded-full border bg-background p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setShowDeltaPrice(true)}
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                showDeltaPrice
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Delta
            </button>
            <button
              type="button"
              onClick={() => setShowDeltaPrice(false)}
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                !showDeltaPrice
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Net
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
