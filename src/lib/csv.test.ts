import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/csv";

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
