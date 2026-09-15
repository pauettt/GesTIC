"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auditName, recordAudit, type AuditAction } from "@/lib/audit";
import { canSeeCredential } from "@/lib/credentials";
import { db } from "@/lib/db";
import { isSuperAdmin, requireAdmin, requireSuperAdmin } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  deleteCredentialCategorySchema,
  deleteCredentialSchema,
  importCredentialsSchema,
  isWebUrl,
  reorderCredentialCategorySchema,
  revealCredentialSchema,
  upsertCredentialCategorySchema,
  upsertCredentialSchema,
} from "@/lib/validations/credentials";
import { decryptSecret, encryptSecret, vaultKey } from "@/lib/vault";

export type ActionResult = { success: true } | { success: false; error: string };
export type RevealResult =
  | { success: true; password: string; notes: string }
  | { success: false; error: string };
export type ImportResult =
  | { success: true; created: number; skipped: number }
  | { success: false; error: string };

const NOT_FOUND = "Aquesta contrasenya ja no hi és";
const NO_KEY =
  "Falta la clau de xifrat al servidor (VAULT_ENCRYPTION_KEY): no es pot desar ni mostrar cap contrasenya.";

const PATH = "/contrasenyes";

/** La clau, o `null` si el servidor no la té. Sense clau no es desa ni es mostra res. */
function keyOrNull() {
  try {
    return vaultKey();
  } catch {
    return null;
  }
}

function actorName(user: { name?: string | null; email?: string | null }) {
  return auditName({ name: user.name ?? null, email: user.email ?? "" });
}

// ---------------------------------------------------------------------------
// Categories: només el superadministrador
// ---------------------------------------------------------------------------

export async function upsertCredentialCategory(input: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = upsertCredentialCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;
  const order = data.order ? Number(data.order) : 0;

  try {
    if (data.id) {
      await db.credentialCategory.update({
        where: { id: data.id },
        data: { name: data.name, order: Number.isNaN(order) ? 0 : order },
      });
    } else {
      await db.credentialCategory.create({
        data: { name: data.name, order: Number.isNaN(order) ? 0 : order },
      });
    }
  } catch {
    return { success: false, error: "Ja existeix una categoria amb aquest nom" };
  }

  revalidatePath(PATH);
  return { success: true };
}

export async function reorderCredentialCategory(input: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = reorderCredentialCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id, direction } = parsed.data;

  const categories = await db.credentialCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  const index = categories.findIndex((category) => category.id === id);
  if (index === -1) return { success: false, error: "La categoria ja no existeix" };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= categories.length) return { success: true };

  const reordered = [...categories];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await db.$transaction(
    reordered.map((category, position) =>
      db.credentialCategory.update({ where: { id: category.id }, data: { order: position } }),
    ),
  );

  revalidatePath(PATH);
  return { success: true };
}

export async function deleteCredentialCategory(input: unknown): Promise<ActionResult> {
  await requireSuperAdmin();
  const parsed = deleteCredentialCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  // La relació és Restrict: una categoria amb contrasenyes no s'esborra mai de retop.
  if ((await db.credential.count({ where: { categoryId: parsed.data.id } })) > 0) {
    return { success: false, error: "Encara hi ha contrasenyes en aquesta categoria" };
  }
  await db.credentialCategory.deleteMany({ where: { id: parsed.data.id } });

  revalidatePath(PATH);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Contrasenyes
// ---------------------------------------------------------------------------

export async function upsertCredential(input: unknown): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = upsertCredentialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, categoryId, name, username, password, url, notes } = parsed.data;

  const key = keyOrNull();
  if (!key) return { success: false, error: NO_KEY };

  const existing = id
    ? await db.credential.findUnique({ where: { id }, select: { superAdminOnly: true } })
    : null;
  if (id && (!existing || !canSeeCredential(user.role, existing))) {
    return { success: false, error: NOT_FOUND };
  }

  // Només el superadministrador decideix què queda amagat a la coordinació.
  const superAdminOnly = isSuperAdmin(user.role)
    ? parsed.data.superAdminOnly
    : (existing?.superAdminOnly ?? false);

  const data = {
    categoryId,
    name,
    username: username || null,
    url: url || null,
    passwordEncrypted: encryptSecret(password, key),
    notesEncrypted: notes ? encryptSecret(notes, key) : null,
    superAdminOnly,
  };
  if (id) {
    await db.credential.update({ where: { id }, data });
  } else {
    await db.credential.create({ data });
  }

  await recordAudit(
    user.id,
    "credential.change",
    `${actorName(user)} ha ${id ? "modificat" : "afegit"} la contrasenya de «${name}»`,
  );
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteCredential(input: unknown): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = deleteCredentialSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const existing = await db.credential.findUnique({
    where: { id: parsed.data.id },
    select: { name: true, superAdminOnly: true },
  });
  if (!existing || !canSeeCredential(user.role, existing)) {
    return { success: false, error: NOT_FOUND };
  }

  await db.credential.delete({ where: { id: parsed.data.id } });
  await recordAudit(
    user.id,
    "credential.change",
    `${actorName(user)} ha esborrat la contrasenya de «${existing.name}»`,
  );
  revalidatePath(PATH);
  return { success: true };
}

const PURPOSE_VERBS = { view: "ha vist", copy: "ha copiat", edit: "ha obert per editar" } as const;

/**
 * L'única manera de llegir una contrasenya. La pàgina no la porta mai: es
 * demana aquí en mostrar-la, copiar-la o editar-la, i abans de tornar-la queda
 * escrit al registre qui l'ha demanada i per a què.
 */
export async function revealCredential(input: unknown): Promise<RevealResult> {
  const user = await requireAdmin();
  const parsed = revealCredentialSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const limited = await checkRateLimit("credentialReveal", user.id);
  if (limited) return { success: false, error: limited };

  const credential = await db.credential.findUnique({ where: { id: parsed.data.id } });
  if (!credential || !canSeeCredential(user.role, credential)) {
    return { success: false, error: NOT_FOUND };
  }

  const key = keyOrNull();
  if (!key) return { success: false, error: NO_KEY };

  let password: string;
  let notes: string;
  try {
    password = decryptSecret(credential.passwordEncrypted, key);
    notes = credential.notesEncrypted ? decryptSecret(credential.notesEncrypted, key) : "";
  } catch {
    return {
      success: false,
      error: "No s'ha pogut desxifrar: la clau del servidor no és la que la va desar.",
    };
  }

  // Directament i no amb `recordAudit`, que no falla mai: aquí, si no queda
  // apuntat, la contrasenya no surt.
  await db.auditEvent.create({
    data: {
      actorId: user.id,
      action: "credential.reveal" satisfies AuditAction,
      summary: `${actorName(user)} ${PURPOSE_VERBS[parsed.data.purpose]} la contrasenya de «${credential.name}»`,
    },
  });

  return { success: true, password, notes };
}

/**
 * Importació del full de contrasenyes, ja llegit i revisat al navegador. Les
 * categories que no existeixen es creen al final, i una contrasenya que ja hi
 * és (mateixa categoria, nom i usuari) no es duplica si es torna a importar.
 */
export async function importCredentials(input: unknown): Promise<ImportResult> {
  const user = await requireSuperAdmin();
  const parsed = importCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }

  const key = keyOrNull();
  if (!key) return { success: false, error: NO_KEY };

  const { created, skipped } = await db.$transaction(
    async (tx) => {
      const categories = await tx.credentialCategory.findMany({
        select: { id: true, name: true, order: true },
      });
      const categoryIds = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));
      let nextOrder = categories.reduce((max, category) => Math.max(max, category.order + 1), 0);

      const existing = await tx.credential.findMany({
        select: { categoryId: true, name: true, username: true },
      });
      const signature = (categoryId: string, name: string, username: string | null) =>
        `${categoryId}|${name.toLowerCase()}|${(username ?? "").toLowerCase()}`;
      const seen = new Set(existing.map((row) => signature(row.categoryId, row.name, row.username)));

      const data: Prisma.CredentialCreateManyInput[] = [];
      let skippedRows = 0;
      for (const row of parsed.data.credentials) {
        let categoryId = categoryIds.get(row.category.toLowerCase());
        if (!categoryId) {
          categoryId = (
            await tx.credentialCategory.create({ data: { name: row.category, order: nextOrder } })
          ).id;
          nextOrder += 1;
          categoryIds.set(row.category.toLowerCase(), categoryId);
        }

        const rowSignature = signature(categoryId, row.name, row.username);
        if (seen.has(rowSignature)) {
          skippedRows += 1;
          continue;
        }
        seen.add(rowSignature);

        data.push({
          categoryId,
          name: row.name,
          username: row.username || null,
          url: isWebUrl(row.url) ? row.url : null,
          passwordEncrypted: encryptSecret(row.password, key),
          notesEncrypted: row.notes ? encryptSecret(row.notes, key) : null,
          superAdminOnly: row.superAdminOnly,
        });
      }

      if (data.length > 0) await tx.credential.createMany({ data });
      return { created: data.length, skipped: skippedRows };
    },
    { timeout: 60_000 },
  );

  await recordAudit(
    user.id,
    "credential.import",
    `${actorName(user)} ha importat ${created} ${created === 1 ? "contrasenya" : "contrasenyes"}` +
      (skipped > 0 ? ` (${skipped} ja hi eren)` : ""),
  );
  revalidatePath(PATH);
  return { success: true, created, skipped };
}
