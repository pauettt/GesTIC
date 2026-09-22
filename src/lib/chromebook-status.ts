import type { ChromebookStatus, IncidentStatus, Prisma, StudentDeviceRequestStatus } from "@prisma/client";

/** Incidències que encara mantenen un equip fora de servei. */
export const OPEN_INCIDENT_STATUSES: IncidentStatus[] = ["OBERTA", "EN_CURS"];

/**
 * Préstecs a l'alumnat que ocupen un equip. Aprovada vol dir que ja està apartat
 * per a un alumne encara que no l'hagi vingut a buscar; entregada, que és a casa
 * seva. En tots dos casos no es pot assignar a ningú més.
 */
export const ACTIVE_STUDENT_REQUEST_STATUSES: StudentDeviceRequestStatus[] = ["APROVADA", "ENTREGADA"];

/**
 * Estat que li toca a un Chromebook segons els fets, i no segons qui l'ha tocat
 * l'últim.
 *
 * Abans cada acció hi escrivia el seu: reportar posava EN_INCIDENCIA i tancar
 * posava DISPONIBLE. Així, tancar una de dues incidències obertes donava l'equip
 * per bo, i un equip del pool que passava per una incidència tornava com a
 * DISPONIBLE amb l'alumne encara a casa amb ell, a punt per assignar-lo a un
 * segon alumne.
 *
 * L'ordre és el de què pesa més:
 *  1. BAIXA només la treu qui la posa, a mà. Cap incidència ni devolució no ha
 *     de ressuscitar un equip retirat.
 *  2. NO_DISPONIBLE tampoc: la coordinació l'ha tret de servei per un motiu seu,
 *     i tancar una incidència no el torna a donar per bo.
 *  3. Amb alguna incidència oberta, l'equip no serveix, sigui de carro o de
 *     préstec.
 *  4. Si està assignat a un alumne —apartat o ja a casa seva—, no és lliure.
 *  5. Si no, és lliure.
 *
 * RESERVAT no surt mai d'aquí. Un equip reservat a part (`DeviceReservation`)
 * continua DISPONIBLE, i es mostra com a no disponible mentre el té algú
 * (`src/lib/device-reservations.ts`): la reserva comença i s'acaba a hores que
 * cap acció no marca.
 */
export function chromebookStatusFor({
  current,
  hasOpenIncident,
  isAssigned,
}: {
  current: ChromebookStatus;
  hasOpenIncident: boolean;
  isAssigned: boolean;
}): ChromebookStatus {
  if (current === "BAIXA") return "BAIXA";
  if (current === "NO_DISPONIBLE") return "NO_DISPONIBLE";
  if (hasOpenIncident) return "EN_INCIDENCIA";
  if (isAssigned) return "ASSIGNAT";
  return "DISPONIBLE";
}

type StatusClient = Pick<Prisma.TransactionClient, "chromebook" | "incident" | "studentDeviceRequest">;

/**
 * Torna a calcular i desa l'estat d'un Chromebook. S'ha de cridar després de
 * qualsevol canvi que l'afecti: una incidència nova, un canvi d'estat o
 * l'esborrat d'una incidència, una devolució i una assignació anul·lada.
 * Accepta `db` o el `tx` d'una transacció.
 */
export async function syncChromebookStatus(client: StatusClient, chromebookId: string) {
  const chromebook = await client.chromebook.findUnique({
    where: { id: chromebookId },
    select: { status: true },
  });
  if (!chromebook) return;

  const openIncidents = await client.incident.count({
    where: { chromebookId, status: { in: OPEN_INCIDENT_STATUSES } },
  });
  const activeAssignments = await client.studentDeviceRequest.count({
    where: { chromebookId, status: { in: ACTIVE_STUDENT_REQUEST_STATUSES } },
  });

  const next = chromebookStatusFor({
    current: chromebook.status,
    hasOpenIncident: openIncidents > 0,
    isAssigned: activeAssignments > 0,
  });
  if (next !== chromebook.status) {
    await client.chromebook.update({ where: { id: chromebookId }, data: { status: next } });
  }
}
