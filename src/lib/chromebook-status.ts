import type { ChromebookStatus, IncidentStatus, Prisma } from "@prisma/client";

/** Incidències que encara mantenen un equip fora de servei. */
export const OPEN_INCIDENT_STATUSES: IncidentStatus[] = ["OBERTA", "EN_CURS"];

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
 *  2. Amb alguna incidència oberta, l'equip no serveix, sigui de carro o de
 *     préstec.
 *  3. Si un alumne el té assignat, és a casa seva.
 *  4. Si no, és lliure.
 *
 * RESERVAT no surt mai d'aquí: les reserves són del carro sencer, no de cada
 * equip.
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
  if (hasOpenIncident) return "EN_INCIDENCIA";
  if (isAssigned) return "ASSIGNAT";
  return "DISPONIBLE";
}

type StatusClient = Pick<Prisma.TransactionClient, "chromebook" | "incident" | "studentDeviceRequest">;

/**
 * Torna a calcular i desa l'estat d'un Chromebook. S'ha de cridar després de
 * qualsevol canvi que l'afecti: una incidència nova, un canvi d'estat o
 * l'esborrat d'una incidència, i una devolució. Accepta `db` o el `tx` d'una
 * transacció.
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
    where: { chromebookId, status: "APROVADA" },
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
