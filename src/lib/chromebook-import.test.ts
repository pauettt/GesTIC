import { describe, expect, it } from "vitest";

import {
  CART_SHEET_FIELDS,
  detectColumns,
  planCartImport,
  planChromebookImport,
  type ExistingInventory,
} from "@/lib/chromebook-import";

const HEADER = ["f", "Marca", "NS", "nº Carretó", "Nº aula", "NOM AULA", "INCIDÈNCIES"];
const EMPTY: ExistingInventory = { spaces: [], cartNames: [], assetTags: [], serialNumbers: [] };

function plan(rows: string[][], existing = EMPTY, withoutCart: "pool" | "skip" = "pool") {
  const { headerRow, mapping } = detectColumns(rows);
  return planChromebookImport(rows, { headerRow, mapping, withoutCart, defaultDeviceType: "CHROMEBOOK" }, existing);
}

describe("detectColumns", () => {
  it("reconeix les columnes pel títol, sense mirar accents, majúscules ni signes", () => {
    expect(detectColumns([HEADER])).toEqual({
      headerRow: 0,
      mapping: { position: 0, brand: 1, serialNumber: 2, cart: 3, roomNumber: 4, roomName: 5 },
    });
  });

  it("troba la fila de títols encara que el full porti un títol a sobre", () => {
    expect(detectColumns([["Inventari de Chromebooks 2026"], [], HEADER]).headerRow).toBe(2);
  });
});

describe("planChromebookImport", () => {
  it("crea l'aula, el carro amb l'aula on és i les etiquetes pel número dins del carro", () => {
    const result = plan([
      HEADER,
      ["1", "asus", "SN-A", "1", "A.004", "Rosalia", "pantalla"],
      ["2", "asus", "SN-B", "1", "A.004", "Rosalia", ""],
      ["12", "asus", "SN-C", "1", "A.004", "Rosalia", ""],
    ]);

    expect(result.newSpaces).toEqual([{ name: "A.004 · Rosalia", number: "A.004", roomName: "Rosalia" }]);
    expect(result.carts).toEqual([
      { name: "Carro 1 (A.004)", spaceName: "A.004 · Rosalia", chromebooks: 3, exists: false },
    ]);
    expect(result.chromebooks.map((c) => c.assetTag)).toEqual(["C1-01", "C1-02", "C1-12"]);
    expect(result.chromebooks[0]).toMatchObject({ serialNumber: "SN-A", brand: "asus", cartName: "Carro 1 (A.004)" });
    expect(result.errors).toEqual([]);
  });

  it("el carro va a l'aula on hi ha més equips seus", () => {
    const result = plan([
      HEADER,
      ["1", "asus", "SN-A", "2", "A.002", "", ""],
      ["2", "asus", "SN-B", "2", "A.002", "", ""],
      ["3", "asus", "SN-C", "2", "B.101", "", ""],
    ]);
    expect(result.carts[0]).toMatchObject({ name: "Carro 2 (A.002)", spaceName: "A.002" });
    expect(result.newSpaces.map((s) => s.name)).toEqual(["A.002"]);
  });

  it("aprofita les aules i els carros que ja hi són, i no torna a crear els equips que ja existeixen", () => {
    const result = plan(
      [HEADER, ["1", "asus", "SN-A", "1", "A.004", "Rosalia", ""], ["2", "asus", "SN-B", "1", "A.004", "Rosalia", ""]],
      {
        spaces: [{ name: "A.004 · Rosalia", number: "A.004" }],
        cartNames: ["Carro 1 (A.004)"],
        assetTags: ["C1-01"],
        serialNumbers: [],
      },
    );

    expect(result.newSpaces).toEqual([]);
    expect(result.carts).toEqual([
      { name: "Carro 1 (A.004)", spaceName: "A.004 · Rosalia", chromebooks: 1, exists: true },
    ]);
    expect(result.duplicates).toEqual([{ row: 2, message: "Ja hi ha un dispositiu amb l'etiqueta C1-01" }]);
    expect(result.chromebooks.map((c) => c.assetTag)).toEqual(["C1-02"]);
  });

  it("els equips sense carro van al préstec a l'alumnat, amb etiqueta nova i número de sèrie obligatori", () => {
    const result = plan(
      [HEADER, ["", "asus", "SN-P1", "", "", "", ""], ["", "asus", "", "", "", "", ""]],
      { ...EMPTY, assetTags: ["ALU-07"] },
    );

    expect(result.withoutCart).toBe(2);
    expect(result.chromebooks).toEqual([
      {
        row: 2,
        assetTag: "ALU-08",
        serialNumber: "SN-P1",
        brand: "asus",
        model: null,
        deviceType: "CHROMEBOOK",
        cartName: null,
      },
    ]);
    expect(result.errors).toEqual([
      { row: 3, message: "Sense carro ni número de sèrie: no pot anar al préstec a l'alumnat" },
    ]);
  });

  it("si es tria no importar-los, els equips sense carro només es compten", () => {
    const result = plan([HEADER, ["", "asus", "SN-P1", "", "", "", ""]], EMPTY, "skip");
    expect(result).toMatchObject({ withoutCart: 1, chromebooks: [], errors: [] });
  });

  it("una coma o un punt de més al final del carro no en crea un altre", () => {
    const result = plan([
      HEADER,
      ["1", "asus", "SN-A", "Conselleria", "", "", ""],
      ["2", "asus", "SN-B", "Conselleria,", "", "", ""],
    ]);
    expect(result.carts).toEqual([{ name: "Conselleria", spaceName: null, chromebooks: 2, exists: false }]);
  });

  it("el tipus surt de la columna si n'hi ha, i si no, del que es tria per a tot el full", () => {
    const rows = [
      [...HEADER, "Tipus"],
      ["1", "apple", "SN-I", "5", "", "", "", "iPad 9"],
      ["2", "asus", "SN-C", "5", "", "", "", ""],
    ];
    const { headerRow, mapping } = detectColumns(rows);
    const result = planChromebookImport(
      rows,
      { headerRow, mapping, withoutCart: "pool", defaultDeviceType: "PORTATIL" },
      EMPTY,
    );
    expect(result.chromebooks.map((c) => c.deviceType)).toEqual(["IPAD", "PORTATIL"]);
  });

  it("sense triar el tipus, les files que no el diuen no s'importen: no se suposa que són Chromebooks", () => {
    const rows = [
      [...HEADER, "Tipus"],
      ["1", "apple", "SN-I", "5", "", "", "", "iPad 9"],
      ["2", "asus", "SN-C", "5", "", "", "", ""],
    ];
    const { headerRow, mapping } = detectColumns(rows);
    const result = planChromebookImport(rows, { headerRow, mapping, withoutCart: "pool", defaultDeviceType: null }, EMPTY);
    expect(result.chromebooks.map((c) => c.assetTag)).toEqual(["C5-01"]);
    expect(result.withoutType).toBe(1);
    expect(result.errors).toEqual([{ row: 3, message: expect.stringContaining("tipus de dispositiu") }]);
  });

  it("un número de sèrie repetit al full és un error, i el primer sí que s'importa", () => {
    const result = plan([HEADER, ["1", "asus", "SN-A", "1", "", "", ""], ["2", "asus", "sn-a", "1", "", "", ""]]);
    expect(result.chromebooks.map((c) => c.assetTag)).toEqual(["C1-01"]);
    expect(result.errors).toEqual([{ row: 3, message: "El número de sèrie sn-a ja surt a la fila 2" }]);
  });
});

describe("planCartImport", () => {
  function cartPlan(rows: string[][], existing = EMPTY, defaultDeviceType: "CHROMEBOOK" | null = null) {
    const { headerRow, mapping } = detectColumns(rows, CART_SHEET_FIELDS);
    return planCartImport(rows, { headerRow, mapping, defaultDeviceType }, existing);
  }

  it("només mira les columnes d'un carro: un «N» no es pren per número dins del carro", () => {
    expect(detectColumns([["N", "Etiqueta", "NS", "Marca"]], CART_SHEET_FIELDS).mapping).toEqual({
      assetTag: 1,
      serialNumber: 2,
      brand: 3,
    });
  });

  it("el «Nombre» del full és l'etiqueta", () => {
    expect(detectColumns([["Nombre", "Número de serie", "Marca"]], CART_SHEET_FIELDS).mapping).toEqual({
      assetTag: 0,
      serialNumber: 1,
      brand: 2,
    });
  });

  it("importa cada fila amb la seva etiqueta, número de sèrie, marca i tipus", () => {
    const rows = [
      ["Etiqueta", "Número de sèrie", "Marca", "Tipus"],
      ["C4-01", "SN1", "Lenovo", "Chromebook"],
      ["C4-02", "", "Apple", "iPad"],
      ["", "", "", ""],
    ];
    expect(cartPlan(rows).chromebooks).toEqual([
      { row: 2, assetTag: "C4-01", serialNumber: "SN1", brand: "Lenovo", model: null, deviceType: "CHROMEBOOK" },
      { row: 3, assetTag: "C4-02", serialNumber: null, brand: "Apple", model: null, deviceType: "IPAD" },
    ]);
  });

  it("no crea mai un dispositiu dues vegades: ni si ja existeix ni si surt repetit al full", () => {
    const rows = [
      ["Etiqueta", "NS", "Tipus"],
      ["C4-01", "SN1", "Chromebook"],
      ["c4-02", "SN2", "Chromebook"],
      ["C4-03", "sn9", "Chromebook"],
      ["C4-04", "SN4", "Chromebook"],
      ["C4-04", "SN5", "Chromebook"],
      ["C4-06", "sn4", "Chromebook"],
    ];
    const result = cartPlan(rows, { ...EMPTY, assetTags: ["C4-02"], serialNumbers: ["SN9"] });
    expect(result.chromebooks.map((c) => c.assetTag)).toEqual(["C4-01", "C4-04"]);
    expect(result.duplicates).toEqual([
      { row: 3, message: "Ja hi ha un dispositiu amb l'etiqueta c4-02" },
      { row: 4, message: "Ja hi ha un dispositiu amb el número de sèrie sn9" },
    ]);
    expect(result.errors).toEqual([
      { row: 6, message: "L'etiqueta C4-04 ja surt a la fila 5" },
      { row: 7, message: "El número de sèrie sn4 ja surt a la fila 5" },
    ]);
  });

  it("una fila sense etiqueta no s'importa", () => {
    const result = cartPlan([["Etiqueta", "NS", "Tipus"], ["", "SN1", "Chromebook"]]);
    expect(result.chromebooks).toEqual([]);
    expect(result.errors).toEqual([{ row: 2, message: "No té etiqueta" }]);
  });

  it("les files sense tipus esperen que se'n triï un, i llavors el prenen", () => {
    const rows = [
      ["Etiqueta", "NS", "Marca"],
      ["C4-01", "SN1", "Lenovo"],
    ];
    const pending = cartPlan(rows);
    expect(pending.withoutType).toBe(1);
    expect(pending.chromebooks).toEqual([]);
    expect(cartPlan(rows, EMPTY, "CHROMEBOOK").chromebooks.map((c) => c.deviceType)).toEqual(["CHROMEBOOK"]);
  });
});
