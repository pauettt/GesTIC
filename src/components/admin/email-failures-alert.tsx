import { MailWarningIcon } from "lucide-react";

import { formatDateTime } from "@/lib/date";
import type { EmailFailures } from "@/lib/email-failures";
import { DismissEmailFailuresButton } from "@/components/admin/dismiss-email-failures-button";

/**
 * Avís de correus que no han sortit, al panell de la coordinació i a
 * Administració. No surt si no n'hi ha cap.
 */
export function EmailFailuresAlert({ failures }: { failures: EmailFailures }) {
  const { total, latest, since } = failures;
  if (total === 0 || !since) return null;

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
    >
      <div className="flex items-start gap-3">
        <MailWarningIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-destructive">
            {total === 1 ? "Un correu no ha sortit" : `${total} correus no han sortit`} des del{" "}
            {formatDateTime(since)}
          </p>
          <p className="text-muted-foreground">
            Aquests avisos no han arribat a qui els esperava. Si en falla més d&apos;un seguit, sol
            ser el compte de correu del servidor: la contrasenya d&apos;aplicació de{" "}
            <code>SMTP_USER</code> s&apos;ha canviat o revocat. Qui té accés a Vercel l&apos;ha de
            posar de nou i provar-ho amb el correu de prova d&apos;<em>Administració</em>.
          </p>
          <p className="break-words text-muted-foreground">
            Últim error: <span className="text-foreground">{latest[0]?.reason}</span>
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-1 pl-8">
        {latest.map((failure) => (
          <li key={failure.id} className="break-words">
            <span className="text-muted-foreground">{formatDateTime(failure.createdAt)}</span> ·{" "}
            {failure.subject}
          </li>
        ))}
        {total > latest.length && (
          <li className="text-muted-foreground">i {total - latest.length} més</li>
        )}
      </ul>
      <div className="pl-8">
        <DismissEmailFailuresButton upToId={latest[0].id} />
      </div>
    </div>
  );
}
