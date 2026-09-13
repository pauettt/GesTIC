"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { notifyQueryComment, notifyQueryCreated } from "@/lib/notifications";
import { isAdmin, requireAdmin, requireUser } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  addQueryCommentSchema,
  createQuerySchema,
  updateQueryStatusSchema,
} from "@/lib/validations/query";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createQuery(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }

  const limited = await checkRateLimit("query", user.id);
  if (limited) return { success: false, error: limited };

  const query = await db.query.create({
    data: {
      authorId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
    },
  });

  await notifyQueryCreated(query.id);

  revalidatePath("/consultes");
  redirect(`/consultes/${query.id}`);
}

export async function addQueryComment(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addQueryCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }

  const query = await db.query.findUnique({ where: { id: parsed.data.queryId } });
  if (!query) return { success: false, error: "La consulta no existeix" };
  if (!isAdmin(user.role) && query.authorId !== user.id) {
    return { success: false, error: "No tens permís per comentar aquesta consulta" };
  }

  const comment = await db.queryComment.create({
    data: {
      queryId: parsed.data.queryId,
      authorId: user.id,
      body: parsed.data.body,
    },
  });

  await notifyQueryComment(comment.id);

  revalidatePath(`/consultes/${parsed.data.queryId}`);
  return { success: true };
}

export async function updateQueryStatus(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateQueryStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }

  const { queryId, status, expectedStatus } = parsed.data;

  const before = await db.query.findUnique({
    where: { id: queryId },
    select: { status: true, resolvedAt: true },
  });
  if (!before) return { success: false, error: "La consulta no existeix" };

  // Com a les incidències: si l'estat ja no és el que veia qui el canvia, algú
  // altre de coordinació l'acaba de tocar, i no es trepitja en silenci.
  const isClosing = status === "RESOLTA" || status === "TANCADA";
  const updated =
    expectedStatus && before.status !== expectedStatus
      ? { count: 0 }
      : await db.query.updateMany({
          where: { id: queryId, status: before.status },
          data: {
            status,
            // Passar de Resolta a Tancada no ha de canviar quan es va resoldre.
            resolvedAt: isClosing ? (before.resolvedAt ?? new Date()) : null,
          },
        });
  if (updated.count === 0) {
    revalidatePath(`/consultes/${queryId}`);
    return {
      success: false,
      error: "Algú altre acaba de canviar l'estat d'aquesta consulta. Torna-ho a mirar.",
    };
  }

  revalidatePath(`/consultes/${parsed.data.queryId}`);
  revalidatePath("/consultes");
  return { success: true };
}
