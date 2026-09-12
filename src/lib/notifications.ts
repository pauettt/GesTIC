import "server-only";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import {
  buildIncidentReportedEmail,
  buildLoanDecisionEmail,
  buildLoanOverdueEmail,
  buildLoanRequestedEmail,
  buildQueryAnsweredEmail,
  buildQueryCreatedEmail,
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

/** Avisa l'autor/a quan la coordinació respon la seva consulta. */
export async function notifyQueryAnswered(queryId: string, commentId: string) {
  await safely("resposta a una consulta", async () => {
    const comment = await db.queryComment.findUnique({
      where: { id: commentId },
      include: { author: true, query: { include: { author: true } } },
    });
    if (!comment) return;

    // Només s'avisa qui va obrir la consulta, i mai de la seva pròpia resposta.
    if (comment.authorId === comment.query.authorId) return;

    const baseUrl = await getBaseUrl();
    await sendEmail({
      to: comment.query.author.email,
      ...buildQueryAnsweredEmail({
        title: comment.query.title,
        answeredBy: comment.author.name ?? comment.author.email,
        body: comment.body,
        url: `${baseUrl}/consultes/${comment.queryId}`,
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
