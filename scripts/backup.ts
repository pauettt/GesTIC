import "dotenv/config";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

/**
 * Còpia de seguretat de les dades, en JSON.
 *
 * El pla gratuït de Supabase no fa còpies diàries, i des del 2026-09-15 les
 * dades són reals: incidències, préstecs i noms de menors. Això les treu totes
 * en un fitxer, sense dependre de `pg_dump` ni de quina versió de PostgreSQL hi
 * hagi a cada banda.
 *
 *   BACKUP_DATABASE_URL="<DIRECT_URL de Vercel>" npm run db:backup
 *
 * Sense `BACKUP_DATABASE_URL` copia la base de dades del `.env` (la local), que
 * és útil per provar l'script però no és cap còpia de seguretat de res.
 *
 * Amb `BACKUP_DIR` el fitxer va on es digui —una carpeta sincronitzada amb el
 * Drive del centre, un disc extern— en comptes de `backups/`. Una còpia al
 * mateix ordinador que es fa malbé o es perd no és una còpia de seguretat.
 *
 * Les taules surten del propi esquema de Prisma: una taula nova hi entra sola.
 * Només llegeix; no toca res.
 */

// Sessions i testimonis no es copien: caduquen, no serveixen per restaurar res
// i són el més sensible que hi ha a la base de dades.
const NO_ES_COPIEN = new Set(["Session", "Account", "VerificationToken"]);

const url = process.env.BACKUP_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Falta BACKUP_DATABASE_URL (o DATABASE_URL al .env).");
  process.exit(1);
}

const { host, pathname } = new URL(url);
const origen = `${host}${pathname}`;

const pool = new Pool({ connectionString: url });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
// Els models del client es diuen com el model amb la primera lletra minúscula.
const taules = db as unknown as Record<string, { findMany: () => Promise<unknown[]> }>;

async function main() {
  console.info(`Copiant de ${origen}…`);

  const dades: Record<string, unknown[]> = {};
  const recompte: Record<string, number> = {};
  for (const model of Prisma.dmmf.datamodel.models) {
    if (NO_ES_COPIEN.has(model.name)) continue;
    const files = await taules[model.name[0].toLowerCase() + model.name.slice(1)].findMany();
    dades[model.name] = files;
    recompte[model.name] = files.length;
  }

  const ara = new Date();
  const marca = ara.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  const carpeta = process.env.BACKUP_DIR ?? "backups";
  const fitxer = path.join(carpeta, `gestic-${marca}.json`);
  await mkdir(carpeta, { recursive: true });
  await writeFile(
    fitxer,
    `${JSON.stringify({ generat: ara.toISOString(), origen, recompte, dades }, null, 2)}\n`,
  );

  const files = Object.values(recompte).reduce((total, n) => total + n, 0);
  const mida = Math.round((await stat(fitxer)).size / 1024);
  console.info(
    `✓ ${path.resolve(fitxer)} — ${files} files de ${Object.keys(recompte).length} taules, ${mida} kB`,
  );
  console.info("Porta dades personals, també de menors: guarda'l fora d'aquest ordinador i tracta'l com a tal.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
