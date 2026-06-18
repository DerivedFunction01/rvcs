import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CatalogNavigationMode, type CatalogDetailDisplayPrefs, ViewMode } from "@/lib/pos/types";

export interface AppPreferences {
  detailLevel: ViewMode;
  isLedgerCollapsed: boolean;
  isGroupNotesCollapsed: boolean;
  isBulkActionsCollapsed: boolean;
  isCompactMode: boolean;
  useCommaDecimal: boolean;
  inlineModifierPriceDisplayDelta: boolean;
  catalogDetailDisplay: CatalogDetailDisplayPrefs;
  catalogNavigationMode: CatalogNavigationMode;
  catalogGridRows: number;
  catalogGridCols: number;
  splitLineWarnThreshold: number;
  globalDepthColors: string[];
  globalGuestPalette: string[];
  globalBranchColors: string[];
  defaultMultiSelectMode: boolean;
  autoSelectLastClickedItem: boolean;
}

export const defaultAppPreferences: AppPreferences = {
  detailLevel: ViewMode.Simple,
  isLedgerCollapsed: true,
  isGroupNotesCollapsed: true,
  isBulkActionsCollapsed: false,
  isCompactMode: false,
  useCommaDecimal: false,
  inlineModifierPriceDisplayDelta: true,
  catalogDetailDisplay: {
    showSku: true,
    showIcons: true,
    showPrice: false,
  },
  catalogNavigationMode: CatalogNavigationMode.Scroll,
  catalogGridRows: 4,
  catalogGridCols: 5,
  splitLineWarnThreshold: 10,
  globalDepthColors: [
    "#94a3b8",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#f43f5e",
  ],
  globalGuestPalette: [
    "#10b981", // emerald
    "#8b5cf6", // violet
    "#f59e0b", // amber
    "#0ea5e9", // sky
    "#f43f5e", // rose
    "#14b8a6", // teal
    "#f97316", // orange
    "#6366f1", // indigo
    "#d946ef", // fuchsia
    "#84cc16", // lime
    "#06b6d4", // cyan
    "#ec4899", // pink
    "#eab308", // yellow
    "#3b82f6", // blue
    "#a855f7", // purple
    "#ef4444", // red
    "#22c55e", // green
    "#64748b", // slate
  ],
  globalBranchColors: [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
  ],
  defaultMultiSelectMode: false,
  autoSelectLastClickedItem: true,
};

interface PreferencesStore {
  defaultPrefs: AppPreferences;
  repoPrefs: Record<string, Partial<AppPreferences>>;
  
  getPreferences: (repoId: string | null) => AppPreferences;
  updateDefaultPreferences: (prefs: Partial<AppPreferences>) => void;
  updateRepoPreferences: (repoId: string, prefs: Partial<AppPreferences>) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      defaultPrefs: defaultAppPreferences,
      repoPrefs: {},
      
      getPreferences: (repoId) => {
        const { defaultPrefs, repoPrefs } = get();
        if (!repoId || !repoPrefs[repoId]) {
          return defaultPrefs;
        }
        return { ...defaultPrefs, ...repoPrefs[repoId] };
      },
      
      updateDefaultPreferences: (prefs) => {
        set((state) => ({ defaultPrefs: { ...state.defaultPrefs, ...prefs } }));
      },
      
      updateRepoPreferences: (repoId, prefs) => {
        set((state) => ({ repoPrefs: { ...state.repoPrefs, [repoId]: { ...(state.repoPrefs[repoId] || {}), ...prefs } } }));
      }
    }),
    { name: "vcs-preferences" }
  )
);
