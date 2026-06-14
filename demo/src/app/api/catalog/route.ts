import { db } from "@/lib/db";
import { CatalogItemType } from "@/lib/vcs/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── GET /api/catalog ─────────────────────────────────────────────────────────
// Returns the active product catalog. The VCS Engine caches this locally.

export async function GET() {
  try {
    const items = await db.catalogItem.findMany({
      where: { active: true },
      include: {
        appliedSizeGroup: {
          include: {
            options: true,
          },
        },
        allowedStates: true,
        allowedModifiers: true,
        chargeTags: {
          include: { tag: true },
        },
      },
      orderBy: { category: "asc" },
    });

    const catalog = items.map((item) => ({
      sku: item.sku,
      name: item.name,
      basePrice: item.basePrice,
      category: item.category,
      type: item.type as CatalogItemType,
      dietaryFlags: JSON.parse(item.dietaryFlags) as string[],
      allergens: JSON.parse(item.allergens) as string[],
      brand: item.brand,
      active: item.active,
      comboChoices: JSON.parse(item.comboChoices || "[]") as any[],
      sizeGroupId: item.sizeGroupId,
      appliedSizeGroupId: item.appliedSizeGroupId,
      inlineQtyType: item.inlineQtyType,
      inlineQtyLabel: item.inlineQtyLabel,
      inlineQtyUnit: item.inlineQtyUnit,
      inlineQtyIncrement: item.inlineQtyIncrement ?? 1,
      inlineQtyPricePerUnit: item.inlineQtyPricePerUnit ?? false,
      inlineQtyPricePerUnitShowPer:
        item.inlineQtyPricePerUnitShowPer ?? true,
      inlineQtyMainQtyLocked: item.inlineQtyMainQtyLocked ?? false,
      mainQtyIncrement: item.mainQtyIncrement ?? 1,
      appliedSizeGroup: item.appliedSizeGroup
        ? {
            id: item.appliedSizeGroup.id,
            name: item.appliedSizeGroup.name,
            defaultSku: item.appliedSizeGroup.defaultSku,
            options: item.appliedSizeGroup.options.map((opt) => ({
              sku: opt.sku,
              name: opt.name,
              basePrice: opt.basePrice,
              category: opt.category,
              type: opt.type as CatalogItemType,
              dietaryFlags: JSON.parse(opt.dietaryFlags) as string[],
              allergens: JSON.parse(opt.allergens) as string[],
              brand: opt.brand,
              active: opt.active,
              sizeGroupId: opt.sizeGroupId,
            })),
          }
        : null,
      allowedStates: item.allowedStates.map((as) => ({
        id: as.id,
        modifierSku: as.modifierSku,
        state: as.state,
        label: as.label,
        priceOverride: as.priceOverride,
      })),
      allowedModifiers: item.allowedModifiers.map((am) => am.modifierSku),
      modifierConfigs: item.allowedModifiers.map((am) => ({
        modifierSku: am.modifierSku,
        allowDuplicates: am.allowDuplicates,
      })),
      chargeTags: item.chargeTags.map((ct) => ({
        tagCode: ct.tag.code,
        categoryHint: ct.tag.categoryHint,
        originCode: ct.originCode,
      })),
    }));

    return NextResponse.json({ catalog });
  } catch (error) {
    console.error("Catalog fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog" },
      { status: 500 },
    );
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
      inlineQtyType?: string;
      inlineQtyLabel?: string;
      inlineQtyUnit?: string;      inlineQtyIncrement?: number;      inlineQtyPricePerUnit?: boolean;
      inlineQtyPricePerUnitShowPer?: boolean;
      inlineQtyMainQtyLocked?: boolean;
      mainQtyIncrement?: number;
    }>;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "items array required" },
        { status: 400 },
      );
    }

    for (const item of items) {
      const data: any = {
        name: item.name,
        basePrice: item.basePrice,
        category: item.category,
        type: item.type,
        dietaryFlags: JSON.stringify(item.dietaryFlags || []),
        allergens: JSON.stringify(item.allergens || []),
        brand: item.brand || "",
        inlineQtyType: item.inlineQtyType ?? null,
        inlineQtyLabel: item.inlineQtyLabel ?? null,
        inlineQtyUnit: item.inlineQtyUnit ?? null,
        inlineQtyPricePerUnit: item.inlineQtyPricePerUnit ?? false,
        inlineQtyPricePerUnitShowPer:
          item.inlineQtyPricePerUnitShowPer ?? true,
        inlineQtyMainQtyLocked: item.inlineQtyMainQtyLocked ?? false,
        inlineQtyIncrement: item.inlineQtyIncrement ?? 1,
        mainQtyIncrement: item.mainQtyIncrement ?? 1,
      };

      await db.catalogItem.upsert({
        where: { sku: item.sku },
        update: data,
        create: {
          sku: item.sku,
          ...data,
        },
      });
    }

    const count = await db.catalogItem.count();
    return NextResponse.json({
      message: `Seeded ${items.length} items (${count} total)`,
    });
  } catch (error) {
    console.error("Catalog seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed catalog" },
      { status: 500 },
    );
  }
}
