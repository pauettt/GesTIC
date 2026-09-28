import { describe, expect, it } from "vitest";

import { incidentPage, incidentReturnHref, incidentSearchQuery } from "@/lib/incident-list";

describe("paginació d'incidències", () => {
  it("ajusta una pàgina fora de rang, també després de desaparèixer l'últim resultat", () => {
    expect(incidentPage("3", 26)).toEqual({ page: 2, pages: 2, skip: 25 });
    expect(incidentPage("2", 25)).toEqual({ page: 1, pages: 1, skip: 0 });
    expect(incidentPage("2", 0)).toEqual({ page: 1, pages: 1, skip: 0 });
  });

  it.each([undefined, ["2"], "-1", "0", "1.5", "Infinity", "99999999999999999999"])(
    "no admet offsets invàlids: %s",
    (value) => expect(incidentPage(value, 100).page).toBe(1),
  );
});

describe("retorn al llistat", () => {
  it("conserva cerca, filtres i pàgina en una ruta local", () => {
    const href = "/incidencies?assignada=jo&curs=TOTS&q=projector&pagina=2";
    expect(incidentReturnHref(href)).toBe(href);
  });

  it.each([undefined, ["/incidencies"], "https://extern.test", "//extern.test/incidencies", "javascript:alert(1)", "/inventari", "/incidencies/123", "/incidencies/../administracio"])(
    "rebutja destinacions que no són el llistat: %s",
    (value) => expect(incidentReturnHref(value)).toBe("/incidencies"),
  );
});

describe("text de cerca", () => {
  it("normalitza espais, descarta paràmetres repetits i limita entrades llargues", () => {
    expect(incidentSearchQuery("  projector  ")).toBe("projector");
    expect(incidentSearchQuery(["projector", "altre"])).toBe("");
    expect(incidentSearchQuery("a".repeat(300))).toHaveLength(200);
  });
});
