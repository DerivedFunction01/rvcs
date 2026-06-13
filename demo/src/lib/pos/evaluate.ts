import type { ProjectedState, ProjectedLineItem, CatalogItemEntry } from "@/lib/vcs/types";
import type { ResolvedChargeRule, ChargeBreakdownLine, ChargeCategory } from "./financials";

export interface PosFinancials {
  subtotal: number;
  taxTotal: number; // sales_tax + excise
  surchargeTotal: number; // surcharge + import_duty
  chargeTotal: number; // taxTotal + surchargeTotal
  grandTotal: number; // subtotal + chargeTotal
  chargeBreakdown: ChargeBreakdownLine[];
  personBreakdown: ProjectedState["financials"]["personBreakdown"];
}

export interface RenderedCheck extends Omit<ProjectedState, "financials"> {
  financials: PosFinancials;
}

/**
 * The Business Rules Pipeline.
 * Evaluates pure VCS state against active jurisdiction tax laws and retail logic.
 */
export function evaluateBusinessRules(
  vcsState: ProjectedState,
  chargeRules: ResolvedChargeRule[],
  catalog: Record<string, CatalogItemEntry>
): RenderedCheck {
  const chargeAccumulator = new Map<
    string,
    { amount: number; rule: ResolvedChargeRule }
  >();

  const applyChargeRules = (
    lineItem: ProjectedLineItem,
    qty: number,
    price: number
  ) => {
    if (chargeRules.length === 0) return;
    
    const catalogEntry = catalog[lineItem.sku];
    const tags = catalogEntry?.chargeTags ?? [];
    const skuOriginCode = tags[0]?.originCode ?? null;
    const tagCodes = tags.map((t) => t.tagCode);
    const hasExplicitTags = tagCodes.length > 0;

    for (const rule of chargeRules) {
      const tagMatches = hasExplicitTags
        ? tagCodes.includes(rule.tagCode)
        : rule.tagCode === "GENERAL";
        
      if (!tagMatches) continue;
      if (rule.originCode !== null && rule.originCode !== skuOriginCode) continue;

      let amount = 0;
      if (rule.rateType === "percentage") {
        amount = price * rule.rate;
      } else if (rule.rateType === "per_unit") {
        amount = qty * rule.rate;
      } else if (rule.rateType === "compound") {
        amount = price * rule.rate; 
      }

      const key = `${rule.jurisdictionCode}::${rule.tagCode}::${rule.chargeCategory}::${rule.rateType}`;
      const existing = chargeAccumulator.get(key);
      chargeAccumulator.set(key, {
        amount: (existing?.amount ?? 0) + amount,
        rule,
      });
    }
  };

  // Phase 1: Evaluate Rules on all active line items
  // We iterate through the flat items map, processing roots and modifiers independently.
  for (const item of Object.values(vcsState.items)) {
    if (item.status === "canceled") continue;
    applyChargeRules(item, item.qty, item.totalPrice);
  }

  // Phase 2: Compute Totals and Render Breakdown
  const chargeBreakdown: ChargeBreakdownLine[] = [];
  let taxTotal = 0;
  let surchargeTotal = 0;

  for (const [, { amount, rule }] of chargeAccumulator.entries()) {
    const rounded = Math.round(amount * 100) / 100;
    if (rounded === 0) continue;

    const rateLabel =
      rule.rateType === "per_unit"
        ? `$${rule.rate.toFixed(2)}/unit`
        : `${(rule.rate * 100).toFixed(0)}%`;
        
    const categoryLabel: Record<ChargeCategory, string> = {
      sales_tax: "Sales Tax",
      excise: "Excise",
      import_duty: "Import Surcharge",
      surcharge: "Surcharge",
    };

    chargeBreakdown.push({
      jurisdictionCode: rule.jurisdictionCode,
      jurisdictionName: rule.jurisdictionName,
      tagCode: rule.tagCode,
      chargeCategory: rule.chargeCategory as ChargeCategory,
      rateType: rule.rateType,
      rate: rule.rate,
      chargeAmount: rounded,
      label: `${rule.jurisdictionName} ${categoryLabel[rule.chargeCategory as ChargeCategory] ?? rule.chargeCategory} (${rateLabel})`,
    });

    if (rule.chargeCategory === "sales_tax" || rule.chargeCategory === "excise") {
      taxTotal += rounded;
    } else {
      surchargeTotal += rounded;
    }
  }

  const chargeTotal = Math.round((taxTotal + surchargeTotal) * 100) / 100;
  taxTotal = Math.round(taxTotal * 100) / 100;
  surchargeTotal = Math.round(surchargeTotal * 100) / 100;

  return {
    ...vcsState,
    financials: {
      subtotal: vcsState.financials.subtotal,
      personBreakdown: vcsState.financials.personBreakdown,
      taxTotal,
      surchargeTotal,
      chargeTotal,
      grandTotal: Math.round((vcsState.financials.subtotal + chargeTotal) * 100) / 100,
      chargeBreakdown,
    },
  };
}