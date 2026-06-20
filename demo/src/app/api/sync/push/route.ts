import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── POST /api/sync/push ─────────────────────────────────────────────────────
// Accepts a commit log push from a local VCS Engine.
// The "origin" server verifies and persists the ledger.

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { contextId, contextType, serverName, orderContext, commits } =
      body as {
        contextId: string;
        contextType: string;
        serverName?: string;
        orderContext?: Record<string, any>;
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
      return NextResponse.json(
        { error: "contextId and commits array required" },
        { status: 400 },
      );
    }

    const normalizedServerName = serverName?.trim() || contextId;

    const server = await (
      db as typeof db & {
        server: {
          upsert: (args: unknown) => Promise<{ id: string; name: string }>;
        };
      }
    ).server.upsert({
      where: { name: normalizedServerName },
      update: {},
      create: {
        name: normalizedServerName,
      },
    });

    const repo = await db.transactionRepo.upsert({
      where: { id: contextId },
      update: {
        server: { connect: { id: server.id } },
        serverName: server.name,
        orderContext: orderContext ? JSON.stringify(orderContext) : undefined,
      },
      create: {
        id: contextId,
        server: { connect: { id: server.id } },
        serverName: server.name,
        contextType: contextType || "cart",
        contextId,
        orderContext: orderContext ? JSON.stringify(orderContext) : undefined,
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
