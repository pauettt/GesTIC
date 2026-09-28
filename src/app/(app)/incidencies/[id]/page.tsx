import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckIcon, FileIcon } from "lucide-react";

import { incidentReturnHref } from "@/lib/incident-list";
import { cn } from "@/lib/utils";

import { db } from "@/lib/db";
import { deviceTypeLabels } from "@/lib/devices";
import { formatDate, formatDateTime } from "@/lib/date";
import { COORDINATOR_ROLES, isAdmin, isSuperAdmin, requireUser } from "@/lib/permissions";
import { deleteIncident } from "@/actions/incidents";
import {
  incidentCategoryLabels,
  incidentPriorityLabels,
  incidentPriorityVariants,
  incidentStatusLabels,
  incidentStatusVariants,
  incidentTargetTypeLabels,
} from "@/lib/labels";
import { AttachmentUploader } from "@/components/incidents/attachment-uploader";
import { CommentForm } from "@/components/incidents/comment-form";
import { StatusControls } from "@/components/incidents/status-controls";
import { CleanUrlParam } from "@/components/shared/clean-url-param";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { SuccessNotice } from "@/components/shared/success-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const LIFECYCLE_STEPS = [
  { key: "OBERTA", label: "Oberta", desc: "Reportada" },
  { key: "EN_CURS", label: "En curs", desc: "En revisió / reparació" },
  { key: "RESOLTA", label: "Resolta", desc: "Solucionada" },
];

export default async function IncidentDetailPage({ params, searchParams }: PageProps<"/incidencies/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { avis, retorn } = await searchParams;
  const returnHref = incidentReturnHref(retorn);

  const [incident, coordinators] = await Promise.all([
    db.incident.findUnique({
      where: { id },
      include: {
        reporter: true,
        assignedTo: true,
        inventoryItem: true,
        chromebook: { include: { cart: true } },
        cart: true,
        space: true,
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    }),
    isAdmin(user.role)
      ? db.user.findMany({
          where: { role: { in: COORDINATOR_ROLES }, disabledAt: null },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  if (!incident) notFound();
  if (!isAdmin(user.role) && incident.reporterId !== user.id) {
    redirect("/incidencies");
  }

  const targetLabel = incident.inventoryItem
    ? `${incident.inventoryItem.brand} ${incident.inventoryItem.model}`
    : incident.chromebook
      ? `${deviceTypeLabels[incident.chromebook.deviceType]} ${incident.chromebook.assetTag}${incident.chromebook.cart ? ` (carro ${incident.chromebook.cart.name})` : ""}`
      : incident.cart
        ? `Carro ${incident.cart.name}`
        : (incident.space?.name ?? incidentTargetTypeLabels[incident.targetType]);

  const currentStep =
    incident.status === "OBERTA"
      ? 0
      : incident.status === "EN_CURS"
        ? 1
        : 2;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={returnHref} className="text-sm text-muted-foreground hover:underline">
          &larr; {retorn ? "Torna a la llista" : "Totes les incidències"}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
          <Badge variant={incidentStatusVariants[incident.status]}>
            {incidentStatusLabels[incident.status]}
          </Badge>
          <Badge variant={incidentPriorityVariants[incident.priority]}>
            {incidentPriorityLabels[incident.priority]}
          </Badge>
          {incident.category && <Badge variant="outline">{incidentCategoryLabels[incident.category]}</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Reportada per {incident.reporter.name ?? incident.reporter.email} el{" "}
          {formatDate(incident.createdAt)} · {targetLabel}
          {incident.assignedTo
            ? ` · Assignada a ${incident.assignedTo.name ?? incident.assignedTo.email}`
            : " · Sense assignar"}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = currentStep > idx;
            const isCurrent = currentStep === idx;
            return (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                      isCompleted
                        ? "bg-emerald-600 text-white dark:bg-emerald-500"
                        : isCurrent
                          ? step.key === "RESOLTA"
                            ? "bg-emerald-600 text-white ring-4 ring-emerald-500/20 shadow-xs"
                            : "bg-amber-500 text-white ring-4 ring-amber-500/20 shadow-xs"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <CheckIcon className="size-4 stroke-[2.5]" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        isCurrent
                          ? "text-foreground font-bold"
                          : isCompleted
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="hidden sm:block text-[11px] text-muted-foreground truncate">
                      {step.desc}
                    </p>
                  </div>
                </div>
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 sm:mx-4 h-0.5 flex-1 rounded-full transition-colors",
                      isCompleted ? "bg-emerald-500" : "bg-muted",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {avis === "creada" && (
        <SuccessNotice>
          Incidència enviada. La coordinació TIC ja la té, i aquí en veuràs els canvis i les respostes.
        </SuccessNotice>
      )}
      {avis === "ja-reportada" && (
        <SuccessNotice>Ja tenies aquesta avaria reportada: és aquesta, i la coordinació TIC n&apos;està al cas.</SuccessNotice>
      )}
      <CleanUrlParam name="avis" />

      <Card
        className={cn(
          "shadow-xs",
          incident.status === "RESOLTA" || incident.status === "TANCADA"
            ? "border-t-4 border-t-emerald-500"
            : incident.status === "EN_CURS"
              ? "border-t-4 border-t-amber-500"
              : "border-t-4 border-t-red-500",
        )}
      >
        <CardContent className="whitespace-pre-wrap pt-6 text-sm">
          {incident.description}
        </CardContent>
      </Card>

      {incident.attachments.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {incident.attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              <FileIcon className="size-4" />
              {attachment.filename}
            </a>
          ))}
        </div>
      )}

      <AttachmentUploader incidentId={incident.id} />

      {isAdmin(user.role) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gestió</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusControls
              incidentId={incident.id}
              status={incident.status}
              priority={incident.priority}
              assignedToId={incident.assignedToId}
              coordinators={coordinators.map((c) => ({
                id: c.id,
                name: c.name ?? c.email,
              }))}
              reporterName={incident.reporter.name ?? incident.reporter.email}
              notifies={incident.reporterId !== user.id}
            />

            {isSuperAdmin(user.role) && (
              <>
                <Separator className="my-4" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Per al dia a dia, tanca la incidència: l&apos;historial de l&apos;equip és el que
                    justifica substituir-lo. Esborra-la només si és un duplicat, una prova o conté
                    dades que no hi haurien de ser.
                  </p>
                  <ConfirmDeleteButton
                    action={deleteIncident}
                    input={{ incidentId: incident.id }}
                    title="Esborrar la incidència definitivament?"
                    description={`Es perden també els ${incident.comments.length} comentaris de seguiment i els ${incident.attachments.length} fitxers adjunts, que s'esborraran del magatzem. No es pot desfer.`}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Seguiment</h2>
        <div className="flex flex-col gap-4">
          {incident.comments.map((comment) => (
            <div key={comment.id} className="rounded-md border bg-background p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {comment.author.name ?? comment.author.email}
                </span>
                <span>{formatDateTime(comment.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))}
          {incident.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">Encara no hi ha cap comentari.</p>
          )}
        </div>
        <div className="mt-4">
          <CommentForm incidentId={incident.id} />
        </div>
      </div>
    </div>
  );
}
