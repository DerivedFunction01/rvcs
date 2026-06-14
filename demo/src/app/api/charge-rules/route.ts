import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ─── GET /api/charge-rules?jurisdictionCode=18106 ─────────────────────────────
// Resolves the full ancestor chain for the given ZIP/state/etc. code
// and returns the flat list of ChargeRules covering that chain.
// US-TRADE is always appended as a parallel layer for trade-policy rules.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jurisdictionCode = searchParams.get("jurisdictionCode") || "US-PA";

    // Build ancestor chain by walking parentCode links
    const allJurisdictions = await db.chargeJurisdiction.findMany();
    const byCode = new Map(allJurisdictions.map((j) => [j.code, j]));

    const chain: string[] = [];
    let current: string | null = jurisdictionCode;
    while (current) {
      chain.push(current);
      const j = byCode.get(current);
      current = j?.parentCode ?? null;
    }

    // Always append US-TRADE as a parallel trade-policy layer for US venues
    if (!chain.includes("US-TRADE") && byCode.has("US-TRADE")) {
      chain.push("US-TRADE");
    }

    // Fetch all rules for these jurisdictions (with tag + jurisdiction data)
    const jurisdictionIds = chain
      .map((code) => byCode.get(code)?.id)
      .filter((id): id is string => id !== undefined);

    const rules = await db.chargeRule.findMany({
      where: {
        jurisdictionId: { in: jurisdictionIds },
        // Only return currently-in-effect rules
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      include: {
        jurisdiction: true,
        tag: true,
      },
      orderBy: [{ priority: "asc" }],
    });

    const resolved = rules.map((r) => ({
      jurisdictionCode: r.jurisdiction.code,
      jurisdictionName: r.jurisdiction.name,
      tagCode: r.tag.code,
      chargeCategory: r.chargeCategory,
      rateType: r.rateType,
      calculationBasis: r.calculationBasis,
      rate: r.rate,
      originCode: r.originCode,
      priority: r.priority,
    }));

    return NextResponse.json({ jurisdictionCode, chain, rules: resolved });
  } catch (error) {
    console.error("Charge-rules fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch charge rules" },
      { status: 500 },
    );
  }
}
