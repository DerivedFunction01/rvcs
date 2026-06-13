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

/** Generate a unique branch name for a draft POS branch. */
export function generateBranchName(prefix: string = "pos-draft"): string {
  return `${prefix}-${createId()}`;
}

/**
 * Generate a deterministic POS draft branch name from a server label.
 * Example: "Tom" -> "pos-draft-server-tom"
 */
export function generateDraftBranchName(serverName: string): string {
  const slug = serverName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `pos-draft-server-${slug || "unknown"}`;
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
