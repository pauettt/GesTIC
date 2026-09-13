import { describe, expect, it } from "vitest";

import { formatCounts, isTestAccountEmail } from "@/lib/test-data";

describe("isTestAccountEmail", () => {
  it("reconeix els comptes del dev login", () => {
    expect(isTestAccountEmail("professor.prova@local.test")).toBe(true);
    expect(isTestAccountEmail(" Admin.Prova@LOCAL.TEST ")).toBe(true);
  });

  it("no confon mai un compte real amb un de prova", () => {
    expect(isTestAccountEmail("ptarazona@iesjmthomas.eu")).toBe(false);
    expect(isTestAccountEmail("local.test@iesjmthomas.eu")).toBe(false);
    expect(isTestAccountEmail("algu@notlocal.test")).toBe(false);
    expect(isTestAccountEmail("professor@e2e.test")).toBe(false);
  });
});

describe("formatCounts", () => {
  const item = (count: number, one: string, many: string) => ({ count, one, many });

  it("només compta el que no és zero, amb singular i plural", () => {
    expect(
      formatCounts([item(3, "incidència", "incidències"), item(0, "préstec", "préstecs"), item(1, "consulta", "consultes")]),
    ).toBe("3 incidències i 1 consulta");
  });

  it("separa amb comes i posa «i» davant l'últim", () => {
    expect(
      formatCounts([item(1, "cita", "cites"), item(2, "reserva", "reserves"), item(4, "nota", "notes")]),
    ).toBe("1 cita, 2 reserves i 4 notes");
  });

  it("sense res, no diu res", () => {
    expect(formatCounts([item(0, "cita", "cites")])).toBe("");
  });
});
