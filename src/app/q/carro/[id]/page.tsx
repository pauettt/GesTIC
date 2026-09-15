import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { deviceSummary } from "@/lib/devices";
import { requireUser } from "@/lib/permissions";
import { CartQrPicker } from "@/components/chromebooks/cart-qr-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Reporta una avaria" };

/**
 * On porta el QR enganxat a cada carro, pensada per al mòbil. El professorat hi
 * veu l'estat de tots els dispositius i reporta l'avaria del que no funciona,
 * sense que calgui enganxar un QR a cada equip: n'hi ha prou que porti visible
 * el seu número.
 */
export default async function CartQrPage({ params }: PageProps<"/q/carro/[id]">) {
  await requireUser();
  const { id } = await params;

  const cart = await db.cart.findUnique({
    where: { id },
    select: {
      name: true,
      space: { select: { name: true } },
      // Un equip donat de baixa ja no és al carro per a qui el vol fer servir.
      chromebooks: {
        where: { status: { not: "BAIXA" } },
        orderBy: { assetTag: "asc" },
        select: { id: true, assetTag: true, deviceType: true, status: true, unavailableReason: true },
      },
    },
  });
  if (!cart) notFound();

  const available = cart.chromebooks.filter((device) => device.status === "DISPONIBLE").length;

  return (
    <main className="flex min-h-screen flex-1 justify-center bg-muted/40 p-4 sm:items-center">
      <Card className="h-fit w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{cart.name}</CardTitle>
          <CardDescription>
            {[cart.space?.name, deviceSummary(cart.chromebooks)].filter(Boolean).join(" · ")}
          </CardDescription>
          <p className="text-sm">
            <span className="font-medium">{available}</span> de {cart.chromebooks.length} disponibles
          </p>
        </CardHeader>
        <CardContent>
          <CartQrPicker devices={cart.chromebooks} />
        </CardContent>
      </Card>
    </main>
  );
}
