import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inventoryItemStatusLabels } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 403 });
  }

  const items = await db.inventoryItem.findMany({
    include: { space: true, category: true },
    orderBy: { brand: "asc" },
  });

  const rows = [
    [
      "Categoria",
      "Marca",
      "Model",
      "Núm. sèrie",
      "Ubicació",
      "Prestable",
      "Estat",
      "Data de compra",
      "Garantia fins",
    ],
    ...items.map((item) => [
      item.category.name,
      item.brand,
      item.model,
      item.serialNumber ?? "",
      item.space?.name ?? "",
      item.isLoanable ? "Sí" : "No",
      inventoryItemStatusLabels[item.status],
      item.purchaseDate?.toISOString().slice(0, 10) ?? "",
      item.warrantyUntil?.toISOString().slice(0, 10) ?? "",
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventari-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
