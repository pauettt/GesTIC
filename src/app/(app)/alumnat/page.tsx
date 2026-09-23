import { db } from "@/lib/db";
import { isAdmin, requireStudentLoanAccess } from "@/lib/permissions";
import { StudentChromebookPool } from "@/components/chromebooks/student-pool";
import {
  AwaitingDeliveryStudentDevices,
  DeliveredStudentDevices,
  PendingStudentRequests,
  TutorStudentRequests,
} from "@/components/chromebooks/student-requests";
import {
  StudentRequestHistory,
  type StudentRequestHistoryRow,
} from "@/components/chromebooks/student-request-history";

export const metadata = { title: "Préstec a l'alumnat" };

/**
 * Els Chromebooks que es deixen a un alumne per a tot el curs. No té res a veure
 * amb els carros: són un altre pool d'equips i una altra gent, els tutors/es que
 * els demanen i la coordinació TIC que els decideix i els entrega.
 */
export default async function StudentLoansPage() {
  const user = await requireStudentLoanAccess();
  const admin = isAdmin(user.role);

  // Un coordinador TIC pot ser tutor també: les dues parts de la pantalla no
  // s'exclouen, cadascuna surt si toca.
  const requestsWithContext = { include: { tutor: true, chromebook: true } } as const;

  const [academicStages, studentChromebooks, myRequests, pendingRequests, awaitingDelivery, delivered, answered] =
    await Promise.all([
      user.isTutor ? db.academicStage.findMany({
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { id: true, name: true, courses: {
          orderBy: [{ order: "asc" }, { name: "asc" }],
          select: { id: true, name: true, groups: {
            orderBy: [{ order: "asc" }, { name: "asc" }],
            select: { id: true, name: true },
          } },
        } },
      }) : Promise.resolve([]),
      // El pool de préstec és inventari de la coordinació: al tutor no li surt,
      // i per això tampoc es demana.
      admin
        ? db.chromebook.findMany({
            where: { isStudentLoanable: true },
            orderBy: { assetTag: "asc" },
            select: {
              id: true,
              assetTag: true,
              serialNumber: true,
              brand: true,
              model: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      // Les seves i prou: les dades d'un alumne no surten a la pantalla d'un
      // altre tutor, encara que tots dos puguin demanar equips.
      user.isTutor
        ? db.studentDeviceRequest.findMany({
            where: { tutorId: user.id },
            ...requestsWithContext,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      admin
        ? db.studentDeviceRequest.findMany({
            where: { status: "PENDENT" },
            ...requestsWithContext,
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
      // Els que fa més dies que esperen que els vinguin a buscar, primer.
      admin
        ? db.studentDeviceRequest.findMany({
            where: { status: "APROVADA" },
            ...requestsWithContext,
            orderBy: { respondedAt: "asc" },
          })
        : Promise.resolve([]),
      // Els tancats no surten aquí: són a l'historial de cada equip.
      admin
        ? db.studentDeviceRequest.findMany({
            where: { status: "ENTREGADA" },
            ...requestsWithContext,
            orderBy: { deliveredAt: "desc" },
          })
        : Promise.resolve([]),
      // L'historial: tot el que ja no espera resposta, el més nou primer. De
      // les persones només en surt el nom, que va cap al navegador.
      admin
        ? db.studentDeviceRequest.findMany({
            where: { status: { not: "PENDENT" } },
            select: {
              id: true,
              studentFirstName: true,
              studentLastName: true,
              groupName: true,
              reason: true,
              reasonNote: true,
              status: true,
              responseNote: true,
              createdAt: true,
              respondedAt: true,
              tutor: { select: { name: true, email: true } },
              respondedBy: { select: { name: true, email: true } },
              chromebook: { select: { id: true, assetTag: true, serialNumber: true } },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

  const history: StudentRequestHistoryRow[] = answered.map((request) => ({
    id: request.id,
    studentName: `${request.studentFirstName} ${request.studentLastName}`,
    groupName: request.groupName,
    reason: request.reason,
    reasonNote: request.reasonNote,
    status: request.status,
    responseNote: request.responseNote,
    tutorName: request.tutor.name ?? request.tutor.email,
    respondedByName: request.respondedBy
      ? (request.respondedBy.name ?? request.respondedBy.email)
      : null,
    chromebookId: request.chromebook?.id ?? null,
    deviceLabel: request.chromebook
      ? [request.chromebook.assetTag, request.chromebook.serialNumber].filter(Boolean).join(" · ")
      : null,
    createdAt: request.createdAt,
    respondedAt: request.respondedAt,
  }));

  const availableDevices = studentChromebooks.filter((cb) => cb.status === "DISPONIBLE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Préstec a l&apos;alumnat</h1>
        <p className="text-muted-foreground">
          Chromebooks que es deixen a un alumne/a per a tot el curs.
        </p>
      </div>

      {user.isTutor && <TutorStudentRequests requests={myRequests} stages={academicStages} />}

      {admin && (
        <>
          <PendingStudentRequests requests={pendingRequests} available={availableDevices} />
          <AwaitingDeliveryStudentDevices requests={awaitingDelivery} />
          <DeliveredStudentDevices requests={delivered} />
          <StudentRequestHistory rows={history} />
          <StudentChromebookPool chromebooks={studentChromebooks} />
        </>
      )}
    </div>
  );
}
