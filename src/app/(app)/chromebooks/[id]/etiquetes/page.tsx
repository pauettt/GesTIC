import type { Route } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { QrLabelSheet } from "@/components/chromebooks/qr-label-sheet";

export const metadata = { title: "Etiquetes QR" };

export default async function CartLabelsPage({ params }: PageProps<"/chromebooks/[id]/etiquetes">) {
  await requireAdmin();
  const { id } = await params;

  const cart = await db.cart.findUnique({
    where: { id },
    include: {
      // Un equip donat de baixa ja no tornarà a classe: no cal etiqueta.
      chromebooks: {
        where: { status: { not: "BAIXA" } },
        orderBy: { assetTag: "asc" },
        select: { id: true, assetTag: true },
      },
    },
  });
  if (!cart) notFound();

  return (
    <QrLabelSheet
      title={`Etiquetes QR — ${cart.name}`}
      backHref={`/chromebooks/${cart.id}` as Route}
      backLabel="Torna al carro"
      caption={cart.name}
      chromebooks={cart.chromebooks}
    />
  );
}
