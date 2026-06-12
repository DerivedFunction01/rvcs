import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── POS Config Types ──────────────────────────────────────────────────────

interface CustomerField {
  key: string;          // "name", "phone", "address", "email", "notes"
  label: string;        // Display label
  type: "text" | "tel" | "email" | "textarea";
  required: boolean;
  placeholder?: string;
  validation?: { pattern?: string; minLength?: number; maxLength?: number };
}

interface OrderType {
  id: string;           // "walk-in", "pickup", "delivery"
  label: string;        // "Walk In", "Pickup", "Delivery"
  description: string;
  icon: string;         // Lucide icon name
  customerFields: CustomerField[];
  estimatedTimeLabel?: string; // e.g. "Ready in ~15 min"
}

// ─── Default Configuration (seeded on first fetch) ─────────────────────────

const DEFAULT_CONFIG = {
  key: "default",
  label: "Main Location",
  defaultPaymentMethod: "cash",
  orderTypes: [
    {
      id: "walk-in",
      label: "Walk In",
      description: "Dine-in or takeout at the counter",
      icon: "Store",
      estimatedTimeLabel: null,
      customerFields: [
        {
          key: "name",
          label: "Name",
          type: "text" as const,
          required: true,
          placeholder: "Customer name",
          validation: { minLength: 2, maxLength: 50 },
        },
      ],
    },
    {
      id: "pickup",
      label: "Pickup",
      description: "Order now, pick up at the counter",
      icon: "PackageCheck",
      estimatedTimeLabel: "Ready in ~15 min",
      customerFields: [
        {
          key: "name",
          label: "Name",
          type: "text" as const,
          required: true,
          placeholder: "Customer name",
          validation: { minLength: 2, maxLength: 50 },
        },
        {
          key: "phone",
          label: "Phone Number",
          type: "tel" as const,
          required: true,
          placeholder: "(555) 123-4567",
          validation: { minLength: 10, maxLength: 20 },
        },
        {
          key: "notes",
          label: "Special Instructions",
          type: "textarea" as const,
          required: false,
          placeholder: "Any special requests...",
        },
      ],
    },
    {
      id: "delivery",
      label: "Delivery",
      description: "Have it delivered to your door",
      icon: "Truck",
      estimatedTimeLabel: "Arrives in ~30-45 min",
      customerFields: [
        {
          key: "name",
          label: "Name",
          type: "text" as const,
          required: true,
          placeholder: "Customer name",
          validation: { minLength: 2, maxLength: 50 },
        },
        {
          key: "phone",
          label: "Phone Number",
          type: "tel" as const,
          required: true,
          placeholder: "(555) 123-4567",
          validation: { minLength: 10, maxLength: 20 },
        },
        {
          key: "address",
          label: "Delivery Address",
          type: "text" as const,
          required: true,
          placeholder: "123 Main St, Apt 4B",
          validation: { minLength: 5, maxLength: 200 },
        },
        {
          key: "notes",
          label: "Delivery Instructions",
          type: "textarea" as const,
          required: false,
          placeholder: "Gate code, ring doorbell, leave at door...",
        },
      ],
    },
  ] as OrderType[],
};

// ─── GET /api/pos-config ───────────────────────────────────────────────────
// Returns the active POS configuration. Auto-seeds on first call.

export async function GET() {
  try {
    // Try to find an active config
    let config = await db.posConfig.findFirst({
      where: { active: true },
    });

    // Auto-seed if no config exists
    if (!config) {
      config = await db.posConfig.create({
        data: {
          key: DEFAULT_CONFIG.key,
          label: DEFAULT_CONFIG.label,
          config: JSON.stringify({
            defaultPaymentMethod: DEFAULT_CONFIG.defaultPaymentMethod,
            orderTypes: DEFAULT_CONFIG.orderTypes,
          }),
        },
      });
    }

    const parsed = JSON.parse(config.config);
    const orderTypes = (parsed.orderTypes ?? parsed) as OrderType[];
    const defaultPaymentMethod = (parsed.defaultPaymentMethod ?? "cash") as string;

    return NextResponse.json({
      id: config.id,
      key: config.key,
      label: config.label,
      defaultPaymentMethod,
      orderTypes,
    });
  } catch (error) {
    console.error("POS config fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch POS config" }, { status: 500 });
  }
}

// ─── POST /api/pos-config ──────────────────────────────────────────────────
// Upsert the POS configuration (admin endpoint).

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, label, orderTypes, defaultPaymentMethod } = body as {
      key?: string;
      label?: string;
      orderTypes?: OrderType[];
      defaultPaymentMethod?: string;
    };

    if (!orderTypes || !Array.isArray(orderTypes)) {
      return NextResponse.json({ error: "orderTypes array required" }, { status: 400 });
    }

    const configKey = key || "default";
    const configLabel = label || "Main Location";

    const configPayload = {
      defaultPaymentMethod: defaultPaymentMethod || "cash",
      orderTypes,
    };

    const config = await db.posConfig.upsert({
      where: { key: configKey },
      update: {
        label: configLabel,
        config: JSON.stringify(configPayload),
      },
      create: {
        key: configKey,
        label: configLabel,
        config: JSON.stringify(configPayload),
      },
    });

    const parsed = JSON.parse(config.config);
    return NextResponse.json({
      id: config.id,
      key: config.key,
      label: config.label,
      defaultPaymentMethod: parsed.defaultPaymentMethod ?? "cash",
      orderTypes: parsed.orderTypes ?? parsed,
    });
  } catch (error) {
    console.error("POS config upsert error:", error);
    return NextResponse.json({ error: "Failed to save POS config" }, { status: 500 });
  }
}