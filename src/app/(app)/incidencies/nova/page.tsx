import type { Route } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, CloudIcon, LaptopIcon, MapPinIcon, type LucideIcon } from "lucide-react";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { CartIncidentForm } from "@/components/incidents/cart-incident-form";
import { GoogleIncidentForm } from "@/components/incidents/google-incident-form";
import { RoomIncidentForm } from "@/components/incidents/room-incident-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Nova incidència" };

type Kind = "aula" | "carro" | "google";

/** Els tres tipus, amb el que cal saber per triar: on és el problema. */
const KINDS: { value: Kind; icon: LucideIcon; title: string; description: string }[] = [
  {
    value: "aula",
    icon: MapPinIcon,
    title: "Incidència en un aula",
    description: "Per a equipament fix de l'aula: PC, projector, pissarra digital, impressora…",
  },
  {
    value: "carro",
    icon: LaptopIcon,
    title: "Incidència en un carro o un dispositiu",
    description:
      "Per als carros i els seus Chromebooks, i per als equips de préstec a l'alumnat. No cal saber en quina aula és el carro ara mateix.",
  },
  {
    value: "google",
    icon: CloudIcon,
    title: "Incidència de l'entorn Google",
    description:
      "Per a Classroom, correu, Drive, Meet, YouTube, contrasenyes… No cal indicar cap aula ni cap equip.",
  },
];

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/**
 * Primer es tria on és el problema, i després només surt aquell formulari: els
 * tres seguits feien pensar que calia omplir-los tots. Des del QR d'un carro o
 * d'un equip s'hi arriba amb el tipus i l'equip ja triats.
 */
export default async function NovaIncidenciaPage({ searchParams }: PageProps<"/incidencies/nova">) {
  await requireUser();
  const params = await searchParams;
  const kind = KINDS.find((candidate) => candidate.value === single(params.tipus));

  if (!kind) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Nova incidència</h1>
          <p className="text-muted-foreground">On és el problema?</p>
        </div>
        {KINDS.map((candidate) => {
          const Icon = candidate.icon;
          return (
            <Link key={candidate.value} href={`/incidencies/nova?tipus=${candidate.value}` as Route}>
              <Card className="transition-colors hover:border-primary/50 hover:bg-muted/40">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Icon className="size-6 shrink-0 text-primary" />
                  <div className="flex-1">
                    <CardTitle>{candidate.title}</CardTitle>
                    <CardDescription>{candidate.description}</CardDescription>
                  </div>
                  <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href="/incidencies/nova"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        Canvia el tipus d&apos;incidència
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{kind.title}</CardTitle>
          <CardDescription>{kind.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {kind.value === "google" ? (
            <GoogleIncidentForm />
          ) : kind.value === "aula" ? (
            <RoomForm />
          ) : (
            <CartForm cartId={single(params.carro)} chromebookId={single(params.equip)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function RoomForm() {
  const [spaces, inventoryItems, carts] = await Promise.all([
    db.space.findMany({ orderBy: { name: "asc" } }),
    db.inventoryItem.findMany({
      where: { status: { not: "BAIXA" } },
      orderBy: { brand: "asc" },
      select: { id: true, brand: true, model: true, spaceId: true },
    }),
    loadCarts(),
  ]);
  return <RoomIncidentForm spaces={spaces} inventoryItems={inventoryItems} carts={carts} />;
}

async function CartForm({ cartId, chromebookId }: { cartId?: string; chromebookId?: string }) {
  const [carts, studentPool] = await Promise.all([
    loadCarts(),
    // Els equips de préstec a l'alumnat no són de cap carro. Només l'identificador:
    // qui reporta l'avaria no ha de saber de quin alumne és.
    db.chromebook.findMany({
      where: { isStudentLoanable: true, status: { not: "BAIXA" } },
      orderBy: { assetTag: "asc" },
      select: { id: true, assetTag: true, deviceType: true },
    }),
  ]);
  return <CartIncidentForm carts={carts} studentPool={studentPool} initial={{ cartId, chromebookId }} />;
}

function loadCarts() {
  return db.cart.findMany({
    orderBy: { name: "asc" },
    // Un equip donat de baixa ja no es fa servir: no s'hi han d'obrir incidències.
    include: {
      chromebooks: { where: { status: { not: "BAIXA" } }, orderBy: { assetTag: "asc" } },
    },
  });
}
