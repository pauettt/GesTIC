import { describe, expect, it } from "vitest";

import { parseCredentialSheet } from "@/lib/credential-import";

describe("parseCredentialSheet", () => {
  it("llegeix el full tal com surt de Google Sheets, amb les franges com a categories", () => {
    const result = parseCredentialSheet([
      ["", "Usuari", "Contrasenya", "OBSERVACIONS"],
      ["", "", "COMPTES", ""],
      ["Xarxa social A", "centre@example.com", "prova-1", ""],
      ["Xarxa social B", "centre@example.com", " prova 2 ", "La gestiona direcció"],
      ["", "", "", ""],
      ["", "", "IMPRESSORES", ""],
      ["Impressora consergeria", "Admin", "prova-3", ""],
    ]);

    expect(result).toEqual({
      ok: true,
      skipped: 0,
      credentials: [
        { category: "Comptes", name: "Xarxa social A", username: "centre@example.com", password: "prova-1", url: "", notes: "" },
        { category: "Comptes", name: "Xarxa social B", username: "centre@example.com", password: " prova 2 ", url: "", notes: "La gestiona direcció" },
        { category: "Impressores", name: "Impressora consergeria", username: "Admin", password: "prova-3", url: "", notes: "" },
      ],
    });
  });

  it("reconeix els títols sense mirar accents ni majúscules, i també en castellà", () => {
    const result = parseCredentialSheet([
      ["Nombre", "USUARIO", "Contraseña", "Enlace", "Observaciones"],
      ["Router", "admin", "prova", "http://192.168.0.1", "Planta 0"],
    ]);

    expect(result).toEqual({
      ok: true,
      skipped: 0,
      credentials: [
        { category: "Sense categoria", name: "Router", username: "admin", password: "prova", url: "http://192.168.0.1", notes: "Planta 0" },
      ],
    });
  });

  it("les files sense nom no s'importen, però es compten", () => {
    const result = parseCredentialSheet([
      ["", "Usuari", "Contrasenya"],
      ["", "algú", "prova"],
      ["Ordinador direcció", "dir", "prova"],
    ]);

    expect(result).toMatchObject({ ok: true, skipped: 1 });
    expect(result.ok && result.credentials.map((c) => c.name)).toEqual(["Ordinador direcció"]);
  });

  it("sense columna de contrasenya no és el full que toca", () => {
    expect(parseCredentialSheet([["planta", "Nom d'aula", "IP"], ["0", "Consergeria", "10.0.0.1"]])).toMatchObject({
      ok: false,
    });
  });
});
