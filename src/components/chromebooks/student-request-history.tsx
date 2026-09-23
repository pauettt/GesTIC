"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StudentDeviceReason, StudentDeviceRequestStatus } from "@prisma/client";

import { formatDate } from "@/lib/date";
import { DeleteStudentRequestButton } from "@/components/chromebooks/delete-student-request-button";
import {
  studentDeviceReasonLabels,
  studentDeviceRequestStatusLabels,
  studentDeviceRequestStatusVariants,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Només el que la taula ensenya: al navegador no hi ha de viatjar res més dels
 * usuaris que el nom o el correu.
 */
export type StudentRequestHistoryRow = {
  id: string;
  studentName: string;
  groupName: string | null;
  reason: StudentDeviceReason;
  reasonNote: string | null;
  status: StudentDeviceRequestStatus;
  responseNote: string | null;
  tutorName: string;
  respondedByName: string | null;
  chromebookId: string | null;
  deviceLabel: string | null;
  createdAt: Date;
  respondedAt: Date | null;
};

type FilterValue = "totes" | "acceptades" | "rebutjades" | "cancellades";

const FILTERS: {
  value: FilterValue;
  label: string;
  match: (row: StudentRequestHistoryRow) => boolean;
}[] = [
  { value: "totes", label: "Totes", match: () => true },
  // Acceptada és acceptada encara que després s'hagi entregat o retornat.
  {
    value: "acceptades",
    label: "Acceptades",
    match: (row) => ["APROVADA", "ENTREGADA", "RETORNADA"].includes(row.status),
  },
  { value: "rebutjades", label: "Rebutjades", match: (row) => row.status === "REBUTJADA" },
  { value: "cancellades", label: "Cancel·lades", match: (row) => row.status === "CANCELLADA" },
];

/** Sense majúscules ni accents: "nuria" troba "Núria". */
function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Totes les sol·licituds que ja tenen resposta, amb qui les va demanar i qui
 * les va decidir. Les pendents són a la cua de dalt.
 */
export function StudentRequestHistory({ rows }: { rows: StudentRequestHistoryRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("totes");

  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    const matchesFilter =
      FILTERS.find((candidate) => candidate.value === filter)?.match ?? (() => true);
    return rows.filter(
      (row) =>
        matchesFilter(row) &&
        (!needle ||
          normalize(
            [row.studentName, row.groupName, row.tutorName, row.deviceLabel]
              .filter(Boolean)
              .join(" "),
          ).includes(needle)),
    );
  }, [rows, query, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de sol·licituds</CardTitle>
        <p className="text-sm text-muted-foreground">
          Les sol·licituds ja respostes, amb el tutor/a que les va fer i qui les va decidir.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Encara no s&apos;ha respost cap sol·licitud.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca per alumne/a, grup, tutor/a o equip…"
                aria-label="Cerca sol·licituds"
                className="max-w-sm"
              />
              {FILTERS.map((candidate) => (
                <Button
                  key={candidate.value}
                  size="sm"
                  variant={filter === candidate.value ? "default" : "outline"}
                  aria-pressed={filter === candidate.value}
                  onClick={() => setFilter(candidate.value)}
                >
                  {candidate.label}
                  <span className="text-xs opacity-70">{rows.filter(candidate.match).length}</span>
                </Button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumne/a</TableHead>
                    <TableHead>Grup</TableHead>
                    <TableHead>Sol·licitada per</TableHead>
                    <TableHead>Motiu</TableHead>
                    <TableHead>Estat</TableHead>
                    <TableHead>Equip</TableHead>
                    <TableHead>Demanada</TableHead>
                    <TableHead>Resposta</TableHead>
                    <TableHead><span className="sr-only">Accions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                        Cap sol·licitud no coincideix amb la cerca.
                      </TableCell>
                    </TableRow>
                  )}
                  {visible.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{row.groupName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.tutorName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {studentDeviceReasonLabels[row.reason]}
                        {row.reasonNote && (
                          <span className="mt-0.5 block text-xs">{row.reasonNote}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={studentDeviceRequestStatusVariants[row.status]}>
                          {studentDeviceRequestStatusLabels[row.status]}
                        </Badge>
                        {row.responseNote && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {row.responseNote}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.chromebookId && row.deviceLabel ? (
                          <Link href={`/alumnat/${row.chromebookId}`} className="hover:underline">
                            {row.deviceLabel}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.respondedAt ? (
                          <span className="whitespace-nowrap">{formatDate(row.respondedAt)}</span>
                        ) : (
                          "—"
                        )}
                        {row.respondedByName && (
                          <span className="mt-0.5 block text-xs">{row.respondedByName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteStudentRequestButton id={row.id} status={row.status} studentName={row.studentName} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
