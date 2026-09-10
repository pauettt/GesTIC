import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { isAdmin, requireUser } from "@/lib/permissions";
import { queryStatusLabels, queryStatusVariants } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QueryStatus } from "@prisma/client";

const STATUS_FILTERS: { value: QueryStatus | "TOTES"; label: string }[] = [
  { value: "TOTES", label: "Totes" },
  { value: "OBERTA", label: "Obertes" },
  { value: "EN_CURS", label: "En curs" },
  { value: "RESOLTA", label: "Resoltes" },
  { value: "TANCADA", label: "Tancades" },
];

export const metadata = { title: "Consultes" };

export default async function ConsultesPage({ searchParams }: PageProps<"/consultes">) {
  const user = await requireUser();
  const { status } = await searchParams;
  const statusFilter = typeof status === "string" ? status : "TOTES";

  const queries = await db.query.findMany({
    where: {
      ...(isAdmin(user.role) ? {} : { authorId: user.id }),
      ...(statusFilter !== "TOTES" ? { status: statusFilter as QueryStatus } : {}),
    },
    include: { author: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Consultes</h1>
          <p className="text-muted-foreground">
            {isAdmin(user.role)
              ? "Dubtes d'ús que ha plantejat el professorat."
              : "Les consultes que has fet."}
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/consultes/nova" />}>
          <PlusIcon className="size-4" />
          Fes una pregunta
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={statusFilter === filter.value ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href={filter.value === "TOTES" ? "/consultes" : `/consultes?status=${filter.value}`} />
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consulta</TableHead>
              {isAdmin(user.role) && <TableHead>Professor/a</TableHead>}
              <TableHead>Estat</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queries.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin(user.role) ? 4 : 3} className="py-10 text-center text-muted-foreground">
                  No hi ha cap consulta amb aquest filtre.
                </TableCell>
              </TableRow>
            )}
            {queries.map((query) => (
              <TableRow key={query.id}>
                <TableCell className="font-medium">
                  <Link href={`/consultes/${query.id}`} className="hover:underline">
                    {query.title}
                  </Link>
                </TableCell>
                {isAdmin(user.role) && (
                  <TableCell className="text-muted-foreground">
                    {query.author.name ?? query.author.email}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={queryStatusVariants[query.status]}>
                    {queryStatusLabels[query.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(query.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
