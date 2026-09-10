"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { deleteFaqSchema, upsertFaqSchema } from "@/lib/validations/faq";

export type ActionResult = { success: true } | { success: false; error: string };

export async function upsertFaq(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertFaqSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;
  const order = data.order ? Number(data.order) : 0;

  const payload = {
    question: data.question,
    answer: data.answer,
    category: data.category,
    order: Number.isNaN(order) ? 0 : order,
  };

  if (data.id) {
    await db.faqEntry.update({ where: { id: data.id }, data: payload });
  } else {
    await db.faqEntry.create({ data: payload });
  }

  revalidatePath("/dubtes");
  return { success: true };
}

export async function deleteFaq(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteFaqSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.faqEntry.delete({ where: { id: parsed.data.id } });
  revalidatePath("/dubtes");
  return { success: true };
}
