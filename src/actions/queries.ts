"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { notifyQueryAnswered, notifyQueryCreated } from "@/lib/notifications";
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

  await notifyQueryAnswered(parsed.data.queryId, comment.id);

  revalidatePath(`/consultes/${parsed.data.queryId}`);
  return { success: true };
}

export async function updateQueryStatus(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateQueryStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }

  const isClosing = parsed.data.status === "RESOLTA" || parsed.data.status === "TANCADA";
  await db.query.update({
    where: { id: parsed.data.queryId },
    data: {
      status: parsed.data.status,
      resolvedAt: isClosing ? new Date() : null,
    },
  });

  revalidatePath(`/consultes/${parsed.data.queryId}`);
  revalidatePath("/consultes");
  return { success: true };
}
