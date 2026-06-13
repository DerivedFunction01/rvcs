import type { AllocationBlock, PaymentAllocation } from "@/lib/vcs/types";

export function getPaymentAllocDisplayName(
  alloc: AllocationBlock,
  allAllocations: Record<string, AllocationBlock>
): string {
  if (alloc.type !== "payment") return "";
  const pay = alloc as PaymentAllocation;

  const siblings = pay.correlationId
    ? Object.values(allAllocations).filter(
        (a) => a.type === "payment" && a.correlationId === pay.correlationId && a.allocationId !== alloc.allocationId
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
  if (alloc.type !== "assignment") return "";
  return (alloc as { entity: string }).entity || "unassigned";
}

export function generateSplitCorrelationId(
  splits: Array<{ entity: string; percentage: number }>
): string {
  const parts = [...splits]
    .sort((a, b) => b.percentage - a.percentage)
    .map((s) => `${s.entity}-${s.percentage}`);
  return `split-${parts.join("-")}`;
}

export function formatFulfillmentTime(
  calculatedAtStr: string,
  initiatedAtStr?: string
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
