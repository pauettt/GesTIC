import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { quickReportChromebookIncident } from "@/actions/incidents";
import { chromebookStatusLabels, chromebookStatusVariants, incidentCategoryIcons, incidentCategoryLabels } from "@/lib/labels";
import { CleanUrlParam } from "@/components/shared/clean-url-param";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { IncidentCategory } from "@prisma/client";

const CATEGORIES: IncidentCategory[] = [
  "PANTALLA",
  "TECLAT",
  "TOUCHPAD",
  "WIFI_INTERNET",
  "NO_S_ENCEN",
  "ALTRE",
];

export default async function QuickChromebookReportPage({
  params,
  searchParams,
}: PageProps<"/q/chromebook/[id]">) {
  await requireUser();
  const { id } = await params;
  const { avis } = await searchParams;

  const chromebook = await db.chromebook.findUnique({
    where: { id },
    include: { cart: true },
  });

  if (!chromebook) notFound();

  const retired = chromebook.status === "BAIXA";

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Chromebook {chromebook.assetTag}</CardTitle>
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
            <Badge variant={chromebookStatusVariants[chromebook.status]}>
              {chromebookStatusLabels[chromebook.status]}
            </Badge>
          </div>
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
              Aquest Chromebook està donat de baixa i ja no s&apos;hauria de fer servir. Si
              l&apos;has trobat en un carro o a l&apos;aula, avisa la coordinació TIC.
            </p>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Quin problema té aquest Chromebook?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => {
                  const Icon = incidentCategoryIcons[category];
                  return (
                    <form
                      key={category}
                      action={quickReportChromebookIncident.bind(null, {
                        chromebookId: chromebook.id,
                        category,
                      })}
                    >
                      <button
                        type="submit"
                        className="flex w-full flex-col items-center gap-2 rounded-lg border bg-background p-4 text-center text-sm font-medium transition-colors hover:border-primary/50 hover:bg-muted"
                      >
                        <Icon className="size-6 text-primary" />
                        {incidentCategoryLabels[category]}
                      </button>
                    </form>
                  );
                })}
              </div>
              <Link
                href="/incidencies/nova"
                className="mt-2 text-center text-xs text-muted-foreground hover:underline"
              >
                El problema no és cap d&apos;aquests? Reporta&apos;l amb més detall
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
