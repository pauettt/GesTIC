import Link from "next/link";
import { ChevronRightIcon, MessageCircleQuestionIcon } from "lucide-react";

import { isAdmin, requireUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import { deleteFaq } from "@/actions/faq";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { FaqDialog } from "@/components/faq/faq-dialog";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dubtes freqüents" };

export default async function DubtesPage() {
  const user = await requireUser();
  const entries = await db.faqEntry.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] });

  const categories = Array.from(new Set(entries.map((e) => e.category)));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dubtes freqüents</h1>
          <p className="text-muted-foreground">
            Respostes ràpides a les preguntes més habituals del professorat.
          </p>
        </div>
        {isAdmin(user.role) && <FaqDialog />}
      </div>

      {categories.length === 0 && (
        <p className="text-muted-foreground">Encara no hi ha cap pregunta freqüent.</p>
      )}

      {categories.map((category) => (
        <div key={category}>
          <h2 className="mb-2 text-lg font-semibold">{category}</h2>
          <div className="divide-y rounded-lg border bg-background">
            {entries
              .filter((entry) => entry.category === category)
              .map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 p-4">
                  <details className="group min-w-0 flex-1">
                    <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                      <span>{entry.question}</span>
                    </summary>
                    <p className="mt-3 pl-6 text-sm whitespace-pre-wrap text-muted-foreground">
                      {entry.answer}
                    </p>
                  </details>
                  {isAdmin(user.role) && (
                    <div className="flex shrink-0 items-center gap-1">
                      <FaqDialog
                        faq={{
                          id: entry.id,
                          question: entry.question,
                          answer: entry.answer,
                          category: entry.category,
                          order: String(entry.order),
                        }}
                        trigger={
                          <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                            Edita
                          </button>
                        }
                      />
                      <ConfirmDeleteButton
                        action={deleteFaq}
                        input={{ id: entry.id }}
                        title="Eliminar aquesta pregunta?"
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}

      <div className="rounded-lg border bg-background p-4 text-center">
        <p className="mb-2 text-sm text-muted-foreground">No trobes la resposta que busques?</p>
        <Button variant="outline" nativeButton={false} render={<Link href="/consultes/nova" />}>
          <MessageCircleQuestionIcon className="size-4" />
          Fes una pregunta
        </Button>
      </div>
    </div>
  );
}
