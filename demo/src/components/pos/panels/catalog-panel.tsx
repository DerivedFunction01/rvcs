"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CatalogDetailDialog } from "@/components/pos/dialogs/catalog-detail-dialog";
import { useFormatNumber } from "@/components/pos/hooks/use-format-number";
import { formatLabel } from "@/lib/pos/ui-utils";
import {
  CatalogCategoryMode,
  CatalogNavigationMode,
  type CatalogDetailDisplayPrefs,
} from "@/lib/pos/types";
import type { CatalogItemEntry } from "@/lib/vcs/types";
import type { IconConfig } from "@/store/vcs-store";
import { usePreferencesStore } from "@/store/preferences-store";
import * as LucideIcons from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

type CatalogRow = { category: string; item: CatalogItemEntry };

export function CatalogPanel({
  repoId,
  catalogItems: _catalogItems,
  groupedCatalog,
  availableTags,
  iconConfigs,
  onAddItem,
  catalogFilter,
  setCatalogFilter,
  requireTags,
  setRequireTags,
  avoidTags,
  setAvoidTags,
  catalogLayoutOpen,
  setCatalogLayoutOpen,
}: {
  repoId: string;
  catalogItems: CatalogItemEntry[];
  groupedCatalog: Record<string, CatalogItemEntry[]>;
  availableTags: string[];
  iconConfigs: Record<string, IconConfig>;
  onAddItem: (sku: string) => void;
  catalogFilter: string;
  setCatalogFilter: Dispatch<SetStateAction<string>>;
  requireTags: Set<string>;
  setRequireTags: Dispatch<SetStateAction<Set<string>>>;
  avoidTags: Set<string>;
  setAvoidTags: Dispatch<SetStateAction<Set<string>>>;
  catalogLayoutOpen: boolean;
  setCatalogLayoutOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const getPreferences = usePreferencesStore((state) => state.getPreferences);
  const updateRepoPreferences = usePreferencesStore(
    (state) => state.updateRepoPreferences,
  );
  const prefs = getPreferences(repoId);

  const [page, setPage] = useState(0);
  const [categoryPage, setCategoryPage] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const formatNumber = useFormatNumber();
  const detailDisplay = prefs.catalogDetailDisplay;
  const navigationMode = prefs.catalogNavigationMode;
  const categoryMode = prefs.catalogCategoryMode;
  const gridRows = prefs.catalogGridRows;
  const gridCols = prefs.catalogGridCols;
  const isPageMode = navigationMode === CatalogNavigationMode.Page;
  const isCategoryMode = categoryMode === CatalogCategoryMode.Buttons;

  const filteredSections = useMemo(() => {
    return Object.entries(groupedCatalog)
      .map(([category, items]) => ({
        category,
        items: items.filter((item) =>
          matchesCatalogFilters(item, catalogFilter, requireTags, avoidTags),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [groupedCatalog, catalogFilter, requireTags, avoidTags]);

  const flatFilteredItems = useMemo<CatalogRow[]>(() => {
    const rows: CatalogRow[] = [];
    for (const section of filteredSections) {
      for (const item of section.items)
        rows.push({ category: section.category, item });
    }
    return rows;
  }, [filteredSections]);

  useEffect(() => {
    if (categoryMode === CatalogCategoryMode.Buttons) {
      setActiveCategory((current) => {
        if (
          current &&
          filteredSections.some((section) => section.category === current)
        ) {
          return current;
        }
        return filteredSections[0]?.category ?? null;
      });
    } else {
      setActiveCategory(null);
    }
  }, [categoryMode, filteredSections]);

  useEffect(() => {
    setPage(0);
  }, [
    catalogFilter,
    requireTags,
    avoidTags,
    navigationMode,
    gridRows,
    gridCols,
  ]);

  useEffect(() => {
    if (isCategoryMode) setPage(0);
  }, [activeCategory, isCategoryMode]);

  useEffect(() => {
    setCategoryPage(0);
  }, [catalogFilter, requireTags, avoidTags, categoryMode]);

  const pageSize = gridRows * gridCols;
  const categoryFilteredItems = isCategoryMode
    ? (() => {
        const section = filteredSections.find(
          (entry) => entry.category === activeCategory,
        );
        return (section?.items ?? []).map((item) => ({
          category: section?.category ?? "",
          item,
        }));
      })()
    : flatFilteredItems;
  const pageCount = Math.max(
    1,
    Math.ceil(categoryFilteredItems.length / pageSize),
  );
  const currentPage = Math.min(page, pageCount - 1);
  const categoriesPerPage = 10;
  const categoryPageCount = Math.max(
    1,
    Math.ceil(filteredSections.length / categoriesPerPage),
  );
  const currentCategoryPage = Math.min(categoryPage, categoryPageCount - 1);
  const visibleCategories = filteredSections.slice(
    currentCategoryPage * categoriesPerPage,
    currentCategoryPage * categoriesPerPage + categoriesPerPage,
  );
  const pagedItems =
    navigationMode === CatalogNavigationMode.Page
      ? categoryFilteredItems.slice(
          currentPage * pageSize,
          currentPage * pageSize + pageSize,
        )
      : categoryFilteredItems;
  const ghostCount =
    navigationMode === CatalogNavigationMode.Page
      ? Math.max(0, pageSize - pagedItems.length)
      : 0;
  const gridItems: CatalogRow[] =
    navigationMode === CatalogNavigationMode.Page
      ? pagedItems
      : categoryFilteredItems;

  // Explicit template column widths with `1fr` so item buttons do not expand arbitrarily
  const gridContainerStyle = {
    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
    gridTemplateRows:
      navigationMode === CatalogNavigationMode.Page
        ? `repeat(${gridRows}, minmax(0, 1fr))`
        : undefined,
    gridAutoRows: "minmax(7rem, 1fr)",
  };

  // Keep a unified outer container width to protect layout layout jumps across modes
  const widthClass = isCategoryMode
    ? "w-[52rem] xl:w-[60rem]"
    : "w-[38rem] xl:w-[46rem]"; // Removed variant sizing for Scroll vs Page to lock width down completely

  return (
    <aside
      className={`${widthClass} border-r bg-card flex flex-col shrink-0 h-full overflow-hidden`}
    >

      {/* Main Panel Content split into Column Layout */}
      <div className="flex-1 min-h-0 flex flex-row p-0 gap-0 dynamic-content-area">
        {/* Independent Static Category Column */}
        {isCategoryMode &&
          getCategoryColumn(
            currentCategoryPage,
            categoryPageCount,
            visibleCategories,
            activeCategory,
            setActiveCategory,
            setCategoryPage,
          )}

        {/* Independent Scroll Container for Grid Items and Controls */}
        <div className="flex-1 flex flex-col min-h-0 w-full min-w-0">
          <ScrollArea className="flex-1 min-h-0 w-full">
            <div className="grid gap-0 w-full pb-2" style={gridContainerStyle}>
              {gridItems.map(({ category, item }) => (
                <CatalogItemCard
                  key={item.sku}
                  item={item}
                  category={category}
                  detailDisplay={detailDisplay}
                  iconConfigs={iconConfigs}
                  formatNumber={formatNumber}
                  onAddItem={onAddItem}
                />
              ))}
              {navigationMode === CatalogNavigationMode.Page &&
                Array.from({ length: ghostCount }).map((_, idx) => (
                  <div
                    key={`ghost-${currentPage}-${idx}`}
                    className="h-28 w-full border border-border/40 bg-muted/5 opacity-55 pointer-events-none"
                    aria-hidden="true"
                  />
                ))}
            </div>
          </ScrollArea>

          {/* Item Grid Pagination Buttons Container - Fixed height footprint so layout dimensions don't flex shift */}
          <div className="h-14 flex items-center justify-stretch pt-2 border-t mt-auto shrink-0 w-full min-w-0">
            {navigationMode === CatalogNavigationMode.Page ? (
              <div className="grid grid-cols-2 gap-2 w-full">
                {currentPage > 0 ? (
                  <Button
                    variant="outline"
                    className="h-12 w-full"
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev Page
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-12 opacity-0 pointer-events-none w-full"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    Prev Page
                  </Button>
                )}
                {currentPage + 1 < pageCount ? (
                  <Button
                    variant="outline"
                    className="h-12 w-full"
                    onClick={() =>
                      setPage((prev) => Math.min(pageCount - 1, prev + 1))
                    }
                  >
                    Next Page
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-12 opacity-0 pointer-events-none w-full"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    Next Page
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CatalogDetailDialog
        open={catalogLayoutOpen}
        onOpenChange={setCatalogLayoutOpen}
        value={{
          detailDisplay,
          navigationMode,
          categoryMode,
          gridRows,
          gridCols,
        }}
        onChange={(next) =>
          updateRepoPreferences(repoId, {
            catalogDetailDisplay: next.detailDisplay,
            catalogNavigationMode: next.navigationMode,
            catalogCategoryMode: next.categoryMode,
            catalogGridRows: next.gridRows,
            catalogGridCols: next.gridCols,
          })
        }
      />
    </aside>
  );
}

function getCategoryColumn(
  currentCategoryPage: number,
  categoryPageCount: number,
  visibleCategories: { category: string; items: CatalogItemEntry[] }[],
  activeCategory: string | null,
  setActiveCategory: Dispatch<SetStateAction<string | null>>,
  setCategoryPage: Dispatch<SetStateAction<number>>,
): import("react").ReactNode {
  return (
    <div className="w-36 xl:w-48 shrink-0 flex flex-col h-full border-r">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="grid grid-rows-8 grid-cols-2 flex-1 min-h-0 border-t border-l">
          {visibleCategories.map((section) => {
            const isActive = section.category === activeCategory;
            return (
              <Button
                key={section.category}
                variant={isActive ? "default" : "outline"}
                className={`h-full min-h-8 px-3 text-sm justify-center w-full rounded-none border-b border-r border-t-0 border-l-0 shadow-none bg-background ${
                  isActive ? "bg-primary text-primary-foreground font-bold" : "border-border/80 hover:bg-accent/40"
                }`}
                onClick={() => setActiveCategory(section.category)}
              >
                <span className="text-center truncate">{section.category}</span>
              </Button>
            );
          })}
          {Array.from({ length: Math.max(0, 16 - visibleCategories.length) }).map((_, idx) => (
            <div
              key={`category-ghost-${idx}`}
              className="h-full w-full border-b border-r border-t-0 border-l-0 border-border/80 bg-muted/5 pointer-events-none"
            />
          ))}
        </div>

        {/* Navigation row below the flat grid layout */}
        <div className="grid grid-cols-2 gap-2 p-2 pt-3 shrink-0 h-14 items-center">
          {currentCategoryPage > 0 ? (
            <Button
              variant="ghost"
              className="h-10 w-full rounded-none"
              onClick={() => setCategoryPage((prev) => Math.max(0, prev - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-10 opacity-0 pointer-events-none w-full rounded-none"
              tabIndex={-1}
              aria-hidden="true"
            >
              Prev
            </Button>
          )}
          {currentCategoryPage + 1 < categoryPageCount ? (
            <Button
              variant="ghost"
              className="h-10 w-full rounded-none"
              onClick={() =>
                setCategoryPage((prev) =>
                  Math.min(categoryPageCount - 1, prev + 1),
                )
              }
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-10 opacity-0 pointer-events-none w-full rounded-none"
              tabIndex={-1}
              aria-hidden="true"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


function summarizeCatalogLayout(
  detailDisplay: CatalogDetailDisplayPrefs,
  navigationMode: CatalogNavigationMode,
  categoryMode: CatalogCategoryMode,
  gridRows: number,
  gridCols: number,
) {
  const parts = ["Name"];
  if (detailDisplay.showSku) parts.push("SKU");
  if (detailDisplay.showIcons) parts.push("Icons");
  if (detailDisplay.showPrice) parts.push("Price");
  const layout =
    navigationMode === CatalogNavigationMode.Page
      ? `${gridRows}x${gridCols}`
      : "Scroll";
  const categoryLabel =
    categoryMode === CatalogCategoryMode.Buttons
      ? "Category Buttons"
      : "No Categories";
  return `${parts.join(" + ")} · ${layout} · ${categoryLabel}`;
}

function matchesCatalogFilters(
  item: CatalogItemEntry,
  catalogFilter: string,
  requireTags: Set<string>,
  avoidTags: Set<string>,
) {
  if (
    catalogFilter &&
    !item.name.toLowerCase().includes(catalogFilter.toLowerCase()) &&
    !item.sku.toLowerCase().includes(catalogFilter.toLowerCase())
  ) {
    return false;
  }
  if (avoidTags.size > 0) {
    for (const a of item.allergens) if (avoidTags.has(a)) return false;
    for (const f of item.dietaryFlags) if (avoidTags.has(f)) return false;
  }
  if (requireTags.size > 0) {
    for (const tag of requireTags) {
      if (!item.allergens.includes(tag) && !item.dietaryFlags.includes(tag))
        return false;
    }
  }
  return true;
}

function CatalogItemCard({
  item,
  category,
  detailDisplay,
  iconConfigs,
  formatNumber,
  onAddItem,
}: {
  item: CatalogItemEntry;
  category: string;
  detailDisplay: CatalogDetailDisplayPrefs;
  iconConfigs: Record<string, IconConfig>;
  formatNumber: (value: number, decimals?: number) => string;
  onAddItem: (sku: string) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onAddItem(item.sku)}
          className="h-28 w-full border bg-background p-2 text-left hover:border-primary/40 hover:bg-accent/40 transition-colors flex flex-col justify-between gap-2 overflow-hidden shrink-0"
        >
          <div className="space-y-1 min-w-0 flex-1 min-h-0 w-full">
            <div className="flex items-start justify-between gap-2 w-full">
              <span className="text-sm font-medium leading-tight flex-1">
                {item.name}
              </span>
              {detailDisplay.showPrice && (
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {formatNumber(item.basePrice, 2)}
                </span>
              )}
            </div>
            {detailDisplay.showSku && (
              <div className="text-[10px] text-muted-foreground font-mono truncate w-full">
                {item.sku}
              </div>
            )}
            {detailDisplay.showIcons &&
              (item.dietaryFlags.length > 0 || item.allergens.length > 0) && (
                <div className="flex flex-wrap gap-1 pt-1 min-h-4 w-full">
                  {item.dietaryFlags.map((flag) => {
                    const config = iconConfigs[flag];
                    if (!config) return null;
                    const Icon =
                      (LucideIcons as any)[config.icon] || LucideIcons.Info;
                    return (
                      <Icon
                        key={flag}
                        className={`w-3.5 h-3.5 ${config.color}`}
                      />
                    );
                  })}
                  {item.allergens.map((allergen) => {
                    const config = iconConfigs[allergen];
                    const Icon = config
                      ? (LucideIcons as any)[config.icon] || LucideIcons.Info
                      : LucideIcons.Info;
                    const color = config
                      ? config.color
                      : "text-muted-foreground";
                    return (
                      <Icon key={allergen} className={`w-3.5 h-3.5 ${color}`} />
                    );
                  })}
                </div>
              )}
            {!detailDisplay.showSku &&
              !detailDisplay.showIcons &&
              !detailDisplay.showPrice && (
                <div className="text-[10px] text-muted-foreground/70">
                  Tap to add
                </div>
              )}
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground w-full mt-auto">
            <span className="uppercase tracking-wider truncate flex-1">
              {category}
            </span>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <div>{item.name}</div>
        <div className="text-muted-foreground">{item.sku}</div>
      </TooltipContent>
    </Tooltip>
  );
}
