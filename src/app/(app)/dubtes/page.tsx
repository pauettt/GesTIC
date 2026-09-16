import { ChevronRightIcon, MessageCircleQuestionIcon } from "lucide-react";

import { isAdmin, requireUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import {
  deleteFaq,
  deleteFaqCategory,
  reorderFaqCategory,
  upsertFaqCategory,
} from "@/actions/faq";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { CategoryManagerDialog } from "@/components/shared/category-manager-dialog";
import { FaqDialog } from "@/components/faq/faq-dialog";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata = { title: "Dubtes freqüents" };

export default async function DubtesPage() {
  const user = await requireUser();
  const canManage = isAdmin(user.role);
  const categories = await db.faqCategory.findMany({
    include: { entries: { orderBy: [{ order: "asc" }, { question: "asc" }] } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const selectable = categories.map(({ id, name }) => ({ id, name }));
  const withQuestions = categories.filter((category) => category.entries.length > 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dubtes freqüents</h1>
          <p className="text-muted-foreground">
            Respostes ràpides a les preguntes més habituals del professorat.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <CategoryManagerDialog
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name,
                order: category.order,
                usageCount: category.entries.length,
              }))}
              upsertAction={upsertFaqCategory}
              deleteAction={deleteFaqCategory}
              reorderAction={reorderFaqCategory}
              title="Categories dels dubtes"
              description="Ordena, reanomena o elimina les seccions dels dubtes freqüents."
              itemNounSingular="pregunta"
              itemNounPlural="preguntes"
              deleteCascades
              triggerVariant="outline"
            />
            {/* Sense cap categoria no hi ha on posar la pregunta: primer se'n crea una. */}
            {selectable.length > 0 && <FaqDialog categories={selectable} />}
          </div>
        )}
      </div>

      {withQuestions.length === 0 && (
        <p className="text-muted-foreground">
          Encara no hi ha cap pregunta freqüent.
          {canManage && selectable.length === 0 && " Comença creant una categoria."}
        </p>
      )}

      {withQuestions.map((category) => (
        <div key={category.id}>
          <h2 className="mb-2 text-lg font-semibold">{category.name}</h2>
          <div className="divide-y rounded-lg border bg-background">
            {category.entries.map((entry) => (
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
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <FaqDialog
                      categories={selectable}
                      faq={{
                        id: entry.id,
                        question: entry.question,
                        answer: entry.answer,
                        categoryId: entry.categoryId,
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
        <ButtonLink variant="outline" href="/consultes/nova">
          <MessageCircleQuestionIcon className="size-4" />
          Fes una pregunta
        </ButtonLink>
      </div>
    </div>
  );
}
