import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { repoId } = await request.json();

    if (!repoId) {
      return NextResponse.json(
        { error: "repoId is required" },
        { status: 400 }
      );
    }

    const repo = await db.transactionRepo.update({
      where: { id: repoId },
      data: { status: "void" },
    });

    return NextResponse.json({
      status: "success",
      repoId: repo.id,
      repoStatus: repo.status,
    });
  } catch (error) {
    console.error("Void repo error:", error);
    return NextResponse.json({ error: "Failed to void repository" }, { status: 500 });
  }
}
