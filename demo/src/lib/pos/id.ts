import { createId } from "@paralleldrive/cuid2";

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
