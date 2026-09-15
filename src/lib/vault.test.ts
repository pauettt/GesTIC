import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret, parseVaultKey } from "@/lib/vault";

const key = randomBytes(32);

describe("xifrat de les contrasenyes", () => {
  it("es recupera exactament el que es va desar, espais i accents inclosos", () => {
    for (const secret of ["", "  amb espais  ", "Contrasenya·2026!", "àèéíòóú ñ ç 🔑"]) {
      expect(decryptSecret(encryptSecret(secret, key), key)).toBe(secret);
    }
  });

  it("la mateixa contrasenya no queda mai igual a la base de dades", () => {
    expect(encryptSecret("repetida", key)).not.toBe(encryptSecret("repetida", key));
    expect(encryptSecret("repetida", key)).not.toContain("repetida");
  });

  it("amb una altra clau no es pot llegir", () => {
    const payload = encryptSecret("secreta", key);
    expect(() => decryptSecret(payload, randomBytes(32))).toThrow();
  });

  it("si algú toca el text xifrat, falla en comptes de tornar brossa", () => {
    const [version, iv, tag, encrypted] = encryptSecret("secreta", key).split(".");
    const flipped = Buffer.from(encrypted, "base64url");
    flipped[0] ^= 1;
    expect(() => decryptSecret([version, iv, tag, flipped.toString("base64url")].join("."), key)).toThrow();
    expect(() => decryptSecret("no-és-un-secret", key)).toThrow();
  });

  it("la clau ha de ser de 32 bytes en base64", () => {
    expect(parseVaultKey(randomBytes(32).toString("base64"))).toHaveLength(32);
    expect(parseVaultKey(randomBytes(16).toString("base64"))).toBeNull();
    expect(parseVaultKey("")).toBeNull();
    expect(parseVaultKey(undefined)).toBeNull();
  });
});
