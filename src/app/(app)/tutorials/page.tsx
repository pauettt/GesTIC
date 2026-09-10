import Link from "next/link";

import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/permissions";
import {
  deleteTutorialArticle,
  deleteTutorialCategory,
  reorderTutorialCategory,
  upsertTutorialCategory,
} from "@/actions/tutorials";
import { ArticleDialog } from "@/components/tutorials/article-dialog";
import { CategoryManagerDialog } from "@/components/shared/category-manager-dialog";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";

export const metadata = { title: "Tutorials" };

export default async function TutorialsPage() {
  const user = await requireUser();
  const categories = await db.tutorialCategory.findMany({
    include: { articles: { orderBy: { title: "asc" } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tutorials i instruccions</h1>
          <p className="text-muted-foreground">
            Guies pas a pas per a eines i equips del centre.
          </p>
        </div>
        {isAdmin(user.role) && (
          <div className="flex gap-2">
            <CategoryManagerDialog
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name,
                order: category.order,
                usageCount: category.articles.length,
              }))}
              upsertAction={upsertTutorialCategory}
              deleteAction={deleteTutorialCategory}
              reorderAction={reorderTutorialCategory}
              title="Categories de tutorials"
              description="Ordena, reanomena o elimina les seccions dels tutorials."
              itemNounSingular="tutorial"
              itemNounPlural="tutorials"
              deleteCascades
              triggerVariant="outline"
            />
            <ArticleDialog categories={categories} />
          </div>
        )}
      </div>

      {categories.length === 0 && (
        <p className="text-muted-foreground">Encara no hi ha cap categoria de tutorials.</p>
      )}

      {categories.map((category) => (
        <div key={category.id}>
          <h2 className="mb-2 text-lg font-semibold">{category.name}</h2>
          <div className="divide-y rounded-lg border bg-background">
            {category.articles.map((article) => (
              <div key={article.id} className="flex items-center justify-between gap-3 p-3">
                <Link href={`/tutorials/${article.slug}`} className="font-medium hover:underline">
                  {article.title}
                </Link>
                {isAdmin(user.role) && (
                  <div className="flex gap-1">
                    <ArticleDialog
                      categories={categories}
                      article={{
                        id: article.id,
                        categoryId: article.categoryId,
                        title: article.title,
                        contentMarkdown: article.contentMarkdown,
                      }}
                      trigger={
                        <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                          Edita
                        </button>
                      }
                    />
                    <ConfirmDeleteButton
                      action={deleteTutorialArticle}
                      input={{ id: article.id }}
                      title="Eliminar aquest tutorial?"
                    />
                  </div>
                )}
              </div>
            ))}
            {category.articles.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">Sense tutorials en aquesta categoria.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
