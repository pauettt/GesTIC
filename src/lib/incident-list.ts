import type { Route } from "next";
import type { Prisma } from "@prisma/client";

export const INCIDENT_PAGE_SIZE = 25;

export function incidentSearchQuery(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

/** Cerca literal: els caràcters % i _ no han d'ampliar els resultats d'ILIKE. */
export function incidentSearchWhere(query: string): Prisma.IncidentWhereInput {
  if (!query) return {};
  const contains = { contains: query.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" as const };
  return {
    OR: [
      { title: contains },
      { description: contains },
      { inventoryItem: { OR: [{ brand: contains }, { model: contains }, { serialNumber: contains }] } },
      { chromebook: { OR: [{ assetTag: contains }, { serialNumber: contains }, { cart: { name: contains } }] } },
      { cart: { name: contains } },
      { space: { name: contains } },
    ],
  };
}

export function incidentPage(value: unknown, total: number) {
  const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 1;
  const pages = Math.max(1, Math.ceil(total / INCIDENT_PAGE_SIZE));
  const page = Math.min(pages, Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1);
  return { page, pages, skip: (page - 1) * INCIDENT_PAGE_SIZE };
}

/** El retorn només pot apuntar a la llista local d'incidències. */
export function incidentReturnHref(value: unknown): Route {
  if (typeof value !== "string" || value.length > 2048) return "/incidencies";
  if (value !== "/incidencies" && !value.startsWith("/incidencies?")) return "/incidencies";
  const url = new URL(value, "https://gestic.invalid");
  return `${url.pathname}${url.search}` as Route;
}
