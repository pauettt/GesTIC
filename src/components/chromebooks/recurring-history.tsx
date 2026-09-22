"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RecurringReservationStatus } from "@prisma/client";

import { formatDate } from "@/lib/date";
import { recurringReservationStatusLabels, recurringReservationStatusVariants } from "@/lib/labels";
import { CancelRecurringButton } from "@/components/chromebooks/recurring-reservations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Només el que la taula ensenya: dels usuaris, el nom o el correu. */
export type RecurringHistoryRow = {
  id: string;
  cartId: string;
  cartName: string;
  /** «Dimarts · 3a hora (09:50–10:45)». */
  slot: string;
  who: string;
  purpose: string;
  status: RecurringReservationStatus;
  schoolYear: string;
  createdAt: Date;
  respondedAt: Date | null;
  respondedByName: string | null;
  responseNote: string | null;
  cancelledAt: Date | null;
  cancelledByName: string | null;
  /** Setmanes ja fetes, per venir i alliberades soles o en anul·lar-la. */
  weeks: { done: number; upcoming: number; freed: number };
  /** Aprovada i amb setmanes per venir: encara es pot anul·lar. */
  cancellable: boolean;
  mine: boolean;
};

type FilterValue = "totes" | "aprovades" | "rebutjades" | "anullades";

const FILTERS: { value: FilterValue; label: string; match: (row: RecurringHistoryRow) => boolean }[] = [
  { value: "totes", label: "Totes", match: () => true },
  { value: "aprovades", label: "Aprovades", match: (row) => row.status === "APROVADA" },
  { value: "rebutjades", label: "No aprovades", match: (row) => row.status === "REBUTJADA" },
  { value: "anullades", label: "Anul·lades", match: (row) => row.status === "CANCELLADA" },
];

/** Sense majúscules ni accents: "robotica" troba "Robòtica". */
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Com ha anat, en setmanes. D'una anul·lada, només les que es van fer: les que
 * quedaven s'alliberen totes en anul·lar-la, i sumar-les a les alliberades
 * soles faria pensar que no es feia servir.
 */
function weeksLabel({ status, weeks: { done, upcoming, freed } }: RecurringHistoryRow) {
  const doneLabel = `${done} ${done === 1 ? "feta" : "fetes"}`;
  if (status === "CANCELLADA") return doneLabel;
  const parts = [doneLabel, `${upcoming} per venir`];
  if (freed > 0) parts.push(`${freed} ${freed === 1 ? "alliberada" : "alliberades"}`);
  return parts.join(" · ");
}

/**
 * L'historial de reserves fixes de la coordinació: totes les que ja estan
 * decidides, de qualsevol curs, amb qui les va demanar, qui les va decidir i qui
 * les va anul·lar i quan. Les aprovades que encara tenen setmanes per venir es
 * poden anul·lar d'aquí mateix. Les pendents són a la cua de dalt.
 */
export function RecurringHistory({
  rows,
  currentSchoolYear,
}: {
  rows: RecurringHistoryRow[];
  currentSchoolYear: string;
}) {
  const courses = useMemo(
    () => [...new Set([currentSchoolYear, ...rows.map((row) => row.schoolYear)])].sort().reverse(),
    [rows, currentSchoolYear],
  );
  const [course, setCourse] = useState(currentSchoolYear);
  const [filter, setFilter] = useState<FilterValue>("totes");
  const [query, setQuery] = useState("");

  const inCourse = useMemo(() => rows.filter((row) => row.schoolYear === course), [rows, course]);
  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    const matchesFilter = FILTERS.find((candidate) => candidate.value === filter)?.match ?? (() => true);
    return inCourse.filter(
      (row) =>
        matchesFilter(row) &&
        (!needle || normalize([row.cartName, row.who, row.purpose, row.slot].join(" ")).includes(needle)),
    );
  }, [inCourse, query, filter]);
  const courseItems = courses.map((value) => ({ value, label: `Curs ${value}` }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial</CardTitle>
        <p className="text-sm text-muted-foreground">
          Les reserves fixes ja decidides, amb qui les va demanar, qui les va decidir i qui les va anul·lar. Les
          aprovades es poden anul·lar mentre els quedin setmanes.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={course} onValueChange={(next) => next && setCourse(next)} items={courseItems}>
            <SelectTrigger className="w-40" aria-label="Curs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courseItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per carro, professor/a o motiu…"
            aria-label="Cerca reserves fixes"
            className="max-w-xs"
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
              <span className="text-xs opacity-70">{inCourse.filter(candidate.match).length}</span>
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reserva</TableHead>
                <TableHead>Estat</TableHead>
                <TableHead>Setmanes</TableHead>
                <TableHead>Qui i quan</TableHead>
                <TableHead>
                  <span className="sr-only">Accions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {inCourse.length === 0
                      ? "Aquest curs encara no n'hi ha cap de decidida."
                      : "Cap reserva fixa no coincideix amb la cerca."}
                  </TableCell>
                </TableRow>
              )}
              {visible.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="min-w-56 align-top whitespace-normal">
                    <Link href={`/chromebooks/${row.cartId}`} className="font-medium hover:underline">
                      {row.cartName}
                    </Link>
                    <span className="block">{row.slot}</span>
                    <span className="block text-muted-foreground">{row.who}</span>
                    <span className="block text-xs text-muted-foreground">{row.purpose}</span>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <Badge variant={recurringReservationStatusVariants[row.status]}>
                      {recurringReservationStatusLabels[row.status]}
                    </Badge>
                    {row.responseNote && (
                      <span className="mt-1 block max-w-56 text-xs text-muted-foreground">{row.responseNote}</span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-28 align-top whitespace-normal text-muted-foreground">
                    {/* Sense aprovar, no n'hi va haver mai cap. */}
                    {row.status === "REBUTJADA" || !row.respondedAt ? "—" : weeksLabel(row)}
                  </TableCell>
                  <TableCell className="min-w-56 align-top text-xs whitespace-normal text-muted-foreground">
                    <span className="block">Demanada el {formatDate(row.createdAt)}</span>
                    {row.respondedAt && (
                      <span className="block">
                        {row.status === "REBUTJADA" ? "No aprovada" : "Aprovada"} el {formatDate(row.respondedAt)}
                        {row.respondedByName && ` per ${row.respondedByName}`}
                      </span>
                    )}
                    {row.status === "CANCELLADA" && (
                      <span className="block">
                        {row.respondedAt ? "Anul·lada" : "Retirada"}
                        {row.cancelledAt && ` el ${formatDate(row.cancelledAt)}`}
                        {row.cancelledByName && ` per ${row.cancelledByName}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right">
                    {row.cancellable && <CancelRecurringButton id={row.id} approved mine={row.mine} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
