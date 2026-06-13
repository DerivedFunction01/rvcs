export type ChargeCategory =
  | "sales_tax"
  | "excise"
  | "import_duty"
  | "surcharge";

export type ChargeRateType = "percentage" | "per_unit" | "compound";

export type CalculationBasis =
  | "retail_price"
  | "wholesale_cost"
  | "subtotal"
  | "subtotal_plus_tax";

export interface ChargeBreakdownLine {
  jurisdictionCode: string;
  jurisdictionName: string;
  tagCode: string;
  chargeCategory: ChargeCategory;
  rateType: ChargeRateType;
  rate: number;
  chargeAmount: number;
  label: string;
}

export interface ResolvedChargeRule {
  jurisdictionCode: string;
  jurisdictionName: string;
  tagCode: string;
  chargeCategory: ChargeCategory;
  rateType: ChargeRateType;
  calculationBasis: CalculationBasis;
  rate: number;
  originCode: string | null;
  priority: number;
}