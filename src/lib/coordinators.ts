import type { Prisma, Role } from "@prisma/client";

import { COORDINATOR_ROLES, isAdmin } from "@/lib/roles";

/**
 * La coordinació TIC que encara té accés a gesTIC: qui rep els avisos i qui pot
 * atendre cites. Qui deixa la coordinació o el centre no s'esborra, i les seves
 * hores de cita tampoc: deixen de sortir al professorat i ningú no les pot
 * demanar, i si hi torna, tornen a sortir.
 */
export const activeCoordinator = {
  role: { in: COORDINATOR_ROLES },
  disabledAt: null,
} satisfies Prisma.UserWhereInput;

/** El mateix que `activeCoordinator`, per a una fila ja llegida. */
export function isActiveCoordinator(user: { role: Role; disabledAt: Date | null }) {
  return isAdmin(user.role) && user.disabledAt === null;
}
