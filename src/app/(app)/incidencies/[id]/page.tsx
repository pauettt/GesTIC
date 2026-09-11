import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileIcon } from "lucide-react";

import { db } from "@/lib/db";
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
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function IncidentDetailPage({ params }: PageProps<"/incidencies/[id]">) {
  const user = await requireUser();
  const { id } = await params;

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
      ? db.user.findMany({ where: { role: { in: COORDINATOR_ROLES } }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  if (!incident) notFound();
  if (!isAdmin(user.role) && incident.reporterId !== user.id) {
    redirect("/incidencies");
  }

  const targetLabel = incident.inventoryItem
    ? `${incident.inventoryItem.brand} ${incident.inventoryItem.model}`
    : incident.chromebook
      ? `Chromebook ${incident.chromebook.assetTag}${incident.chromebook.cart ? ` (carro ${incident.chromebook.cart.name})` : ""}`
      : incident.cart
        ? `Carro ${incident.cart.name}`
        : (incident.space?.name ?? incidentTargetTypeLabels[incident.targetType]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/incidencies" className="text-sm text-muted-foreground hover:underline">
          &larr; Totes les incidències
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{incident.title}</h1>
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

      <Card>
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
