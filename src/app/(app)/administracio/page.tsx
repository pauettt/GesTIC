import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";

import { db } from "@/lib/db";
import { getConfigChecks, getTestDataSummary } from "@/lib/admin-data";
import { auditActionLabels, type AuditAction } from "@/lib/audit";
import { formatDateTime } from "@/lib/date";
import { requireSuperAdmin } from "@/lib/permissions";
import { formatCounts, isTestAccountEmail } from "@/lib/test-data";
import { PurgeTestDataButton } from "@/components/admin/purge-test-data-button";
import { TestEmailButton } from "@/components/admin/test-email-button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Administració" };

/**
 * La feina de superadministrador que no és el dia a dia de la coordinació:
 * comprovar que el servidor està ben configurat, cuidar les dades personals i
 * poder respondre qui ha fet els canvis delicats. Els permisos de cada persona
 * es reparteixen a /usuaris.
 */
export default async function AdministracioPage() {
  const superAdmin = await requireSuperAdmin();

  const [testData, studentRequests, usersWithoutAccess, auditEvents] = await Promise.all([
    getTestDataSummary(),
    db.studentDeviceRequest.count(),
    db.user.count({ where: { disabledAt: { not: null } } }),
    db.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  const checks = getConfigChecks();
  const isTestAccount = !superAdmin.email || isTestAccountEmail(superAdmin.email);
  const accountsLabel = `${testData.accounts.length} ${
    testData.accounts.length === 1 ? "compte de prova" : "comptes de prova"
  }`;
  const testDataDetails = formatCounts(testData.items);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Administració</h1>
        <p className="text-muted-foreground">
          El que no és el dia a dia de la coordinació: comprovar que el servidor està ben configurat,
          cuidar les dades personals i veure qui ha fet els canvis delicats.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuració del servidor</CardTitle>
          <CardDescription>
            El que hi ha a les variables d&apos;entorn, sense ensenyar-ne cap secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-3 py-2">
                {check.ok ? (
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-green-600" aria-label="Correcte" />
                ) : (
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="Cal revisar-ho" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-sm break-words text-muted-foreground">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <TestEmailButton disabled={isTestAccount} />
            <p className="text-xs text-muted-foreground">
              {isTestAccount
                ? "Entra amb el teu compte del centre per rebre'l."
                : `S'envia a ${superAdmin.email}.`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dades personals</CardTitle>
          <CardDescription>
            gesTIC guarda noms de menors i dades del claustre: què s&apos;hi guarda i per què.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1">
              {studentRequests === 0
                ? "Encara no hi ha cap sol·licitud de Chromebook per a alumnat."
                : `${studentRequests} ${studentRequests === 1 ? "sol·licitud" : "sol·licituds"} de Chromebook per a alumnat, amb el nom de l'alumne/a.`}{" "}
              Es guarden sense data de caducitat, perquè cada equip pugui dir qui l&apos;ha tingut curs
              rere curs, i només les veuen el tutor/a que les fa i la coordinació TIC.
            </p>
            <ButtonLink variant="outline" size="sm" href="/chromebooks">
              Chromebooks
            </ButtonLink>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1">
              {usersWithoutAccess === 0
                ? "Ningú no té l'accés retirat."
                : `${usersWithoutAccess} ${usersWithoutAccess === 1 ? "persona té" : "persones tenen"} l'accés retirat.`}{" "}
              Quan algú deixa el centre, treu-li l&apos;accés: no hi entra, no rep avisos i el que va
              fer continua dient qui ho va fer.
            </p>
            <ButtonLink variant="outline" size="sm" href="/usuaris">
              Usuaris i permisos
            </ButtonLink>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dades de prova</CardTitle>
          <CardDescription>
            Els comptes del botó de dev login (adreces <code>@local.test</code>) i tot el que en penja.
            Cap compte real del centre no pot tenir aquesta adreça.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {testData.accounts.length === 0 ? (
            <p className="text-muted-foreground">No hi ha cap compte de prova.</p>
          ) : (
            <>
              <p>
                <strong>{accountsLabel}</strong>
                {testDataDetails ? `, amb ${testDataDetails}.` : ", sense dades pròpies."}
              </p>
              <p className="break-words text-muted-foreground">
                {testData.accounts.map((account) => account.email).join(" · ")}
              </p>
              <p className="text-muted-foreground">
                El que no penja de cap compte —els conserges i les claus d&apos;exemple, o equips i
                aules creats provant— s&apos;esborra des de la seva pantalla.
              </p>
              <div>
                <PurgeTestDataButton
                  disabled={isTestAccount}
                  summary={`${accountsLabel}${testDataDetails ? ` i ${testDataDetails}` : ""}`}
                />
              </div>
              {isTestAccount && (
                <p className="text-xs text-muted-foreground">
                  Fes-ho amb el teu compte del centre: amb un compte de prova t&apos;esborraries a tu mateix.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registre d&apos;activitat</CardTitle>
          <CardDescription>
            Canvis de permisos, accessos retirats, esborrats definitius i neteges de dades. Els 50
            últims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Encara no hi ha res registrat.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quan</TableHead>
                    <TableHead>Qui</TableHead>
                    <TableHead>Què</TableHead>
                    <TableHead>Detall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.actor ? (event.actor.name ?? event.actor.email) : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {auditActionLabels[event.action as AuditAction] ?? event.action}
                      </TableCell>
                      <TableCell>{event.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
