import { Store, PackageCheck, Truck } from "lucide-react";
import React from "react";
import type { AllocationBlock, PaymentAllocation, ProjectedLineItem } from "@/lib/vcs/types";

export interface Guest {
  id: string; // Stable identifier (e.g. "__vcs_guest_1__", "__vcs_guest_2__")
  number: number; // Stable sequential number
  alias?: string; // Optional custom name/alias
  description?: string; // Optional custom description/details
}

export const PAYMENT_METHODS = ["cash", "visa", "mastercard", "amex"];

export const ORDER_TYPE_ICONS: Record<string, React.ElementType> = {
  "walk-in": Store,
  pickup: PackageCheck,
  delivery: Truck,
};

export function formatLabel(str: string) {
  return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Guest color palette — cycled by index. Deterministic: same name at same index = same color.
export const GUEST_PALETTE = [
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-indigo-500",
];

export function getGuestColor(name: string, guests: Guest[]): string {
  if (name.includes(",")) {
    return "bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 border border-primary/20";
  }
  const idx = guests.findIndex((g) => g.id === name);
  if (idx >= 0) return GUEST_PALETTE[idx % GUEST_PALETTE.length];
  // Fallback: hash the name to a stable index for historical commits
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GUEST_PALETTE[Math.abs(hash) % GUEST_PALETTE.length];
}

export function getUniqueGuestLabel(name: string, allGuests: string[]): string {
  if (/^(guest|table|chair|seat|__vcs_guest_)\b/i.test(name)) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name;

  const firstName = parts[0];
  const rest = parts.slice(1).join(" ");

  const sameFirst = allGuests.filter((g) => {
    if (g === name || /^(guest|table|chair|seat|__vcs_guest_)\b/i.test(g))
      return false;
    return g.trim().split(/\s+/)[0].toLowerCase() === firstName.toLowerCase();
  });

  if (sameFirst.length === 0) return firstName;

  for (let i = 1; i <= rest.length; i++) {
    const candidate = `${firstName} ${rest.substring(0, i)}`;
    const conflict = sameFirst.some((other) => {
      return other.toLowerCase().startsWith(candidate.toLowerCase());
    });
    if (!conflict) return candidate;
  }

  return name;
}

export function getPatchedAllocations(
  allocations: Record<string, AllocationBlock>,
): Record<string, AllocationBlock> {
  const patched: Record<string, AllocationBlock> = {};
  for (const [id, alloc] of Object.entries(allocations)) {
    if (alloc.type === "payment") {
      const p = alloc as PaymentAllocation;
      const stratType = p.paymentStrategy.strategyType as string;
      if (stratType === "fixed_item" || stratType === "fixed_global") {
        patched[id] = {
          ...p,
          paymentStrategy: { ...p.paymentStrategy, strategyType: "fixed" },
        } as any;
        continue;
      }
    }
    patched[id] = alloc;
  }
  return patched;
}

export function getAssigneeFromItem(
  item: ProjectedLineItem,
  allocations: Record<string, AllocationBlock>,
  guests?: Guest[],
): string {
  let assignee = "";
  for (const allocId of item.allocations) {
    const alloc = allocations[allocId];
    if (alloc?.type === AllocationType.Assignment) {
      assignee = (alloc as { entity: string }).entity;
      break;
    }
  }
  if (guests && guests.length > 0) {
    if (!assignee) return guests[0].id;
    const parts = assignee.split(",").map((p) => p.trim());
    const hasValidGuest = parts.some((p) => guests.some((g) => g.id === p));
    if (!hasValidGuest) {
      return guests[0].id;
    }
  }
  return assignee;
}