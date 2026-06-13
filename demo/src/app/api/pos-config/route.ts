import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface CustomerField {
  key: string;
  label: string;
  type: "text" | "tel" | "email" | "textarea";
  required: boolean;
  placeholder?: string;
  validation?: { pattern?: string; minLength?: number; maxLength?: number };
}

interface OrderType {
  id: string;
  label: string;
  description: string;
  icon: string;
  customerFields: CustomerField[];
  estimatedTimeLabel?: string;
}

interface FloorRow {
  id: string;
  name: string;
  sortOrder: number;
  objects: Array<{
    id: string;
    type: string;
    name: string;
    shapeType: string | null;
    points: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  links: Array<{ tableId: string; chairId: string }>;
}

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

function defaultFloorSeed() {
  return [
    {
      name: "Main Floor",
      sortOrder: 0,
      objects: [
        { type: "wall", name: "North Wall", shapeType: null, points: [[0, 0], [8, 0]], x: 0, y: 0, w: 8, h: 1 },
        { type: "deadspace", name: "Entry", shapeType: null, points: [[0, 1]], x: 0, y: 1, w: 1, h: 1 },
        { type: "table", name: "Table 1", shapeType: "rectangle", points: [[2, 1], [4, 1], [4, 2], [2, 2]], x: 2, y: 1, w: 2, h: 1 },
        { type: "chair", name: "Table 1 Chair 1", shapeType: "rectangle", points: [[2, 2]], x: 2, y: 2, w: 1, h: 1 },
        { type: "chair", name: "Table 1 Chair 2", shapeType: "rectangle", points: [[3, 2]], x: 3, y: 2, w: 1, h: 1 },
        { type: "table", name: "Table 2", shapeType: "circle", points: [[5, 1], [6, 1], [6, 2], [5, 2]], x: 5, y: 1, w: 2, h: 2 },
        { type: "chair", name: "Table 2 Chair 1", shapeType: "rectangle", points: [[5, 3]], x: 5, y: 3, w: 1, h: 1 },
        { type: "chair", name: "Table 2 Chair 2", shapeType: "rectangle", points: [[6, 3]], x: 6, y: 3, w: 1, h: 1 },
        { type: "chair", name: "Table 2 Chair 3", shapeType: "rectangle", points: [[6, 2]], x: 6, y: 2, w: 1, h: 1 },
        { type: "wall", name: "South Wall", shapeType: null, points: [[0, 4], [8, 4]], x: 0, y: 4, w: 8, h: 1 },
      ],
      links: [
        { tableName: "Table 1", chairName: "Table 1 Chair 1" },
        { tableName: "Table 1", chairName: "Table 1 Chair 2" },
        { tableName: "Table 2", chairName: "Table 2 Chair 1" },
        { tableName: "Table 2", chairName: "Table 2 Chair 2" },
        { tableName: "Table 2", chairName: "Table 2 Chair 3" },
      ],
    },
  ];
}

async function ensureDefaultFloors(posConfigId: string) {
  const prisma = db as typeof db & { floor: any; floorObject: any; tableChairLink: any };
  const existingFloors = await prisma.floor.findMany({
    where: { posConfigId },
    include: { objects: true },
  });

  if (existingFloors.length > 0) return;

  for (const floorSeed of defaultFloorSeed()) {
    const floor = await prisma.floor.create({
      data: {
        posConfigId,
        name: floorSeed.name,
        sortOrder: floorSeed.sortOrder,
      },
    });

    const objectMap = new Map<string, { id: string; name: string }>();
    for (const object of floorSeed.objects) {
      const created = await prisma.floorObject.create({
        data: {
          floorId: floor.id,
          type: object.type,
          name: object.name,
          shapeType: object.shapeType,
          points: JSON.stringify(object.points),
          x: object.x,
          y: object.y,
          w: object.w,
          h: object.h,
        },
      });
      objectMap.set(object.name, { id: created.id, name: created.name });
    }

    for (const link of floorSeed.links) {
      const table = objectMap.get(link.tableName);
      const chair = objectMap.get(link.chairName);
      if (!table || !chair) continue;
      await prisma.tableChairLink.create({
        data: {
          tableId: table.id,
          chairId: chair.id,
        },
      });
    }
  }
}

async function readFloorConfigs(posConfigId: string): Promise<Array<{
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  objects: Array<{
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
  }>;
}>> {
  const prisma = db as typeof db & { floor: any; floorObject: any; tableChairLink: any };
  const floors: FloorRow[] = await prisma.floor.findMany({
    where: { posConfigId },
    orderBy: { sortOrder: "asc" },
    include: {
      objects: true,
    },
  });

  const links = await prisma.tableChairLink.findMany({
    include: {
      table: true,
      chair: true,
    },
  });

  return floors.map((floor) => {
    const objects = floor.objects.map((object) => {
      const matchingLinks = links.filter((link: { tableId: string; chairId: string }) => link.tableId === object.id);
      const linkedChairIds = matchingLinks.map((link: { chairId: string }) => link.chairId);
      const chairLabels = matchingLinks.map((link: { chair: { name: string } }) => link.chair.name);
      const reverseLink = links.find((link: { chairId: string; tableId: string }) => link.chairId === object.id);

      return {
        id: object.id,
        kind: object.type as "table" | "chair" | "wall" | "deadspace",
        shape: (object.shapeType as "circle" | "ellipse" | "rectangle" | "triangle" | "polygon") || undefined,
        label: object.name,
        x: object.x,
        y: object.y,
        w: object.w,
        h: object.h,
        guestNames:
          object.type === "table"
            ? chairLabels.map((label) => `Guest ${label.split(" ").pop() || "1"}`)
            : undefined,
        linkedChairIds: object.type === "table" ? linkedChairIds : undefined,
        chairLabels: object.type === "table" ? chairLabels : undefined,
        tableId: object.type === "chair" ? reverseLink?.tableId ?? null : undefined,
      };
    });

    const gridWidth = Math.max(1, ...objects.map((obj) => obj.x + obj.w));
    const gridHeight = Math.max(1, ...objects.map((obj) => obj.y + obj.h));

    return {
      id: floor.id,
      name: floor.name,
      gridWidth,
      gridHeight,
      objects,
    };
  });
}

export async function GET() {
  try {
    let config = await db.posConfig.findFirst({
      where: { active: true },
    });

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

    await ensureDefaultFloors(config.id);

    const parsed = JSON.parse(config.config);
    const orderTypes = (parsed.orderTypes ?? parsed) as OrderType[];
    const defaultPaymentMethod = (parsed.defaultPaymentMethod ?? "cash") as string;
    const floorConfigs = await readFloorConfigs(config.id);

    return NextResponse.json({
      id: config.id,
      key: config.key,
      label: config.label,
      defaultPaymentMethod,
      orderTypes,
      floorConfigs,
    });
  } catch (error) {
    console.error("POS config fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch POS config" }, { status: 500 });
  }
}

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

    await ensureDefaultFloors(config.id);
    const floorConfigs = await readFloorConfigs(config.id);
    const parsed = JSON.parse(config.config);

    return NextResponse.json({
      id: config.id,
      key: config.key,
      label: config.label,
      defaultPaymentMethod: parsed.defaultPaymentMethod ?? "cash",
      orderTypes: parsed.orderTypes ?? parsed,
      floorConfigs,
    });
  } catch (error) {
    console.error("POS config upsert error:", error);
    return NextResponse.json({ error: "Failed to save POS config" }, { status: 500 });
  }
}
