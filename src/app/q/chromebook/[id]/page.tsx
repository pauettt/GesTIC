import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { canAccessCart } from "@/lib/cart-access";
import { requireUser } from "@/lib/permissions";
import { currentHolder, openDeviceReservations, withHolder } from "@/lib/device-reservations";
import { deviceStatusNote, deviceTypeLabels } from "@/lib/devices";
import { QUICK_REPORT_CATEGORIES, chromebookStatusLabels, chromebookStatusVariants } from "@/lib/labels";
import { QuickReportButtons } from "@/components/chromebooks/quick-report-buttons";
import { CleanUrlParam } from "@/components/shared/clean-url-param";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function QuickChromebookReportPage({
  params,
  searchParams,
}: PageProps<"/q/chromebook/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { avis } = await searchParams;

  const chromebook = await db.chromebook.findUnique({
    where: { id },
    include: { cart: true, reservations: openDeviceReservations },
  });

  if (!chromebook || (chromebook.cart && !canAccessCart(user.role, chromebook.cart))) notFound();

  const retired = chromebook.status === "BAIXA";
  // Si ara el té algú per una reserva, no disponible i amb el seu nom, com al carro.
  const shown = withHolder(chromebook, currentHolder(chromebook.reservations));

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{deviceTypeLabels[chromebook.deviceType]} {chromebook.assetTag}
          </CardTitle>
          <CardDescription>
            {/* Els equips del pool no són de cap carro: dir-ne "sense carro" faria
                pensar que s'ha perdut. I l'estat que hi ha a sota diu "Assignat a
                alumnat" sense cap nom, que és el que ha de veure qui escanegi
                l'etiqueta sense ser ni el tutor ni la coordinació. */}
            {chromebook.isStudentLoanable
              ? "Equip de préstec a l'alumnat"
              : (chromebook.cart?.name ?? "Sense carro assignat")}
          </CardDescription>
          <div className="mt-1 flex justify-center">
            <Badge variant={chromebookStatusVariants[shown.status]}>{chromebookStatusLabels[shown.status]}</Badge>
          </div>
          {shown.status === "NO_DISPONIBLE" && (
            <p className="text-sm text-muted-foreground">{deviceStatusNote(shown)}</p>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {avis === "limit" && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-center text-sm">
              Has reportat moltes incidències en poca estona. Espera una mica o parla amb la
              coordinació TIC.
            </p>
          )}
          {avis === "ja-reportada" && (
            <p
              role="status"
              className="rounded-md border border-green-300 bg-green-50 p-3 text-center text-sm text-green-900"
            >
              Aquesta avaria ja està reportada i la coordinació TIC n&apos;està al cas. Gràcies per avisar!
            </p>
          )}
          <CleanUrlParam name="avis" />

          {retired ? (
            <p className="text-center text-sm text-muted-foreground">
              Aquest dispositiu està donat de baixa i ja no s&apos;hauria de fer servir. Si
              l&apos;has trobat en un carro o a l&apos;aula, avisa la coordinació TIC.
            </p>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Quin problema té aquest dispositiu?
              </p>
              <QuickReportButtons chromebookId={chromebook.id} categories={QUICK_REPORT_CATEGORIES} />
              <Link
                href={`/incidencies/nova?tipus=carro&equip=${chromebook.id}` as Route}
                className="mt-2 text-center text-xs text-muted-foreground hover:underline"
              >
                El problema no és cap d&apos;aquests? Reporta&apos;l amb més detall
              </Link>
              {chromebook.cart && (
                <Link
                  href={`/q/carro/${chromebook.cart.id}` as Route}
                  className="text-center text-xs text-muted-foreground hover:underline"
                >
                  Veure tots els dispositius de {chromebook.cart.name}
                </Link>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
