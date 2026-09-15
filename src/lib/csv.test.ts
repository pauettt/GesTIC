import { describe, expect, it } from "vitest";

import { parseCsv, toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("neutralitza les cel·les que un full de càlcul executaria com a fórmula", () => {
    expect(toCsv([["=1+1"]])).toBe("'=1+1");
    expect(toCsv([["+34 600"]])).toBe("'+34 600");
    expect(toCsv([["-5"]])).toBe("'-5");
    expect(toCsv([["@SUM(A1)"]])).toBe("'@SUM(A1)");
    expect(toCsv([["\tx"]])).toBe("'\tx");
  });

  it("una fórmula amb cometes queda neutralitzada i ben escapada", () => {
    expect(toCsv([['=HYPERLINK("http://exemple.com")']])).toBe('"\'=HYPERLINK(""http://exemple.com"")"');
  });

  it("escapa comes, cometes i salts de línia", () => {
    expect(toCsv([["a,b", 'diu "hola"', "línia\nnova", "normal"]])).toBe(
      '"a,b","diu ""hola""","línia\nnova",normal',
    );
  });

  it("separa les files amb salts de línia", () => {
    expect(toCsv([["a", "b"], ["c", "d"]])).toBe("a,b\nc,d");
  });
});

describe("parseCsv", () => {
  it("llegeix cel·les entre cometes amb comes, cometes i salts de línia", () => {
    expect(parseCsv('nom,nota\n"Router, hall","diu ""hola""\nsegona línia"')).toEqual([
      ["nom", "nota"],
      ["Router, hall", 'diu "hola"\nsegona línia'],
    ]);
  });

  it("accepta finals de línia de Windows, la marca BOM i cel·les buides", () => {
    expect(parseCsv("\uFEFFa,,c\r\n,,\r\n")).toEqual([
      ["a", "", "c"],
      ["", "", ""],
    ]);
  });

  it("detecta el punt i coma de l'Excel en català o castellà", () => {
    expect(parseCsv("Nom;Usuari;Contrasenya\nImpressora;admin;1,2,3")).toEqual([
      ["Nom", "Usuari", "Contrasenya"],
      ["Impressora", "admin", "1,2,3"],
    ]);
  });

  it("no retalla res: els espais poden ser part d'una contrasenya", () => {
    expect(parseCsv(" a , b ")).toEqual([[" a ", " b "]]);
  });
});
