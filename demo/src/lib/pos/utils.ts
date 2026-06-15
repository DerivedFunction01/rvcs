import type { AllocationBlock, PaymentAllocation } from "@/lib/vcs/types";
import { AllocationType, PaymentStrategyType } from "@/lib/vcs/types";

export function getPaymentAllocDisplayName(
  alloc: AllocationBlock,
  allAllocations: Record<string, AllocationBlock>,
): string {
  if (alloc.type !== AllocationType.Payment) return "";
  const pay = alloc as PaymentAllocation;

  const siblings = pay.correlationId
    ? Object.values(allAllocations).filter(
        (a) =>
          a.type === AllocationType.Payment &&
          a.correlationId === pay.correlationId &&
          a.allocationId !== alloc.allocationId,
      )
    : [];

  const formatStrategy = (sp: PaymentAllocation) => {
    const strat = sp.paymentStrategy;
    if (strat?.strategyType === PaymentStrategyType.Fixed || strat?.strategyType === PaymentStrategyType.FixedItem || strat?.strategyType === PaymentStrategyType.FixedGlobal) {
      return `${sp.payer} $${(strat.value ?? 0).toFixed(2)}`;
    } else if (strat?.strategyType === PaymentStrategyType.Remaining) {
      return `${sp.payer} remaining`;
    } else {
      const pct = Math.round((strat?.value ?? 1) * 100);
      return `${sp.payer} ${pct}%`;
    }
  };

  if (siblings.length > 0) {
    const allSplits = [alloc, ...siblings] as PaymentAllocation[];
    const groups = new Map<string, { payers: string[]; strat: string; sortValue: number }>();

    for (const sp of allSplits) {
      const strat = sp.paymentStrategy;
      let key = "";
      let stratLabel = "";
      let sortValue = 0;

      if (strat?.strategyType === PaymentStrategyType.Fixed || strat?.strategyType === PaymentStrategyType.FixedItem || strat?.strategyType === PaymentStrategyType.FixedGlobal) {
        key = `fixed-${strat.value}`;
        stratLabel = `$${(strat.value ?? 0).toFixed(2)}`;
        sortValue = strat.value ?? 0;
      } else if (strat?.strategyType === PaymentStrategyType.Remaining) {
        key = `remaining`;
        stratLabel = `remaining`;
        sortValue = -1;
      } else {
        const pct = Math.round((strat?.value ?? 1) * 100);
        key = `pct-${pct}`;
        stratLabel = `${pct}%`;
        sortValue = pct;
      }

      if (!groups.has(key)) {
        groups.set(key, { payers: [], strat: stratLabel, sortValue });
      }
      groups.get(key)!.payers.push(sp.payer);
    }

    const sortedGroups = Array.from(groups.values()).sort((a, b) => b.sortValue - a.sortValue);
    const parts = sortedGroups.map((g) => {
      const payerStr = g.payers.length > 2 ? `${g.payers.length} Guests` : g.payers.join(", ");
      return `${payerStr} ${g.strat}`;
    });
    return parts.join(" / ");
  }

  const strat = pay.paymentStrategy;
  if (strat && strat.strategyType !== PaymentStrategyType.Percentage) {
    return formatStrategy(pay);
  }

  const parts: string[] = [];
  if (pay.method) parts.push(pay.method);
  if (pay.payer) parts.push(pay.payer);
  return parts.join(" — ") || "payment";
}

export function getAssignmentAllocDisplayName(alloc: AllocationBlock): string {
  if (alloc.type !== AllocationType.Assignment) return "";
  return (alloc as { entity: string }).entity || "unassigned";
}

export function generateSplitCorrelationId(
  splits: Array<{ entity: string; percentage: number }>,
): string {
  const parts = [...splits]
    .sort((a, b) => b.percentage - a.percentage)
    .map((s) => `${s.entity}-${s.percentage}`);
  return `split-${parts.join("-")}`;
}

export function formatFulfillmentTime(
  calculatedAtStr: string,
  initiatedAtStr?: string,
): string {
  const calcDate = new Date(calculatedAtStr);
  const timeStr = calcDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!initiatedAtStr) {
    return timeStr;
  }

  const initDate = new Date(initiatedAtStr);

  const isSameDay =
    calcDate.getDate() === initDate.getDate() &&
    calcDate.getMonth() === initDate.getMonth() &&
    calcDate.getFullYear() === initDate.getFullYear();

  if (isSameDay) {
    return timeStr;
  }

  const isSameYear = calcDate.getFullYear() === initDate.getFullYear();

  const month = calcDate.toLocaleDateString([], { month: "short" });
  const day = calcDate.getDate();

  if (isSameYear) {
    return `${month} ${day}, ${timeStr}`;
  } else {
    const year = calcDate.getFullYear();
    return `${month} ${day}, ${year}, ${timeStr}`;
  }
}

export const SQUASH_DESCRIPTIONS = {
  light: {
    label: "Light Squash",
    desc: "Prune intermediate quantity changes and net-zero items, keeping original commit history structure.",
  },
  full: {
    label: "Full Squash",
    desc: "Prune net-zero items and collapse/compress the range of commits into a single commit.",
  },
};

export const MERGE_SQUASH_DESCRIPTIONS = {
  none: {
    label: "No Squash",
    desc: "Source branch commits will be merged directly, retaining the complete commit history graph.",
  },
  light: {
    label: "Light Squash",
    desc: "Net-zero items and intermediate quantity changes are pruned from source commits, keeping their individual commit boundaries.",
  },
  full: {
    label: "Full Squash",
    desc: "All pending commits on each source branch are collapsed into a single commit containing optimized deltas before merging.",
  },
};
