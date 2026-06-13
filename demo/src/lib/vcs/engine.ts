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
  counter: number,
): MergeConflict | null {
  const id = `conflict-${counter}`;

  // add_item + add_item on same lineId
  if (
    deltaA.action === "add_item" &&
    deltaB.action === "add_item" &&
    deltaA.lineId === deltaB.lineId
  ) {
    // If every parameter is identical the two branches independently agreed — not a conflict.
    const identical =
      deltaA.sku === deltaB.sku &&
      deltaA.qty === deltaB.qty &&
      deltaA.parentLineId === deltaB.parentLineId &&
      deltaA.selectedModifierState === deltaB.selectedModifierState &&
      JSON.stringify([...deltaA.allocations].sort()) ===
        JSON.stringify([...deltaB.allocations].sort());
    if (identical) return null; // clean auto-dedup
    return {
      id,
      type: "add_add",
      lineId: deltaA.lineId,
      branchA,
      branchB,
      deltaA,
      deltaB,
      resolution: null,
    };
  }

  // remove_item vs modify_sku on same lineId
  if (
    (deltaA.action === "remove_item" &&
      deltaB.action === "modify_sku" &&
      deltaA.lineId === deltaB.lineId) ||
    (deltaA.action === "modify_sku" &&
      deltaB.action === "remove_item" &&
      deltaA.lineId === deltaB.lineId)
  ) {
    const lineId = (deltaA as { lineId: string }).lineId;
    return {
      id,
      type: "remove_modify_sku",
      lineId,
      branchA,
      branchB,
      deltaA,
      deltaB,
      resolution: null,
    };
  }

  // remove_item vs modify_item_allocations on same lineId
  if (
    (deltaA.action === "remove_item" &&
      deltaB.action === "modify_item_allocations" &&
      deltaA.lineId === deltaB.lineId) ||
    (deltaA.action === "modify_item_allocations" &&
      deltaB.action === "remove_item" &&
      deltaA.lineId === deltaB.lineId)
  ) {
    const lineId = (deltaA as { lineId: string }).lineId;
    return {
      id,
      type: "remove_modify_alloc",
      lineId,
      branchA,
      branchB,
      deltaA,
      deltaB,
      resolution: null,
    };
  }

  // modify_sku + modify_sku on same lineId → only conflict if different SKUs
  if (
    deltaA.action === "modify_sku" &&
    deltaB.action === "modify_sku" &&
    deltaA.lineId === deltaB.lineId &&
    deltaA.afterSku !== deltaB.afterSku
  ) {
    return {
      id,
      type: "modify_sku_sku",
      lineId: deltaA.lineId,
      branchA,
      branchB,
      deltaA,
      deltaB,
      resolution: null,
    };
  }

  // modify_item_allocations + modify_item_allocations on same lineId
  if (
    deltaA.action === "modify_item_allocations" &&
    deltaB.action === "modify_item_allocations" &&
    deltaA.lineId === deltaB.lineId
  ) {
    return {
      id,
      type: "modify_alloc_alloc",
      lineId: deltaA.lineId,
      branchA,
      branchB,
      deltaA,
      deltaB,
      resolution: null,
    };
  }

  // declare_allocation + declare_allocation on same allocationId
  if (
    deltaA.action === "declare_allocation" &&
    deltaB.action === "declare_allocation" &&
    deltaA.allocation.allocationId === deltaB.allocation.allocationId
  ) {
    return {
      id,
      type: "alloc_alloc",
      allocationId: deltaA.allocation.allocationId,
      branchA,
      branchB,
      deltaA,
      deltaB,
      resolution: null,
    };
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
  systemHash: string | null,
  allDeltas: Delta[],
  catalog: Record<string, import("./types").CatalogItemEntry>,
  confirmedHash: string | null,
): import("./types").ProjectedState {
  if (allDeltas.length === 0) {
    return projectState(log, lcaHash, systemHash, catalog, confirmedHash);
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
  return projectState(
    [...log, virtualCommit],
    "__merge_preview__",
    systemHash,
    catalog,
    confirmedHash,
  );
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
    return Object.values(this.catalog).filter(
      (i) => i.active && i.type === "item",
    );
  }

  getModifierItems(): CatalogItemEntry[] {
    return Object.values(this.catalog).filter(
      (i) => i.active && i.type === "modifier",
    );
  }

  getSystemHash(): string | null {
    return this.repo.branches["system"]?.headHash ?? null;
  }

  getConfirmedHash(): string | null {
    const mainHead =
      this.repo.branches[this.getMainActiveBranch()]?.headHash ?? null;
    if (!mainHead) return null;

    let current: string | null = mainHead;
    while (current) {
      const commit = this.repo.log.find((c) => c.commitHash === current);
      if (!commit) break;
      if (
        commit.mergeParentHashes.length > 0 ||
        commit.authorId === "system-init"
      ) {
        return current;
      }
      current = commit.parentHash;
    }
    return null;
  }

  // ─── Projection ───────────────────────────────────────────────────────────

  projectAt(hash: string | null): ProjectedState {
    return projectState(
      this.repo.log,
      hash,
      this.getSystemHash(),
      this.catalog,
      this.getConfirmedHash(),
    );
  }

  projectCurrent(): ProjectedState {
    const headHash =
      this.repo.branches[this.repo.activeBranch]?.headHash ?? null;
    return this.projectAt(headHash);
  }

  // ─── Core Operations ──────────────────────────────────────────────────────

  /**
   * Commit new deltas to the system branch.
   * Returns the new commit.
   */
  commitSystem(deltas: Delta[], authorId: string = "system"): VCSCommit {
    if (!this.repo.branches["system"]) {
      this.repo.branches["system"] = { headHash: null, type: "parallel" };
    }
    return this.commit(deltas, authorId, "system");
  }

  /**
   * Commit new deltas to the active branch.
   * Returns the new commit.
   */
  commit(
    deltas: Delta[],
    authorId: string = "pos-ui",
    branchOverride?: string,
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
    if (name === "system") {
      throw new Error("Cannot manually create the reserved 'system' branch.");
    }
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

  updateBranchConfig(
    name: string,
    config: { type?: "parallel" | "hypothetical"; label?: string },
  ): void {
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
    if (oldName === "system" || newName === "system") {
      throw new Error("Cannot rename the 'system' branch or use it as a target name.");
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
    if (branch === "system") {
      throw new Error("Cannot checkout the system branch directly.");
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
      timeOfPayment: {
        type: "immediate",
        calculatedAt: new Date().toISOString(),
      },
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
      params.authorId,
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
      params.authorId,
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
      params.authorId,
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
      timeOfPayment: {
        type: "immediate",
        calculatedAt: new Date().toISOString(),
      },
    };

    return this.commit(
      [
        { action: "declare_allocation", allocation: assignmentAlloc },
        { action: "declare_allocation", allocation: paymentAlloc },
        {
          action: "batch_by_filter",
          baseRevisionId: headHash,
          filters: [
            {
              property: "assignee",
              operator: "equals",
              value: params.sourceAssignee,
            },
          ],
          templateMutation: {
            mutationType: "batch_duplicate_and_reallocate",
            patchAllocations: [assignmentAlloc, paymentAlloc],
          },
        },
      ],
      params.authorId || "ai-agent",
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
      if (idx > bestIdx) {
        bestIdx = idx;
        bestHash = h;
      }
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
    lcaHash: string | null,
  ): Delta[] {
    if (!tipHash || tipHash === lcaHash) return [];
    const result: Delta[] = [];
    let current: string | null = tipHash;
    const visited = new Set<string>();
    while (current && current !== lcaHash && !visited.has(current)) {
      visited.add(current);
      const commit = this.repo.log.find((c) => c.commitHash === current);
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
              branchA,
              deltaA,
              branchB,
              deltaB,
              ++conflictCounter,
            );
            if (conflict) conflicts.push(conflict);
          }
        }
      }
    }

    // Build auto-merged state: S_LCA ⊕ ΔT ⊕ ΔS1 ⊕ …  (target wins conflicts)
    const allDeltasInOrder = [
      ...deltasByBranch[targetBranch],
      ...sourceBranches.flatMap((sb) => deltasByBranch[sb]),
    ];
    const autoMergedState = projectMergedDeltas(
      this.repo.log,
      lcaHash,
      this.getSystemHash(),
      allDeltasInOrder,
      this.catalog,
      this.getConfirmedHash(),
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
    resolutionDeltas: Delta[],
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
      .map((sb) => this.repo.branches[sb]?.headHash)
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

  // ─── History Management ───────────────────────────────────────────────────

  /**
   * Returns whether a commit is "confirmed" — i.e., is a merge commit, system-init,
   * or an ancestor of one. These commits cannot be squashed, reset, or otherwise
   * modified.
   */
  private isConfirmedCommit(commitHash: string): boolean {
    const confirmedHash = this.getConfirmedHash();
    if (!confirmedHash) return false;
    // A commit is confirmed if it IS the confirmedHash or an ancestor of it.
    if (commitHash === confirmedHash) return true;
    return this.isAncestorOf(commitHash, confirmedHash);
  }

  /**
   * Get the linear chain of commits on `branch` strictly AFTER `afterHash`,
   * up to (and including) the branch HEAD. Returned in chronological order.
   * Only follows first-parent links (no merge traversal).
   */
  private getPendingChainOnBranch(
    branch: string,
    afterHash: string | null,
  ): VCSCommit[] {
    const headHash = this.repo.branches[branch]?.headHash ?? null;
    if (!headHash) return [];

    const commitByHash = new Map(this.repo.log.map((c) => [c.commitHash, c]));
    const chain: VCSCommit[] = [];
    let current: string | null = headHash;

    while (current && current !== afterHash) {
      const commit = commitByHash.get(current);
      if (!commit) break;
      chain.unshift(commit); // prepend → chronological order
      current = commit.parentHash;
    }

    return chain;
  }

  /**
   * Squash all pending commits from `squashFromHash` (inclusive) up to the
   * current branch HEAD into a single replacement commit.
   *
   * Rules:
   * - `squashFromHash` must itself be a pending commit (not confirmed).
   * - No merge commits may exist in the squash range.
   * - The squashed commit sits on the same parentHash as `squashFromHash`.
   */
  squashPendingCommits(
    squashFromHash: string,
    type: "light" | "full",
    branch?: string,
  ): VCSCommit[] {
    const targetBranch = branch || this.repo.activeBranch;
    if (targetBranch === "system") {
      throw new Error("Cannot squash commits on the system branch.");
    }
    const headHash = this.repo.branches[targetBranch]?.headHash ?? null;

    if (!headHash) {
      throw new Error("Cannot squash: branch has no commits.");
    }
    if (headHash === squashFromHash) {
      throw new Error("Cannot squash: nothing to squash — already at HEAD.");
    }

    // Verify squashFromHash is not confirmed
    if (this.isConfirmedCommit(squashFromHash)) {
      throw new Error(
        "Cannot squash confirmed commits. Only pending commits can be squashed.",
      );
    }

    // Collect the range: commits from squashFromHash to HEAD (inclusive)
    const commitByHash = new Map(this.repo.log.map((c) => [c.commitHash, c]));
    const fromCommit = commitByHash.get(squashFromHash);
    if (!fromCommit) {
      throw new Error(`Commit ${squashFromHash} not found.`);
    }

    // Walk from HEAD back to squashFromHash
    const rangeCommits: VCSCommit[] = [];
    let current: string | null = headHash;
    while (current && current !== fromCommit.parentHash) {
      const commit = commitByHash.get(current);
      if (!commit) break;
      if (commit.mergeParentHashes.length > 0) {
        throw new Error(
          "Cannot squash: merge commit found in range. Squash only works on linear pending history.",
        );
      }
      if (this.isConfirmedCommit(commit.commitHash)) {
        throw new Error(
          "Cannot squash confirmed commits. Only pending commits can be squashed.",
        );
      }
      if (commit.authorId.startsWith("system-")) {
        throw new Error(
          "Cannot squash system-generated initialization commits.",
        );
      }
      rangeCommits.unshift(commit);
      current = commit.parentHash;
    }

    if (rangeCommits.length === 0) {
      throw new Error("Squash range is empty.");
    }

    // Collect all deltas from the range in chronological order
    let allDeltas: Delta[] = [];
    for (const c of rangeCommits) {
      allDeltas.push(...c.deltas);
    }

    const hasBatchDelta = allDeltas.some((d) => d.action === "batch_by_filter");
    const deadLineIds = new Set<string>();
    const createdWithinRange = new Set<string>();
    const finalQtyMap = new Map<string, number>();

    // We bypass optimization if there's a batch mutation, as it relies on
    // deterministic state evaluation at a specific historical point.
    if (!hasBatchDelta) {
      // Optimize deltas: remove items that were both created and fully removed within this range
      const createdLineIds = new Set<string>();
      const parentMap = new Map<string, string | null>();
      const finalQty = new Map<string, number>();

      for (const d of allDeltas) {
        if (d.action === "add_item") {
          createdLineIds.add(d.lineId);
          createdWithinRange.add(d.lineId);
          parentMap.set(d.lineId, d.parentLineId);
          finalQty.set(d.lineId, (finalQty.get(d.lineId) || 0) + d.qty);
          finalQtyMap.set(d.lineId, (finalQtyMap.get(d.lineId) || 0) + d.qty);
        } else if (d.action === "remove_item") {
          if (createdLineIds.has(d.lineId)) {
            finalQty.set(d.lineId, (finalQty.get(d.lineId) || 0) - d.qty);
          }
          finalQtyMap.set(d.lineId, (finalQtyMap.get(d.lineId) || 0) - d.qty);
        } else if (d.action === "modify_qty") {
          if (createdLineIds.has(d.lineId)) {
            finalQty.set(d.lineId, d.afterQty);
          }
          finalQtyMap.set(d.lineId, d.afterQty);
        }
      }

      let stable = false;
      for (const lineId of createdLineIds) {
        if ((finalQty.get(lineId) || 0) <= 0) {
          deadLineIds.add(lineId);
        }
      }

      // Cascade deletions to children
      while (!stable) {
        stable = true;
        for (const lineId of createdLineIds) {
          if (!deadLineIds.has(lineId)) {
            const parentId = parentMap.get(lineId);
            if (parentId && deadLineIds.has(parentId)) {
              deadLineIds.add(lineId);
              stable = false;
            }
          }
        }
      }
    }

    if (type === "full") {
      const optimizedDeltas: Delta[] = [];
      const lastModifyQtyDeltaMap = new Map<string, Delta>();
      for (const d of allDeltas) {
        if (d.action === "modify_qty") {
          lastModifyQtyDeltaMap.set(d.lineId, d);
        }
      }

      for (const d of allDeltas) {
        if ("lineId" in d && deadLineIds.has(d.lineId as string)) {
          continue;
        }
        if (d.action === "add_item") {
          const finalQty = finalQtyMap.get(d.lineId) ?? d.qty;
          optimizedDeltas.push({ ...d, qty: finalQty });
          continue;
        }
        if (d.action === "modify_qty") {
          if (createdWithinRange.has(d.lineId)) {
            continue;
          }
          if (lastModifyQtyDeltaMap.get(d.lineId) === d) {
            optimizedDeltas.push(d);
          }
          continue;
        }
        optimizedDeltas.push(d);
      }

      // Build replacement commit at the same parent as the first commit in range
      const replacementCommit: VCSCommit = {
        commitHash: generateCommitHash(),
        parentHash: fromCommit.parentHash,
        mergeParentHashes: [],
        branch: targetBranch,
        timestamp: new Date().toISOString(),
        authorId: "pos-squash",
        metadata: { squashedCount: rangeCommits.length, squashType: "full" },
        deltas: optimizedDeltas,
      };

      // Remove all commits in the squash range from the log
      const rangeHashes = new Set(rangeCommits.map((c) => c.commitHash));
      this.repo.log = this.repo.log.filter(
        (c) => !rangeHashes.has(c.commitHash),
      );

      // Append the replacement commit
      this.repo.log.push(replacementCommit);

      // Update branch pointer
      this.repo.branches[targetBranch] = {
        ...this.repo.branches[targetBranch],
        headHash: replacementCommit.commitHash,
      };

      return [replacementCommit];
    } else {
      // Find the last commit containing a modify_qty delta for each lineId
      const lastModifyQtyCommitMap = new Map<string, VCSCommit>();
      for (const c of rangeCommits) {
        for (const d of c.deltas) {
          if (d.action === "modify_qty") {
            lastModifyQtyCommitMap.set(d.lineId, c);
          }
        }
      }

      // Light squash: rewrite commits in place, removing dead items and pruning intermediate quantities
      const rewrittenRange: VCSCommit[] = [];
      let lastParentHash = fromCommit.parentHash;

      for (const c of rangeCommits) {
        const filteredDeltas: Delta[] = [];
        for (const d of c.deltas) {
          if ("lineId" in d && deadLineIds.has(d.lineId as string)) {
            continue;
          }

          if (d.action === "add_item") {
            const finalQty = finalQtyMap.get(d.lineId) ?? d.qty;
            filteredDeltas.push({
              ...d,
              qty: finalQty,
            });
            continue;
          }

          if (d.action === "modify_qty") {
            if (createdWithinRange.has(d.lineId)) {
              continue;
            }
            if (lastModifyQtyCommitMap.get(d.lineId) === c) {
              filteredDeltas.push(d);
            } else {
              continue;
            }
            continue;
          }

          filteredDeltas.push(d);
        }

        if (filteredDeltas.length > 0) {
          const newCommit: VCSCommit = {
            ...c,
            parentHash: lastParentHash,
            deltas: filteredDeltas,
          };
          rewrittenRange.push(newCommit);
          lastParentHash = newCommit.commitHash;
        }
      }

      // Remove all commits in the squash range from the log
      const rangeHashes = new Set(rangeCommits.map((c) => c.commitHash));
      this.repo.log = this.repo.log.filter(
        (c) => !rangeHashes.has(c.commitHash),
      );

      // Insert the rewritten commits into log
      this.repo.log.push(...rewrittenRange);

      // Update branch pointer
      const newHeadHash =
        rewrittenRange.length > 0
          ? rewrittenRange[rewrittenRange.length - 1].commitHash
          : fromCommit.parentHash;

      this.repo.branches[targetBranch] = {
        ...this.repo.branches[targetBranch],
        headHash: newHeadHash,
      };

      return rewrittenRange;
    }
  }

  /**
   * Reset the active branch HEAD to `targetHash`, discarding all commits after it.
   *
   * Rules:
   * - `targetHash` must be a pending (non-confirmed) commit.
   * - All commits being dropped must also be pending.
   */
  resetToCommit(targetHash: string, branch?: string): void {
    const targetBranch = branch || this.repo.activeBranch;
    if (targetBranch === "system") {
      throw new Error("Cannot reset commits on the system branch.");
    }
    const headHash = this.repo.branches[targetBranch]?.headHash ?? null;

    if (!headHash) {
      throw new Error("Cannot reset: branch has no commits.");
    }
    if (headHash === targetHash) {
      throw new Error("Already at this commit — nothing to reset.");
    }

    // Verify target is not confirmed
    if (this.isConfirmedCommit(targetHash)) {
      throw new Error(
        "Cannot reset to a confirmed commit. Only pending history can be removed.",
      );
    }

    // Collect commits to be dropped (between targetHash and HEAD on this branch)
    const commitByHash = new Map(this.repo.log.map((c) => [c.commitHash, c]));
    const toDrop = new Set<string>();
    let current: string | null = headHash;

    while (current && current !== targetHash) {
      const commit = commitByHash.get(current);
      if (!commit) break;
      if (this.isConfirmedCommit(commit.commitHash)) {
        throw new Error(
          "Cannot reset past a confirmed commit. Only pending commits can be removed.",
        );
      }
      if (commit.authorId.startsWith("system-")) {
        throw new Error(
          "Cannot remove system-generated initialization commits.",
        );
      }
      toDrop.add(current);
      current = commit.parentHash;
    }

    if (toDrop.size === 0) {
      throw new Error(
        `Commit ${targetHash} is not in the pending history of branch "${targetBranch}".`,
      );
    }

    // Remove the dropped commits from the log
    this.repo.log = this.repo.log.filter((c) => !toDrop.has(c.commitHash));

    // Update branch pointer
    this.repo.branches[targetBranch] = {
      ...this.repo.branches[targetBranch],
      headHash: targetHash,
    };
  }
}
// ─── Serialization ───────────────────────────────────────────────�
