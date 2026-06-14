// ─── VCS Core Type Definitions (v2.0.0-PRO compliant) ─────────────────────────
// These types define the entire VCS data model. The UI and backend must never
// deviate from these contracts. Prices and names are NEVER stored in commits.

// ─── Allocation System (First-Class Decoupled Contracts) ────────────────────────

export enum AllocationType {
  Assignment = "assignment",
  Payment = "payment",
  Fulfillment = "fulfillment",
  Note = "note",
}

export enum TimeBlockType {
  Immediate = "immediate",
  Scheduled = "scheduled",
  Deferred = "deferred",
}

export enum NoteAttachmentScope {
  Order = "order",
  Item = "item",
}

export interface TimeBlock {
  type: TimeBlockType;
  calculatedAt: string | null;
}

export enum PaymentStrategyType {
  Percentage = "percentage",
  Fixed = "fixed",
  Remaining = "remaining",
  FixedItem = "fixed_item",
  FixedGlobal = "fixed_global",
}

export interface PaymentStrategy {
  strategyType: PaymentStrategyType;
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
  type: AllocationType.Assignment;
  entity: string;
  hidden?: boolean;
}

export interface PaymentAllocation {
  allocationId: string;
  correlationId?: string | null;
  type: AllocationType.Payment;
  payer: string;
  method: string | null;
  paymentStrategy: PaymentStrategy;
  timeOfPayment: TimeBlock;
  hidden?: boolean;
}

export interface FulfillmentAllocation {
  allocationId: string;
  correlationId?: string | null;
  type: AllocationType.Fulfillment;
  method: string;
  time: TimeBlock;
  fulfillmentMetadata: FulfillmentMetadata;
  hidden?: boolean;
}

export interface NoteAllocation {
  allocationId: string;
  correlationId?: string | null;
  type: AllocationType.Note;
  text: string;
  attachedTo?: NoteAttachmentScope | null;
  hidden?: boolean;
}

export type AllocationBlock =
  | AssignmentAllocation
  | PaymentAllocation
  | FulfillmentAllocation
  | NoteAllocation;

// ─── Delta Operations (Polymorphic, Append-Only) ────────────────────────────────

export enum DeltaActionType {
  DeclareAllocation = "declare_allocation",
  UndeclareAllocation = "undeclare_allocation",
  AddItem = "add_item",
  RemoveItem = "remove_item",
  ModifyItemAllocations = "modify_item_allocations",
  ModifySku = "modify_sku",
  ModifyModifierState = "modify_modifier_state",
  ModifyQty = "modify_qty",
  ModifyInlineQty = "modify_inline_qty",
  BatchByFilter = "batch_by_filter",
}

export interface DeclareAllocationDelta {
  action: DeltaActionType.DeclareAllocation;
  allocation: AllocationBlock;
}

export interface UndeclareAllocationDelta {
  action: DeltaActionType.UndeclareAllocation;
  allocationId: string;
}

export interface AddItemDelta {
  action: DeltaActionType.AddItem;
  lineId: string;
  parentLineId: string | null;
  sku: string;
  qty: number;
  inlineQty?: number;
  allocations: string[]; // Flat array of allocation_id references
  selectedModifierState?: string; // Selected modifier state value (e.g. "EXTRA")
}

export interface RemoveItemDelta {
  action: DeltaActionType.RemoveItem;
  lineId: string;
  qty: number;
}

export interface ModifyItemAllocationsDelta {
  action: DeltaActionType.ModifyItemAllocations;
  lineId: string;
  beforeAllocations: string[];
  afterAllocations: string[];
}

export interface ModifySkuDelta {
  action: DeltaActionType.ModifySku;
  lineId: string;
  beforeSku: string;
  afterSku: string;
}

export interface ModifyModifierStateDelta {
  action: DeltaActionType.ModifyModifierState;
  lineId: string;
  beforeState?: string;
  afterState?: string;
}

export interface ModifyItemQtyDelta {
  action: DeltaActionType.ModifyQty;
  lineId: string;
  beforeQty: number;
  afterQty: number;
}

export interface ModifyInlineQtyDelta {
  action: DeltaActionType.ModifyInlineQty;
  lineId: string;
  beforeInlineQty?: number;
  afterInlineQty: number;
}

// ─── Filter & Batch System ─────────────────────────────────────────────────────

export enum FilterProperty {
  Name = "name",
  Sku = "sku",
  Payer = "payer",
  Assignee = "assignee",
  FulfillmentMethod = "fulfillment_method",
  SkuCategory = "sku_category",
  TaxStatus = "tax_status",
  Price = "price",
  Quantity = "quantity",
  PopularityIndex = "popularity_index",
  DietaryFlags = "dietary_flags",
  Allergens = "allergens",
  Brand = "brand",
}

export enum FilterOperator {
  Equals = "equals",
  NotEquals = "not_equals",
  InSet = "in_set",
  NotInSet = "not_in_set",
  GreaterThan = "greater_than",
  GreaterThanOrEqual = "greater_than_or_equal",
  LessThan = "less_than",
  LessThanOrEqual = "less_than_or_equal",
  Like = "like",
  NotLike = "not_like",
}

export interface FilterRule {
  property: FilterProperty;
  operator: FilterOperator;
  value: string | number | string[];
}

export enum MutationType {
  BatchModifyAllocations = "batch_modify_allocations",
  BatchRemoveItems = "batch_remove_items",
  BatchModifySku = "batch_modify_sku",
  BatchDuplicateAndReallocate = "batch_duplicate_and_reallocate",
}

// Batch mutation templates
export interface BatchModifyAllocations {
  mutationType: MutationType.BatchModifyAllocations;
  targetAllocationType: AllocationType;
  patchAllocation: AllocationBlock;
}

export interface BatchRemoveItems {
  mutationType: MutationType.BatchRemoveItems;
}

export interface BatchModifySku {
  mutationType: MutationType.BatchModifySku;
  afterSku: string;
}

export interface BatchDuplicateAndReallocate {
  mutationType: MutationType.BatchDuplicateAndReallocate;
  patchAllocations: AllocationBlock[];
}

export type TemplateMutation =
  | BatchModifyAllocations
  | BatchRemoveItems
  | BatchModifySku
  | BatchDuplicateAndReallocate;

export interface BatchByFilterDelta {
  action: DeltaActionType.BatchByFilter;
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
  | ModifyInlineQtyDelta
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

export enum ItemStatus {
  Pending = "pending",
  Confirmed = "confirmed",
  Canceled = "canceled",
  Changed = "changed",
}

// ─── Projected State (Computed, Never Stored) ─────────────────────────────────

export interface ProjectedLineItem {
  lineId: string;
  parentLineId: string | null;
  sku: string;
  name: string; // Late-bound from catalog
  basePrice: number; // Late-bound from catalog
  qty: number;
  inlineQty?: number;
  canceledQty: number;
  totalPrice: number; // Computed: basePrice * qty * inlineQty
  allocations: string[]; // Referenced allocation IDs
  children: ProjectedLineItem[];
  selectedModifierState?: string;
  status: ItemStatus;
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

export enum BranchType {
  Parallel = "parallel",
  Hypothetical = "hypothetical",
}

export interface BranchPointer {
  headHash: string | null;
  type?: BranchType;
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

export enum CatalogItemType {
  Item = "item",
  Modifier = "modifier",
  Discount = "discount",
}

export enum CatalogCategory {
  ComboSlot = "combo-slot",
  General = "general",
}

export interface CatalogItemEntry {
  sku: string;
  name: string;
  basePrice: number;
  category: string;
  type: CatalogItemType;
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
  inlineQtyType?: "int" | "float" | "none" | null;
  inlineQtyLabel?: string | null;
  inlineQtyUnit?: string | null;
  inlineQtyIncrement?: number | null;
  inlineQtyPricePerUnit?: boolean | null;
  inlineQtyPricePerUnitShowPer?: boolean | null;
  inlineQtyMainQtyLocked?: boolean | null;
}

// ─── VCS Repository (The "Repo") ──────────────────────────────────────────────

export enum RepoContextType {
  Cart = "cart",
  Catalog = "catalog",
  InventoryWarehouse = "inventory_warehouse",
}

export interface VCSRepo {
  contextType: RepoContextType | string;
  contextId: string;
  orderContext?: unknown; // Optional external state, not part of core VCS semantics
  log: VCSCommit[];
  branches: BranchMap;
  activeBranch: string;
  mainActiveBranch?: string;
}

// ─── Merge Semantics ──────────────────────────────────────────────────────────

export enum MergeConflictType {
  AddAdd = "add_add",
  RemoveModifySku = "remove_modify_sku",
  RemoveModifyAlloc = "remove_modify_alloc",
  RemoveModifyQty = "remove_modify_qty",
  RemoveModifyInlineQty = "remove_modify_inline_qty",
  ModifySkuSku = "modify_sku_sku",
  ModifyQtyQty = "modify_qty_qty",
  ModifyInlineQtyInlineQty = "modify_inline_qty_inline_qty",
  ModifyQtyModifyInlineQty = "modify_qty_modify_inline_qty",
  AllocAlloc = "alloc_alloc",
  ModifyAllocAlloc = "modify_alloc_alloc",
}

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

export enum SquashType {
  Light = "light",
  Full = "full",
}
