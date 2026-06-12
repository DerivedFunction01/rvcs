import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── POST /api/sync/push ─────────────────────────────────────────────────────
// Accepts a commit log push from a local VCS Engine.
// The "origin" server verifies and persists the ledger.

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { contextId, contextType, commits } = body as {
      contextId: string;
      contextType: string;
      commits: Array<{
        commitHash: string;
        parentHash: string | null;
        mergeParentHashes: string[];
        branch: string;
        timestamp: string;
        authorId: string;
        deltas: unknown[];
        metadata?: Record<string, unknown>;
      }>;
    };

    if (!contextId || !Array.isArray(commits)) {
      return NextResponse.json({ error: "contextId and commits array required" }, { status: 400 });
    }

    // Find or create repo
    const repo = await db.transactionRepo.upsert({
      where: { id: contextId },
      update: {},
      create: {
        id: contextId,
        contextType: contextType || "cart",
        contextId,
      },
    });

    let accepted = 0;
    let duplicates = 0;

    for (const commit of commits) {
      // Check for duplicates (idempotent push)
      const existing = await db.transactionCommit.findUnique({
        where: { commitHash: commit.commitHash },
      });

      if (existing) {
        duplicates++;
        continue;
      }

      await db.transactionCommit.create({
        data: {
          repoId: repo.id,
          commitHash: commit.commitHash,
          parentHash: commit.parentHash,
          mergeParentHashes: JSON.stringify(commit.mergeParentHashes || []),
          branch: commit.branch,
          timestamp: new Date(commit.timestamp),
          authorId: commit.authorId,
          deltas: JSON.stringify(commit.deltas),
          metadata: JSON.stringify(commit.metadata || {}),
        },
      });
      accepted++;
    }

    return NextResponse.json({
      status: "accepted",
      accepted,
      duplicates,
      repoId: repo.id,
    });
  } catch (error) {
    console.error("Sync push error:", error);
    return NextResponse.json({ error: "Failed to push" }, { status: 500 });
  }
}