import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    const customers = await db.customerProfile.findMany({
      where: q
        ? {
            OR: [
              {
                names: {
                  some: {
                    OR: [
                      { displayName: { contains: q } },
                      { firstName: { contains: q } },
                      { lastName: { contains: q } },
                    ],
                  },
                },
              },
              {
                contacts: {
                  some: {
                    value: { contains: q },
                  },
                },
              },
            ],
          }
        : undefined,
      include: {
        names: true,
        contacts: true,
        deliveryLocations: true,
        attributes: true,
      },
      take: 20,
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}
