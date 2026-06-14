import React from "react";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Clock, Split, MessageSquare } from "lucide-react";
import { useVCSStore } from "@/store/vcs-store";
import {
  getPaymentAllocDisplayName,
  getAssignmentAllocDisplayName,
  formatFulfillmentTime,
} from "@/lib/pos/utils";
import {
  type AllocationBlock,
  type PaymentAllocation,
  type FulfillmentAllocation,
  type NoteAllocation,
  AllocationType,
} from "@/lib/vcs/types";
import { type Guest, getPatchedAllocations } from "@/lib/pos/ui-utils";

export function AllocationBadges({
  allocationIds,
  allocations,
  defaultPaymentAllocId,
  guests,
}: {
  allocationIds: string[];
  allocations: Record<string, AllocationBlock>;
  defaultPaymentAllocId: string | null;
  guests: Guest[];
}) {
  const initiatedAt = useVCSStore((state) => state.orderContext?.initiatedAt);

  if (allocationIds.length === 0) return null;

  const seenPaymentGroups = new Set<string>();
  const patchedAllocs = getPatchedAllocations(allocations);

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {allocationIds.map((id) => {
        const alloc = allocations[id];
        if (!alloc) return null;

        if (alloc.type === AllocationType.Assignment) {
          const entity = getAssignmentAllocDisplayName(alloc);
          return (
            <Badge
              key={id}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-medium"
            >
              <User className="w-2.5 h-2.5 mr-0.5" />
              {entity}
            </Badge>
          );
        }
        if (alloc.type === AllocationType.Payment) {
          const payAlloc = alloc as PaymentAllocation;
          const paymentGroupId =
            payAlloc.correlationId || payAlloc.allocationId;
          if (seenPaymentGroups.has(paymentGroupId)) return null;
          seenPaymentGroups.add(paymentGroupId);
          const displayName = getPaymentAllocDisplayName(
            patchedAllocs[payAlloc.allocationId] as PaymentAllocation,
            patchedAllocs,
          );
          const isDefault = id === defaultPaymentAllocId;
          const siblings = payAlloc.correlationId
            ? Object.values(patchedAllocs).filter(
                (a) =>
                  a.type === AllocationType.Payment &&
                  a.correlationId === payAlloc.correlationId &&
                  a.allocationId !== payAlloc.allocationId,
              )
            : [];
          const isSplit = siblings.length > 0;
          return (
            <Badge
              key={id}
              variant={isDefault ? "default" : "outline"}
              className={`text-[10px] px-1.5 py-0 h-4 font-medium ${isSplit ? "border-primary/50" : ""}`}
            >
              {isSplit && <Split className="w-2.5 h-2.5 mr-0.5" />}
              {!isSplit && <CreditCard className="w-2.5 h-2.5 mr-0.5" />}
              {displayName}
            </Badge>
          );
        }
        if (alloc.type === AllocationType.Fulfillment) {
          const fulAlloc = alloc as FulfillmentAllocation;
          const isImmediate =
            fulAlloc.time.type === "immediate" || !fulAlloc.time.calculatedAt;
          const displayLabel = isImmediate
            ? `${fulAlloc.method} (On Confirmation)`
            : `${fulAlloc.method} @ ${formatFulfillmentTime(fulAlloc.time.calculatedAt!, initiatedAt)}`;
          return (
            <Badge
              key={id}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 font-medium border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
            >
              <Clock className="w-2.5 h-2.5 mr-0.5" />
              {displayLabel}
            </Badge>
          );
        }
        if (alloc.type === AllocationType.Note) {
          const noteAlloc = alloc as NoteAllocation;
          return (
            <Badge
              key={id}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 font-medium border-primary/30 text-primary bg-primary/5 max-w-40 truncate"
              title={noteAlloc.text}
            >
              <MessageSquare className="w-2.5 h-2.5 mr-0.5 shrink-0" />
              <span className="truncate">{noteAlloc.text}</span>
            </Badge>
          );
        }
        return null;
      })}
    </div>
  );
}