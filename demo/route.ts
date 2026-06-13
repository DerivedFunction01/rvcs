import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const configs = await (prisma as any).iconConfig.findMany();
    return NextResponse.json({ configs });
  } catch (error) {
    console.error("Icon config fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch icon configs" }, { status: 500 });
  }
}