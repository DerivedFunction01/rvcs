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
    name: string | null;
    displayName: string | null;
    zIndex: number | null;
    shapeType: string | null;
    x: number;
    y: number;
    rotation: number;
    width: number | null;
    height: number | null;
    radius: number | null;
    radiusX: number | null;
    radiusY: number | null;
    points: string | null;
  }>;
  links: Array<{ tableId: string; chairId: string; tableLabel?: string; chairLabel?: string }>;
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
          validation: { minLength: 3, maxLength: 20 },
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
          validation: { minLength: 3, maxLength: 20 },
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
        { kind: "wall", label: "North Wall", displayName: null, shape: "rectangle", x: 4, y: 0.5, width: 8, height: 1, rotation: 0 },
        { kind: "deadspace", label: "Entry", displayName: "Entry", shape: "rectangle", x: 0.5, y: 1.5, width: 1, height: 1, rotation: 0 },
        { kind: "table", label: "Table 1", displayName: "Table 1", shape: "rectangle", x: 3, y: 1.5, width: 2, height: 1, rotation: 0 },
        { kind: "chair", label: "Table 1 Chair 1", displayName: "C1", shape: "rectangle", x: 2.5, y: 2.5, width: 1, height: 1, rotation: 0 },
        { kind: "chair", label: "Table 1 Chair 2", displayName: "C2", shape: "rectangle", x: 3.5, y: 2.5, width: 1, height: 1, rotation: 0 },
        { kind: "table", label: "Table 2", displayName: "Table 2", shape: "circle", x: 6, y: 2, radius: 1, rotation: 0 },
        { kind: "chair", label: "Table 2 Chair 1", displayName: "C1", shape: "rectangle", x: 5.5, y: 3.5, width: 1, height: 1, rotation: 0 },
        { kind: "chair", label: "Table 2 Chair 2", displayName: "C2", shape: "rectangle", x: 6.5, y: 3.5, width: 1, height: 1, rotation: 0 },
        { kind: "chair", label: "Table 2 Chair 3", displayName: "C3", shape: "rectangle", x: 6.5, y: 2.5, width: 1, height: 1, rotation: 0 },
        { kind: "wall", label: "South Wall", displayName: null, shape: "rectangle", x: 4, y: 4.5, width: 8, height: 1, rotation: 0 },
      ],
      links: [
        { tableLabel: "Table 1", chairLabel: "Table 1 Chair 1" },
        { tableLabel: "Table 1", chairLabel: "Table 1 Chair 2" },
        { tableLabel: "Table 2", chairLabel: "Table 2 Chair 1" },
        { tableLabel: "Table 2", chairLabel: "Table 2 Chair 2" },
        { tableLabel: "Table 2", chairLabel: "Table 2 Chair 3" },
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

  const needsReseed = existingFloors.length === 0 || existingFloors.some((f: any) => f.objects.length === 0 || f.objects.some((o: any) => !o.type || !o.name || o.rotation === undefined || o.rotation === null));

  if (!needsReseed) return;

  if (existingFloors.length > 0) {
    const floorIds = existingFloors.map((f: any) => f.id);
    const objectIds = existingFloors.flatMap((f: any) => f.objects.map((o: any) => o.id));
    
    if (objectIds.length > 0) {
      await prisma.tableChairLink.deleteMany({
        where: { OR: [ { tableId: { in: objectIds } }, { chairId: { in: objectIds } } ] }
      });
      await prisma.floorObject.deleteMany({
        where: { floorId: { in: floorIds } }
      });
    }
    await prisma.floor.deleteMany({
      where: { id: { in: floorIds } }
    });
  }

  for (const floorSeed of defaultFloorSeed()) {
    const floor = await prisma.floor.create({
      data: {
        posConfigId,
        name: floorSeed.name,
        sortOrder: floorSeed.sortOrder,
      },
    });

    const objectMap = new Map<string, { id: string; label: string }>();
    for (const object of floorSeed.objects) {
      const created = await prisma.floorObject.create({
        data: {
          floorId: floor.id,
          type: object.kind,
          name: object.label || "Unnamed",
          displayName: 'displayName' in object ? object.displayName : null,
          zIndex: 'zIndex' in object ? (object as any).zIndex : null,
          shapeType: object.shape,
          x: object.x,
          y: object.y,
          rotation: object.rotation,
          width: 'width' in object ? object.width : null,
          height: 'height' in object ? object.height : null,
          radius: 'radius' in object ? object.radius : null,
          radiusX: 'radiusX' in object ? object.radiusX : null,
          radiusY: 'radiusY' in object ? object.radiusY : null,
          points: 'points' in object ? JSON.stringify(object.points) : null,
        },
      });
      if (created.name) objectMap.set(created.name, { id: created.id, label: created.name });
    }

    for (const link of floorSeed.links) {
      const table = link.tableLabel ? objectMap.get(link.tableLabel) : undefined;
      const chair = link.chairLabel ? objectMap.get(link.chairLabel) : undefined;
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
  objects: Array<{
    id: string;
    kind: "table" | "chair" | "wall" | "deadspace";
    shape?: "circle" | "ellipse" | "rectangle" | "triangle" | "polygon";
    label?: string;
    x: number;
    y: number;
    rotation: number;
    width?: number;
    height?: number;
    radius?: number;
    radiusX?: number;
    radiusY?: number;
    points?: Array<[number, number]>;
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
      const chairLabels = matchingLinks.map((link: { chair: { name: string | null } }) => link.chair.name || "");
      const reverseLink = links.find((link: { chairId: string; tableId: string }) => link.chairId === object.id);

      return {
        id: object.id,
        kind: object.type as "table" | "chair" | "wall" | "deadspace",
        shape: (object.shapeType as "circle" | "ellipse" | "rectangle" | "triangle" | "polygon") || undefined,
        label: object.name || undefined,
        displayName: object.displayName || undefined,
        zIndex: object.zIndex ?? undefined,
        x: object.x,
        y: object.y,
        rotation: object.rotation,
        width: object.width ?? undefined,
        height: object.height ?? undefined,
        radius: object.radius ?? undefined,
        radiusX: object.radiusX ?? undefined,
        radiusY: object.radiusY ?? undefined,
        points: object.points ? JSON.parse(object.points) : undefined,
        guestNames:
          object.type === "table"
            ? chairLabels.map((label) => `Guest ${label.split(" ").pop() || "1"}`)
            : undefined,
        linkedChairIds: object.type === "table" ? linkedChairIds : undefined,
        chairLabels: object.type === "table" ? chairLabels : undefined,
        tableId: object.type === "chair" ? reverseLink?.tableId ?? null : undefined,
      };
    });

    return {
      id: floor.id,
      name: floor.name,
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
