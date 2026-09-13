"use client";

import { useMemo, useState } from "react";
import type { Role } from "@prisma/client";
import { ShieldCheckIcon } from "lucide-react";

import { formatDate } from "@/lib/date";
import { roleLabels } from "@/lib/labels";
import { UserAccessToggle } from "@/components/users/user-access-toggle";
import { UserRoleSelect } from "@/components/users/user-role-select";
import { UserTutorToggle } from "@/components/users/user-tutor-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isTutor: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  disabledAt: Date | null;
};

type FilterValue = "tots" | "coordinacio" | "tutors" | "consergeria" | "sense-acces";

const FILTERS: { value: FilterValue; label: string; match: (user: UserRow) => boolean }[] = [
  { value: "tots", label: "Tothom", match: () => true },
  {
    value: "coordinacio",
    label: "Coordinació TIC",
    match: (user) => user.role === "SUPER_ADMIN" || user.role === "ADMIN",
  },
  { value: "tutors", label: "Tutors", match: (user) => user.isTutor },
  { value: "consergeria", label: "Consergeria", match: (user) => user.role === "CONSERGERIA" },
  { value: "sense-acces", label: "Sense accés", match: (user) => user.disabledAt !== null },
];

/** Sense majúscules ni accents: "jose" troba "Josep", "garcia" troba "García". */
function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Tot el claustre que ha entrat alguna vegada, amb cercador i filtres. Amb un
 * centenar de persones, a principi de curs la feina és trobar els tutors nous i
 * treure l'accés a qui ja no hi és, i sense cercador era anar baixant la taula.
 */
export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("tots");

  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    const matchesFilter = FILTERS.find((candidate) => candidate.value === filter)?.match ?? (() => true);
    return users.filter(
      (user) =>
        matchesFilter(user) && (!needle || normalize(`${user.name ?? ""} ${user.email}`).includes(needle)),
    );
  }, [users, query, filter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca per nom o correu…"
          aria-label="Cerca usuaris"
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
            <span className="text-xs opacity-70">{users.filter(candidate.match).length}</span>
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Correu</TableHead>
              <TableHead>Primer accés</TableHead>
              <TableHead>Últim accés</TableHead>
              <TableHead className="w-52">Permís</TableHead>
              <TableHead className="w-24 text-center">Tutor/a</TableHead>
              <TableHead className="text-right">Accés</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Ningú no coincideix amb la cerca.
                </TableCell>
              </TableRow>
            )}
            {visible.map((user) => {
              const isMe = user.id === currentUserId;
              const name = user.name ?? user.email;
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name ?? "—"}
                    {isMe && <span className="ml-2 text-xs text-muted-foreground">(tu)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"}
                  </TableCell>
                  <TableCell>
                    {user.role === "SUPER_ADMIN" ? (
                      <Badge variant="default" className="gap-1">
                        <ShieldCheckIcon className="size-3" />
                        {roleLabels.SUPER_ADMIN}
                      </Badge>
                    ) : (
                      <UserRoleSelect userId={user.id} role={user.role} userName={name} />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {user.role === "CONSERGERIA" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <UserTutorToggle userId={user.id} isTutor={user.isTutor} userName={name} />
                    )}
                  </TableCell>
                  <TableCell>
                    {isMe || user.role === "SUPER_ADMIN" ? (
                      <span className="block text-right text-muted-foreground">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {user.disabledAt && <Badge variant="outline">Sense accés</Badge>}
                        <UserAccessToggle
                          userId={user.id}
                          userName={name}
                          disabled={user.disabledAt !== null}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
