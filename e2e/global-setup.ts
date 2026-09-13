import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

import { AUTH_DIR, E2E_DATABASE_URL, assertLocalDatabase } from "./env";
import { seed } from "./fixtures";
import { authFile } from "./helpers";

/**
 * Deixa la base de dades de proves com nova abans de cada execució: esborra-ho
 * tot, hi aplica les mateixes migracions que producció i hi posa les dades de
 * prova. Cada execució comença igual i no depèn de la d'abans.
 */
export default async function globalSetup() {
  assertLocalDatabase(E2E_DATABASE_URL);

  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, DIRECT_URL: E2E_DATABASE_URL },
    });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    throw new Error(`No s'han pogut aplicar les migracions a la base de dades de proves:\n${stderr}`);
  }

  const { fixtures, tokens } = await seed(E2E_DATABASE_URL);

  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(path.join(AUTH_DIR, "fixtures.json"), JSON.stringify(fixtures, null, 2));

  const expires = Math.floor(Date.now() / 1000) + 86_400;
  for (const [user, token] of Object.entries(tokens) as [keyof typeof tokens, string][]) {
    writeFileSync(
      authFile(user),
      JSON.stringify({
        cookies: [
          {
            name: "authjs.session-token",
            value: token,
            domain: "localhost",
            path: "/",
            expires,
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
          },
        ],
        origins: [],
      }),
    );
  }
}
