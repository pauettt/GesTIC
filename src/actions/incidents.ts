"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { sendIncidentResolvedEmail } from "@/lib/email";
import { notifyIncidentReported } from "@/lib/notifications";
import { getBaseUrl } from "@/lib/url";
import { checkRateLimit } from "@/lib/rate-limit";
import { isAdmin, requireAdmin, requireUser } from "@/lib/permissions";
import { incidentCategoryDefaultPriority, incidentCategoryLabels } from "@/lib/labels";
import {
  addCommentSchema,
  assignIncidentSchema,
  attachIncidentFileSchema,
  createIncidentSchema,
  quickChromebookIncidentSchema,
  updateIncidentPrioritySchema,
  updateIncidentStatusSchema,
} from "@/lib/validations/incident";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createIncident(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;

  const limited = await checkRateLimit("incident", user.id);
  if (limited) return { success: false, error: limited };

  const space = data.spaceId ? await db.space.findUnique({ where: { id: data.spaceId } }) : null;
  const spaceSuffix = space ? ` — ${space.name}` : "";

  let title = `Incidència general${spaceSuffix}`;
  if (data.targetType === "INVENTORY_ITEM" && data.inventoryItemId) {
    const item = await db.inventoryItem.findUnique({ where: { id: data.inventoryItemId } });
    if (item) title = `${item.brand} ${item.model}${spaceSuffix}`;
  } else if (data.targetType === "CART" && data.cartId) {
    const cart = await db.cart.findUnique({ where: { id: data.cartId } });
    if (cart) title = `Carro ${cart.name}${spaceSuffix}`;
  } else if (data.targetType === "CHROMEBOOK" && data.chromebookId) {
    const chromebook = await db.chromebook.findUnique({ where: { id: data.chromebookId } });
    if (chromebook) title = `Chromebook ${chromebook.assetTag}${spaceSuffix}`;
  }

  const incident = await db.incident.create({
    data: {
      reporterId: user.id,
      title,
      description: data.description,
      category: data.category ?? null,
      priority: data.priority,
      targetType: data.targetType,
      inventoryItemId: data.targetType === "INVENTORY_ITEM" ? data.inventoryItemId : null,
      chromebookId: data.targetType === "CHROMEBOOK" ? data.chromebookId : null,
      cartId: data.targetType === "CART" ? data.cartId : null,
      spaceId: data.spaceId || null,
    },
  });

  if (data.photoUrls?.length) {
    await db.incidentAttachment.createMany({
      data: data.photoUrls.map((url, index) => ({
        incidentId: incident.id,
        url,
        filename: `Foto ${index + 1}`,
      })),
    });
  }

  if (data.targetType === "CHROMEBOOK" && data.chromebookId) {
    await db.chromebook.update({
      where: { id: data.chromebookId },
      data: { status: "EN_INCIDENCIA" },
    });
  }

  await notifyIncidentReported(incident.id);

  revalidatePath("/incidencies");
  redirect(`/incidencies/${incident.id}`);
}

export async function quickReportChromebookIncident(input: unknown): Promise<void> {
  const user = await requireUser();
  const parsed = quickChromebookIncidentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Dades no vàlides");
  }
  const { chromebookId, category } = parsed.data;

  const chromebook = await db.chromebook.findUnique({ where: { id: chromebookId } });
  if (!chromebook) {
    throw new Error("Aquest Chromebook no existeix");
  }

  const categoryLabel = incidentCategoryLabels[category];
  const incident = await db.incident.create({
    data: {
      reporterId: user.id,
      title: `${categoryLabel} — Chromebook ${chromebook.assetTag}`,
      description: `Incidència reportada des del codi QR del Chromebook ${chromebook.assetTag}: ${categoryLabel}.`,
      category,
      priority: incidentCategoryDefaultPriority[category],
      targetType: "CHROMEBOOK",
      chromebookId,
    },
  });

  await db.chromebook.update({ where: { id: chromebookId }, data: { status: "EN_INCIDENCIA" } });

  await notifyIncidentReported(incident.id);

  revalidatePath("/incidencies");
  redirect(`/incidencies/${incident.id}`);
}

export async function addComment(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }

  const incident = await db.incident.findUnique({ where: { id: parsed.data.incidentId } });
  if (!incident) return { success: false, error: "La incidència no existeix" };
  if (!isAdmin(user.role) && incident.reporterId !== user.id) {
    return { success: false, error: "No tens permís per comentar aquesta incidència" };
  }

  await db.incidentComment.create({
    data: {
      incidentId: parsed.data.incidentId,
      authorId: user.id,
      body: parsed.data.body,
    },
  });

  revalidatePath(`/incidencies/${parsed.data.incidentId}`);
  return { success: true };
}

export async function updateIncidentStatus(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = updateIncidentStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { incidentId, status, note } = parsed.data;

  const before = await db.incident.findUnique({
    where: { id: incidentId },
    include: { reporter: true },
  });
  if (!before) return { success: false, error: "La incidència no existeix" };

  const isClosing = status === "RESOLTA" || status === "TANCADA";
  const incident = await db.incident.update({
    where: { id: incidentId },
    data: {
      status,
      // Es conserva la data de la primera resolució: si després es tanca, no
      // s'ha de perdre quan es va resoldre realment.
      resolvedAt: isClosing ? (before.resolvedAt ?? new Date()) : null,
    },
  });

  if (note) {
    await db.incidentComment.create({ data: { incidentId, authorId: admin.id, body: note } });
  }

  if (incident.chromebookId && isClosing) {
    await db.chromebook.update({
      where: { id: incident.chromebookId },
      data: { status: "DISPONIBLE" },
    });
  }

  revalidatePath(`/incidencies/${incidentId}`);
  revalidatePath("/incidencies");

  // Avisem qui va reportar la incidència només quan passa a resolta de debò, i
  // no si se l'ha resolt ell mateix. L'enviament no pot fer fallar l'acció: si
  // el correu no surt, l'estat ja està desat i només se n'informa.
  const justResolved = status === "RESOLTA" && before.status !== "RESOLTA";
  if (justResolved && before.reporterId !== admin.id) {
    const baseUrl = await getBaseUrl();
    const result = await sendIncidentResolvedEmail({
      to: before.reporter.email,
      incidentTitle: before.title,
      resolvedBy: admin.name ?? "Coordinació TIC",
      note: note || null,
      incidentUrl: `${baseUrl}/incidencies/${incidentId}`,
    });
    if (!result.sent) {
      return {
        success: false,
        error: `Incidència resolta, però no s'ha pogut avisar per correu: ${result.reason}`,
      };
    }
  }

  return { success: true };
}

export async function updateIncidentPriority(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateIncidentPrioritySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }

  await db.incident.update({
    where: { id: parsed.data.incidentId },
    data: { priority: parsed.data.priority },
  });

  revalidatePath(`/incidencies/${parsed.data.incidentId}`);
  revalidatePath("/incidencies");
  return { success: true };
}

export async function assignIncident(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = assignIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }

  await db.incident.update({
    where: { id: parsed.data.incidentId },
    data: { assignedToId: parsed.data.assignedToId },
  });

  revalidatePath(`/incidencies/${parsed.data.incidentId}`);
  return { success: true };
}

export async function attachIncidentFile(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = attachIncidentFileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { incidentId, url, filename } = parsed.data;

  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { success: false, error: "La incidència no existeix" };
  if (!isAdmin(user.role) && incident.reporterId !== user.id) {
    return { success: false, error: "No pots adjuntar fitxers a aquesta incidència" };
  }

  await db.incidentAttachment.create({
    data: { incidentId, url, filename },
  });
  revalidatePath(`/incidencies/${incidentId}`);
  return { success: true };
}
