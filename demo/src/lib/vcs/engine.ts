// ─── VCS Engine (The "Git" Engine) ────────────────────────────────────────────
// Manages the local repository: commit log, branches, HEAD pointers.
// Provides commit(), branch(), checkout() — the core VCS operations.
// All business logic lives here. The UI is a pure view.

import type {
  VCSCommit,
  VCSRepo,
  Delta,
  ProjectedState,
  CatalogItemEntry,
  BranchMap,
  BranchPointer,
  AllocationBlock,
  AssignmentAllocation,
  PaymentAllocation,
} from "./types";
import { projectState } from "./reducer";
import { generateCommitHash, generateLineId, generateAllocationId } from "./id";

// ─── Engine Class ──────────────────────────────────────────────────────────────

export class VCSEngine {
  private repo: VCSRepo;
  private catalog: Record<string, CatalogItemEntry> = {};

  constructor(repo: VCSRepo) {
    this.repo = repo;
  }

  // ─── Catalog ──────────────────────────────────────────────────────────────

  setCatalog(items: CatalogItemEntry[]): void {
    this.catalog = {};
    for (const item of items) {
      this.catalog[item.sku] = item;
    }
  }

  getCatalog(): Record<string, CatalogItemEntry> {
    return this.catalog;
  }

  getCatalogItems(): CatalogItemEntry[] {
    return Object.values(this.catalog).filter((i) => i.active && i.type === "item");
  }

  getModifierItems(): CatalogItemEntry[] {
    return Object.values(this.catalog).filter((i) => i.active && i.type === "modifier");
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  projectAt(hash: string | null): ProjectedState {
    return projectState(this.repo.log, hash, this.catalog);
  }

  projectCurrent(): ProjectedState {
    const headHash = this.repo.branches[this.repo.activeBranch]?.headHash ?? null;
    return this.projectAt(headHash);
  }

  // ─── Core Operations ──────────────────────────────────────────────────────

  /**
   * Commit new deltas to the active branch.
   * Returns the new commit.
   */
  commit(
    deltas: Delta[],
    authorId: string = "pos-ui",
    branchOverride?: string
  ): VCSCommit {
    const branch = branchOverride || this.repo.activeBranch;
    const parentHash = this.repo.branches[branch]?.headHash ?? null;

    const newCommit: VCSCommit = {
      commitHash: generateCommitHash(),
      parentHash,
      mergeParentHashes: [],
      branch,
      timestamp: new Date().toISOString(),
      authorId,
      deltas,
    };

    this.repo.log.push(newCommit);
    this.repo.branches[branch] = {
      headHash: newCommit.commitHash,
    };

    return newCommit;
  }

  /** Get the commit log (newest first) */
  getLog(): VCSCommit[] {
    return [...this.repo.log].reverse();
  }

  /** Get the full repo state */
  getRepo(): VCSRepo {
    return this.repo;
  }

  // ─── Branching ───────────────────────────────────────────────────────────

  getBranches(): BranchMap {
    return { ...this.repo.branches };
  }

  getActiveBranch(): string {
    return this.repo.activeBranch;
  }

  createBranch(name: string, fromBranch?: string): void {
    const source = fromBranch || this.repo.activeBranch;
    const sourceHead = this.repo.branches[source]?.headHash ?? null;
    if (this.repo.branches[name]) {
      throw new Error(`Branch "${name}" already exists`);
    }
    this.repo.branches[name] = { headHash: sourceHead };
  }

  checkout(branch: string): void {
    if (!this.repo.branches[branch]) {
      throw new Error(`Branch "${branch}" does not exist`);
    }
    this.repo.activeBranch = branch;
  }

  getHeadHash(branch?: string): string | null {
    const target = branch || this.repo.activeBranch;
    return this.repo.branches[target]?.headHash ?? null;
  }

  // ─── Convenience Methods (compose deltas for common UI actions) ───────────

  /**
   * Add an item with decoupled allocations.
   * Declares assignment + payment allocations, then adds the item.
   */
  addItemWithAllocations(params: {
    sku: string;
    qty: number;
    assignee: string;
    payer: string;
    paymentMethod: string;
    selectedOptions?: string[];
    selectedModifierState?: string;
    authorId?: string;
  }): VCSCommit {
    const assignAllocId = generateAllocationId("assign");
    const payAllocId = generateAllocationId("pay");

    const assignmentAlloc: AssignmentAllocation = {
      allocationId: assignAllocId,
      type: "assignment",
      entity: params.assignee,
    };

    const paymentAlloc: PaymentAllocation = {
      allocationId: payAllocId,
      type: "payment",
      payer: params.payer,
      method: params.paymentMethod,
      paymentStrategy: { strategyType: "percentage", value: 1.0 },
      timeOfPayment: { type: "immediate", calculatedAt: new Date().toISOString() },
    };

    return this.commit(
      [
        { action: "declare_allocation", allocation: assignmentAlloc },
        { action: "declare_allocation", allocation: paymentAlloc },
        {
          action: "add_item",
          lineId: generateLineId(),
          parentLineId: null,
          sku: params.sku,
          qty: params.qty,
          allocations: [assignAllocId, payAllocId],
          selectedOptions: params.selectedOptions,
          selectedModifierState: params.selectedModifierState,
        },
      ],
      params.authorId
    );
  }

  /** Add a modifier (child) to an existing line item */
  addModifier(params: {
    parentLineId: string;
    modifierSku: string;
    selectedModifierState?: string;
    authorId?: string;
  }): VCSCommit {
    return this.commit(
      [
        {
          action: "add_item",
          lineId: generateLineId(),
          parentLineId: params.parentLineId,
          sku: params.modifierSku,
          qty: 1,
          allocations: [],
          selectedModifierState: params.selectedModifierState,
        },
      ],
      params.authorId
    );
  }

  /** Remove an item (triggers cascading deletion in reducer) */
  removeItem(params: {
    lineId: string;
    qty?: number;
    authorId?: string;
  }): VCSCommit {
    // Find current qty of the item to remove it fully
    const state = this.projectCurrent();
    const item = state.items[params.lineId];
    const qty = params.qty ?? item?.qty ?? 1;

    return this.commit(
      [{ action: "remove_item", lineId: params.lineId, qty }],
      params.authorId
    );
  }

  /**
   * AI Agent: "George mimics Bob" — batch_duplicate_and_reallocate
   * Clones all items assigned to sourceAssignee for targetAssignee.
   */
  mimicOrder(params: {
    sourceAssignee: string;
    targetAssignee: string;
    targetPayer: string;
    paymentMethod: string;
    authorId?: string;
  }): VCSCommit {
    const headHash = this.getHeadHash();
    if (!headHash) {
      throw new Error("Cannot mimic: no commits exist");
    }

    const assignAllocId = generateAllocationId("assign");
    const payAllocId = generateAllocationId("pay");

    const assignmentAlloc: AssignmentAllocation = {
      allocationId: assignAllocId,
      type: "assignment",
      entity: params.targetAssignee,
    };

    const paymentAlloc: PaymentAllocation = {
      allocationId: payAllocId,
      type: "payment",
      payer: params.targetPayer,
      method: params.paymentMethod,
      paymentStrategy: { strategyType: "percentage", value: 1.0 },
      timeOfPayment: { type: "immediate", calculatedAt: new Date().toISOString() },
    };

    return this.commit(
      [
        { action: "declare_allocation", allocation: assignmentAlloc },
        { action: "declare_allocation", allocation: paymentAlloc },
        {
          action: "batch_by_filter",
          baseRevisionId: headHash,
          filters: [
            { property: "assignee", operator: "equals", value: params.sourceAssignee },
          ],
          templateMutation: {
            mutationType: "batch_duplicate_and_reallocate",
            patchAllocations: [assignmentAlloc, paymentAlloc],
          },
        },
      ],
      params.authorId || "ai-agent"
    );
  }

  // ─── Serialization ────────────────────────────────────────────────────────

  toJSON(): string {
    return JSON.stringify(this.repo);
  }

  static fromJSON(json: string, catalog?: CatalogItemEntry[]): VCSEngine {
    const repo = JSON.parse(json) as VCSRepo;
    const engine = new VCSEngine(repo);
    if (catalog) engine.setCatalog(catalog);
    return engine;
  }
}