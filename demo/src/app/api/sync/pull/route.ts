import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/sync/pull?contextId=X&since_hash=Y ─────────────────────────
// Serves the commit history for a repo, optionally since a given hash.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get("contextId");
    const sinceHash = searchParams.get("since_hash");

    if (!contextId) {
      return NextResponse.json({ error: "contextId required" }, { status: 400 });
    }

    // Find the repo
    const repo = await db.transactionRepo.findUnique({
      where: { id: contextId },
    });

    if (!repo) {
      return NextResponse.json({ commits: [], hasMore: false });
    }

    // Get commits, optionally filtering by since_hash
    const commits = await db.transactionCommit.findMany({
      where: {
        repoId: repo.id,
        ...(sinceHash
          ? {
              createdAt: {
                gt: new Date(
                  (
                    await db.transactionCommit.findUnique({
                      where: { commitHash: sinceHash },
                      select: { createdAt: true },
                    })
                  )?.createdAt ?? new Date(0)
                ),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    });

    const serialized = commits.map((c) => ({
      commitHash: c.commitHash,
      parentHash: c.parentHash,
      mergeParentHashes: JSON.parse(c.mergeParentHashes),
      branch: c.branch,
      timestamp: c.timestamp.toISOString(),
      authorId: c.authorId,
      deltas: JSON.parse(c.deltas),
      metadata: JSON.parse(c.metadata),
    }));

    return NextResponse.json({
      commits: serialized,
      contextId: repo.contextId,
      status: repo.status,
    });
  } catch (error) {
    console.error("Sync pull error:", error);
    return NextResponse.json({ error: "Failed to pull" }, { status: 500 });
  }
}