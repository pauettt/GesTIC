import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/permissions";
import { ConciergeManager } from "@/components/keys/concierge-manager";
import { UsersTable } from "@/components/users/users-table";

export const metadata = { title: "Usuaris i permisos" };

export default async function UsuarisPage() {
  const superAdmin = await requireSuperAdmin();

  const [users, concierges] = await Promise.all([
    db.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      // Només el que ensenya la taula: aquestes files viatgen al navegador.
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTutor: true,
        createdAt: true,
        lastLoginAt: true,
        disabledAt: true,
      },
    }),
    db.concierge.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuaris i permisos</h1>
        <p className="text-muted-foreground">
          Tothom qui ha entrat alguna vegada a gesTIC. Dona permisos de coordinació TIC a qui
          hagi de gestionar incidències, inventari i carros, marca com a tutor/a qui tingui un
          grup assignat, i treu l&apos;accés a qui ja no és al centre.
        </p>
      </div>

      <UsersTable users={users} currentUserId={superAdmin.id} />

      <ConciergeManager concierges={concierges} />

      <p className="text-sm text-muted-foreground">
        La marca de <strong>tutor/a</strong> no és un permís i no en treu cap: se suma al que ja
        té l&apos;usuari. Serveix perquè pugui demanar Chromebooks en préstec per a l&apos;alumnat
        del seu grup.
      </p>

      <p className="text-sm text-muted-foreground">
        Treure l&apos;accés no esborra ningú: la persona ja no pot entrar ni rep avisos, però el que
        va fer continua dient qui ho va fer. Els superadministradors es defineixen a la variable{" "}
        <code>ADMIN_EMAILS</code> del servidor i no es poden canviar des d&apos;aquí: així ningú no
        es pot donar permisos a si mateix, i sempre es pot recuperar el control encara que algú es
        descuidi.
      </p>
    </div>
  );
}
