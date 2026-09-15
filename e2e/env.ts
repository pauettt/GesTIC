import { userInfo } from "node:os";
import path from "node:path";

export const E2E_PORT = 3200;
export const BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * Base de dades de les proves: el PostgreSQL local, mai el de Supabase. Es pot
 * canviar amb `E2E_DATABASE_URL`, però `assertLocalDatabase` segueix manant.
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? `postgresql://${userInfo().username}@localhost:5432/gestic_e2e`;

/** Clau de xifrat de les contrasenyes a les proves. No protegeix res: les dades són inventades. */
export const E2E_VAULT_KEY = Buffer.alloc(32, 7).toString("base64");

/** Sessions i identificadors que genera cada execució (fora del repositori). */
export const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");

/**
 * Les proves buiden la base de dades on s'executen. Abans de tocar-ne res es
 * comprova que sigui local i que el nom digui que és de proves: així una
 * variable mal posada no pot esborrar ni les dades del centre ni cap altra base
 * de dades de l'ordinador.
 */
export function assertLocalDatabase(url: string) {
  const { hostname, pathname } = new URL(url);
  const isLocal = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
  const isTestDatabase = pathname.replace(/^\//, "").includes("e2e");
  if (!isLocal || !isTestDatabase) {
    throw new Error(
      `Les proves e2e només s'executen contra una base de dades local de proves (amb "e2e" al nom). S'ha rebutjat: ${hostname}${pathname}`,
    );
  }
}
