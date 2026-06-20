import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { projectState } from "@/lib/vcs/reducer";
import { evaluateBusinessRules } from "@/lib/pos/evaluate";
import { ChargeCategory, ChargeRateType, CalculationBasis } from "@/lib/pos/financials";

export async function GET() {
  try {
    const repos = await db.transactionRepo.findMany({
      where: { status: "active" },
      include: {
        commits: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const catalogItems = await db.catalogItem.findMany({
      where: { active: true },
      include: {
        allowedStates: true,
        allowedModifiers: true,
        modifierOf: true,
        chargeTags: true,
      },
    });

    const catalog: Record<string, any> = {};
    for (const item of catalogItems) {
      catalog[item.sku] = {
        sku: item.sku,
        name: item.name,
        basePrice: item.basePrice,
        category: item.category,
        type: item.type,
        dietaryFlags: JSON.parse(item.dietaryFlags || "[]"),
        allergens: JSON.parse(item.allergens || "[]"),
        brand: item.brand,
        active: item.active,
        comboChoices: JSON.parse(item.comboChoices || "[]"),
        mainQtyIncrement: item.mainQtyIncrement,
        inlineQtyType: item.inlineQtyType,
        inlineQtyLabel: item.inlineQtyLabel,
        inlineQtyUnit: item.inlineQtyUnit,
        inlineQtyIncrement: item.inlineQtyIncrement,
        inlineQtyPricePerUnit: item.inlineQtyPricePerUnit,
        inlineQtyPricePerUnitShowPer: item.inlineQtyPricePerUnitShowPer,
        inlineQtyMainQtyLocked: item.inlineQtyMainQtyLocked,
        allowedStates: item.allowedStates,
      };
    }

    const chargeRulesDb = await db.chargeRule.findMany({
      include: {
        jurisdiction: true,
        tag: true,
      },
    });
    const chargeRules = chargeRulesDb.map((r) => ({
      id: r.id,
      jurisdictionCode: r.jurisdiction.code,
      jurisdictionName: r.jurisdiction.name,
      tagCode: r.tag.code,
      chargeCategory: r.chargeCategory as ChargeCategory,
      rateType: r.rateType as ChargeRateType,
      rate: r.rate,
      originCode: r.originCode,
      priority: r.priority,
      calculationBasis: r.calculationBasis as CalculationBasis,
    }));

    const results: any[] = [];
    for (const repo of repos) {
      const orderContext = repo.orderContext ? JSON.parse(repo.orderContext) : null;
      let grandTotal = 0;
      let subtotal = 0;
      let itemCount = 0;
      let lastUpdated = repo.createdAt.toISOString();

      if (repo.commits.length > 0) {
        const lastCommit = repo.commits[repo.commits.length - 1];
        lastUpdated = lastCommit.timestamp.toISOString();

        const commits = repo.commits.map((c) => ({
          commitHash: c.commitHash,
          parentHash: c.parentHash,
          mergeParentHashes: JSON.parse(c.mergeParentHashes),
          branch: c.branch,
          timestamp: c.timestamp.toISOString(),
          authorId: c.authorId,
          deltas: JSON.parse(c.deltas),
          metadata: JSON.parse(c.metadata),
        }));

        try {
          const projected = projectState(commits, lastCommit.commitHash, null, catalog);
          const evaluated = evaluateBusinessRules(projected, chargeRules, catalog);

          grandTotal = evaluated.financials.grandTotal;
          subtotal = evaluated.financials.subtotal;
          itemCount = Object.values(evaluated.items).filter(
            (item: any) => !item.parentLineId && item.status !== "canceled"
          ).length;
        } catch (e) {
          console.error(`Failed to project state for repo ${repo.id}:`, e);
        }
      }

      results.push({
        id: repo.id,
        contextId: repo.contextId,
        serverName: repo.serverName,
        status: repo.status,
        createdAt: repo.createdAt.toISOString(),
        settledAt: repo.settledAt?.toISOString() || null,
        grandTotal,
        subtotal,
        itemCount,
        lastUpdated,
        orderContext,
      });
    }

    return NextResponse.json({ repos: results });
  } catch (error) {
    console.error("Failed to fetch draft repos:", error);
    return NextResponse.json({ error: "Failed to fetch draft repos" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await db.transactionRepo.update({
      where: { id },
      data: { status: "void" },
    });
    return NextResponse.json({ status: "voided", id });
  } catch (error) {
    console.error("Failed to void repo:", error);
    return NextResponse.json({ error: "Failed to void repository" }, { status: 500 });
  }
}
