import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/permissions";
import {
  deleteTutorialCategory,
  reorderTutorialCategory,
  upsertTutorialCategory,
} from "@/actions/tutorials";
import { CategoryManagerDialog } from "@/components/shared/category-manager-dialog";
import { VideoDialog } from "@/components/tutorials/video-dialog";
import { VideoLibrary } from "@/components/tutorials/video-library";

export const metadata = { title: "Tutorials" };

export default async function TutorialsPage() {
  const user = await requireUser();
  const canManage = isAdmin(user.role);
  const categories = await db.tutorialCategory.findMany({
    include: {
      videos: {
        select: { id: true, categoryId: true, youtubeId: true, title: true, description: true },
        orderBy: { title: "asc" },
      },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tutorials</h1>
          <p className="text-muted-foreground">
            Vídeos curts per fer servir les eines i els equips del centre.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <CategoryManagerDialog
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name,
                order: category.order,
                usageCount: category.videos.length,
              }))}
              upsertAction={upsertTutorialCategory}
              deleteAction={deleteTutorialCategory}
              reorderAction={reorderTutorialCategory}
              title="Categories de tutorials"
              description="Ordena, reanomena o elimina les seccions dels tutorials."
              itemNounSingular="vídeo"
              itemNounPlural="vídeos"
              deleteCascades
              triggerVariant="outline"
            />
            {categories.length > 0 && (
              <VideoDialog categories={categories.map(({ id, name }) => ({ id, name }))} />
            )}
          </div>
        )}
      </div>

      <VideoLibrary categories={categories} canManage={canManage} />
    </div>
  );
}
