import { ShieldCheckIcon } from "lucide-react";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { roleLabels } from "@/lib/labels";
import { requireSuperAdmin } from "@/lib/permissions";
import { UserRoleSelect } from "@/components/users/user-role-select";
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

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuaris i permisos</h1>
        <p className="text-muted-foreground">
          Tothom qui ha entrat alguna vegada a gesTIC. Dona permisos de coordinació TIC a qui
          hagi de gestionar incidències, inventari i carros.
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Els administradors es defineixen a la variable <code>ADMIN_EMAILS</code> del servidor i no
        es poden canviar des d&apos;aquí: així ningú no es pot donar permisos a si mateix, i sempre
        es pot recuperar el control encara que algú es descuidi.
      </p>
    </div>
  );
}
