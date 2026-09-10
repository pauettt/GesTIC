import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { CartIncidentForm } from "@/components/incidents/cart-incident-form";
import { RoomIncidentForm } from "@/components/incidents/room-incident-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Nova incidència" };

export default async function NovaIncidenciaPage() {
  await requireUser();

  const [spaces, inventoryItems, carts] = await Promise.all([
    db.space.findMany({ orderBy: { name: "asc" } }),
    db.inventoryItem.findMany({
      where: { status: { not: "BAIXA" } },
      orderBy: { brand: "asc" },
      select: { id: true, brand: true, model: true, spaceId: true },
    }),
    db.cart.findMany({
      orderBy: { name: "asc" },
      include: { chromebooks: { orderBy: { assetTag: "asc" } } },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Incidència en un aula</CardTitle>
          <CardDescription>
            Per a equipament fix de l&apos;aula: PC, projector, pissarra digital, impressora…
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomIncidentForm spaces={spaces} inventoryItems={inventoryItems} carts={carts} />
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Incidència en un carro de Chromebooks</CardTitle>
          <CardDescription>
            Per als carros o Chromebooks — no cal saber en quina aula és el carro ara mateix.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CartIncidentForm carts={carts} />
        </CardContent>
      </Card>
    </div>
  );
}
