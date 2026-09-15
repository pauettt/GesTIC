import { describe, expect, it } from "vitest";

import { chromebookStatusFor } from "@/lib/chromebook-status";

describe("chromebookStatusFor", () => {
  it("no treu mai la baixa, passi el que passi", () => {
    expect(chromebookStatusFor({ current: "BAIXA", hasOpenIncident: true, isAssigned: true })).toBe("BAIXA");
    expect(chromebookStatusFor({ current: "BAIXA", hasOpenIncident: false, isAssigned: false })).toBe("BAIXA");
  });

  it("un equip marcat com a no disponible ho continua sent fins que la coordinació ho canvia", () => {
    expect(chromebookStatusFor({ current: "NO_DISPONIBLE", hasOpenIncident: false, isAssigned: false })).toBe(
      "NO_DISPONIBLE",
    );
    // Tancar una incidència que s'hi hagi obert mentrestant no el torna a donar per bo.
    expect(chromebookStatusFor({ current: "NO_DISPONIBLE", hasOpenIncident: true, isAssigned: false })).toBe(
      "NO_DISPONIBLE",
    );
  });

  it("amb una incidència oberta l'equip és fora de servei, encara que el tingui un alumne", () => {
    expect(chromebookStatusFor({ current: "DISPONIBLE", hasOpenIncident: true, isAssigned: false })).toBe(
      "EN_INCIDENCIA",
    );
    expect(chromebookStatusFor({ current: "ASSIGNAT", hasOpenIncident: true, isAssigned: true })).toBe(
      "EN_INCIDENCIA",
    );
  });

  it("en tancar la incidència d'un equip del pool torna a l'alumne i no queda lliure", () => {
    // És el cas que permetia assignar el mateix Chromebook a dos alumnes.
    expect(chromebookStatusFor({ current: "EN_INCIDENCIA", hasOpenIncident: false, isAssigned: true })).toBe(
      "ASSIGNAT",
    );
  });

  it("tancar una de dues incidències obertes no el dona per bo", () => {
    expect(chromebookStatusFor({ current: "EN_INCIDENCIA", hasOpenIncident: true, isAssigned: false })).toBe(
      "EN_INCIDENCIA",
    );
  });

  it("sense incidències ni alumne, és lliure", () => {
    expect(chromebookStatusFor({ current: "EN_INCIDENCIA", hasOpenIncident: false, isAssigned: false })).toBe(
      "DISPONIBLE",
    );
    expect(chromebookStatusFor({ current: "RESERVAT", hasOpenIncident: false, isAssigned: false })).toBe(
      "DISPONIBLE",
    );
  });
});
