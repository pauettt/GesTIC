import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Xifrat de les contrasenyes del centre, amb AES-256-GCM i la clau de
 * `VAULT_ENCRYPTION_KEY`. A la base de dades, i a qualsevol còpia que se'n
 * faci, només hi ha text xifrat; GCM, a més, detecta si algú l'ha manipulat.
 *
 * Format: `v1.<iv>.<etiqueta>.<xifrat>`, en base64url. El prefix de versió
 * permet canviar d'algorisme o de clau més endavant sense perdre les antigues.
 *
 * Sense imports amb `@/`: les proves e2e el fan servir per preparar les dades.
 */
const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

/** La clau en base64 ha de ser de 32 bytes; qualsevol altra cosa és un error de configuració. */
export function parseVaultKey(value: string | undefined): Buffer | null {
  if (!value) return null;
  const key = Buffer.from(value, "base64");
  return key.length === 32 ? key : null;
}

export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), encrypted].map((part) =>
    typeof part === "string" ? part : part.toString("base64url"),
  ).join(".");
}

/** Llança si el text no és d'aquesta clau o si s'ha tocat: mai no torna brossa. */
export function decryptSecret(payload: string, key: Buffer): string {
  const [version, iv, tag, encrypted, ...rest] = payload.split(".");
  if (version !== VERSION || !iv || !tag || encrypted === undefined || rest.length > 0) {
    throw new Error("Format de secret desconegut");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString(
    "utf8",
  );
}

/** Clau del servidor. Si falta, no es desa ni es mostra res: millor fallar que guardar en clar. */
export function vaultKey(): Buffer {
  const key = parseVaultKey(process.env.VAULT_ENCRYPTION_KEY);
  if (!key) {
    throw new Error("VAULT_ENCRYPTION_KEY no està configurada o no són 32 bytes en base64");
  }
  return key;
}
