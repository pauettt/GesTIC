import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { madridDateKey } from "@/lib/date";
import { sendDevicesNotReturnedReminders, sendLoanOverdueReminder } from "@/lib/notifications";

/**
 * Recordatoris automàtics a qui té material del centre fora de termini. Vercel
 * Cron la crida cada dia lectiu al matí (`vercel.json`):
 *  - els equips de carro reservats a part que no han tornat, cada dia: n'hi ha
 *    prou que un falti un dia perquè falti a la classe següent;
 *  - els préstecs d'inventari vençuts, només els dilluns: duren setmanes, i un
 *    correu cada dia seria soroll.
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

  const now = new Date();
  const devices = await sendDevicesNotReturnedReminders(now);
  console.info(`[cron] equips de carro sense tornar: ${devices.overdue}, correus enviats: ${devices.sent}`);

  if (!isMonday(now)) return NextResponse.json({ devices });

  const overdue = await db.loanRequest.findMany({
    where: { status: "APROVADA", endDate: { lt: now } },
    select: { id: true },
  });

  const results = await Promise.all(
    overdue.map(async (loan) => (await sendLoanOverdueReminder(loan.id)).sent),
  );
  const sent = results.filter(Boolean).length;

  console.info(`[cron] recordatoris de préstec: ${sent}/${overdue.length} enviats`);
  return NextResponse.json({ devices, loans: { overdue: overdue.length, sent } });
}

/** Dilluns a l'hora del centre, que és el que val, i no a la del servidor. */
function isMonday(now: Date) {
  const [year, month, day] = madridDateKey(now).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay() === 1;
}
