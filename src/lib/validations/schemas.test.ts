import { describe, expect, it } from "vitest";

import { isDateKey, isDateTimeLocal } from "@/lib/validations/common";
import { createIncidentSchema } from "@/lib/validations/incident";
import { createLoanRequestSchema } from "@/lib/validations/loans";
import {
  createStudentDeviceRequestSchema,
  respondStudentDeviceRequestSchema,
} from "@/lib/validations/student-devices";
import { upsertTutorialVideoSchema } from "@/lib/validations/tutorials";

const BLOB = "https://abc123.public.blob.vercel-storage.com";

describe("formats de data", () => {
  it("isDateKey accepta només dies que existeixen", () => {
    expect(isDateKey("2026-09-14")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2026-02-31")).toBe(false);
    expect(isDateKey("2026-9-14")).toBe(false);
    expect(isDateKey("")).toBe(false);
  });

  it("isDateTimeLocal accepta el format de l'input i res més", () => {
    expect(isDateTimeLocal("2026-09-14T08:00")).toBe(true);
    expect(isDateTimeLocal("2026-09-14T24:00")).toBe(false);
    expect(isDateTimeLocal("2026-09-14T08:00:00")).toBe(false);
    expect(isDateTimeLocal("2026-09-14")).toBe(false);
  });
});

describe("createIncidentSchema", () => {
  const base = { description: "El projector no s'encén", priority: "MITJANA" as const };

  it("una incidència d'aula demana l'aula", () => {
    expect(createIncidentSchema.safeParse({ ...base, targetType: "GENERAL", spaceId: "s1" }).success).toBe(true);
    expect(createIncidentSchema.safeParse({ ...base, targetType: "GENERAL" }).success).toBe(false);
  });

  it("una incidència d'equip demana quin equip", () => {
    expect(
      createIncidentSchema.safeParse({ ...base, targetType: "INVENTORY_ITEM", spaceId: "s1" }).success,
    ).toBe(false);
  });

  it("una incidència de l'entorn Google demana el servei i no l'aula", () => {
    expect(createIncidentSchema.safeParse({ ...base, targetType: "GOOGLE_WORKSPACE" }).success).toBe(false);
    expect(
      createIncidentSchema.safeParse({ ...base, targetType: "GOOGLE_WORKSPACE", googleService: "CLASSROOM" })
        .success,
    ).toBe(true);
  });

  it("les fotos han de ser del nostre blob store, i com a molt dues", () => {
    const withPhotos = (photoUrls: string[]) =>
      createIncidentSchema.safeParse({ ...base, targetType: "GENERAL", spaceId: "s1", photoUrls }).success;
    expect(withPhotos([`${BLOB}/a.jpg`, `${BLOB}/b.jpg`])).toBe(true);
    expect(withPhotos(["https://evil.com/a.jpg"])).toBe(false);
    expect(withPhotos([`${BLOB}/a.jpg`, `${BLOB}/b.jpg`, `${BLOB}/c.jpg`])).toBe(false);
  });
});

describe("sol·licituds de Chromebook per a l'alumnat", () => {
  const student = { studentFirstName: "Aina", studentLastName: "Serra Vidal" };

  it("un motiu de la llista no demana explicació", () => {
    expect(createStudentDeviceRequestSchema.safeParse({ ...student, reason: "SENSE_DISPOSITIU" }).success).toBe(
      true,
    );
  });

  it("«Un altre motiu» obliga a explicar-lo", () => {
    expect(createStudentDeviceRequestSchema.safeParse({ ...student, reason: "ALTRE" }).success).toBe(false);
    expect(
      createStudentDeviceRequestSchema.safeParse({ ...student, reason: "ALTRE", reasonNote: "Tauleta del germà" })
        .success,
    ).toBe(true);
  });

  it("no es pot aprovar sense dir quin equip s'assigna", () => {
    expect(respondStudentDeviceRequestSchema.safeParse({ id: "r1", status: "APROVADA" }).success).toBe(false);
    expect(
      respondStudentDeviceRequestSchema.safeParse({ id: "r1", status: "APROVADA", chromebookId: "c1" }).success,
    ).toBe(true);
    expect(respondStudentDeviceRequestSchema.safeParse({ id: "r1", status: "REBUTJADA" }).success).toBe(true);
  });
});

describe("altres formularis", () => {
  it("un préstec no pot tornar abans de començar ni portar dates inventades", () => {
    const request = (startDate: string, endDate: string) =>
      createLoanRequestSchema.safeParse({ itemId: "i1", startDate, endDate }).success;
    expect(request("2026-09-14", "2026-09-18")).toBe(true);
    expect(request("2026-09-18", "2026-09-14")).toBe(false);
    expect(request("2026-09-14", "2026-02-31")).toBe(false);
  });

  it("un tutorial ha de ser un vídeo de YouTube", () => {
    const video = (url: string) =>
      upsertTutorialVideoSchema.safeParse({ categoryId: "c1", url, title: "Crear una classe" }).success;
    expect(video("https://youtu.be/jNQXAC9IVRw")).toBe(true);
    expect(video("https://vimeo.com/123456789")).toBe(false);
    expect(video("javascript:alert(1)")).toBe(false);
  });
});
