import { LinkIcon, MapPinIcon, UsersIcon } from "lucide-react";

import { db } from "@/lib/db";
import { formatDate, formatDateTimeFull, toDateTimeLocalValue } from "@/lib/date";
import { isAdmin, requireUser } from "@/lib/permissions";
import { deleteTrainingSession } from "@/actions/training";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { EnrollButton } from "@/components/training/enroll-button";
import { EnrolleesDialog } from "@/components/training/enrollees-dialog";
import { SessionDialog } from "@/components/training/session-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Formació" };

export default async function FormacioPage() {
  const user = await requireUser();

  const [sessions, spaces] = await Promise.all([
    db.trainingSession.findMany({
      include: {
        space: true,
        enrollments: { include: { user: true }, orderBy: { enrolledAt: "asc" } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { date: "asc" },
    }),
    db.space.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Formació TIC</h1>
          <p className="text-muted-foreground">Sessions de formació per al professorat.</p>
        </div>
        {isAdmin(user.role) && <SessionDialog spaces={spaces} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sessions.map((session) => {
          const isEnrolled = session.enrollments.some((e) => e.userId === user.id);
          const isFull = Boolean(session.capacity && session._count.enrollments >= session.capacity);
          return (
            <Card key={session.id}>
              <CardHeader>
                <CardTitle>{session.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{formatDateTimeFull(session.date)}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm whitespace-pre-wrap">{session.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {session.space && (
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="size-4" /> {session.space.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <UsersIcon className="size-4" />
                    {session._count.enrollments}
                    {session.capacity ? ` / ${session.capacity}` : ""} inscrits
                  </span>
                  {session.materialsUrl[0] && (
                    <a
                      href={session.materialsUrl[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:underline"
                    >
                      <LinkIcon className="size-4" /> Materials
                    </a>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <EnrollButton sessionId={session.id} isEnrolled={isEnrolled} isFull={isFull} />
                  {isAdmin(user.role) && (
                    <div className="flex items-center gap-1">
                      <EnrolleesDialog
                        sessionTitle={session.title}
                        enrollees={session.enrollments.map((enrollment) => ({
                          id: enrollment.id,
                          name: enrollment.user.name ?? enrollment.user.email,
                          email: enrollment.user.email,
                          enrolledAt: formatDate(enrollment.enrolledAt),
                        }))}
                      />
                      <SessionDialog
                        spaces={spaces}
                        session={{
                          id: session.id,
                          title: session.title,
                          description: session.description,
                          date: toDateTimeLocalValue(session.date),
                          spaceId: session.spaceId ?? "",
                          capacity: session.capacity ? String(session.capacity) : "",
                          materialsUrl: session.materialsUrl[0] ?? "",
                        }}
                        trigger={
                          <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                            Edita
                          </button>
                        }
                      />
                      <ConfirmDeleteButton
                        action={deleteTrainingSession}
                        input={{ id: session.id }}
                        title="Eliminar aquesta sessió?"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sessions.length === 0 && (
          <p className="text-muted-foreground">Encara no hi ha cap sessió de formació programada.</p>
        )}
      </div>
    </div>
  );
}
