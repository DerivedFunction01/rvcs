import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ViewMode } from "@/lib/pos/types";

export interface AppPreferences {
  detailLevel: ViewMode;
  isLedgerCollapsed: boolean;
  isGroupNotesCollapsed: boolean;
  isCompactMode: boolean;
  useCommaDecimal: boolean;
}

export const defaultAppPreferences: AppPreferences = {
  detailLevel: ViewMode.Simple,
  isLedgerCollapsed: true,
  isGroupNotesCollapsed: true,
  isCompactMode: false,
  useCommaDecimal: false,
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