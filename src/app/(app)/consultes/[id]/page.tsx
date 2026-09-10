import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/date";
import { isAdmin, requireUser } from "@/lib/permissions";
import { queryStatusLabels, queryStatusVariants } from "@/lib/labels";
import { QueryCommentForm } from "@/components/queries/query-comment-form";
import { QueryStatusControls } from "@/components/queries/query-status-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function ConsultaDetailPage({ params }: PageProps<"/consultes/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  const query = await db.query.findUnique({
    where: { id },
    include: {
      author: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!query) notFound();
  if (!isAdmin(user.role) && query.authorId !== user.id) {
    redirect("/consultes");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/consultes" className="text-sm text-muted-foreground hover:underline">
          &larr; Totes les consultes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{query.title}</h1>
          <Badge variant={queryStatusVariants[query.status]}>{queryStatusLabels[query.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Preguntada per {query.author.name ?? query.author.email} el {formatDate(query.createdAt)}
        </p>
      </div>

      <Card>
        <CardContent className="whitespace-pre-wrap pt-6 text-sm">{query.description}</CardContent>
      </Card>

      {isAdmin(user.role) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gestió</CardTitle>
          </CardHeader>
          <CardContent>
            <QueryStatusControls queryId={query.id} status={query.status} />
          </CardContent>
        </Card>
      )}

      <Separator />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Seguiment</h2>
        <div className="flex flex-col gap-4">
          {query.comments.map((comment) => (
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
          {query.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Encara no hi ha cap resposta. El coordinador/a TIC la veurà aviat.
            </p>
          )}
        </div>
        <div className="mt-4">
          <QueryCommentForm queryId={query.id} />
        </div>
      </div>
    </div>
  );
}
