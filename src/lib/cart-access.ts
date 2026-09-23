import type { Role } from "@prisma/client";
import { isAdmin } from "@/lib/roles";

/** Els carros d'ús intern continuen disponibles per a la coordinació TIC. */
export function canAccessCart(role: Role, cart: { isVisibleToTeachers: boolean }) {
  return isAdmin(role) || cart.isVisibleToTeachers;
}

export function visibleCartsWhere(role: Role) {
  return isAdmin(role) ? {} : { isVisibleToTeachers: true };
}

export const CART_ACCESS_DENIED = "Aquest carro és d'ús intern i no està disponible per al professorat";
