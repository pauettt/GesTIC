import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/permissions";
import { quickReportChromebookIncident } from "@/actions/incidents";
import { chromebookStatusLabels, chromebookStatusVariants, incidentCategoryIcons, incidentCategoryLabels } from "@/lib/labels";
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
}: PageProps<"/q/chromebook/[id]">) {
  await requireUser();
  const { id } = await params;

  const chromebook = await db.chromebook.findUnique({
    where: { id },
    include: { cart: true },
  });

  if (!chromebook) notFound();

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Chromebook {chromebook.assetTag}</CardTitle>
          <CardDescription>{chromebook.cart?.name ?? "Sense carro assignat"}</CardDescription>
          <div className="mt-1 flex justify-center">
            <Badge variant={chromebookStatusVariants[chromebook.status]}>
              {chromebookStatusLabels[chromebook.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
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
        </CardContent>
      </Card>
    </main>
  );
}
