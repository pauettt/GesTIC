import type { Route } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { orderChromebooks } from "@/lib/chromebook-order";
import { requireAdmin } from "@/lib/permissions";
import { CartQrLabel } from "@/components/chromebooks/cart-qr-label";
import { QrLabelSheet } from "@/components/chromebooks/qr-label-sheet";

export const metadata = { title: "Etiquetes QR" };

/**
 * Per defecte, un sol QR per al carro sencer: és el que cal enganxar. Les
 * etiquetes per dispositiu (`?equips=1`) continuen aquí per a qui les vulgui, i
 * les que ja hi ha enganxades segueixen funcionant.
 */
export default async function CartLabelsPage({
  params,
  searchParams,
}: PageProps<"/chromebooks/[id]/etiquetes">) {
  await requireAdmin();
  const { id } = await params;
  const { equips } = await searchParams;
  const perDevice = equips === "1";

  const cart = await db.cart.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      chromebookOrder: true,
      space: { select: { name: true } },
      // Un equip donat de baixa ja no tornarà a classe: no cal etiqueta.
      chromebooks: perDevice
        ? { where: { status: { not: "BAIXA" } }, orderBy: { assetTag: "asc" }, select: { id: true, assetTag: true } }
        : false,
    },
  });
  if (!cart) notFound();

  if (!perDevice) {
    return <CartQrLabel cartId={cart.id} cartName={cart.name} spaceName={cart.space?.name ?? null} />;
  }

  return (
    <QrLabelSheet
      title={`Etiquetes QR per dispositiu — ${cart.name}`}
      backHref={`/chromebooks/${cart.id}/etiquetes` as Route}
      backLabel="Torna al QR del carro"
      caption={cart.name}
      chromebooks={orderChromebooks(cart.chromebooks ?? [], cart.chromebookOrder)}
    />
  );
}
