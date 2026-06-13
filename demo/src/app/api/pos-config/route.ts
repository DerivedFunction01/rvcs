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

interface FloorObject {
  id: string;
  kind: "table" | "chair" | "wall" | "deadspace";
  shape?: "circle" | "ellipse" | "rectangle" | "triangle" | "polygon";
  label?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  guestNames?: string[];
  linkedChairIds?: string[];
  chairLabels?: string[];
  tableId?: string | null;
}

interface FloorConfig {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  objects: FloorObject[];
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
  floorConfigs: [
    {
      id: "floor-main",
      name: "Main Floor",
      gridWidth: 8,
      gridHeight: 5,
      objects: [
        {
          id: "wall-north",
          kind: "wall",
          x: 0,
          y: 0,
          w: 8,
          h: 1,
        },
        {
          id: "deadspace-entry",
          kind: "deadspace",
          x: 0,
          y: 1,
          w: 1,
          h: 1,
        },
        {
          id: "table-a",
          kind: "table",
          shape: "rectangle",
          label: "Table A",
          x: 2,
          y: 1,
          w: 2,
          h: 1,
          guestNames: ["Guest 1", "Guest 2"],
          linkedChairIds: ["chair-a1", "chair-a2"],
          chairLabels: ["A1", "A2"],
        },
        {
          id: "chair-a1",
          kind: "chair",
          label: "A1",
          x: 2,
          y: 2,
          w: 1,
          h: 1,
          tableId: "table-a",
        },
        {
          id: "chair-a2",
          kind: "chair",
          label: "A2",
          x: 3,
          y: 2,
          w: 1,
          h: 1,
          tableId: "table-a",
        },
        {
          id: "table-b",
          kind: "table",
          shape: "circle",
          label: "Table B",
          x: 5,
          y: 1,
          w: 2,
          h: 2,
          guestNames: ["Guest 1", "Guest 2", "Guest 3"],
          linkedChairIds: ["chair-b1", "chair-b2", "chair-b3"],
          chairLabels: ["B1", "B2", "B3"],
        },
        {
          id: "chair-b1",
          kind: "chair",
          label: "B1",
          x: 5,
          y: 3,
          w: 1,
          h: 1,
          tableId: "table-b",
        },
        {
          id: "chair-b2",
          kind: "chair",
          label: "B2",
          x: 6,
          y: 3,
          w: 1,
          h: 1,
          tableId: "table-b",
        },
        {
          id: "chair-b3",
          kind: "chair",
          label: "B3",
          x: 6,
          y: 2,
          w: 1,
          h: 1,
          tableId: "table-b",
        },
        {
          id: "wall-south",
          kind: "wall",
          x: 0,
          y: 4,
          w: 8,
          h: 1,
        },
      ],
    },
  ] as FloorConfig[],
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
      floorConfigs: parsed.floorConfigs ?? [],
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
      floorConfigs: parsed.floorConfigs ?? [],
    });
  } catch (error) {
    console.error("POS config upsert error:", error);
    return NextResponse.json({ error: "Failed to save POS config" }, { status: 500 });
  }
}
