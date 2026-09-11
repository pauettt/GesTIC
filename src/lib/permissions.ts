import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { canAccessKeys, isAdmin, isSuperAdmin } from "@/lib/roles";

export {
  COORDINATOR_ROLES,
  canAccessKeys,
  isAdmin,
  isConcierge,
  isSuperAdmin,
} from "@/lib/roles";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
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
  const user = await requireUser();
  if (!canAccessKeys(user.role)) {
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
