import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
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
 * Sessió vàlida, sense mirar el rol. Només per al layout, que ha de pintar la
 * barra lateral tant per a consergeria com per a la resta.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
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
