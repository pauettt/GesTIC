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
  NetworkIcon,
  PackageIcon,
  ShieldCheckIcon,
  SquarePlayIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react";

import { canAccessStudentLoans, isAdmin, isConcierge, isSuperAdmin } from "@/lib/roles";

export type NavSectionKey = "principal" | "equipament" | "suport" | "administracio";

export type NavItem = {
  href: Route;
  label: string;
  /** Nom que veu el professorat, quan la seva pantalla no és la de la coordinació. */
  professorLabel?: string;
  icon: typeof HomeIcon;
  section: NavSectionKey;
  iconColor?: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  /** Tutors/es i la coordinació TIC, que en decideix les sol·licituds. */
  tutorsOnly?: boolean;
  /** Si hi és, només aquests rols veuen l'enllaç. Mana sobre la resta de flags. */
  roles?: Role[];
};

export const NAV_SECTIONS: { key: NavSectionKey; label: string }[] = [
  { key: "principal", label: "Principal" },
  { key: "equipament", label: "Equipament i espais" },
  { key: "suport", label: "Assistència TIC" },
  { key: "administracio", label: "Configuració" },
];

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inici", icon: HomeIcon, section: "principal", iconColor: "text-blue-500 dark:text-blue-400" },
  {
    href: "/panell",
    label: "Panell coordinador",
    icon: LayoutDashboardIcon,
    adminOnly: true,
    section: "principal",
    iconColor: "text-indigo-500 dark:text-indigo-400",
  },
  {
    href: "/chromebooks",
    label: "Carros",
    icon: LaptopIcon,
    section: "equipament",
    iconColor: "text-sky-500 dark:text-sky-400",
  },
  {
    href: "/inventari",
    label: "Inventari TIC",
    professorLabel: "Préstec de material",
    icon: PackageIcon,
    section: "equipament",
    iconColor: "text-indigo-500 dark:text-indigo-400",
  },
  {
    href: "/alumnat",
    label: "Préstec a l'alumnat",
    icon: BackpackIcon,
    tutorsOnly: true,
    section: "equipament",
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },
  {
    href: "/espais",
    label: "Aules i espais",
    icon: MapPinIcon,
    adminOnly: true,
    section: "equipament",
    iconColor: "text-orange-500 dark:text-orange-400",
  },
  {
    href: "/xarxa",
    label: "Xarxa",
    icon: NetworkIcon,
    adminOnly: true,
    section: "equipament",
    iconColor: "text-cyan-500 dark:text-cyan-400",
  },
  {
    href: "/consergeria",
    label: "Claus",
    icon: KeyRoundIcon,
    roles: ["CONSERGERIA", "SUPER_ADMIN"],
    section: "equipament",
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  {
    href: "/incidencies",
    label: "Incidències TIC",
    icon: TicketIcon,
    section: "suport",
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  {
    href: "/cites",
    label: "Cites",
    icon: CalendarCheckIcon,
    section: "suport",
    iconColor: "text-purple-500 dark:text-purple-400",
  },
  {
    href: "/consultes",
    label: "Peticions i consultes",
    icon: MessageCircleQuestionIcon,
    section: "suport",
    iconColor: "text-teal-500 dark:text-teal-400",
  },
  {
    href: "/dubtes",
    label: "Dubtes freqüents",
    icon: HelpCircleIcon,
    section: "suport",
    iconColor: "text-orange-500 dark:text-orange-400",
  },
  {
    href: "/tutorials",
    label: "Tutorials",
    icon: SquarePlayIcon,
    section: "suport",
    iconColor: "text-rose-500 dark:text-rose-400",
  },
  {
    href: "/contrasenyes",
    label: "Contrasenyes",
    icon: LockKeyholeIcon,
    adminOnly: true,
    section: "administracio",
    iconColor: "text-yellow-600 dark:text-yellow-400",
  },
  {
    href: "/usuaris",
    label: "Usuaris i permisos",
    icon: UsersIcon,
    superAdminOnly: true,
    section: "administracio",
    iconColor: "text-violet-500 dark:text-violet-400",
  },
  {
    href: "/administracio",
    label: "Administració",
    icon: ShieldCheckIcon,
    superAdminOnly: true,
    section: "administracio",
    iconColor: "text-slate-500 dark:text-slate-400",
  },
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

export function navSectionsFor(user: { role: Role; isTutor: boolean }) {
  const items = navItemsFor(user);
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: items.filter((item) => item.section === section.key),
  })).filter((section) => section.items.length > 0);
}
