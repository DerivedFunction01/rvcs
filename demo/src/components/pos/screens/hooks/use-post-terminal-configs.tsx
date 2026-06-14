import { useMemo } from "react";
import {
  AllocationType,
  type PaymentAllocation,
  type FulfillmentAllocation,
  type ProjectedState,
  type AllocationBlock,
  TimeBlockType,
} from "@/lib/vcs/types";
import { getPatchedAllocations } from "@/lib/pos/ui-utils";
import { OrderType, type OrderContext } from "@/lib/pos/types";
import {
  getPaymentAllocDisplayName,
  formatFulfillmentTime,
} from "@/lib/pos/utils";

export function usePostTerminalConfigs({
  projectedState,
  activePaymentConfigId,
  activeFulfillmentConfigId,
  defaultPaymentAllocId,
  orderContext,
  resolveGuestName,
}: {
  projectedState: ProjectedState;
  activePaymentConfigId: string | null;
  activeFulfillmentConfigId: string | null;
  defaultPaymentAllocId: string | null;
  orderContext: OrderContext | null;
  resolveGuestName: (id: string) => string;
}) {
  const resolvedAllocations = useMemo(() => {
    const resolved: Record<string, AllocationBlock> = {};
    for (const [id, alloc] of Object.entries(projectedState.allocations)) {
      if (alloc.type === AllocationType.Assignment)
        resolved[id] = { ...alloc, entity: resolveGuestName(alloc.entity) };
      else if (alloc.type === AllocationType.Payment)
        resolved[id] = { ...alloc, payer: resolveGuestName(alloc.payer) };
      else resolved[id] = alloc;
    }
    return resolved;
  }, [projectedState.allocations, resolveGuestName]);

  const paymentConfigs = useMemo(() => {
    const configs: Array<{ id: string; name: string; isSplit: boolean }> = [];
    const allocations = projectedState.allocations;
    const referencedIds = new Set<string>();
    for (const item of Object.values(projectedState.items)) {
      for (const id of item.allocations) referencedIds.add(id);
    }
    const singlePayers = new Map<string, PaymentAllocation>();
    const splitGroups = new Map<string, PaymentAllocation[]>();
    for (const alloc of Object.values(allocations)) {
      if (alloc.type === AllocationType.Payment) {
        const pay = alloc as PaymentAllocation;
        const isReferenced = referencedIds.has(alloc.allocationId);
        const isActive =
          activePaymentConfigId === alloc.allocationId ||
          activePaymentConfigId === alloc.correlationId;
        const isDefault = pay.correlationId?.startsWith("group-default-");
        if (!isReferenced && !isActive && !isDefault) continue;
        if (pay.correlationId) {
          if (pay.correlationId.startsWith("group-default-")) continue;
          const group = splitGroups.get(pay.correlationId) || [];
          group.push(pay);
          splitGroups.set(pay.correlationId, group);
        } else {
          if (pay.allocationId !== defaultPaymentAllocId)
            singlePayers.set(pay.allocationId, pay);
        }
      }
    }
    const patchedAllocs = getPatchedAllocations(allocations);
    singlePayers.forEach((pay, id) => {
      configs.push({
        id,
        name: `Single: ${getPaymentAllocDisplayName(patchedAllocs[id] as PaymentAllocation, patchedAllocs)}`,
        isSplit: false,
      });
    });
    splitGroups.forEach((group, correlationId) => {
      const isTrueSplit = group.length > 1;
      configs.push({
        id: correlationId,
        name: `${isTrueSplit ? "Split" : "Single"}: ${getPaymentAllocDisplayName(patchedAllocs[group[0].allocationId] as PaymentAllocation, patchedAllocs)}`,
        isSplit: isTrueSplit,
      });
    });
    return configs;
  }, [projectedState.allocations, projectedState.items, defaultPaymentAllocId, activePaymentConfigId]);

  const currentConfigName = useMemo(() => {
    const customerName = orderContext?.customerFields.name || "Guest";
    if (activePaymentConfigId && activePaymentConfigId.startsWith("group-default-"))
      return `${customerName} (${activePaymentConfigId.replace("group-default-", "").toUpperCase()})`;
    const activeAlloc = Object.values(projectedState.allocations).find(
      (a) => a.type === AllocationType.Payment && (a.allocationId === activePaymentConfigId || a.correlationId === activePaymentConfigId)
    );
    if (activeAlloc) {
      const patchedAllocs = getPatchedAllocations(projectedState.allocations);
      const siblings = activeAlloc.correlationId ? Object.values(patchedAllocs).filter((a) => a.type === AllocationType.Payment && a.correlationId === activeAlloc.correlationId && a.allocationId !== activeAlloc.allocationId) : [];
      return `${siblings.length > 0 ? "Split" : "Single"}: ${getPaymentAllocDisplayName(patchedAllocs[activeAlloc.allocationId] as PaymentAllocation, patchedAllocs)}`;
    }
    return "Default Config";
  }, [activePaymentConfigId, projectedState.allocations, orderContext]);

  const currentFulfillmentConfigName = useMemo(() => {
    const activeId = activeFulfillmentConfigId;
    if (!activeId) return "On Confirmation";
    const alloc = Object.values(projectedState.allocations).find((a) => a.type === AllocationType.Fulfillment && (a.allocationId === activeId || a.correlationId === activeId)) as FulfillmentAllocation | undefined;
    if (alloc) {
      const methodLabel = alloc.method === OrderType.WalkIn ? "Walk In" : alloc.method === OrderType.Pickup ? "Pickup" : alloc.method === OrderType.Delivery ? "Delivery" : alloc.method;
      const destLabel = alloc.fulfillmentMetadata.destinationLabel ? ` (${alloc.fulfillmentMetadata.destinationLabel})` : "";
      return alloc.time.type === TimeBlockType.Immediate || !alloc.time.calculatedAt ? `${methodLabel}${destLabel} (Immediate)` : `${methodLabel}${destLabel} @ ${formatFulfillmentTime(alloc.time.calculatedAt, orderContext?.initiatedAt)}`;
    }
    return "On Confirmation";
  }, [activeFulfillmentConfigId, projectedState.allocations, orderContext?.initiatedAt]);

  return { resolvedAllocations, paymentConfigs, currentConfigName, currentFulfillmentConfigName };
}