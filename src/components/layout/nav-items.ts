import type { Role } from "@prisma/client";
import type { Route } from "next";
import {
  BookOpenIcon,
  CalendarCheckIcon,
  GraduationCapIcon,
  HelpCircleIcon,
  HomeIcon,
  KeyRoundIcon,
  LaptopIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MessageCircleQuestionIcon,
  PackageIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react";

import { isAdmin, isConcierge, isSuperAdmin } from "@/lib/roles";

export type NavItem = {
  href: Route;
  label: string;
  icon: typeof HomeIcon;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  /** Si hi és, només aquests rols veuen l'enllaç. Mana sobre la resta de flags. */
  roles?: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inici", icon: HomeIcon },
  { href: "/incidencies", label: "Incidències TIC", icon: TicketIcon },
  { href: "/inventari", label: "Inventari TIC", icon: PackageIcon },
  { href: "/chromebooks", label: "Chromebooks", icon: LaptopIcon },
  { href: "/espais", label: "Aules i espais", icon: MapPinIcon, adminOnly: true },
  { href: "/formacio", label: "Formació", icon: GraduationCapIcon },
  { href: "/cites", label: "Cites", icon: CalendarCheckIcon },
  { href: "/dubtes", label: "Dubtes freqüents", icon: HelpCircleIcon },
  { href: "/consultes", label: "Consultes", icon: MessageCircleQuestionIcon },
  { href: "/tutorials", label: "Tutorials", icon: BookOpenIcon },
  {
    href: "/consergeria",
    label: "Claus",
    icon: KeyRoundIcon,
    roles: ["CONSERGERIA", "ADMIN", "SUPER_ADMIN"],
  },
  { href: "/panell", label: "Panell coordinador", icon: LayoutDashboardIcon, adminOnly: true },
  { href: "/usuaris", label: "Usuaris i permisos", icon: UsersIcon, superAdminOnly: true },
];

export function navItemsForRole(role: Role) {
  return NAV_ITEMS.filter((item) => {
    // Consergeria comparteix un compte al taulell i només fa una cosa: el
    // control de claus. Només veu allò on el seu rol surt explícitament, en
    // comptes d'anar amagant-li seccions una per una.
    if (isConcierge(role)) return item.roles?.includes(role) ?? false;
    if (item.roles) return item.roles.includes(role);
    if (item.superAdminOnly) return isSuperAdmin(role);
    if (item.adminOnly) return isAdmin(role);
    return true;
  });
}
