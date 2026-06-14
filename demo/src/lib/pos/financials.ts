export enum ChargeCategory {
  SalesTax = "sales_tax",
  Excise = "excise",
  ImportDuty = "import_duty",
  Surcharge = "surcharge",
}

export enum ChargeRateType {
  Percentage = "percentage",
  PerUnit = "per_unit",
  Compound = "compound",
}

export enum CalculationBasis {
  RetailPrice = "retail_price",
  WholesaleCost = "wholesale_cost",
  Subtotal = "subtotal",
  SubtotalPlusTax = "subtotal_plus_tax",
}

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