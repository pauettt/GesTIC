import nodemailer, { type Transporter } from "nodemailer";

// Els correus surten pel Google Workspace del centre (SMTP amb contrasenya
// d'aplicació), de manera que el professorat rep l'avís des d'una adreça del
// centre que reconeix i no cal tocar cap registre DNS.
const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT ?? 465);
const user = process.env.SMTP_USER;
const password = process.env.SMTP_PASSWORD;
const from = process.env.SMTP_FROM ?? (user ? `gesTIC <${user}>` : undefined);

export function isEmailConfigured() {
  return Boolean(user && password);
}

let transporter: Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: user!, pass: password! },
    });
  }
  return transporter;
}

export type EmailResult = { sent: true } | { sent: false; reason: string };

/**
 * Envia un correu i **mai llança**: avisar per correu és secundari respecte de
 * l'acció que l'ha provocat. Si el correu falla, el que s'havia de desar ja
 * s'ha desat i qui crida decideix què fer amb el resultat.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) return { sent: false, reason: "Cap destinatari" };

  if (!isEmailConfigured()) {
    console.warn(`[email] SMTP sense configurar; no s'envia "${subject}"`);
    return { sent: false, reason: "El correu no està configurat al servidor" };
  }

  try {
    await getTransporter().sendMail({ from, to: recipients.join(", "), subject, text, html });
    return { sent: true };
  } catch (error) {
    console.error("[email] no s'ha pogut enviar:", error);
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "error desconegut",
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type EmailBody = {
  intro: string;
  /** Parells etiqueta/valor de la fitxa resum. */
  rows: [string, string][];
  /** Text destacat en un requadre (comentaris, descripcions...). */
  quote?: { label: string; body: string } | null;
  cta: { label: string; url: string };
  footer?: string;
};

/** Plantilla comuna: text pla + HTML, amb tot el contingut variable escapat. */
function layout({ intro, rows, quote, cta, footer }: EmailBody) {
  const text =
    `${intro}\n\n` +
    rows.map(([label, value]) => `${label}: ${value}`).join("\n") +
    (quote ? `\n\n${quote.label}:\n${quote.body}` : "") +
    `\n\n${cta.label}:\n${cta.url}\n` +
    (footer ? `\n${footer}\n` : "") +
    `\n— gesTIC, coordinació TIC del centre`;

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;color:#111;line-height:1.5">
      <p>${escapeHtml(intro)}</p>
      <table style="border-collapse:collapse;margin:16px 0">
        ${rows
          .map(
            ([label, value]) => `<tr>
              <td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(label)}</td>
              <td style="padding:4px 0">${escapeHtml(value)}</td>
            </tr>`,
          )
          .join("")}
      </table>
      ${
        quote
          ? `<div style="border-left:3px solid #ddd;padding:8px 0 8px 12px;margin:16px 0;color:#333">
               <div style="color:#666;font-size:13px;margin-bottom:4px">${escapeHtml(quote.label)}</div>
               ${escapeHtml(quote.body).replace(/\n/g, "<br>")}
             </div>`
          : ""
      }
      <p style="margin:20px 0">
        <a href="${encodeURI(cta.url)}" style="background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">
          ${escapeHtml(cta.label)}
        </a>
      </p>
      ${footer ? `<p style="color:#666;font-size:13px">${escapeHtml(footer)}</p>` : ""}
      <p style="color:#666;font-size:13px">— gesTIC, coordinació TIC del centre</p>
    </div>
  `;

  return { text, html };
}

// ---------------------------------------------------------------------------
// Incidències
// ---------------------------------------------------------------------------

export function buildIncidentResolvedEmail({
  incidentTitle,
  resolvedBy,
  note,
  incidentUrl,
}: {
  incidentTitle: string;
  resolvedBy: string;
  note: string | null;
  incidentUrl: string;
}) {
  return {
    subject: `Incidència resolta: ${incidentTitle}`,
    ...layout({
      intro: "La incidència que vas reportar ja està resolta.",
      rows: [
        ["Incidència", incidentTitle],
        ["Resolta per", resolvedBy],
      ],
      quote: note ? { label: "Comentari de la coordinació TIC", body: note } : null,
      cta: { label: "Veure la incidència", url: incidentUrl },
      footer: "Si el problema continua, respon a la incidència des de gesTIC i la tornarem a obrir.",
    }),
  };
}

export async function sendIncidentResolvedEmail({
  to,
  ...content
}: Parameters<typeof buildIncidentResolvedEmail>[0] & { to: string }): Promise<EmailResult> {
  return sendEmail({ to, ...buildIncidentResolvedEmail(content) });
}

export function buildIncidentReportedEmail({
  incidentTitle,
  reporterName,
  location,
  priority,
  description,
  incidentUrl,
}: {
  incidentTitle: string;
  reporterName: string;
  location: string;
  priority: string;
  description: string;
  incidentUrl: string;
}) {
  return {
    subject: `Nova incidència (${priority.toLowerCase()}): ${incidentTitle}`,
    ...layout({
      intro: `${reporterName} ha reportat una incidència nova.`,
      rows: [
        ["Equip o espai", incidentTitle],
        ["Ubicació", location],
        ["Prioritat", priority],
        ["Reportada per", reporterName],
      ],
      quote: { label: "Descripció", body: description },
      cta: { label: "Obrir la incidència", url: incidentUrl },
    }),
  };
}

// ---------------------------------------------------------------------------
// Préstecs
// ---------------------------------------------------------------------------

export function buildLoanRequestedEmail({
  itemLabel,
  requesterName,
  period,
  purpose,
  url,
}: {
  itemLabel: string;
  requesterName: string;
  period: string;
  purpose: string | null;
  url: string;
}) {
  return {
    subject: `Sol·licitud de préstec: ${itemLabel}`,
    ...layout({
      intro: `${requesterName} demana en préstec un equip de l'inventari.`,
      rows: [
        ["Equip", itemLabel],
        ["Període", period],
        ["Sol·licitat per", requesterName],
      ],
      quote: purpose ? { label: "Motiu", body: purpose } : null,
      cta: { label: "Revisar la sol·licitud", url },
    }),
  };
}

export function buildLoanDecisionEmail({
  itemLabel,
  approved,
  period,
  url,
}: {
  itemLabel: string;
  approved: boolean;
  period: string;
  url: string;
}) {
  return {
    subject: approved
      ? `Préstec aprovat: ${itemLabel}`
      : `Sol·licitud de préstec rebutjada: ${itemLabel}`,
    ...layout({
      intro: approved
        ? "La teva sol·licitud de préstec s'ha aprovat."
        : "La teva sol·licitud de préstec no s'ha pogut acceptar.",
      rows: [
        ["Equip", itemLabel],
        ["Període", period],
      ],
      cta: { label: "Veure els meus préstecs", url },
      footer: approved
        ? "Passa per la coordinació TIC per recollir l'equip i recorda tornar-lo dins del termini."
        : "Si ho necessites per a una altra data, pots fer una sol·licitud nova.",
    }),
  };
}

export function buildLoanOverdueEmail({
  itemLabel,
  period,
  daysLate,
  url,
}: {
  itemLabel: string;
  period: string;
  daysLate: number;
  url: string;
}) {
  return {
    subject: `Recordatori: has de tornar ${itemLabel}`,
    ...layout({
      intro: `Consta que encara tens un equip del centre que havia de tornar-se fa ${daysLate} ${daysLate === 1 ? "dia" : "dies"}.`,
      rows: [
        ["Equip", itemLabel],
        ["Període del préstec", period],
      ],
      cta: { label: "Veure el préstec", url },
      footer: "Si ja l'has tornat, avisa la coordinació TIC per posar-ho al dia.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Consultes
// ---------------------------------------------------------------------------

export function buildQueryAnsweredEmail({
  title,
  answeredBy,
  body,
  url,
}: {
  title: string;
  answeredBy: string;
  body: string;
  url: string;
}) {
  return {
    subject: `Resposta a la teva consulta: ${title}`,
    ...layout({
      intro: `${answeredBy} ha respost la teva consulta.`,
      rows: [["Consulta", title]],
      quote: { label: "Resposta", body },
      cta: { label: "Veure la conversa", url },
      footer: "Pots continuar la conversa responent des de gesTIC.",
    }),
  };
}

export function buildQueryCreatedEmail({
  title,
  authorName,
  description,
  url,
}: {
  title: string;
  authorName: string;
  description: string;
  url: string;
}) {
  return {
    subject: `Nova consulta: ${title}`,
    ...layout({
      intro: `${authorName} ha fet una consulta a la coordinació TIC.`,
      rows: [
        ["Consulta", title],
        ["Feta per", authorName],
      ],
      quote: { label: "Descripció", body: description },
      cta: { label: "Respondre la consulta", url },
    }),
  };
}
