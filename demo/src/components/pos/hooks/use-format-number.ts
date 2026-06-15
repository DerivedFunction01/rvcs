import { usePreferencesStore } from "@/store/preferences-store";
import { useVCSStore } from "@/store/vcs-store";
import { useCallback } from "react";

export enum NumberFractionOverflow {
  Round = "round",
  Truncate = "truncate",
  Scientific = "scientific"
}

export function useFormatNumber() {
  const repoId = useVCSStore((s) => s.engine.getRepo().contextId);
  const useComma = usePreferencesStore((s) => s.getPreferences(repoId)?.useCommaDecimal ?? false);

  return useCallback(
    (
      value: number,
      decimals?: number,
      overflow_precision: number = 5,
      overflow_fraction_strategy: NumberFractionOverflow = NumberFractionOverflow.Scientific
    ) => {
      const absValue = Math.abs(value);

      // Handle Scientific notation for very large numbers OR tiny decimals
      const shouldUseScientific =
        absValue >= Math.pow(10, overflow_precision) ||
        (absValue > 0 && absValue < Math.pow(10, -overflow_precision));

      if (shouldUseScientific && overflow_fraction_strategy === NumberFractionOverflow.Scientific) {
        return value.toExponential(overflow_precision);
      }

      // Handle cases between -1 and 1
      if (absValue > 0 && absValue < 1) {
        if (overflow_fraction_strategy === NumberFractionOverflow.Truncate) {
          // Truncate logic
          const factor = Math.pow(10, decimals ?? 4);
          value = Math.trunc(value * factor) / factor;
        }
        // If "Round" (default), toFixed handles the rounding automatically
      }

      let str = decimals !== undefined ? value.toFixed(decimals) : String(value);

      if (useComma) {
        str = str.replace(/\./g, ",");
      }
      return str;
    },
    [useComma],
  );
}