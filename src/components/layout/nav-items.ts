import type { Role } from "@prisma/client";
import type { Route } from "next";
import {
  BackpackIcon,
  CalendarCheckIcon,
  HelpCircleIcon,
  HomeIcon,
  KeyRoundIcon,
  LaptopIcon,
  LayoutDashboardIcon,
  LockKeyholeIcon,
  MapPinIcon,
  MessageCircleQuestionIcon,
  PackageIcon,
  ShieldCheckIcon,
  SquarePlayIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react";

import { canAccessStudentLoans, isAdmin, isConcierge, isSuperAdmin } from "@/lib/roles";

export type NavItem = {
  href: Route;
  label: string;
  /** Nom que veu el professorat, quan la seva pantalla no és la de la coordinació. */
  professorLabel?: string;
  icon: typeof HomeIcon;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  /** Tutors/es i la coordinació TIC, que en decideix les sol·licituds. */
  tutorsOnly?: boolean;
  /** Si hi és, només aquests rols veuen l'enllaç. Mana sobre la resta de flags. */
  roles?: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inici", icon: HomeIcon },
  { href: "/incidencies", label: "Incidències TIC", icon: TicketIcon },
  { href: "/inventari", label: "Inventari TIC", professorLabel: "Préstec de material", icon: PackageIcon },
  { href: "/chromebooks", label: "Carros", icon: LaptopIcon },
  { href: "/alumnat", label: "Préstec a l'alumnat", icon: BackpackIcon, tutorsOnly: true },
  { href: "/espais", label: "Aules i espais", icon: MapPinIcon, adminOnly: true },
  { href: "/cites", label: "Cites", icon: CalendarCheckIcon },
  { href: "/dubtes", label: "Dubtes freqüents", icon: HelpCircleIcon },
  { href: "/consultes", label: "Consultes", icon: MessageCircleQuestionIcon },
  { href: "/tutorials", label: "Tutorials", icon: SquarePlayIcon },
  {
    href: "/consergeria",
    label: "Claus",
    icon: KeyRoundIcon,
    roles: ["CONSERGERIA", "ADMIN", "SUPER_ADMIN"],
  },
  { href: "/panell", label: "Panell coordinador", icon: LayoutDashboardIcon, adminOnly: true },
  { href: "/contrasenyes", label: "Contrasenyes", icon: LockKeyholeIcon, adminOnly: true },
  { href: "/usuaris", label: "Usuaris i permisos", icon: UsersIcon, superAdminOnly: true },
  { href: "/administracio", label: "Administració", icon: ShieldCheckIcon, superAdminOnly: true },
];

export function navItemsFor(user: { role: Role; isTutor: boolean }) {
  const { role } = user;
  const items = NAV_ITEMS.filter((item) => {
    // Consergeria comparteix un compte al taulell i només fa una cosa: el
    // control de claus. Només veu allò on el seu rol surt explícitament, en
    // comptes d'anar amagant-li seccions una per una.
    if (isConcierge(role)) return item.roles?.includes(role) ?? false;
    if (item.roles) return item.roles.includes(role);
    if (item.superAdminOnly) return isSuperAdmin(role);
    if (item.tutorsOnly) return canAccessStudentLoans(user);
    if (item.adminOnly) return isAdmin(role);
    return true;
  });
  if (isAdmin(role)) return items;
  return items.map((item) => (item.professorLabel ? { ...item, label: item.professorLabel } : item));
}
