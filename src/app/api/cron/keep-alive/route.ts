import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * Ping diari a la base de dades perquè Supabase no pausi el projecte.
 *
 * El pla Free de Supabase atura la base de dades després de 7 dies sense
 * activitat, i un institut es passa el juliol i l'agost sencers sense que
 * ningú reporti res: al setembre el primer professor que entrés es trobaria
 * l'aplicació morta fins que algú la reactivés a mà des del panell.
 *
 * No fa res més que tocar la base de dades: qualsevol consulta reinicia el
 * comptador d'inactivitat. Mateixa protecció que la resta de crons — sense la
 * capçalera correcta no s'executa.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET sense configurar" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }

  await db.$queryRaw`SELECT 1`;

  console.info("[cron] ping a la base de dades");
  return NextResponse.json({ ok: true });
}
