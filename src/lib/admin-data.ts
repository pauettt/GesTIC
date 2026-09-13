import "server-only";

import { db } from "@/lib/db";
import { isDevLoginEnabled } from "@/lib/dev-login-enabled";
import { isEmailConfigured } from "@/lib/email";
import { TEST_ACCOUNT_DOMAIN, type CountItem } from "@/lib/test-data";

export type ConfigCheck = { label: string; ok: boolean; detail: string };

/**
 * Estat de la configuració del servidor, per no haver d'entrar a Vercel a
 * comprovar-lo. Diu si cada cosa hi és i què en resulta, però cap secret no surt
 * d'aquí: de les claus, només si existeixen.
 */
export function getConfigChecks(): ConfigCheck[] {
  const domain = process.env.GOOGLE_WORKSPACE_DOMAIN?.trim();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  const appUrl = process.env.APP_URL?.trim();
  const email = isEmailConfigured();
  const blob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const cron = Boolean(process.env.CRON_SECRET);
  const devLogin = isDevLoginEnabled();

  return [
    {
      label: "Domini del centre",
      ok: Boolean(domain),
      detail: domain ? `Només hi entren comptes de ${domain}` : "Sense configurar: no hi pot entrar ningú",
    },
    {
      label: "Superadministradors",
      ok: adminEmails.length > 0,
      detail: adminEmails.length > 0 ? adminEmails.join(", ") : "Cap: ningú no podria repartir permisos",
    },
    {
      label: "Adreça de l'aplicació",
      ok: Boolean(appUrl),
      detail:
        appUrl ??
        "Sense fixar: els QR i els enllaços dels correus agafarien el domini des d'on es generin",
    },
    {
      label: "Correu de sortida",
      ok: email,
      detail: email
        ? `Els avisos surten com a ${process.env.SMTP_FROM ?? process.env.SMTP_USER}`
        : "Sense configurar: no s'envia cap avís",
    },
    {
      label: "Fotos",
      ok: blob,
      detail: blob ? "Vercel Blob configurat" : "Sense configurar: no es poden pujar fotos",
    },
    {
      label: "Tasques programades",
      ok: cron,
      detail: cron
        ? "Recordatoris de préstecs vençuts i ping diari a la base de dades"
        : "Sense CRON_SECRET: ni recordatoris ni el ping que evita que Supabase es pausi",
    },
    {
      label: "Dev login",
      ok: !devLogin,
      detail: devLogin ? "Activat: només pot passar en local" : "Desactivat",
    },
  ];
}

export type TestDataSummary = {
  accounts: { id: string; name: string | null; email: string }[];
  items: CountItem[];
};

/** Comptes de prova (`@local.test`) i tot el que en penja, comptat abans d'esborrar res. */
export async function getTestDataSummary(): Promise<TestDataSummary> {
  const accounts = await db.user.findMany({
    where: { email: { endsWith: TEST_ACCOUNT_DOMAIN, mode: "insensitive" } },
    select: { id: true, name: true, email: true },
    orderBy: { email: "asc" },
  });
  if (accounts.length === 0) return { accounts, items: [] };

  const ids = { in: accounts.map((account) => account.id) };
  const [
    incidents,
    photos,
    comments,
    loans,
    reservations,
    keyLoans,
    appointments,
    queries,
    studentRequests,
    enrollments,
    notes,
  ] = await Promise.all([
    db.incident.count({ where: { reporterId: ids } }),
    db.incidentAttachment.count({ where: { incident: { reporterId: ids } } }),
    db.incidentComment.count({ where: { authorId: ids } }),
    db.loanRequest.count({ where: { requesterId: ids } }),
    db.reservation.count({ where: { userId: ids } }),
    db.keyLoan.count({ where: { borrowerId: ids } }),
    db.appointment.count({ where: { userId: ids } }),
    db.query.count({ where: { authorId: ids } }),
    db.studentDeviceRequest.count({ where: { tutorId: ids } }),
    db.trainingEnrollment.count({ where: { userId: ids } }),
    db.chromebookNote.count({ where: { authorId: ids } }),
  ]);

  return {
    accounts,
    items: [
      { count: incidents, one: "incidència", many: "incidències" },
      { count: photos, one: "foto", many: "fotos" },
      { count: comments, one: "comentari", many: "comentaris" },
      { count: loans, one: "préstec", many: "préstecs" },
      { count: reservations, one: "reserva de carro", many: "reserves de carro" },
      { count: keyLoans, one: "préstec de clau", many: "préstecs de claus" },
      { count: appointments, one: "cita", many: "cites" },
      { count: queries, one: "consulta", many: "consultes" },
      {
        count: studentRequests,
        one: "sol·licitud de Chromebook d'alumnat",
        many: "sol·licituds de Chromebook d'alumnat",
      },
      { count: enrollments, one: "inscripció a formació", many: "inscripcions a formació" },
      { count: notes, one: "nota de Chromebook", many: "notes de Chromebook" },
    ],
  };
}
