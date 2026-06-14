import type {
  Delta,
  ProjectedState,
  AllocationBlock,
  PaymentAllocation,
  FulfillmentAllocation,
  AllocationType,
} from "./types";

function getAllocationBlock(
  id: string,
  state?: ProjectedState,
): AllocationBlock | null {
  return state?.allocations[id] || null;
}

function areAllocationsFunctionallyIdentical(
  allocA: AllocationBlock,
  allocB: AllocationBlock,
): boolean {
  if (allocA.type !== allocB.type) return false;
  if (allocA.type === AllocationType.Assignment) {
    return allocA.entity === (allocB as any).entity;
  }
  if (allocA.type === AllocationType.Payment) {
    const pA = allocA as PaymentAllocation;
    const pB = allocB as PaymentAllocation;
    return (
      pA.payer === pB.payer &&
      pA.method === pB.method &&
      pA.paymentStrategy?.strategyType === pB.paymentStrategy?.strategyType &&
      pA.paymentStrategy?.value === pB.paymentStrategy?.value &&
      pA.timeOfPayment?.type === pB.timeOfPayment?.type &&
      pA.timeOfPayment?.calculatedAt === pB.timeOfPayment?.calculatedAt
    );
  }
  if (allocA.type === AllocationType.Fulfillment) {
    const fA = allocA as FulfillmentAllocation;
    const fB = allocB as FulfillmentAllocation;
    return (
      fA.method === fB.method &&
      fA.time?.type === fB.time?.type &&
      fA.time?.calculatedAt === fB.time?.calculatedAt &&
      fA.fulfillmentMetadata?.destinationLabel ===
        fB.fulfillmentMetadata?.destinationLabel &&
      fA.fulfillmentMetadata?.destinationId ===
        fB.fulfillmentMetadata?.destinationId
    );
  }
  return false;
}

function areAllocIdsFunctionallyIdentical(
  idA: string,
  idB: string,
  state?: ProjectedState,
): boolean {
  if (idA === idB) return true;
  const blockA = getAllocationBlock(idA, state);
  const blockB = getAllocationBlock(idB, state);
  if (!blockA || !blockB) return false;
  return areAllocationsFunctionallyIdentical(blockA, blockB);
}

function areAllocListsFunctionallyIdentical(
  listA: string[] | undefined,
  listB: string[] | undefined,
  state?: ProjectedState,
): boolean {
  if (!listA && !listB) return true;
  if (!listA || !listB) return false;
  if (listA.length !== listB.length) return false;
  const unmatchedB = [...listB];
  for (const idA of listA) {
    const idxB = unmatchedB.findIndex((idB) =>
      areAllocIdsFunctionallyIdentical(idA, idB, state),
    );
    if (idxB === -1) return false;
    unmatchedB.splice(idxB, 1);
  }
  return true;
}

export function areDeltasIdentical(
  deltaA: Delta,
  deltaB: Delta,
  state?: ProjectedState,
): boolean {
  if (deltaA.action !== deltaB.action) return false;

  switch (deltaA.action) {
    case "declare_allocation": {
      return areAllocationsFunctionallyIdentical(
        (deltaA as any).allocation,
        (deltaB as any).allocation,
      );
    }
    case "add_item": {
      const dA = deltaA as any;
      const dB = deltaB as any;
      return (
        dA.sku === dB.sku &&
        dA.qty === dB.qty &&
        dA.parentLineId === dB.parentLineId &&
        dA.selectedModifierState === dB.selectedModifierState &&
        areAllocListsFunctionallyIdentical(
          dA.allocations,
          dB.allocations,
          state,
        )
      );
    }
    case "remove_item": {
      const dA = deltaA as any;
      const dB = deltaB as any;
      return dA.lineId === dB.lineId && dA.qty === dB.qty;
    }
    case "modify_sku": {
      const dA = deltaA as any;
      const dB = deltaB as any;
      return (
        dA.lineId === dB.lineId &&
        dA.beforeSku === dB.beforeSku &&
        dA.afterSku === dB.afterSku
      );
    }
    case "modify_qty": {
      const dA = deltaA as any;
      const dB = deltaB as any;
      return (
        dA.lineId === dB.lineId &&
        dA.beforeQty === dB.beforeQty &&
        dA.afterQty === dB.afterQty
      );
    }
    case "modify_modifier_state": {
      const dA = deltaA as any;
      const dB = deltaB as any;
      return (
        dA.lineId === dB.lineId &&
        dA.beforeState === dB.beforeState &&
        dA.afterState === dB.afterState
      );
    }
    case "modify_item_allocations": {
      const dA = deltaA as any;
      const dB = deltaB as any;
      return (
        dA.lineId === dB.lineId &&
        areAllocListsFunctionallyIdentical(
          dA.beforeAllocations,
          dB.beforeAllocations,
          state,
        ) &&
        areAllocListsFunctionallyIdentical(
          dA.afterAllocations,
          dB.afterAllocations,
          state,
        )
      );
    }
    case "batch_by_filter": {
      return JSON.stringify(deltaA) === JSON.stringify(deltaB);
    }
    default:
      return false;
  }
}
