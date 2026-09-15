import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { REQUESTED_PATH_HEADER, loginPath } from "@/lib/login-redirect";
import {
  COORDINATOR_ROLES,
  canAccessKeys,
  isAdmin,
  isConcierge,
  isSuperAdmin,
} from "@/lib/roles";

// Re-exportats des dels bindings locals, i no amb `export … from`: tenir-hi
// totes dues formes alhora deixava la variable local sense definir en temps
// d'execució, i `requireUser` petava amb "isConcierge is not defined".
export { COORDINATOR_ROLES, canAccessKeys, isAdmin, isConcierge, isSuperAdmin };

/**
 * La sessió d'aquesta petició. El layout i la pàgina es pinten alhora i tots dos
 * la demanen, i com que es desa a la base de dades cada navegació en feia dues
 * consultes. `cache` de React la comparteix dins d'una mateixa petició i prou:
 * la següent la torna a llegir, i treure l'accés a algú continua valent al moment.
 */
const getSession = cache(() => auth());

/**
 * Sessió vàlida, sense mirar el rol. Només per al layout, que ha de pintar la
 * barra lateral tant per a consergeria com per a la resta.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    // Amb una cookie de sessió caducada o esborrada el Proxy deixa passar, i és
    // aquí on es veu que no hi ha sessió: un cop dins, cal tornar on s'anava.
    redirect(loginPath((await headers()).get(REQUESTED_PATH_HEADER)));
  }
  return session.user;
}

/**
 * Usuari de la part general de l'aplicació.
 *
 * Consergeria en queda fora: té un compte compartit al taulell, només ha de fer
 * el control de claus, i la resta de pantalles li sortirien buides. Com que
 * totes les pàgines i accions passen per aquí, amb això n'hi ha prou — no cal
 * anar-ho repetint secció per secció.
 */
export async function requireUser() {
  const user = await requireSession();
  if (isConcierge(user.role)) {
    redirect("/consergeria");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.role)) {
    redirect("/");
  }
  return user;
}

/** Control de claus: consergeria i la coordinació TIC. */
export async function requireKeyAccess() {
  const user = await requireSession();
  if (!canAccessKeys(user.role)) {
    redirect("/");
  }
  return user;
}

/**
 * Tutor/a de grup: qui pot demanar Chromebooks per a l'alumnat. La coordinació
 * TIC no hi entra pel fet de ser-ho —decideix les sol·licituds, no en fa— però
 * un coordinador que també sigui tutor sí que hi és, perquè porta la marca.
 */
export async function requireTutor() {
  const user = await requireUser();
  if (!user.isTutor) {
    redirect("/");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdmin(user.role)) {
    redirect("/");
  }
  return user;
}
