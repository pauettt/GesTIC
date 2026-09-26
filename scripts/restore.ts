import "dotenv/config";
import { readFile } from "node:fs/promises";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

/**
 * Restaura una còpia de `npm run db:backup` en una base de dades BUIDA.
 *
 *   RESTORE_DATABASE_URL="<DIRECT_URL de la base de dades nova>" npm run db:restore -- <còpia.json>
 *
 * És per al dia que la base de dades de producció es perd o queda malmesa: es
 * crea un projecte de Supabase nou, s'hi apliquen les migracions i aquí s'hi
 * posen les dades. El pas a pas és al README (*Restaurar una còpia*).
 *
 * Per no trepitjar mai res, només escriu en una base de dades on totes les
 * taules són buides, i ho fa tot en una sola transacció: o hi entra la còpia
 * sencera o no hi entra res. No llegeix `DATABASE_URL`: on es restaura s'ha de
 * dir sempre a propòsit.
 *
 * L'ordre de les taules surt de les claus foranes de la mateixa base de dades de
 * destinació, i no d'una llista feta a mà: una taula nova hi entra sola.
 */

type Backup = { generat: string; origen: string; recompte: Record<string, number>; dades: Record<string, unknown[]> };

// Prisma parteix els `createMany` grans, però així cap consulta no s'acosta al
// límit de paràmetres de PostgreSQL encara que la taula creixi.
const PER_TANDA = 500;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const fitxer = process.argv[2];
if (!fitxer) fail("Indica la còpia: npm run db:restore -- <fitxer.json>");

const url = process.env.RESTORE_DATABASE_URL;
if (!url) fail("Falta RESTORE_DATABASE_URL: l'adreça de la base de dades on es restaura, amb les migracions ja aplicades.");

// Com a `backup.ts`: l'adreça porta la contrasenya i no ha de sortir mai sencera.
let desti: string;
try {
  const { host, pathname } = new URL(url);
  desti = `${host}${pathname}`;
} catch {
  fail("L'adreça de RESTORE_DATABASE_URL no és vàlida: ha d'anar en una sola línia i entre cometes.");
}

const pool = new Pool({ connectionString: url });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

type Delegate = {
  count: () => Promise<number>;
  createMany: (args: { data: unknown[] }) => Promise<{ count: number }>;
};
const delegate = (client: unknown, model: string) =>
  (client as Record<string, Delegate>)[model[0].toLowerCase() + model.slice(1)];

/** Les taules en un ordre on cada una va després de les que referencia. */
async function insertionOrder(models: string[]): Promise<string[]> {
  const foreignKeys = await db.$queryRaw<{ child: string; parent: string }[]>`
    SELECT cl.relname AS child, pcl.relname AS parent
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_class pcl ON pcl.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'`;

  const selfReferencing = foreignKeys.filter((fk) => fk.child === fk.parent).map((fk) => fk.child);
  if (selfReferencing.length > 0) {
    // Avui no n'hi ha cap. Si mai n'hi ha, les files d'aquella taula s'haurien
    // d'ordenar entre elles: millor aturar-se que deixar la restauració a mitges.
    fail(`La taula ${selfReferencing.join(", ")} es referencia a si mateixa: cal adaptar aquest script.`);
  }

  const pending = new Map(models.map((model) => [model, new Set<string>()]));
  for (const { child, parent } of foreignKeys) {
    if (pending.has(child) && pending.has(parent)) pending.get(child)!.add(parent);
  }

  const order: string[] = [];
  while (pending.size > 0) {
    const ready = [...pending].filter(([, parents]) => parents.size === 0).map(([model]) => model);
    if (ready.length === 0) fail(`Hi ha un cicle de claus foranes entre ${[...pending.keys()].join(", ")}.`);
    for (const model of ready.sort()) {
      order.push(model);
      pending.delete(model);
      for (const parents of pending.values()) parents.delete(model);
    }
  }
  return order;
}

async function main() {
  const copia = JSON.parse(await readFile(fitxer, "utf8")) as Backup;
  if (!copia?.dades || typeof copia.dades !== "object") fail(`${fitxer} no és una còpia de gesTIC.`);

  const models = Prisma.dmmf.datamodel.models.map((model) => model.name);
  const desconegudes = Object.keys(copia.dades).filter((taula) => !models.includes(taula));
  if (desconegudes.length > 0) {
    // Una còpia d'un esquema posterior al d'aquest codi: les dades d'aquestes
    // taules es perdrien sense avisar.
    fail(`La còpia porta taules que aquest codi no coneix (${desconegudes.join(", ")}): restaura-la amb una versió més nova.`);
  }

  console.info(`Restaurant ${fitxer} (còpia de ${copia.origen}, ${copia.generat}) a ${desti}…`);

  const plenes: string[] = [];
  for (const model of models) {
    const files = await delegate(db, model).count();
    if (files > 0) plenes.push(`${model} (${files})`);
  }
  if (plenes.length > 0) {
    fail(`La base de dades de destinació no és buida: ${plenes.join(", ")}. No es toca res.`);
  }

  const order = await insertionOrder(models);
  const restaurades: Record<string, number> = {};

  await db.$transaction(
    async (tx) => {
      for (const model of order) {
        const files = copia.dades[model] ?? [];
        for (let inici = 0; inici < files.length; inici += PER_TANDA) {
          await delegate(tx, model).createMany({ data: files.slice(inici, inici + PER_TANDA) });
        }
        restaurades[model] = files.length;
      }
    },
    // Uns quants milers de files van en segons, però amb marge: si el temps
    // s'acaba, la transacció es desfà sencera.
    { timeout: 10 * 60 * 1000, maxWait: 60 * 1000 },
  );

  // Es tornen a comptar, ja fora de la transacció: el que diu la còpia és el
  // que hi ha d'haver.
  const diferents: string[] = [];
  for (const [model, esperades] of Object.entries(copia.recompte ?? {})) {
    const files = await delegate(db, model).count();
    if (files !== esperades) diferents.push(`${model}: ${files} de ${esperades}`);
  }
  if (diferents.length > 0) fail(`La restauració no quadra amb la còpia: ${diferents.join("; ")}.`);

  const total = Object.values(restaurades).reduce((sum, n) => sum + n, 0);
  console.info(`✓ ${total} files de ${Object.keys(copia.dades).length} taules restaurades.`);

  if (!("Account" in copia.dades)) {
    console.warn(
      "Atenció: aquesta còpia és d'abans del 2026-09-26 i no porta els comptes de Google. Ningú no podrà entrar amb Google fins que es lliguin de nou: fes servir una còpia més nova si n'hi ha.",
    );
  }
  console.info(
    "Recorda: les contrasenyes del centre només es poden llegir amb la mateixa VAULT_ENCRYPTION_KEY que les va desar.",
  );
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
