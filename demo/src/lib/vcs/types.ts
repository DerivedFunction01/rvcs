// ─── VCS Core Type Definitions (v2.0.0-PRO compliant) ─────────────────────────
// These types define the entire VCS data model. The UI and backend must never
// deviate from these contracts. Prices and names are NEVER stored in commits.

// ─── Allocation System (First-Class Decoupled Contracts) ────────────────────────

export type AllocationType = "assignment" | "payment" | "fulfillment" | "note";

export interface TimeBlock {
  type: "immediate" | "scheduled" | "deferred";
  calculatedAt: string | null;
}

export interface PaymentStrategy {
  strategyType:
    | "percentage"
    | "fixed"
    | "remaining"
    | "fixed_item"
    | "fixed_global";
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
  hidden?: boolean;
}

export interface PaymentAllocation {
  allocationId: string;
  correlationId?: string | null;
  type: "payment";
  payer: string;
  method: string | null;
  paymentStrategy: PaymentStrategy;
  timeOfPayment: TimeBlock;
  hidden?: boolean;
}

export interface FulfillmentAllocation {
  allocationId: string;
  correlationId?: string | null;
  type: "fulfillment";
  method: string;
  time: TimeBlock;
  fulfillmentMetadata: FulfillmentMetadata;
  hidden?: boolean;
}

export interface NoteAllocation {
  allocationId: string;
  correlationId?: string | null;
  type: "note";
  text: string;
  attachedTo?: "order" | null;
  hidden?: boolean;
}

export type AllocationBlock =
  | AssignmentAllocation
  | PaymentAllocation
  | FulfillmentAllocation
  | NoteAllocation;

// ─── Delta Operations (Polymorphic, Append-Only) ────────────────────────────────

export interface DeclareAllocationDelta {
  action: "declare_allocation";
  allocation: AllocationBlock;
}

export interface UndeclareAllocationDelta {
  action: "undeclare_allocation";
  allocationId: string;
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

export interface ModifyItemQtyDelta {
  action: "modify_qty";
  lineId: string;
  beforeQty: number;
  afterQty: number;
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
  | UndeclareAllocationDelta
  | AddItemDelta
  | RemoveItemDelta
  | ModifyItemAllocationsDelta
  | ModifySkuDelta
  | ModifyModifierStateDelta
  | ModifyItemQtyDelta
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
  name: string; // Late-bound from catalog
  basePrice: number; // Late-bound from catalog
  qty: number;
  canceledQty: number;
  totalPrice: number; // Computed: basePrice * qty
  allocations: string[]; // Referenced allocation IDs
  children: ProjectedLineItem[];
  selectedModifierState?: string;
  status: "pending" | "confirmed" | "canceled" | "changed";
}

export interface PersonBreakdown {
  person: string;
  subtotal: number;
  items: string[]; // line IDs
  paymentMethod: string | null;
}

// ─── Charge / Tax Breakdown ────────────────────────────────────────────────────

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
  type?: "parallel" | "hypothetical";
  label?: string;
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

export interface ComboChoiceEntry {
  slotSku: string;
  optionSku: string;
  price: number;
  modifierSku?: string;
}

export interface SkuChargeTagEntry {
  tagCode: string;
  categoryHint: string;
  originCode?: string | null;
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
  comboChoices?: ComboChoiceEntry[];
  sizeGroupId?: string | null;
  appliedSizeGroupId?: string | null;
  appliedSizeGroup?: SizeGroup | null;
  allowedStates?: ModifierStateOption[];
  allowedModifiers?: string[];
  chargeTags?: SkuChargeTagEntry[]; // resolved from SkuChargeTag — empty = use GENERAL rules
}

// ─── VCS Repository (The "Repo") ──────────────────────────────────────────────

export interface VCSRepo {
  contextType: string;
  contextId: string;
  orderContext?: unknown; // Optional external state, not part of core VCS semantics
  log: VCSCommit[];
  branches: BranchMap;
  activeBranch: string;
  mainActiveBranch?: string;
}

// ─── Merge Semantics ──────────────────────────────────────────────────────────

export type MergeConflictType =
  | "add_add"
  | "remove_modify_sku"
  | "remove_modify_alloc"
  | "modify_sku_sku"
  | "alloc_alloc"
  | "modify_alloc_alloc";

/**
 * A detected conflict between two branches touching the same entity.
 * `resolution` is the branch name whose delta wins (null = unresolved).
 */
export interface MergeConflict {
  id: string;
  type: MergeConflictType;
  lineId?: string;
  allocationId?: string;
  /** Name of the first branch involved */
  branchA: string;
  /** Name of the second branch involved */
  branchB: string;
  deltaA: Delta;
  deltaB: Delta;
  /** Winning branch name chosen by the user, or null if unresolved */
  resolution: string | null;
}

/**
 * Result of previewMerge — contains all information needed to render the
 * merge dialog Step 2 and to produce the final merge commit.
 */
export interface MergePreview {
  lcaHash: string | null;
  targetHead: string | null;
  /** Map of sourceBranchName → headHash */
  sourceHeads: Record<string, string | null>;
  /** Per-branch delta pools (exclusive of LCA commit) */
  deltasByBranch: Record<string, Delta[]>;
  conflicts: MergeConflict[];
  /** S_LCA ⊕ ΔT ⊕ ΔS1 ⊕ … (target wins conflicts by default) */
  autoMergedState: ProjectedState;
  isFastForward: boolean;
  /** Source branches whose tips are already ancestors of the target head */
  alreadyMergedBranches: string[];
  /** True when every selected source is already merged into the target */
  isUpToDate: boolean;
}
