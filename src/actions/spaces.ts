"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { spaceName } from "@/lib/spaces";
import {
  deleteBuildingSchema,
  deleteFloorSchema,
  deleteSpaceSchema,
  reorderBuildingSchema,
  reorderFloorSchema,
  upsertBuildingSchema,
  upsertFloorSchema,
  upsertSpaceSchema,
} from "@/lib/validations/space";

export type ActionResult = { success: true } | { success: false; error: string };

function prismaCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

export async function upsertSpace(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertSpaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, number, roomName, buildingId, floorId } = parsed.data;
  const data = {
    name: spaceName({ number, roomName }),
    number: number || null,
    roomName: roomName || null,
    buildingId: buildingId || null,
    floorId: floorId || null,
  };

  try {
    if (id) {
      await db.space.update({ where: { id }, data });
    } else {
      await db.space.create({ data });
    }
  } catch (error) {
    // P2003: l'edifici o la planta triats s'han eliminat mentre el diàleg era obert.
    if (prismaCode(error) === "P2003") {
      return { success: false, error: "L'edifici o la planta triats ja no existeixen: torna a obrir el diàleg" };
    }
    if (prismaCode(error) === "P2002") {
      return { success: false, error: "Ja hi ha un espai amb aquest número o aquest nom" };
    }
    throw error;
  }

  revalidatePath("/espais");
  revalidatePath("/panell");
  return { success: true };
}

export async function deleteSpace(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteSpaceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.space.delete({ where: { id: parsed.data.id } });
  revalidatePath("/espais");
  revalidatePath("/panell");
  return { success: true };
}

export async function upsertBuilding(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertBuildingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, name } = parsed.data;
  const order = Number(parsed.data.order || 0);
  const data = { name, order: Number.isNaN(order) ? 0 : order };

  try {
    if (id) {
      await db.building.update({ where: { id }, data });
    } else {
      await db.building.create({ data });
    }
  } catch (error) {
    if (prismaCode(error) === "P2002") {
      return { success: false, error: "Ja hi ha un edifici amb aquest nom" };
    }
    throw error;
  }

  revalidatePath("/espais");
  return { success: true };
}

export async function reorderBuilding(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderBuildingSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id, direction } = parsed.data;

  const buildings = await db.building.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  const index = buildings.findIndex((building) => building.id === id);
  if (index === -1) return { success: false, error: "L'edifici ja no existeix" };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= buildings.length) return { success: true };

  const reordered = [...buildings];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await db.$transaction(
    reordered.map((building, position) =>
      db.building.update({ where: { id: building.id }, data: { order: position } }),
    ),
  );

  revalidatePath("/espais");
  return { success: true };
}

export async function deleteBuilding(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteBuildingSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  try {
    await db.building.delete({ where: { id: parsed.data.id } });
  } catch (error) {
    // El diàleg ja no deixa eliminar-ne un amb espais; això és si n'hi han posat un mentrestant.
    if (prismaCode(error) === "P2003") {
      return { success: false, error: "No es pot eliminar: hi ha espais en aquest edifici" };
    }
    throw error;
  }

  revalidatePath("/espais");
  return { success: true };
}

export async function upsertFloor(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertFloorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, name } = parsed.data;
  const order = Number(parsed.data.order || 0);
  const data = { name, order: Number.isNaN(order) ? 0 : order };

  try {
    if (id) {
      await db.floor.update({ where: { id }, data });
    } else {
      await db.floor.create({ data });
    }
  } catch (error) {
    if (prismaCode(error) === "P2002") {
      return { success: false, error: "Ja hi ha una planta amb aquest nom" };
    }
    throw error;
  }

  revalidatePath("/espais");
  return { success: true };
}

export async function reorderFloor(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderFloorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id, direction } = parsed.data;

  const floors = await db.floor.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  const index = floors.findIndex((floor) => floor.id === id);
  if (index === -1) return { success: false, error: "La planta ja no existeix" };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= floors.length) return { success: true };

  const reordered = [...floors];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await db.$transaction(
    reordered.map((floor, position) =>
      db.floor.update({ where: { id: floor.id }, data: { order: position } }),
    ),
  );

  revalidatePath("/espais");
  return { success: true };
}

export async function deleteFloor(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteFloorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  try {
    await db.floor.delete({ where: { id: parsed.data.id } });
  } catch (error) {
    // El diàleg ja no deixa eliminar-ne una amb espais; això és si n'hi han posat un mentrestant.
    if (prismaCode(error) === "P2003") {
      return { success: false, error: "No es pot eliminar: hi ha espais en aquesta planta" };
    }
    throw error;
  }

  revalidatePath("/espais");
  return { success: true };
}
