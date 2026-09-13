import "server-only";

import { db } from "@/lib/db";
import { formatDate, formatDateTimeFull } from "@/lib/date";
import {
  buildAppointmentBookedEmail,
  buildAppointmentCancelledEmail,
  buildIncidentCommentedEmail,
  buildIncidentReportedEmail,
  buildLoanDecisionEmail,
  buildLoanOverdueEmail,
  buildLoanRequestedEmail,
  buildQueryAnsweredEmail,
  buildQueryCreatedEmail,
  buildQueryRepliedEmail,
  buildStudentDeviceDecisionEmail,
  buildStudentDeviceRequestedEmail,
  sendEmail,
} from "@/lib/email";
import { daysOverdue } from "@/lib/loans";
import {
  googleServiceLabels,
  incidentPriorityLabels,
  studentDeviceReasonLabels,
} from "@/lib/labels";
import { COORDINATOR_ROLES } from "@/lib/roles";
import { getBaseUrl } from "@/lib/url";

/**
 * Avisos automàtics. **Cap d'aquestes funcions no llança mai**: si el correu
 * falla, l'acció que l'ha provocat (reportar una incidència, demanar un
 * préstec...) ja s'ha desat i no s'ha de perdre per un problema de correu.
 * Els errors queden al log del servidor.
 */
async function safely(what: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.error(`[notificacions] ${what}:`, error);
  }
}

/** Correus de la coordinació TIC (administradors i coordinadors), excloent-ne una persona. */
async function coordinatorEmails(exceptUserId?: string) {
  const coordinators = await db.user.findMany({
    where: {
      role: { in: COORDINATOR_ROLES },
      // Qui ja no té accés a gesTIC no ha de rebre'n els avisos.
      disabledAt: null,
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
    },
    select: { email: true },
  });
  return coordinators.map((c) => c.email);
}

export async function notifyIncidentReported(incidentId: string) {
  await safely("incidència reportada", async () => {
    const incident = await db.incident.findUnique({
      where: { id: incidentId },
      include: { reporter: true, space: true },
    });
    if (!incident) return;

    // Qui l'ha reportada no s'avisa a si mateix, encara que sigui coordinador.
    const to = await coordinatorEmails(incident.reporterId);
    if (to.length === 0) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to,
      ...buildIncidentReportedEmail({
        incidentTitle: incident.title,
        reporterName: incident.reporter.name ?? incident.reporter.email,
        location:
          incident.space?.name ??
          (incident.googleService
            ? `Entorn Google · ${googleServiceLabels[incident.googleService]}`
            : "Sense ubicació indicada"),
        priority: incidentPriorityLabels[incident.priority],
        description: incident.description,
        incidentUrl: `${baseUrl}/incidencies/${incident.id}`,
      }),
    });
  });
}

export async function notifyLoanRequested(loanRequestId: string) {
  await safely("sol·licitud de préstec", async () => {
    const loan = await db.loanRequest.findUnique({
      where: { id: loanRequestId },
      include: { requester: true, item: true },
    });
    if (!loan) return;

    const to = await coordinatorEmails(loan.requesterId);
    if (to.length === 0) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to,
      ...buildLoanRequestedEmail({
        itemLabel: `${loan.item.brand} ${loan.item.model}`,
        requesterName: loan.requester.name ?? loan.requester.email,
        period: `${formatDate(loan.startDate)} – ${formatDate(loan.endDate)}`,
        purpose: loan.purpose,
        url: `${baseUrl}/inventari`,
      }),
    });
  });
}

export async function notifyLoanDecision(loanRequestId: string, approved: boolean) {
  await safely("resposta a un préstec", async () => {
    const loan = await db.loanRequest.findUnique({
      where: { id: loanRequestId },
      include: { requester: true, item: true },
    });
    if (!loan) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to: loan.requester.email,
      ...buildLoanDecisionEmail({
        itemLabel: `${loan.item.brand} ${loan.item.model}`,
        approved,
        period: `${formatDate(loan.startDate)} – ${formatDate(loan.endDate)}`,
        url: `${baseUrl}/inventari`,
      }),
    });
  });
}

/** Recordatori a qui té un equip fora de termini. Retorna si el correu ha sortit. */
export async function sendLoanOverdueReminder(loanRequestId: string) {
  const loan = await db.loanRequest.findUnique({
    where: { id: loanRequestId },
    include: { requester: true, item: true },
  });
  if (!loan) return { sent: false as const, reason: "El préstec no existeix" };

  const baseUrl = await getBaseUrl();
  return sendEmail({
    to: loan.requester.email,
    ...buildLoanOverdueEmail({
      itemLabel: `${loan.item.brand} ${loan.item.model}`,
      period: `${formatDate(loan.startDate)} – ${formatDate(loan.endDate)}`,
      daysLate: daysOverdue(loan.endDate),
      url: `${baseUrl}/inventari`,
    }),
  });
}

/**
 * Avís a l'altra banda de la conversa quan algú escriu a una consulta. Si
 * respon la coordinació, a qui la va fer. Si hi torna a escriure qui la va fer,
 * a tota la coordinació: abans aquesta resposta no avisava ningú i es quedava a
 * gesTIC fins que algú hi entrava.
 */
export async function notifyQueryComment(commentId: string) {
  await safely("comentari a una consulta", async () => {
    const comment = await db.queryComment.findUnique({
      where: { id: commentId },
      include: { author: true, query: { include: { author: true } } },
    });
    if (!comment) return;

    const baseUrl = await getBaseUrl();
    const url = `${baseUrl}/consultes/${comment.queryId}`;
    const authorName = comment.author.name ?? comment.author.email;

    if (comment.authorId === comment.query.authorId) {
      const to = await coordinatorEmails(comment.authorId);
      if (to.length === 0) return;
      await sendEmail({
        to,
        ...buildQueryRepliedEmail({
          title: comment.query.title,
          authorName,
          body: comment.body,
          url,
        }),
      });
      return;
    }

    await sendEmail({
      to: comment.query.author.email,
      ...buildQueryAnsweredEmail({
        title: comment.query.title,
        answeredBy: authorName,
        body: comment.body,
        url,
      }),
    });
  });
}

/**
 * Avís a l'altra banda quan algú escriu al seguiment d'una incidència, igual
 * que a les consultes. Si hi escriu la coordinació, a qui la va reportar, que si
 * no no se n'assabentaria fins que la incidència es resolgués. Si hi escriu qui
 * la va reportar —sovint per respondre una pregunta—, a tota la coordinació.
 */
export async function notifyIncidentComment(commentId: string) {
  await safely("comentari a una incidència", async () => {
    const comment = await db.incidentComment.findUnique({
      where: { id: commentId },
      include: {
        author: true,
        incident: {
          select: {
            id: true,
            title: true,
            reporterId: true,
            reporter: { select: { email: true } },
          },
        },
      },
    });
    if (!comment) return;

    // Només poden comentar qui la va reportar i la coordinació (`addComment`),
    // així que si no l'ha escrit qui la va reportar, l'ha escrit la coordinació.
    const byReporter = comment.authorId === comment.incident.reporterId;
    const to = byReporter
      ? await coordinatorEmails(comment.authorId)
      : [comment.incident.reporter.email];
    if (to.length === 0) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to,
      ...buildIncidentCommentedEmail({
        toReporter: !byReporter,
        incidentTitle: comment.incident.title,
        authorName: comment.author.name ?? comment.author.email,
        body: comment.body,
        url: `${baseUrl}/incidencies/${comment.incident.id}`,
      }),
    });
  });
}

export async function notifyQueryCreated(queryId: string) {
  await safely("consulta nova", async () => {
    const query = await db.query.findUnique({
      where: { id: queryId },
      include: { author: true },
    });
    if (!query) return;

    const to = await coordinatorEmails(query.authorId);
    if (to.length === 0) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to,
      ...buildQueryCreatedEmail({
        title: query.title,
        authorName: query.author.name ?? query.author.email,
        description: query.description,
        url: `${baseUrl}/consultes/${query.id}`,
      }),
    });
  });
}

export async function notifyStudentDeviceRequested(requestId: string) {
  await safely("sol·licitud de Chromebook per a alumnat", async () => {
    const request = await db.studentDeviceRequest.findUnique({
      where: { id: requestId },
      include: { tutor: true },
    });
    if (!request) return;

    const to = await coordinatorEmails(request.tutorId);
    if (to.length === 0) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to,
      ...buildStudentDeviceRequestedEmail({
        tutorName: request.tutor.name ?? request.tutor.email,
        groupName: request.groupName,
        reason: studentDeviceReasonLabels[request.reason],
        url: `${baseUrl}/chromebooks`,
      }),
    });
  });
}

export async function notifyStudentDeviceDecision(requestId: string, approved: boolean) {
  await safely("resposta a una sol·licitud de Chromebook", async () => {
    const request = await db.studentDeviceRequest.findUnique({
      where: { id: requestId },
      include: { tutor: true, chromebook: true },
    });
    if (!request) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to: request.tutor.email,
      ...buildStudentDeviceDecisionEmail({
        studentName: `${request.studentFirstName} ${request.studentLastName}`,
        approved,
        deviceLabel: request.chromebook
          ? [request.chromebook.assetTag, request.chromebook.serialNumber]
              .filter(Boolean)
              .join(" · ")
          : null,
        responseNote: request.responseNote,
        url: `${baseUrl}/chromebooks`,
      }),
    });
  });
}

/**
 * A qui de coordinació li interessa una cita: qui va obrir l'hora, que és amb
 * qui es té. Si l'hora ja no té qui l'obrís, o qui la demana és la mateixa
 * persona, s'avisa la resta de la coordinació.
 */
async function appointmentCoordinationEmails(
  opener: { id: string; email: string } | null,
  exceptUserId: string,
) {
  if (opener && opener.id !== exceptUserId) return [opener.email];
  return coordinatorEmails(exceptUserId);
}

export async function notifyAppointmentBooked(appointmentId: string) {
  await safely("cita demanada", async () => {
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: { select: { name: true, email: true } },
        slot: { select: { startDate: true, openedBy: { select: { id: true, email: true } } } },
      },
    });
    if (!appointment) return;

    const to = await appointmentCoordinationEmails(appointment.slot.openedBy, appointment.userId);
    if (to.length === 0) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to,
      ...buildAppointmentBookedEmail({
        who: appointment.user.name ?? appointment.user.email,
        when: formatDateTimeFull(appointment.slot.startDate),
        purpose: appointment.purpose,
        url: `${baseUrl}/cites`,
      }),
    });
  });
}

/**
 * Avís a l'altra banda quan es cancel·la una cita. Si la cancel·la la
 * coordinació, a qui la tenia, que si no es presentaria igualment. Si la
 * cancel·la qui la tenia, a la coordinació, que es guardaria l'hora per a
 * ningú. Rep les dades ja llegides perquè la cita ja no existeix.
 */
export async function notifyAppointmentCancelled({
  cancelledById,
  cancelledByName,
  owner,
  opener,
  startDate,
  purpose,
}: {
  cancelledById: string;
  cancelledByName: string;
  owner: { id: string; name: string | null; email: string };
  opener: { id: string; email: string } | null;
  startDate: Date;
  purpose: string;
}) {
  await safely("cita cancel·lada", async () => {
    const byOwner = cancelledById === owner.id;
    const to = byOwner ? await appointmentCoordinationEmails(opener, owner.id) : [owner.email];
    if (to.length === 0) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to,
      ...buildAppointmentCancelledEmail({
        byOwner,
        who: byOwner ? (owner.name ?? owner.email) : cancelledByName,
        when: formatDateTimeFull(startDate),
        purpose,
        url: `${baseUrl}/cites`,
      }),
    });
  });
}
