// ─── VCS Core Type Definitions (v2.0.0-PRO compliant) ─────────────────────────
// These types define the entire VCS data model. The UI and backend must never
// deviate from these contracts. Prices and names are NEVER stored in commits.

// ─── Allocation System (First-Class Decoupled Contracts) ────────────────────────

export type AllocationType = "assignment" | "payment" | "fulfillment";

export interface TimeBlock {
  type: "immediate" | "scheduled" | "deferred";
  calculatedAt: string | null;
}

export interface PaymentStrategy {
  strategyType: "percentage" | "fixed" | "remaining";
  value: number | null;
}

export interface FulfillmentMetadata {
  destinationLabel: string;
  destinationId: string | null;
}

// Discriminated union for allocation blocks
export interface AssignmentAllocation {
  allocationId: string;
  correlationId?: string | null;
  type: "assignment";
  entity: string;
}

export interface PaymentAllocation {
  allocationId: string;
  correlationId?: string | null;
  type: "payment";
  payer: string;
  method: string | null;
  paymentStrategy: PaymentStrategy;
  timeOfPayment: TimeBlock;
}

export interface FulfillmentAllocation {
  allocationId: string;
  correlationId?: string | null;
  type: "fulfillment";
  method: string;
  time: TimeBlock;
  fulfillmentMetadata: FulfillmentMetadata;
}

export type AllocationBlock =
  | AssignmentAllocation
  | PaymentAllocation
  | FulfillmentAllocation;

// ─── Delta Operations (Polymorphic, Append-Only) ────────────────────────────────

export interface DeclareAllocationDelta {
  action: "declare_allocation";
  allocation: AllocationBlock;
}

export interface AddItemDelta {
  action: "add_item";
  lineId: string;
  parentLineId: string | null;
  sku: string;
  qty: number;
  allocations: string[]; // Flat array of allocation_id references
  selectedModifierState?: string; // Selected modifier state value (e.g. "EXTRA")
}

export interface RemoveItemDelta {
  action: "remove_item";
  lineId: string;
  qty: number;
}

export interface ModifyItemAllocationsDelta {
  action: "modify_item_allocations";
  lineId: string;
  beforeAllocations: string[];
  afterAllocations: string[];
}

export interface ModifySkuDelta {
  action: "modify_sku";
  lineId: string;
  beforeSku: string;
  afterSku: string;
}

export interface ModifyModifierStateDelta {
  action: "modify_modifier_state";
  lineId: string;
  beforeState?: string;
  afterState?: string;
}

// ─── Filter & Batch System ─────────────────────────────────────────────────────

export type FilterProperty =
  | "name"
  | "sku"
  | "payer"
  | "assignee"
  | "fulfillment_method"
  | "sku_category"
  | "tax_status"
  | "price"
  | "quantity"
  | "popularity_index"
  | "dietary_flags"
  | "allergens"
  | "brand";

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "in_set"
  | "not_in_set"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "like"
  | "not_like";

export interface FilterRule {
  property: FilterProperty;
  operator: FilterOperator;
  value: string | number | string[];
}

// Batch mutation templates
export interface BatchModifyAllocations {
  mutationType: "batch_modify_allocations";
  targetAllocationType: AllocationType;
  patchAllocation: AllocationBlock;
}

export interface BatchRemoveItems {
  mutationType: "batch_remove_items";
}

export interface BatchModifySku {
  mutationType: "batch_modify_sku";
  afterSku: string;
}

export interface BatchDuplicateAndReallocate {
  mutationType: "batch_duplicate_and_reallocate";
  patchAllocations: AllocationBlock[];
}

export type TemplateMutation =
  | BatchModifyAllocations
  | BatchRemoveItems
  | BatchModifySku
  | BatchDuplicateAndReallocate;

export interface BatchByFilterDelta {
  action: "batch_by_filter";
  baseRevisionId: string;
  filters: FilterRule[];
  templateMutation: TemplateMutation;
}

// Union of all delta types
export type Delta =
  | DeclareAllocationDelta
  | AddItemDelta
  | RemoveItemDelta
  | ModifyItemAllocationsDelta
  | ModifySkuDelta
  | ModifyModifierStateDelta
  | BatchByFilterDelta;

// ─── Commit Envelope ───────────────────────────────────────────────────────────

export interface VCSCommit {
  commitHash: string;
  parentHash: string | null;
  mergeParentHashes: string[];
  branch: string;
  timestamp: string;
  authorId: string;
  metadata?: Record<string, unknown>;
  deltas: Delta[];
}

// ─── Projected State (Computed, Never Stored) ─────────────────────────────────

export interface ProjectedLineItem {
  lineId: string;
  parentLineId: string | null;
  sku: string;
  name: string;       // Late-bound from catalog
  basePrice: number;  // Late-bound from catalog
  qty: number;
  totalPrice: number; // Computed: basePrice * qty
  allocations: string[]; // Referenced allocation IDs
  children: ProjectedLineItem[];
  selectedModifierState?: string;
}

export interface PersonBreakdown {
  person: string;
  subtotal: number;
  items: string[]; // line IDs
  paymentMethod: string | null;
}

export interface ProjectedFinancials {
  subtotal: number;
  personBreakdown: PersonBreakdown[];
}

export interface ProjectedState {
  items: Record<string, ProjectedLineItem>;
  allocations: Record<string, AllocationBlock>;
  financials: ProjectedFinancials;
}

// ─── Branch Pointers ──────────────────────────────────────────────────────────

export interface BranchPointer {
  headHash: string | null;
}

export type BranchMap = Record<string, BranchPointer>;

// ─── Catalog Item (from backend) ───────────────────────────────────────────────

export interface SizeGroup {
  id: string;
  name: string;
  defaultSku: string;
  options?: CatalogItemEntry[];
}

export interface ModifierStateOption {
  id: string;
  modifierSku: string;
  state: string;
  label: string;
  priceOverride: number | null;
}

export interface CatalogItemEntry {
  sku: string;
  name: string;
  basePrice: number;
  category: string;
  type: "item" | "modifier" | "discount";
  dietaryFlags: string[];
  allergens: string[];
  brand: string;
  active: boolean;
  sizeGroupId?: string | null;
  appliedSizeGroupId?: string | null;
  appliedSizeGroup?: SizeGroup | null;
  allowedStates?: ModifierStateOption[];
  allowedModifiers?: string[];
}

// ─── Order Context (Set at Init, Stored in Repo) ─────────────────────────────

export interface OrderContext {
  orderType: string;         // "walk-in" | "pickup" | "delivery"
  orderTypeLabel: string;    // "Walk In" | "Pickup" | "Delivery"
  customerFields: Record<string, string>;  // { name: "Bob", phone: "555-1234", ... }
  estimatedTimeLabel?: string | null;      // "Ready in ~15 min"
  initiatedAt: string;       // ISO timestamp
}

// ─── POS Config (Fetched from Backend) ───────────────────────────────────────

export interface CustomerFieldConfig {
  key: string;
  label: string;
  type: "text" | "tel" | "email" | "textarea";
  required: boolean;
  placeholder?: string;
  validation?: { pattern?: string; minLength?: number; maxLength?: number };
}

export interface OrderTypeConfig {
  id: string;
  label: string;
  description: string;
  icon: string;
  customerFields: CustomerFieldConfig[];
  estimatedTimeLabel?: string | null;
}

export interface PosConfigResponse {
  id: string;
  key: string;
  label: string;
  defaultPaymentMethod: string;
  orderTypes: OrderTypeConfig[];
}

// ─── VCS Repository (The "Repo") ──────────────────────────────────────────────

export interface VCSRepo {
  contextType: string;
  contextId: string;
  orderContext?: OrderContext;  // Set once at init, never mutated
  log: VCSCommit[];
  branches: BranchMap;
  activeBranch: string;
}