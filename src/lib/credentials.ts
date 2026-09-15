import type { Prisma, Role } from "@prisma/client";

import { isAdmin, isSuperAdmin } from "@/lib/roles";

/**
 * Qui veu cada contrasenya. La coordinació TIC les veu totes menys les marcades
 * «Només superadministrador», que per a ella no existeixen: ni a la llista, ni
 * a la cerca, ni el servidor les torna si se les demana pel seu identificador.
 */
export function canSeeCredential(role: Role, credential: { superAdminOnly: boolean }) {
  return isAdmin(role) && (isSuperAdmin(role) || !credential.superAdminOnly);
}

/** El mateix filtre per a les consultes: així la regla no s'ha de repetir a cada lloc. */
export function visibleCredentialsWhere(role: Role): Prisma.CredentialWhereInput {
  if (!isAdmin(role)) return { id: { in: [] } };
  return isSuperAdmin(role) ? {} : { superAdminOnly: false };
}
