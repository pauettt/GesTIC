import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  googleServiceLabels,
  incidentCategoryLabels,
  incidentPriorityLabels,
  incidentStatusLabels,
  incidentTargetTypeLabels,
} from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 403 });
  }

  const incidents = await db.incident.findMany({
    include: { reporter: true, inventoryItem: true, chromebook: true, cart: true, space: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    ["Títol", "Tipus", "Equip", "Problema", "Prioritat", "Estat", "Reportada per", "Data", "Resolta el"],
    ...incidents.map((incident) => [
      incident.title,
      incidentTargetTypeLabels[incident.targetType],
      incident.inventoryItem
        ? `${incident.inventoryItem.brand} ${incident.inventoryItem.model}`
        : incident.chromebook
          ? `Chromebook ${incident.chromebook.assetTag}`
          : incident.cart
            ? `Carro ${incident.cart.name}`
            : incident.googleService
              ? googleServiceLabels[incident.googleService]
              : (incident.space?.name ?? ""),
      incident.category ? incidentCategoryLabels[incident.category] : "",
      incidentPriorityLabels[incident.priority],
      incidentStatusLabels[incident.status],
      incident.reporter.name ?? incident.reporter.email,
      incident.createdAt.toISOString().slice(0, 10),
      incident.resolvedAt?.toISOString().slice(0, 10) ?? "",
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="incidencies-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
