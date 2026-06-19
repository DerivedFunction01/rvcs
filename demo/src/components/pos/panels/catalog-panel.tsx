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
}: {
  repoId: string;
  catalogItems: CatalogItemEntry[];
  groupedCatalog: Record<string, CatalogItemEntry[]>;
  availableTags: string[];
  iconConfigs: Record<string, IconConfig>;
  onAddItem: (sku: string) => void;
}) {
  const getPreferences = usePreferencesStore((state) => state.getPreferences);
  const updateRepoPreferences = usePreferencesStore(
    (state) => state.updateRepoPreferences,
  );
  const prefs = getPreferences(repoId);

  const [catalogFilter, setCatalogFilter] = useState("");
  const [requireTags, setRequireTags] = useState<Set<string>>(new Set());
  const [avoidTags, setAvoidTags] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [categoryPage, setCategoryPage] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [catalogLayoutOpen, setCatalogLayoutOpen] = useState(false);

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
      {/* Top Filter and Search Controls */}
      {SearchControls(
        setCatalogLayoutOpen,
        detailDisplay,
        navigationMode,
        categoryMode,
        gridRows,
        gridCols,
        catalogFilter,
        setCatalogFilter,
        requireTags,
        avoidTags,
        setRequireTags,
        setAvoidTags,
        availableTags,
        iconConfigs,
        flatFilteredItems,
      )}

      {/* Main Panel Content split into Column Layout */}
      <div className="flex-1 min-h-0 flex flex-row p-2 gap-3 dynamic-content-area">
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
                    className="min-h-24 rounded-lg border border-dashed border-transparent opacity-0 pointer-events-none w-full"
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
        {/* Removed gap-2 and padding to make the grid flush */}
        <div className="grid grid-rows-8 grid-cols-2 flex-1 min-h-0 border-b">
          {visibleCategories.map((section) => {
            const isActive = section.category === activeCategory;
            return (
              <Button
                key={section.category}
                variant={isActive ? "default" : "outline"}
                // Added rounded-none and -m-[1px] / border adjustment to handle inner-grid overlaps seamlessly
                className="h-full min-h-8 px-3 text-sm justify-center w-full rounded-none -mb-[1px] -mr-[1px]"
                onClick={() => setActiveCategory(section.category)}
              >
                <span className="text-center">{section.category}</span>
              </Button>
            );
          })}
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
function SearchControls(
  setCatalogLayoutOpen: Dispatch<SetStateAction<boolean>>,
  detailDisplay: CatalogDetailDisplayPrefs,
  navigationMode: CatalogNavigationMode,
  categoryMode: CatalogCategoryMode,
  gridRows: number,
  gridCols: number,
  catalogFilter: string,
  setCatalogFilter: Dispatch<SetStateAction<string>>,
  requireTags: Set<string>,
  avoidTags: Set<string>,
  setRequireTags: Dispatch<SetStateAction<Set<string>>>,
  setAvoidTags: Dispatch<SetStateAction<Set<string>>>,
  availableTags: string[],
  iconConfigs: Record<string, IconConfig>,
  flatFilteredItems: CatalogRow[],
) {
  return (
    <div className="p-3 border-b space-y-2 shrink-0">
      {/* <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Catalog
        </h2>
         <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="h-6 w-30 text-[10px] px-2 justify-between gap-2"
            onClick={() => setCatalogLayoutOpen(true)}
          >
            <span>Layout</span>
            <span className="text-muted-foreground truncate">
              {summarizeCatalogLayout(
                detailDisplay,
                navigationMode,
                categoryMode,
                gridRows,
                gridCols,
              )}
            </span>
          </Button>
        </div>
      </div> */}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={catalogFilter}
            onChange={(e) => setCatalogFilter(e.target.value)}
            className="h-8 text-xs pl-8"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-6 text-[10px] px-2 gap-1.5 ${requireTags.size > 0 || avoidTags.size > 0 ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20" : ""}`}
            >
              <Filter className="w-3 h-3" />
              {requireTags.size > 0 || avoidTags.size > 0
                ? `Filters (${requireTags.size + avoidTags.size})`
                : "Filters"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1 pb-1 border-b">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Filter Items
                </span>
                {(requireTags.size > 0 || avoidTags.size > 0) && (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-[10px]"
                    onClick={() => {
                      setRequireTags(new Set());
                      setAvoidTags(new Set());
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto pt-1 space-y-1">
                {availableTags.map((tag) => {
                  const config = iconConfigs[tag];
                  const Icon = config
                    ? (LucideIcons as any)[config.icon] || LucideIcons.Info
                    : LucideIcons.Info;
                  const isRequired = requireTags.has(tag);
                  const isAvoided = avoidTags.has(tag);
                  let stateClass = "hover:bg-accent text-foreground";
                  let iconColor = config
                    ? config.color
                    : "text-muted-foreground";
                  if (isRequired) {
                    stateClass =
                      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
                    iconColor = "text-emerald-600 dark:text-emerald-400";
                  } else if (isAvoided) {
                    stateClass =
                      "bg-rose-500/10 text-rose-700 dark:text-rose-400";
                    iconColor = "text-rose-600 dark:text-rose-400";
                  }

                  return (
                    <button
                      key={tag}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${stateClass}`}
                      onClick={() => {
                        if (!isRequired && !isAvoided) {
                          setRequireTags((prev) => new Set(prev).add(tag));
                        } else if (isRequired) {
                          setRequireTags((prev) => {
                            const n = new Set(prev);
                            n.delete(tag);
                            return n;
                          });
                          setAvoidTags((prev) => new Set(prev).add(tag));
                        } else if (isAvoided) {
                          setAvoidTags((prev) => {
                            const n = new Set(prev);
                            n.delete(tag);
                            return n;
                          });
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                        <span className="text-xs font-medium capitalize">
                          {config ? config.label : formatLabel(tag)}
                        </span>
                      </div>
                      {isRequired && (
                        <Plus className="w-3.5 h-3.5 opacity-70" />
                      )}
                      {isAvoided && (
                        <Minus className="w-3.5 h-3.5 opacity-70" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {/* <div className="text-[10px] text-muted-foreground ml-auto">
          {flatFilteredItems.length} items
        </div> */}
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
