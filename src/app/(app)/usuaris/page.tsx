import { ShieldCheckIcon } from "lucide-react";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { roleLabels } from "@/lib/labels";
import { requireSuperAdmin } from "@/lib/permissions";
import { UserRoleSelect } from "@/components/users/user-role-select";
import { UserTutorToggle } from "@/components/users/user-tutor-toggle";
import { ConciergeManager } from "@/components/keys/concierge-manager";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Usuaris i permisos" };

export default async function UsuarisPage() {
  const superAdmin = await requireSuperAdmin();

  const [users, concierges] = await Promise.all([
    db.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] }),
    db.concierge.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuaris i permisos</h1>
        <p className="text-muted-foreground">
          Tothom qui ha entrat alguna vegada a gesTIC. Dona permisos de coordinació TIC a qui
          hagi de gestionar incidències, inventari i carros, i marca com a tutor/a qui tingui un
          grup assignat.
        </p>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isMe = user.id === superAdmin.id;
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name ?? "—"}
                    {isMe && <span className="ml-2 text-xs text-muted-foreground">(tu)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
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
                      <UserRoleSelect
                        userId={user.id}
                        role={user.role}
                        userName={user.name ?? user.email}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {user.role === "CONSERGERIA" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <UserTutorToggle
                        userId={user.id}
                        isTutor={user.isTutor}
                        userName={user.name ?? user.email}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConciergeManager concierges={concierges} />

      <p className="text-sm text-muted-foreground">
        La marca de <strong>tutor/a</strong> no és un permís i no en treu cap: se suma al que ja
        té l&apos;usuari. Serveix perquè pugui demanar Chromebooks en préstec per a l&apos;alumnat
        del seu grup.
      </p>

      <p className="text-sm text-muted-foreground">
        Els administradors es defineixen a la variable <code>ADMIN_EMAILS</code> del servidor i no
        es poden canviar des d&apos;aquí: així ningú no es pot donar permisos a si mateix, i sempre
        es pot recuperar el control encara que algú es descuidi.
      </p>
    </div>
  );
}
