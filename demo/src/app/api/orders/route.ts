import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const orders = await db.completedOrder.findMany({
      orderBy: { settledAt: "desc" },
      include: { items: true },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to fetch completed orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch completed orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectedState, paymentMethod } = body;

    if (!projectedState || !projectedState.financials) {
      return NextResponse.json(
        { error: "projectedState is required" },
        { status: 400 },
      );
    }

    const financials = projectedState.financials;
    const customerName =
      projectedState.orderContext?.customerFields?.name || "Guest";
    const customerPhone =
      projectedState.orderContext?.customerFields?.phone || null;
    const serverName = projectedState.orderContext?.serverName || "Tom";
    const orderType = projectedState.orderContext?.orderType || "walk_in";

    // Generate a simple unique order number: ORD-YYYYMMDD-HHMMSS-RANDOM
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `ORD-${dateStr}-${timeStr}-${randomSuffix}`;

    // Filter root items
    const rootItems = Object.values(projectedState.items || {}).filter(
      (item: any) => !item.parentLineId && item.status !== "canceled",
    );

    const repoId = body.repoId || projectedState.repoId || null;
    if (repoId) {
      await db.transactionRepo.updateMany({
        where: { id: repoId },
        data: { status: "settled", settledAt: new Date() },
      });
    }

    const completedOrder = await db.completedOrder.create({
      data: {
        orderNumber,
        repoId: repoId,
        customerName,
        customerPhone,
        serverName,
        orderType,
        subtotal: financials.subtotal,
        taxTotal: financials.chargeTotal,
        grandTotal: financials.grandTotal,
        paymentMethod: paymentMethod || "cash",
        paymentStatus: "paid",
        items: {
          create: rootItems.map((item: any) => {
            // Find children modifiers
            const children = Object.values(projectedState.items || {}).filter(
              (c: any) => c.parentLineId === item.id && c.status !== "canceled",
            );

            // Compute total price including modifiers
            const modifierTotal = children.reduce(
              (sum: number, c: any) => sum + c.qty * c.basePrice,
              0,
            );
            const totalPrice = item.qty * item.basePrice + modifierTotal;

            return {
              sku: item.sku,
              name: item.name,
              qty: item.qty,
              basePrice: item.basePrice,
              totalPrice,
              modifiers: JSON.stringify(children),
              guestId: item.guestId || null,
            };
          }),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ order: completedOrder });
  } catch (error) {
    console.error("Failed to archive completed order:", error);
    return NextResponse.json(
      { error: "Failed to archive completed order" },
      { status: 500 },
    );
  }
}
