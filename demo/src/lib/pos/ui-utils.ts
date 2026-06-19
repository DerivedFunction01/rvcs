import { Store, PackageCheck, Truck } from "lucide-react";
import React from "react";
import type {
  AllocationBlock,
  PaymentAllocation,
  ProjectedLineItem,
} from "@/lib/vcs/types";
import { AllocationType, PaymentStrategyType } from "@/lib/vcs/types";
import { useVCSStore } from "@/store/vcs-store";
import { usePreferencesStore } from "@/store/preferences-store";

import { OrderType } from "./types";

export interface Guest {
  id: string; // Stable identifier
  number: number; // Stable sequential number
  alias?: string; // Optional custom name/alias
  description?: string; // Optional custom description/details
  multiplier?: number;
}

export const PAYMENT_METHODS = ["Cash", "Visa", "Mastercard", "AMEX"];

export const ORDER_TYPE_ICONS: Record<string, React.ElementType> = {
  [OrderType.WalkIn]: Store,
  [OrderType.Pickup]: PackageCheck,
  [OrderType.Delivery]: Truck,
};

export function formatLabel(str: string) {
  return str
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getGuestColor(name: string, guests: Guest[]): string {
  if (name.includes(",")) {
    return "linear-gradient(to top right, #0ea5e9, #6366f1, #a855f7)";
  }
  const palette = usePreferencesStore.getState().defaultPrefs?.globalGuestPalette;
  if (!palette || palette.length === 0) return "#94a3b8";

  const idx = guests.findIndex((g) => g.id === name);
  if (idx >= 0) return palette[idx % palette.length];
  // Fallback: hash the name to a stable index for historical commits
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function getBranchColorInfo(branchName: string) {
  const palette = usePreferencesStore.getState().defaultPrefs?.globalBranchColors;
  const colors = palette && palette.length > 0 ? palette : ["#3b82f6"];
  
  let hex = colors[0];
  if (branchName === "system") {
    hex = colors[1 % colors.length];
  } else if (branchName !== "main") {
    let hash = 0;
    for (let i = 0; i < branchName.length; i++) {
      hash = branchName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = colors.length <= 2 ? Math.abs(hash) % colors.length : 2 + (Math.abs(hash) % (colors.length - 2));
    hex = colors[index];
  }

  return {
    name: branchName,
    hex,
    badge: ""
  };
}

export function getUniqueGuestLabel(name: string, allGuests: string[]): string {
  if (/^(guest|table|chair|seat)\b/i.test(name)) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name;
  const firstName = parts[0];
  const rest = parts.slice(1).join(" ");

  const sameFirst = allGuests.filter((g) => {
    if (g === name || /^(guest|table|chair|seat)\b/i.test(g)) return false;
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
    if (alloc.type === AllocationType.Payment) {
      const p = alloc as PaymentAllocation;
      const stratType = p.paymentStrategy.strategyType as string;
      if (
        stratType === PaymentStrategyType.FixedItem ||
        stratType === PaymentStrategyType.FixedGlobal
      ) {
        patched[id] = {
          ...p,
          paymentStrategy: {
            ...p.paymentStrategy,
            strategyType: PaymentStrategyType.Fixed,
          },
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
