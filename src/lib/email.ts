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
  // Els comptes del dev login porten adreces @….test, un domini reservat que no
  // pot rebre correu (RFC 2606). En local, amb el SMTP del centre configurat,
  // sense aquest filtre cada avís a aquests comptes hi rebotaria i tornaria a la
  // bústia d'enviament.
  const recipients = (Array.isArray(to) ? to : [to]).filter(
    (address) => !address.toLowerCase().endsWith(".test"),
  );
  if (recipients.length === 0) return { sent: false, reason: "Cap destinatari amb adreça real" };

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
  /** Opcional: hi ha avisos que no porten enlloc, com el de tornar una clau. */
  cta?: { label: string; url: string };
  footer?: string;
};

/** Plantilla comuna: text pla + HTML, amb tot el contingut variable escapat. */
function layout({ intro, rows, quote, cta, footer }: EmailBody) {
  const text =
    `${intro}\n\n` +
    rows.map(([label, value]) => `${label}: ${value}`).join("\n") +
    (quote ? `\n\n${quote.label}:\n${quote.body}` : "") +
    (cta ? `\n\n${cta.label}:\n${cta.url}\n` : "\n") +
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
      ${
        cta
          ? `<p style="margin:20px 0">
               <a href="${encodeURI(cta.url)}" style="background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">
                 ${escapeHtml(cta.label)}
               </a>
             </p>`
          : ""
      }
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

export function buildIncidentCommentedEmail({
  toReporter,
  incidentTitle,
  authorName,
  body,
  url,
}: {
  /** Cert si el rep qui va reportar la incidència; fals si el rep la coordinació. */
  toReporter: boolean;
  incidentTitle: string;
  authorName: string;
  body: string;
  url: string;
}) {
  return {
    subject: toReporter
      ? `Nou missatge de la coordinació TIC: ${incidentTitle}`
      : `Nou comentari a la incidència: ${incidentTitle}`,
    ...layout({
      intro: toReporter
        ? `${authorName} ha escrit al seguiment de la incidència que vas reportar.`
        : `${authorName} ha afegit un comentari a la incidència que va reportar.`,
      rows: [
        ["Incidència", incidentTitle],
        ["Comentari de", authorName],
      ],
      quote: { label: "Comentari", body },
      cta: { label: "Obrir la incidència", url },
      footer: toReporter ? "Pots respondre des de gesTIC, al mateix fil de seguiment." : undefined,
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
// Equips de carro reservats a part
// ---------------------------------------------------------------------------

/** A qui té equips d'un carro que havien de tornar-hi un dia que ja ha passat. */
export function buildDevicesNotReturnedEmail({
  devices,
  url,
}: {
  /** «Chromebook C1-07 (Carro 1)» i quan l'havia de tornar. */
  devices: { label: string; due: string }[];
  url: string;
}) {
  const one = devices.length === 1;
  return {
    subject: one ? `Recorda tornar ${devices[0].label} al carro` : `Recorda tornar ${devices.length} equips als carros`,
    ...layout({
      intro: one
        ? "Tens un equip d'un carro que ja havia de tornar-hi i encara no consta que l'hagis tornat. Mentrestant, surt com a no disponible amb el teu nom."
        : "Tens uns equips de carro que ja havien de tornar-hi i encara no consta que els hagis tornat. Mentrestant, surten com a no disponibles amb el teu nom.",
      rows: devices.map(({ label, due }): [string, string] => [label, `Havia de tornar ${due}`]),
      cta: { label: one ? "Marca'l com a tornat" : "Marca'ls com a tornats", url },
      footer:
        "Si ja és al carro, marca'l com a tornat a l'inici de gesTIC i no rebràs més avisos. La coordinació TIC també rep aquest avís.",
    }),
  };
}

/** A la coordinació: tots els equips de carro que no han tornat, i qui els té. */
export function buildDevicesNotReturnedSummaryEmail({
  devices,
  url,
}: {
  devices: { label: string; who: string; due: string }[];
  url: string;
}) {
  return {
    subject:
      devices.length === 1 ? "1 equip de carro sense tornar" : `${devices.length} equips de carro sense tornar`,
    ...layout({
      intro:
        "Aquests equips es van reservar a part i havien de tornar al seu carro un dia que ja ha passat. Qui els té n'ha rebut un avís.",
      rows: devices.map(({ label, who, due }): [string, string] => [label, `${who} · havia de tornar ${due}`]),
      cta: { label: "Obre el panell", url },
      footer: "Quan tornin al carro, qui els tenia o la coordinació els marca com a tornats i s'acaben els avisos.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Reserves fixes de carros
// ---------------------------------------------------------------------------

/** A la coordinació: algú demana un carro cada setmana a la mateixa sessió. */
export function buildRecurringRequestedEmail({
  who,
  cartName,
  slot,
  until,
  purpose,
  url,
}: {
  who: string;
  cartName: string;
  /** «Dimarts · 3a hora (09:50–10:45)». */
  slot: string;
  /** «30 de juny del 2027». */
  until: string;
  purpose: string;
  url: string;
}) {
  return {
    subject: `Reserva fixa per aprovar: ${cartName}, ${slot}`,
    ...layout({
      intro: `${who} demana ${cartName} cada setmana a la mateixa sessió, fins al ${until}. Mentre no l'aproveu, la sessió continua lliure per a tothom.`,
      rows: [
        ["Qui", who],
        ["Carro", cartName],
        ["Quan", slot],
        ["Fins al", until],
      ],
      quote: { label: "Motiu", body: purpose },
      cta: { label: "Revisa-la", url },
    }),
  };
}

/** A qui l'ha demanada: aprovada, amb les setmanes que ja tenia algú, o rebutjada. */
export function buildRecurringDecisionEmail({
  approved,
  cartName,
  slot,
  until,
  weeks,
  skipped,
  responseNote,
  url,
}: {
  approved: boolean;
  cartName: string;
  slot: string;
  until: string;
  /** Quantes setmanes s'han reservat. */
  weeks: number;
  /** Les setmanes que ja tenia reservades algú altre i s'han respectat: «29 de set.». */
  skipped: string[];
  responseNote: string | null;
  url: string;
}) {
  return {
    subject: approved
      ? `Reserva fixa aprovada: ${cartName}, ${slot}`
      : `Reserva fixa no aprovada: ${cartName}, ${slot}`,
    ...layout({
      intro: approved
        ? `La coordinació TIC ha aprovat la teva reserva fixa: tens ${cartName} cada setmana a la mateixa sessió, fins al ${until}.`
        : `La coordinació TIC no ha aprovat la teva reserva fixa de ${cartName}.`,
      rows: approved
        ? [
            ["Carro", cartName],
            ["Quan", slot],
            ["Setmanes reservades", String(weeks)],
            ...(skipped.length > 0
              ? ([["Ja les tenia algú altre", skipped.join(", ")]] as [string, string][])
              : []),
          ]
        : [
            ["Carro", cartName],
            ["Quan", slot],
          ],
      quote: responseNote ? { label: "Nota de la coordinació", body: responseNote } : null,
      cta: { label: "Veure les reserves fixes", url },
      footer: approved
        ? "Si alguna setmana no el necessites, allibera-la a la graella del carro perquè el pugui fer servir algú altre."
        : undefined,
    }),
  };
}

/** A qui la tenia, quan la coordinació anul·la una reserva fixa aprovada. */
export function buildRecurringCancelledEmail({
  cartName,
  slot,
  cancelledBy,
  url,
}: {
  cartName: string;
  slot: string;
  cancelledBy: string;
  url: string;
}) {
  return {
    subject: `Reserva fixa anul·lada: ${cartName}, ${slot}`,
    ...layout({
      intro: `${cancelledBy}, de la coordinació TIC, ha anul·lat la teva reserva fixa. Les setmanes que quedaven ja són lliures per a tothom.`,
      rows: [
        ["Carro", cartName],
        ["Quan", slot],
      ],
      cta: { label: "Veure les reserves fixes", url },
      footer: "Si és un error, parla amb la coordinació TIC.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Peticions i consultes
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
    subject: `Resposta de la coordinació TIC: ${title}`,
    ...layout({
      intro: `${answeredBy} t'ha respost.`,
      rows: [["Assumpte", title]],
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
    subject: `Nova petició o consulta: ${title}`,
    ...layout({
      intro: `${authorName} ha escrit a la coordinació TIC.`,
      rows: [
        ["Assumpte", title],
        ["Feta per", authorName],
      ],
      quote: { label: "Descripció", body: description },
      cta: { label: "Respondre", url },
    }),
  };
}

export function buildQueryRepliedEmail({
  title,
  authorName,
  body,
  url,
}: {
  title: string;
  authorName: string;
  body: string;
  url: string;
}) {
  return {
    subject: `Nova resposta: ${title}`,
    ...layout({
      intro: `${authorName} ha tornat a escriure.`,
      rows: [
        ["Assumpte", title],
        ["Feta per", authorName],
      ],
      quote: { label: "Missatge", body },
      cta: { label: "Veure la conversa", url },
    }),
  };
}

/**
 * Avís a la coordinació que hi ha una sol·licitud per decidir.
 *
 * **No hi va el nom de l'alumne a propòsit.** Qui rep el correu el podria
 * llegir a gesTIC igualment, però el correu surt cap a bústies de Gmail, es
 * reenvia i es queda per sempre: per decidir cal entrar a l'aplicació, i amb
 * saber que hi ha feina n'hi ha prou.
 */
export function buildStudentDeviceRequestedEmail({
  tutorName,
  groupName,
  reason,
  url,
}: {
  tutorName: string;
  groupName: string | null;
  reason: string;
  url: string;
}) {
  return {
    subject: "Nova sol·licitud de Chromebook per a un alumne/a",
    ...layout({
      intro: `${tutorName} ha demanat un Chromebook en préstec per a un alumne/a del seu grup.`,
      rows: [
        ["Tutor/a", tutorName],
        ["Grup", groupName || "Sense indicar"],
        ["Motiu", reason],
      ],
      cta: { label: "Veure la sol·licitud", url },
      footer:
        "Les dades de l'alumne/a són a gesTIC, no en aquest correu. Entra-hi per decidir-ho.",
    }),
  };
}

/**
 * Resposta al tutor. Aquí sí que hi va el nom de l'alumne: el rep només qui
 * l'ha escrit, i sense el nom no sabria de quina de les seves sol·licituds
 * parlem ni quin equip ha d'anar a buscar.
 */
export function buildStudentDeviceDecisionEmail({
  studentName,
  approved,
  deviceLabel,
  responseNote,
  url,
}: {
  studentName: string;
  approved: boolean;
  deviceLabel: string | null;
  responseNote: string | null;
  url: string;
}) {
  return {
    subject: approved
      ? `Chromebook aprovat per a ${studentName}`
      : `Sol·licitud de Chromebook rebutjada: ${studentName}`,
    ...layout({
      intro: approved
        ? `La sol·licitud de Chromebook per a ${studentName} s'ha aprovat.`
        : `La sol·licitud de Chromebook per a ${studentName} no s'ha pogut acceptar.`,
      rows: [
        ["Alumne/a", studentName],
        ...(approved && deviceLabel ? [["Equip assignat", deviceLabel] as [string, string]] : []),
      ],
      ...(responseNote ? { quote: { label: "Nota de la coordinació", body: responseNote } } : {}),
      cta: { label: "Veure les meves sol·licituds", url },
      footer: approved
        ? "L'equip queda apartat per a l'alumne/a. Quan el vingui a recollir, la coordinació TIC n'anotarà l'entrega. És per a tot el curs: quan el torni, avisa perquè quedi registrat."
        : "Si les circumstàncies canvien, pots tornar a demanar-ho.",
    }),
  };
}

export function buildKeyNotReturnedEmail({
  keyLabel,
  deliveredAt,
  conciergeName,
}: {
  keyLabel: string;
  deliveredAt: string;
  conciergeName: string;
}) {
  return {
    subject: `Recorda tornar la clau: ${keyLabel}`,
    ...layout({
      intro:
        "Segons el registre de consergeria encara tens una clau del centre sense tornar. " +
        "Si ja l'has deixat al taulell, no cal que facis res: avisa'ns i ho corregim.",
      rows: [
        ["Clau", keyLabel],
        ["Entregada", deliveredAt],
        ["Avís enviat per", conciergeName],
      ],
      footer: "Torna-la al taulell de consergeria quan puguis; hi pot haver algú esperant-la.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Cites amb la coordinació
// ---------------------------------------------------------------------------

export function buildAppointmentBookedEmail({
  who,
  when,
  purpose,
  url,
}: {
  who: string;
  when: string;
  purpose: string;
  url: string;
}) {
  return {
    subject: `Cita nova amb ${who}`,
    ...layout({
      intro: `${who} ha demanat cita en una de les hores que la coordinació TIC té obertes.`,
      rows: [
        ["Qui", who],
        ["Quan", when],
      ],
      quote: { label: "Per a què", body: purpose },
      cta: { label: "Veure l'agenda", url },
    }),
  };
}

export function buildAppointmentCancelledEmail({
  byOwner,
  who,
  when,
  purpose,
  url,
}: {
  /** Cert si l'ha cancel·lada qui la tenia; fals si ho ha fet la coordinació. */
  byOwner: boolean;
  who: string;
  when: string;
  purpose: string;
  url: string;
}) {
  return {
    subject: byOwner
      ? `Cita cancel·lada: ${who}`
      : "S'ha cancel·lat la teva cita amb la coordinació TIC",
    ...layout({
      intro: byOwner
        ? `${who} ha cancel·lat la cita que tenia amb la coordinació TIC. L'hora torna a quedar lliure.`
        : `${who} ha cancel·lat la teva cita amb la coordinació TIC.`,
      rows: byOwner
        ? [
            ["Qui", who],
            ["Quan", when],
          ]
        : [
            ["Quan", when],
            ["Cancel·lada per", who],
          ],
      quote: { label: "Motiu de la cita", body: purpose },
      cta: { label: "Veure l'agenda", url },
      footer: byOwner ? undefined : "Si encara la necessites, demana una altra hora des de gesTIC.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Administració
// ---------------------------------------------------------------------------

/** Correu de prova: comprova que els avisos poden sortir sense haver d'inventar-ne cap. */
export function buildTestEmail({ name, url }: { name: string; url: string }) {
  return {
    subject: "Correu de prova de gesTIC",
    ...layout({
      intro: `Hola, ${name}. Si llegeixes això, gesTIC pot enviar correus: els avisos d'incidències, préstecs, consultes i cites arribaran a qui toca.`,
      rows: [["Aplicació", url]],
      cta: { label: "Obre gesTIC", url },
    }),
  };
}
