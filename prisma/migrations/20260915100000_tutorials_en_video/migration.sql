-- Tutorials en vídeo (2026-09-15, PENDENTS.md §24).
--
-- Els tutorials deixen de ser articles de text i passen a ser vídeos de YouTube
-- per categories. `TutorialArticle` s'esborra: després del buidat del 2026-09-15
-- era buida. De cada vídeo només es desa l'identificador de YouTube, que és únic
-- perquè el mateix vídeo no surti dues vegades. Les categories no es toquen.

-- DropForeignKey
ALTER TABLE "TutorialArticle" DROP CONSTRAINT "TutorialArticle_categoryId_fkey";

-- DropTable
DROP TABLE "TutorialArticle";

-- CreateTable
CREATE TABLE "TutorialVideo" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorialVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorialVideo_youtubeId_key" ON "TutorialVideo"("youtubeId");

-- CreateIndex
CREATE INDEX "TutorialVideo_categoryId_idx" ON "TutorialVideo"("categoryId");

-- AddForeignKey
ALTER TABLE "TutorialVideo" ADD CONSTRAINT "TutorialVideo_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TutorialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
