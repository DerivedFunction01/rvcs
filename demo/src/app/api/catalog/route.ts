import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/catalog ─────────────────────────────────────────────────────────
// Returns the active product catalog. The VCS Engine caches this locally.

export async function GET() {
  try {
    const items = await db.catalogItem.findMany({
      where: { active: true },
      include: {
        optionGroups: {
          include: {
            options: true,
          },
        },
        allowedStates: true,
      },
      orderBy: { category: "asc" },
    });

    const catalog = items.map((item) => ({
      sku: item.sku,
      name: item.name,
      basePrice: item.basePrice,
      category: item.category,
      type: item.type as "item" | "modifier" | "discount",
      dietaryFlags: JSON.parse(item.dietaryFlags) as string[],
      allergens: JSON.parse(item.allergens) as string[],
      brand: item.brand,
      active: item.active,
      optionGroups: item.optionGroups.map((og) => ({
        id: og.id,
        name: og.name,
        isRequired: og.isRequired,
        minSelection: og.minSelection,
        maxSelection: og.maxSelection,
        options: og.options.map((opt) => ({
          id: opt.id,
          optionGroupId: opt.optionGroupId,
          value: opt.value,
          label: opt.label,
          skuSuffix: opt.skuSuffix,
          priceOverride: opt.priceOverride,
          active: opt.active,
        })),
      })),
      allowedStates: item.allowedStates.map((as) => ({
        id: as.id,
        modifierSku: as.modifierSku,
        state: as.state,
        label: as.label,
        priceOverride: as.priceOverride,
      })),
    }));

    return NextResponse.json({ catalog });
  } catch (error) {
    console.error("Catalog fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch catalog" }, { status: 500 });
  }
}

// ─── POST /api/catalog ────────────────────────────────────────────────────────
// Seed the catalog (admin/init endpoint). Idempotent — uses upsert.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = body.items as Array<{
      sku: string;
      name: string;
      basePrice: number;
      category: string;
      type: string;
      dietaryFlags?: string[];
      allergens?: string[];
      brand?: string;
    }>;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }

    for (const item of items) {
      await db.catalogItem.upsert({
        where: { sku: item.sku },
        update: {
          name: item.name,
          basePrice: item.basePrice,
          category: item.category,
          type: item.type,
          dietaryFlags: JSON.stringify(item.dietaryFlags || []),
          allergens: JSON.stringify(item.allergens || []),
          brand: item.brand || "",
        },
        create: {
          sku: item.sku,
          name: item.name,
          basePrice: item.basePrice,
          category: item.category,
          type: item.type,
          dietaryFlags: JSON.stringify(item.dietaryFlags || []),
          allergens: JSON.stringify(item.allergens || []),
          brand: item.brand || "",
        },
      });
    }

    const count = await db.catalogItem.count();
    return NextResponse.json({ message: `Seeded ${items.length} items (${count} total)` });
  } catch (error) {
    console.error("Catalog seed error:", error);
    return NextResponse.json({ error: "Failed to seed catalog" }, { status: 500 });
  }
}