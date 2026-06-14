import type { AllocationBlock, PaymentAllocation } from "@/lib/vcs/types";

export function getPaymentAllocDisplayName(
  alloc: AllocationBlock,
  allAllocations: Record<string, AllocationBlock>,
): string {
  if (alloc.type !== "payment") return "";
  const pay = alloc as PaymentAllocation;

  const siblings = pay.correlationId
    ? Object.values(allAllocations).filter(
        (a) =>
          a.type === "payment" &&
          a.correlationId === pay.correlationId &&
          a.allocationId !== alloc.allocationId,
      )
    : [];

  const formatStrategy = (sp: PaymentAllocation) => {
    const strat = sp.paymentStrategy;
    if (strat?.strategyType === "fixed") {
      return `${sp.payer} $${(strat.value ?? 0).toFixed(2)}`;
    } else if (strat?.strategyType === "remaining") {
      return `${sp.payer} remaining`;
    } else {
      const pct = Math.round((strat?.value ?? 1) * 100);
      return `${sp.payer} ${pct}%`;
    }
  };

  if (siblings.length > 0) {
    const allSplits = [alloc, ...siblings].sort((a, b) => {
      const va = ((a as PaymentAllocation).paymentStrategy?.value ?? 1) * 100;
      const vb = ((b as PaymentAllocation).paymentStrategy?.value ?? 1) * 100;
      return vb - va;
    });
    const parts = allSplits.map((s) => formatStrategy(s as PaymentAllocation));
    return parts.join(" / ");
  }

  const strat = pay.paymentStrategy;
  if (strat && strat.strategyType !== "percentage") {
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
