import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketIcon } from "lucide-react";

import { db } from "@/lib/db";
import { formatDate, formatDateTime, schoolYearOf } from "@/lib/date";
import {
  chromebookStatusLabels,
  chromebookStatusVariants,
  studentDeviceRequestStatusLabels,
  studentDeviceRequestStatusVariants,
} from "@/lib/labels";
import { requireAdmin } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Historial del Chromebook" };

type Person = { name: string | null; email: string };

const who = (person: Person) => person.name ?? person.email;

/** Quan va passar un pas del préstec i qui el va registrar. */
function Moment({ at, by }: { at: Date | null; by: Person | null }) {
  if (!at) return <>—</>;
  return (
    <>
      <span className="whitespace-nowrap">{formatDateTime(at)}</span>
      {by && <span className="block text-xs">per {who(by)}</span>}
    </>
  );
}

/**
 * La fitxa d'un equip del pool de préstec: quins alumnes l'han tingut, curs
 * rere curs, i quan se'ls va entregar i el van tornar. Porta noms de menors i
 * per això és només de la coordinació. L'etiqueta QR de l'equip porta a una
 * altra pàgina, que no en diu cap.
 */
export default async function StudentChromebookHistoryPage({
  params,
}: PageProps<"/alumnat/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const person = { select: { name: true, email: true } } as const;
  const chromebook = await db.chromebook.findUnique({
    where: { id },
    select: {
      id: true,
      assetTag: true,
      serialNumber: true,
      brand: true,
      model: true,
      status: true,
      isStudentLoanable: true,
      // Només arriben a tenir equip les que s'han aprovat: les rebutjades i les
      // retirades abans de decidir no hi surten mai.
      studentRequests: {
        include: { tutor: person, respondedBy: person, deliveredBy: person, returnedBy: person },
        orderBy: { respondedAt: "desc" },
      },
    },
  });
  if (!chromebook || !chromebook.isStudentLoanable) notFound();

  const model = [chromebook.brand, chromebook.model].filter(Boolean).join(" ");
  const subtitle = [model, chromebook.serialNumber && `Núm. de sèrie ${chromebook.serialNumber}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/alumnat" className="text-sm text-muted-foreground hover:underline">
          &larr; Préstec a l&apos;alumnat
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{chromebook.assetTag}</h1>
            <p className="text-muted-foreground">{subtitle || "Préstec a l'alumnat"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={chromebookStatusVariants[chromebook.status]}>
              {chromebookStatusLabels[chromebook.status]}
            </Badge>
            <ButtonLink variant="outline" size="sm" href={`/incidencies?chromebookId=${chromebook.id}`}>
              <TicketIcon className="size-4" />
              Incidències
            </ButtonLink>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Qui l&apos;ha tingut</h2>
        <div className="overflow-x-auto rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curs</TableHead>
                <TableHead>Alumne/a</TableHead>
                <TableHead>Tutor/a</TableHead>
                <TableHead>Entregat</TableHead>
                <TableHead>Retornat</TableHead>
                <TableHead>Estat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chromebook.studentRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Aquest equip encara no s&apos;ha deixat a cap alumne/a.
                  </TableCell>
                </TableRow>
              )}
              {chromebook.studentRequests.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {schoolYearOf(loan.respondedAt ?? loan.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {loan.studentFirstName} {loan.studentLastName}
                    </span>
                    {loan.groupName && (
                      <span className="block text-xs text-muted-foreground">{loan.groupName}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{who(loan.tutor)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <Moment at={loan.deliveredAt} by={loan.deliveredBy} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Moment at={loan.returnedAt} by={loan.returnedBy} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={studentDeviceRequestStatusVariants[loan.status]}>
                      {studentDeviceRequestStatusLabels[loan.status]}
                    </Badge>
                    {loan.respondedAt && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Aprovat el {formatDate(loan.respondedAt)}
                        {loan.respondedBy && ` per ${who(loan.respondedBy)}`}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
