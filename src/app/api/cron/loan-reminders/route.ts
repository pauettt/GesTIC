import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { sendLoanOverdueReminder } from "@/lib/notifications";

/**
 * Recordatori automàtic a qui té material del centre fora de termini.
 * Pensat per a Vercel Cron un cop per setmana (dilluns al matí).
 *
 * La ruta és pública per força —Vercel la crida des de fora— així que es
 * protegeix amb `CRON_SECRET`: sense la capçalera correcta no fa res. Si el
 * secret no està configurat, la ruta es tanca del tot en comptes de quedar
 * oberta, que és l'error que es paga car.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET sense configurar" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }

  const overdue = await db.loanRequest.findMany({
    where: { status: "APROVADA", endDate: { lt: new Date() } },
    select: { id: true },
  });

  const results = await Promise.all(
    overdue.map(async (loan) => (await sendLoanOverdueReminder(loan.id)).sent),
  );
  const sent = results.filter(Boolean).length;

  console.info(`[cron] recordatoris de préstec: ${sent}/${overdue.length} enviats`);
  return NextResponse.json({ overdue: overdue.length, sent });
}
