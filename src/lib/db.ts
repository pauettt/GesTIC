import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === "production";
  // En entorns serverless (Vercel), cada instància de funció té el seu propi pool:
  // limitar `max` a 2 a producció evita esgotar les connexions de PostgreSQL/Supabase.
  const max = Number(process.env.PG_MAX_CONNECTIONS ?? (isProduction ? "2" : "10"));

  const pool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Reutilitza el client tant en desenvolupament (amb HMR) com en instàncies serverless càlides (warm)
globalForPrisma.prisma = db;

