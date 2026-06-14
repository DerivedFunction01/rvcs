import { Store, PackageCheck, Truck } from "lucide-react";
import React from "react";
import type {
  AllocationBlock,
  PaymentAllocation,
  ProjectedLineItem,
} from "@/lib/vcs/types";
import { AllocationType, PaymentStrategyType } from "@/lib/vcs/types";

import { OrderType } from "./types";

export interface Guest {
  id: string; // Stable identifier
  number: number; // Stable sequential number
  alias?: string; // Optional custom name/alias
  description?: string; // Optional custom description/details
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
  "bg-fuchsia-500",
  "bg-lime-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-green-500",
  "bg-slate-500",
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

export const BRANCH_COLORS = [
  {
    name: "blue",
    hex: "#3b82f6",
    badge:
      "border-blue-400/40 text-blue-600 bg-blue-500/4 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500",
  },
  {
    name: "emerald",
    hex: "#10b981",
    badge:
      "border-emerald-400/40 text-emerald-600 bg-emerald-500/4 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500",
  },
  {
    name: "amber",
    hex: "#f59e0b",
    badge:
      "border-amber-400/40 text-amber-600 bg-amber-500/4 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500",
  },
  {
    name: "purple",
    hex: "#8b5cf6",
    badge:
      "border-purple-400/40 text-purple-600 bg-purple-500/4 dark:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500",
  },
  {
    name: "pink",
    hex: "#ec4899",
    badge:
      "border-pink-400/40 text-pink-600 bg-pink-500/4 dark:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500",
  },
  {
    name: "cyan",
    hex: "#06b6d4",
    badge:
      "border-cyan-400/40 text-cyan-600 bg-cyan-500/4 dark:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500",
  },
  {
    name: "orange",
    hex: "#f97316",
    badge:
      "border-orange-400/40 text-orange-600 bg-orange-500/4 dark:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500",
  },
];

export function getBranchColorInfo(branchName: string) {
  if (branchName === "main") return BRANCH_COLORS[0];
  if (branchName === "system") return BRANCH_COLORS[1];

  let hash = 0;
  for (let i = 0; i < branchName.length; i++) {
    hash = branchName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = 2 + (Math.abs(hash) % (BRANCH_COLORS.length - 2));
  return BRANCH_COLORS[index];
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
