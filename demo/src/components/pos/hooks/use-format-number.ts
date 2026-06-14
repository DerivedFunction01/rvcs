import { usePreferencesStore } from "@/store/preferences-store";
import { useVCSStore } from "@/store/vcs-store";
import { useCallback } from "react";

export function useFormatNumber() {
  const repoId = useVCSStore((s) => s.engine.getRepo().contextId);
  const useComma = usePreferencesStore((s) => s.getPreferences(repoId)?.useCommaDecimal ?? false);

  return useCallback(
    (value: number, decimals?: number) => {
      let str = decimals !== undefined ? value.toFixed(decimals) : String(value);
      if (useComma) {
        str = str.replace(/\./g, ",");
      }
      return str;
    },
    [useComma],
  );
}