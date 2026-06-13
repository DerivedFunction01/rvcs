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
  MergeConflict,
  MergePreview,
} from "./types";
import { projectState } from "./reducer";
import { generateCommitHash, generateLineId, generateAllocationId } from "./id";

// ─── Merge Helpers (module-level) ─────────────────────────────────────────────

/**
 * Detect a conflict between two deltas from different branches touching the same entity.
 * Returns a MergeConflict or null if no conflict.
 */
function detectConflict(
  branchA: string,
  deltaA: Delta,
  branchB: string,
  deltaB: Delta,
  counter: number
): MergeConflict | null {
  const id = `conflict-${counter}`;

  // add_item + add_item on same lineId
  if (deltaA.action === "add_item" && deltaB.action === "add_item" && deltaA.lineId === deltaB.lineId) {
    // If every parameter is identical the two branches independently agreed — not a conflict.
    const identical =
      deltaA.sku === deltaB.sku &&
      deltaA.qty === deltaB.qty &&
      deltaA.parentLineId === deltaB.parentLineId &&
      deltaA.selectedModifierState === deltaB.selectedModifierState &&
      JSON.stringify([...deltaA.allocations].sort()) === JSON.stringify([...deltaB.allocations].sort());
    if (identical) return null; // clean auto-dedup
    return { id, type: "add_add", lineId: deltaA.lineId, branchA, branchB, deltaA, deltaB, resolution: null };
  }

  // remove_item vs modify_sku on same lineId
  if (
    (deltaA.action === "remove_item" && deltaB.action === "modify_sku" && deltaA.lineId === deltaB.lineId) ||
    (deltaA.action === "modify_sku" && deltaB.action === "remove_item" && deltaA.lineId === deltaB.lineId)
  ) {
    const lineId = (deltaA as { lineId: string }).lineId;
    return { id, type: "remove_modify_sku", lineId, branchA, branchB, deltaA, deltaB, resolution: null };
  }

  // remove_item vs modify_item_allocations on same lineId
  if (
    (deltaA.action === "remove_item" && deltaB.action === "modify_item_allocations" && deltaA.lineId === deltaB.lineId) ||
    (deltaA.action === "modify_item_allocations" && deltaB.action === "remove_item" && deltaA.lineId === deltaB.lineId)
  ) {
    const lineId = (deltaA as { lineId: string }).lineId;
    return { id, type: "remove_modify_alloc", lineId, branchA, branchB, deltaA, deltaB, resolution: null };
  }

  // modify_sku + modify_sku on same lineId → only conflict if different SKUs
  if (
    deltaA.action === "modify_sku" && deltaB.action === "modify_sku" &&
    deltaA.lineId === deltaB.lineId && deltaA.afterSku !== deltaB.afterSku
  ) {
    return { id, type: "modify_sku_sku", lineId: deltaA.lineId, branchA, branchB, deltaA, deltaB, resolution: null };
  }

  // modify_item_allocations + modify_item_allocations on same lineId
  if (
    deltaA.action === "modify_item_allocations" && deltaB.action === "modify_item_allocations" &&
    deltaA.lineId === deltaB.lineId
  ) {
    return { id, type: "modify_alloc_alloc", lineId: deltaA.lineId, branchA, branchB, deltaA, deltaB, resolution: null };
  }

  // declare_allocation + declare_allocation on same allocationId
  if (
    deltaA.action === "declare_allocation" && deltaB.action === "declare_allocation" &&
    deltaA.allocation.allocationId === deltaB.allocation.allocationId
  ) {
    return { id, type: "alloc_alloc", allocationId: deltaA.allocation.allocationId, branchA, branchB, deltaA, deltaB, resolution: null };
  }

  return null;
}

/**
 * Project merged state: start from S_LCA then apply allDeltas sequentially.
 * This reuses the existing projectState() by synthesizing a temporary commit.
 */
function projectMergedDeltas(
  log: VCSCommit[],
  lcaHash: string | null,
  allDeltas: Delta[],
  catalog: Record<string, import('./types').CatalogItemEntry>,
  confirmedHash: string | null
): import('./types').ProjectedState {
  if (allDeltas.length === 0) {
    return projectState(log, lcaHash, catalog, confirmedHash);
  }
  // Create a virtual commit on top of lcaHash
  const virtualCommit: VCSCommit = {
    commitHash: "__merge_preview__",
    parentHash: lcaHash,
    mergeParentHashes: [],
    branch: "__preview__",
    timestamp: new Date().toISOString(),
    authorId: "preview",
    deltas: allDeltas,
  };
  return projectState([...log, virtualCommit], "__merge_preview__", catalog, confirmedHash);
}

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

  getConfirmedHash(): string | null {
    const mainHead = this.repo.branches[this.getMainActiveBranch()]?.headHash ?? null;
    if (!mainHead) return null;
    
    let current: string | null = mainHead;
    while (current) {
      const commit = this.repo.log.find(c => c.commitHash === current);
      if (!commit) break;
      if (commit.mergeParentHashes.length > 0 || commit.authorId === "system-init") {
        return current;
      }
      current = commit.parentHash;
    }
    return null;
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  projectAt(hash: string | null): ProjectedState {
    return projectState(this.repo.log, hash, this.catalog, this.getConfirmedHash());
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
      ...this.repo.branches[branch],
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

  createBranch(name: string, fromCommitOrBranch?: string | null): void {
    if (this.repo.branches[name]) {
      throw new Error(`Branch "${name}" already exists`);
    }
    let headHash: string | null = null;
    if (fromCommitOrBranch) {
      if (this.repo.branches[fromCommitOrBranch]) {
        headHash = this.repo.branches[fromCommitOrBranch].headHash;
      } else {
        headHash = fromCommitOrBranch;
      }
    } else {
      headHash = this.repo.branches[this.repo.activeBranch]?.headHash ?? null;
    }
    this.repo.branches[name] = { headHash, type: "parallel" };
  }

  updateBranchConfig(name: string, config: { type?: "parallel" | "hypothetical"; label?: string }): void {
    if (!this.repo.branches[name]) {
      throw new Error(`Branch "${name}" does not exist`);
    }
    this.repo.branches[name] = {
      ...this.repo.branches[name],
      ...config,
    };
  }

  renameBranch(oldName: string, newName: string): void {
    if (oldName === newName) return;
    if (!newName.trim()) {
      throw new Error("Branch name cannot be empty");
    }
    if (!this.repo.branches[oldName]) {
      throw new Error(`Branch "${oldName}" does not exist`);
    }
    if (this.repo.branches[newName]) {
      throw new Error(`Branch "${newName}" already exists`);
    }

    this.repo.branches[newName] = this.repo.branches[oldName];
    delete this.repo.branches[oldName];

    if (this.repo.activeBranch === oldName) {
      this.repo.activeBranch = newName;
    }
    if (this.repo.mainActiveBranch === oldName) {
      this.repo.mainActiveBranch = newName;
    }

    // Update the branch property of all commits belonging to oldName
    for (const commit of this.repo.log) {
      if (commit.branch === oldName) {
        commit.branch = newName;
      }
    }
  }

  setMainActiveBranch(name: string): void {
    if (!this.repo.branches[name]) {
      throw new Error(`Branch "${name}" does not exist`);
    }
    this.repo.mainActiveBranch = name;
  }

  getMainActiveBranch(): string {
    return this.repo.mainActiveBranch || "main";
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

  // ─── Merge ───────────────────────────────────────────────────────────────

  /**
   * Build the full ancestor set for a given hash (inclusive of that hash itself).
   * Walks first-parent and merge-parent links so merged-in branches count as ancestors.
   * Returns a Map of hash → log index for later recency comparison.
   */
  private allAncestors(hash: string | null): Map<string, number> {
    const result = new Map<string, number>();
    if (!hash) return result;

    const indexMap = new Map(this.repo.log.map((c, i) => [c.commitHash, i]));
    const commitByHash = new Map(this.repo.log.map((c) => [c.commitHash, c]));
    const visited = new Set<string>();
    const queue: string[] = [hash];

    while (queue.length > 0) {
      const current = queue.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const idx = indexMap.get(current);
      if (idx !== undefined) result.set(current, idx);

      const commit = commitByHash.get(current);
      if (!commit) continue;

      if (commit.parentHash) queue.push(commit.parentHash);
      for (const mergeHash of commit.mergeParentHashes) {
        queue.push(mergeHash);
      }
    }

    return result;
  }

  /** True when ancestorHash is reachable from descendantHash via parent/merge links. */
  isAncestorOf(ancestorHash: string, descendantHash: string | null): boolean {
    if (!descendantHash) return false;
    return this.allAncestors(descendantHash).has(ancestorHash);
  }

  /**
   * N-way Lowest Common Ancestor.
   * Returns the most-recent commit hash that is a common ancestor of all provided hashes.
   */
  findLCA(hashes: (string | null)[]): string | null {
    if (hashes.includes(null)) return null;
    const nonNull = hashes as string[];
    if (nonNull.length === 0) return null;

    // Build ancestor set for first hash
    let common = this.allAncestors(nonNull[0]);

    // Intersect with each subsequent hash's ancestor set
    for (let i = 1; i < nonNull.length; i++) {
      const other = this.allAncestors(nonNull[i]);
      for (const h of common.keys()) {
        if (!other.has(h)) common.delete(h);
      }
    }

    if (common.size === 0) return null;

    // Return the most-recent (highest log index) common ancestor
    let bestHash: string | null = null;
    let bestIdx = -1;
    for (const [h, idx] of common.entries()) {
      if (idx > bestIdx) { bestIdx = idx; bestHash = h; }
    }
    return bestHash;
  }

  /**
   * Collect all deltas in commits strictly between lcaHash and tipHash
   * (exclusive of the LCA commit itself, inclusive of tipHash commit).
   * Returns [branchName, delta] pairs for conflict attribution.
   */
  private deltasAfterLCA(
    tipHash: string | null,
    lcaHash: string | null
  ): Delta[] {
    if (!tipHash || tipHash === lcaHash) return [];
    const result: Delta[] = [];
    let current: string | null = tipHash;
    const visited = new Set<string>();
    while (current && current !== lcaHash && !visited.has(current)) {
      visited.add(current);
      const commit = this.repo.log.find(c => c.commitHash === current);
      if (!commit) break;
      // Prepend so we get chronological order
      result.unshift(...commit.deltas);
      current = commit.parentHash;
    }
    return result;
  }

  /**
   * Preview an octopus merge of sourceBranches into targetBranch.
   * Detects conflicts across all pairwise branch combinations.
   */
  previewMerge(sourceBranches: string[], targetBranch: string): MergePreview {
    const targetHead = this.repo.branches[targetBranch]?.headHash ?? null;
    const sourceHeads: Record<string, string | null> = {};
    for (const sb of sourceBranches) {
      sourceHeads[sb] = this.repo.branches[sb]?.headHash ?? null;
    }

    // Find N-way LCA across all branch tips
    const allTips = [targetHead, ...Object.values(sourceHeads)];
    const lcaHash = this.findLCA(allTips);

    // Collect per-branch delta pools
    const deltasByBranch: Record<string, Delta[]> = {};
    deltasByBranch[targetBranch] = this.deltasAfterLCA(targetHead, lcaHash);
    for (const sb of sourceBranches) {
      deltasByBranch[sb] = this.deltasAfterLCA(sourceHeads[sb], lcaHash);
    }

    // Detect conflicts across all pairwise combinations
    const conflicts: MergeConflict[] = [];
    const allBranchNames = [targetBranch, ...sourceBranches];
    let conflictCounter = 0;

    for (let i = 0; i < allBranchNames.length; i++) {
      for (let j = i + 1; j < allBranchNames.length; j++) {
        const branchA = allBranchNames[i];
        const branchB = allBranchNames[j];
        const deltasA = deltasByBranch[branchA];
        const deltasB = deltasByBranch[branchB];

        for (const deltaA of deltasA) {
          for (const deltaB of deltasB) {
            const conflict = detectConflict(
              branchA, deltaA, branchB, deltaB, ++conflictCounter
            );
            if (conflict) conflicts.push(conflict);
          }
        }
      }
    }

    // Build auto-merged state: S_LCA ⊕ ΔT ⊕ ΔS1 ⊕ …  (target wins conflicts)
    const allDeltasInOrder = [
      ...deltasByBranch[targetBranch],
      ...sourceBranches.flatMap(sb => deltasByBranch[sb]),
    ];
    const autoMergedState = projectMergedDeltas(
      this.repo.log,
      lcaHash,
      allDeltasInOrder,
      this.catalog,
      this.getConfirmedHash()
    );

    // Fast-forward: LCA is the target head (target is strictly behind all sources)
    const isFastForward = lcaHash !== null && lcaHash === targetHead;

    // Already merged: source tip is an ancestor of target (git "Already up to date")
    const alreadyMergedBranches = sourceBranches.filter((sb) => {
      const head = sourceHeads[sb];
      return head !== null && this.isAncestorOf(head, targetHead);
    });
    const isUpToDate =
      sourceBranches.length > 0 &&
      alreadyMergedBranches.length === sourceBranches.length;

    return {
      lcaHash,
      targetHead,
      sourceHeads,
      deltasByBranch,
      conflicts,
      autoMergedState,
      isFastForward,
      alreadyMergedBranches,
      isUpToDate,
    };
  }

  /**
   * Commit the octopus merge onto targetBranch.
   * resolutionDeltas are the override events chosen during conflict resolution.
   */
  commitMerge(
    sourceBranches: string[],
    targetBranch: string,
    resolutionDeltas: Delta[]
  ): VCSCommit {
    const targetHead = this.repo.branches[targetBranch]?.headHash ?? null;
    const sourceHeads: Record<string, string | null> = {};
    for (const sb of sourceBranches) {
      sourceHeads[sb] = this.repo.branches[sb]?.headHash ?? null;
    }

    const allTips = [targetHead, ...Object.values(sourceHeads)];
    const lcaHash = this.findLCA(allTips);

    const sourceDeltas: Delta[] = [];
    for (const sb of sourceBranches) {
      sourceDeltas.push(...this.deltasAfterLCA(sourceHeads[sb], lcaHash));
    }

    const parentHash = targetHead;
    const mergeParentHashes = sourceBranches
      .map(sb => this.repo.branches[sb]?.headHash)
      .filter((h): h is string => h !== null);

    const mergeCommit: VCSCommit = {
      commitHash: generateCommitHash(),
      parentHash,
      mergeParentHashes,
      branch: targetBranch,
      timestamp: new Date().toISOString(),
      authorId: "pos-ui",
      deltas: [...sourceDeltas, ...resolutionDeltas],
    };

    this.repo.log.push(mergeCommit);
    this.repo.branches[targetBranch] = {
      ...this.repo.branches[targetBranch],
      headHash: mergeCommit.commitHash,
    };

    return mergeCommit;
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