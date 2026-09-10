import type { Role } from "@prisma/client";

// Comprovacions pures de rol, sense dependències de servidor: així també es
// poden fer servir des de components de client (navegació, menús...).
// Els guardians que redirigeixen viuen a `@/lib/permissions`.

/** Rols amb permisos de coordinació TIC (tot el dia a dia de l'aplicació). */
export const COORDINATOR_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];

/**
 * Cert per a la coordinació TIC, super admin inclòs. Cal fer servir SEMPRE
 * aquesta comprovació en comptes de `role === "ADMIN"`: si no, el super admin
 * queda fora de tot allò que hauria de poder fer.
 */
export function isAdmin(role: Role) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Només el super admin: gestió d'usuaris i permisos. */
export function isSuperAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}
