import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/icon-config ─────────────────────────────────────────────────────
// Returns the icon configuration for dietary flags and allergens.
// These icons are displayed next to menu items to indicate dietary information.

export async function GET() {
    try {
        const configs = await db.iconConfig.findMany({
            orderBy: [{ type: "asc" }, { id: "asc" }],
        });

        return NextResponse.json({ configs });
    } catch (error) {
        console.error("Icon-config fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch icon configurations" },
            { status: 500 },
        );
    }
}