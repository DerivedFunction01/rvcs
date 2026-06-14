import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let servers = await (
      db as typeof db & {
        server: {
          findMany: (
            args: unknown,
          ) => Promise<Array<{ id: string; name: string }>>;
          upsert: (args: unknown) => Promise<{ id: string; name: string }>;
        };
      }
    ).server.findMany({
      orderBy: { name: "asc" },
    });

    if (servers.length === 0) {
      const defaults = ["Tom", "Mia", "Alex", "Jordan"];
      servers = await Promise.all(
        defaults.map((name) =>
          (
            db as typeof db & {
              server: {
                findMany: (
                  args: unknown,
                ) => Promise<Array<{ id: string; name: string }>>;
                upsert: (
                  args: unknown,
                ) => Promise<{ id: string; name: string }>;
              };
            }
          ).server.upsert({
            where: { name },
            update: {},
            create: { name },
          }),
        ),
      );
    }

    return NextResponse.json({
      servers: servers.map((server) => ({
        id: server.id,
        name: server.name,
      })),
    });
  } catch (error) {
    console.error("Server list fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch servers" },
      { status: 500 },
    );
  }
}
