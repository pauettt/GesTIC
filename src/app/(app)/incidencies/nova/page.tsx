import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { CartIncidentForm } from "@/components/incidents/cart-incident-form";
import { GoogleIncidentForm } from "@/components/incidents/google-incident-form";
import { RoomIncidentForm } from "@/components/incidents/room-incident-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Nova incidència" };

export default async function NovaIncidenciaPage() {
  await requireUser();

  const [spaces, inventoryItems, carts, studentPool] = await Promise.all([
    db.space.findMany({ orderBy: { name: "asc" } }),
    db.inventoryItem.findMany({
      where: { status: { not: "BAIXA" } },
      orderBy: { brand: "asc" },
      select: { id: true, brand: true, model: true, spaceId: true },
    }),
    db.cart.findMany({
      orderBy: { name: "asc" },
      // Un equip donat de baixa ja no es fa servir: no s'hi han d'obrir incidències.
      include: {
        chromebooks: { where: { status: { not: "BAIXA" } }, orderBy: { assetTag: "asc" } },
      },
    }),
    // Els equips de préstec a l'alumnat no són de cap carro. Només l'identificador:
    // qui reporta l'avaria no ha de saber de quin alumne és.
    db.chromebook.findMany({
      where: { isStudentLoanable: true, status: { not: "BAIXA" } },
      orderBy: { assetTag: "asc" },
      select: { id: true, assetTag: true },
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
          <CardTitle>Incidència en un Chromebook</CardTitle>
          <CardDescription>
            Per als carros i els seus Chromebooks, i per als equips de préstec a l&apos;alumnat. No
            cal saber en quina aula és el carro ara mateix.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CartIncidentForm carts={carts} studentPool={studentPool} />
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Incidència de l&apos;entorn Google</CardTitle>
          <CardDescription>
            Per a Classroom, correu, Drive, Meet, YouTube, contrasenyes… No cal indicar cap aula ni
            cap equip.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleIncidentForm />
        </CardContent>
      </Card>
    </div>
  );
}
