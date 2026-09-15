-- Edificis triats d'una llista (2026-09-15).
--
-- L'edifici d'un espai s'escrivia a mà, i el mateix edifici podia acabar amb
-- noms diferents. Ara és una llista que manté la coordinació i l'espai en tria
-- un. Els edificis que ja hi havia escrits passen a la llista —un sol cop per
-- nom, sense distingir majúscules ni espais als extrems— i cada espai queda
-- enllaçat al seu. De cada edifici es queda la forma més repetida i, si n'hi ha
-- empat, la que comença en majúscula. La columna de text no s'esborra fins que
-- tot està copiat.

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Building_name_key" ON "Building"("name");

-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "buildingId" TEXT;

INSERT INTO "Building" ("id", "name", "order")
SELECT gen_random_uuid()::text, "name", (ROW_NUMBER() OVER (ORDER BY "name") - 1)::int
FROM (
  SELECT MODE() WITHIN GROUP (ORDER BY BTRIM("building") COLLATE "C") AS "name"
  FROM "Space"
  WHERE BTRIM(COALESCE("building", '')) <> ''
  GROUP BY LOWER(BTRIM("building"))
) AS "existing";

UPDATE "Space"
SET "buildingId" = "Building"."id"
FROM "Building"
WHERE LOWER(BTRIM("Space"."building")) = LOWER("Building"."name");

-- AlterTable
ALTER TABLE "Space" DROP COLUMN "building";

-- CreateIndex
CREATE INDEX "Space_buildingId_idx" ON "Space"("buildingId");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
