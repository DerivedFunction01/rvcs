import { createId } from "@paralleldrive/cuid2";

/** Generate a unique commit hash */
export function generateCommitHash(): string {
  return `commit-${createId()}`;
}

/** Generate a unique line ID */
export function generateLineId(): string {
  return `line-${createId()}`;
}

/** Generate a unique allocation ID */
export function generateAllocationId(prefix?: string): string {
  const prefixStr = prefix ? `${prefix}-` : "";
  return `alloc-${prefixStr}${createId()}`;
}

/**
 * Generate a deterministic clone ID for batch_duplicate_and_reallocate.
 * Uses the source line ID + base revision for reproducibility.
 */
export function deriveCloneId(sourceLineId: string, baseRevisionId: string): string {
  // Simple deterministic derivation — truncate for readability
  const src = sourceLineId.replace("line-", "").substring(0, 8);
  const rev = baseRevisionId.substring(0, 8);
  return `line-clone-${src}-${rev}`;
}
