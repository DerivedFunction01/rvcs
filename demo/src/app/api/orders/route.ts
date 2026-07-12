import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { projectState } from "@/lib/vcs/reducer";
import { evaluateBusinessRules } from "@/lib/pos/evaluate";
import { ChargeCategory, ChargeRateType, CalculationBasis } from "@/lib/pos/financials";

export async function GET() {
  try {
    // 1. Fetch completed orders (paid)
    const completedOrders = await db.completedOrder.findMany({
      orderBy: { settledAt: "desc" },
      include: { items: true },
    });

    // 2. Fetch active transaction repos (committed but unpaid)
    const activeRepos = await db.transactionRepo.findMany({
      where: { status: "active" },
      include: {
        commits: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Load catalog items and charge rules for projection
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

    const committedOrders: any[] = [];
    for (const repo of activeRepos) {
      if (repo.commits.length === 0) continue;

      const orderContext = repo.orderContext ? JSON.parse(repo.orderContext) : null;
      const lastCommit = repo.commits[repo.commits.length - 1];
      const lastUpdated = lastCommit.timestamp.toISOString();

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

        const rootItems = Object.values(evaluated.items).filter(
          (item: any) => !item.parentLineId && item.status !== "canceled"
        );

        committedOrders.push({
          id: repo.id,
          orderNumber: `REP-${repo.id.slice(-6).toUpperCase()}`,
          customerName: orderContext?.customerFields?.name || "Guest",
          customerPhone: orderContext?.customerFields?.phone || null,
          serverName: orderContext?.serverName || repo.serverName || "Tom",
          orderType: orderContext?.orderType || "walk_in",
          subtotal: evaluated.financials.subtotal,
          taxTotal: evaluated.financials.chargeTotal,
          grandTotal: evaluated.financials.grandTotal,
          paymentMethod: "unpaid",
          paymentStatus: "committed",
          settledAt: lastUpdated,
          createdAt: repo.createdAt.toISOString(),
          items: rootItems.map((item: any) => {
            const children = Object.values(evaluated.items).filter(
              (c: any) => c.parentLineId === item.id && c.status !== "canceled"
            );
            return {
              id: item.id,
              sku: item.sku,
              name: item.name,
              qty: item.qty,
              basePrice: item.basePrice,
              totalPrice: item.totalPrice,
              modifiers: JSON.stringify(children),
            };
          }),
        });
      } catch (e) {
        console.error(`Failed to project state for repo ${repo.id} in orders GET:`, e);
      }
    }

    return NextResponse.json({
      paid: completedOrders,
      committed: committedOrders,
    });
  } catch (error) {
    console.error("Failed to fetch completed orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch completed/committed orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectedState, paymentMethod } = body;

    if (!projectedState || !projectedState.financials) {
      return NextResponse.json(
        { error: "projectedState is required" },
        { status: 400 },
      );
    }

    const financials = projectedState.financials;
    const customerName =
      projectedState.orderContext?.customerFields?.name || "Guest";
    const customerPhone =
      projectedState.orderContext?.customerFields?.phone || null;
    const serverName = projectedState.orderContext?.serverName || "Tom";
    const orderType = projectedState.orderContext?.orderType || "walk_in";

    // Generate a simple unique order number: ORD-YYYYMMDD-HHMMSS-RANDOM
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `ORD-${dateStr}-${timeStr}-${randomSuffix}`;

    // Filter root items
    const rootItems = Object.values(projectedState.items || {}).filter(
      (item: any) => !item.parentLineId && item.status !== "canceled",
    );

    const repoId = body.repoId || projectedState.repoId || null;
    if (repoId) {
      await db.transactionRepo.updateMany({
        where: { id: repoId },
        data: { status: "settled", settledAt: new Date() },
      });
    }

    const completedOrder = await db.completedOrder.create({
      data: {
        orderNumber,
        repoId: repoId,
        customerName,
        customerPhone,
        serverName,
        orderType,
        subtotal: financials.subtotal,
        taxTotal: financials.chargeTotal,
        grandTotal: financials.grandTotal,
        paymentMethod: paymentMethod || "cash",
        paymentStatus: "paid",
        items: {
          create: rootItems.map((item: any) => {
            // Find children modifiers
            const children = Object.values(projectedState.items || {}).filter(
              (c: any) => c.parentLineId === item.id && c.status !== "canceled",
            );

            // Compute total price including modifiers
            const modifierTotal = children.reduce(
              (sum: number, c: any) => sum + c.qty * c.basePrice,
              0,
            );
            const totalPrice = item.qty * item.basePrice + modifierTotal;

            return {
              sku: item.sku,
              name: item.name,
              qty: item.qty,
              basePrice: item.basePrice,
              totalPrice,
              modifiers: JSON.stringify(children),
              guestId: item.guestId || null,
            };
          }),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ order: completedOrder });
  } catch (error) {
    console.error("Failed to archive completed order:", error);
    return NextResponse.json(
      { error: "Failed to archive completed order" },
      { status: 500 },
    );
  }
}
