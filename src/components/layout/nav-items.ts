import type { Role } from "@prisma/client";
import type { Route } from "next";
import {
  BookOpenIcon,
  GraduationCapIcon,
  HelpCircleIcon,
  HomeIcon,
  LaptopIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MessageCircleQuestionIcon,
  PackageIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react";

import { isAdmin, isSuperAdmin } from "@/lib/roles";

export type NavItem = {
  href: Route;
  label: string;
  icon: typeof HomeIcon;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inici", icon: HomeIcon },
  { href: "/incidencies", label: "Incidències TIC", icon: TicketIcon },
  { href: "/inventari", label: "Inventari TIC", icon: PackageIcon },
  { href: "/chromebooks", label: "Chromebooks", icon: LaptopIcon },
  { href: "/espais", label: "Aules i espais", icon: MapPinIcon, adminOnly: true },
  { href: "/formacio", label: "Formació", icon: GraduationCapIcon },
  { href: "/dubtes", label: "Dubtes freqüents", icon: HelpCircleIcon },
  { href: "/consultes", label: "Consultes", icon: MessageCircleQuestionIcon },
  { href: "/tutorials", label: "Tutorials", icon: BookOpenIcon },
  { href: "/panell", label: "Panell coordinador", icon: LayoutDashboardIcon, adminOnly: true },
  { href: "/usuaris", label: "Usuaris i permisos", icon: UsersIcon, superAdminOnly: true },
];

export function navItemsForRole(role: Role) {
  return NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin(role);
    if (item.adminOnly) return isAdmin(role);
    return true;
  });
}
