-- Plantes triades d'una llista (2026-09-15).
--
-- Com els edificis (`20260915150000_edificis`): la planta d'un espai s'escrivia
-- a mà i ara es tria d'una llista que manté la coordinació, una sola per a tots
-- els edificis. Les plantes que ja hi havia escrites passen a la llista —un sol
-- cop per nom, sense distingir majúscules ni espais als extrems, amb la forma més
-- repetida i, si n'hi ha empat, la que comença en majúscula— i cada espai queda
-- enllaçat a la seva. Queden en ordre alfabètic: la coordinació les posa en
-- l'ordre de l'edifici. La columna de text no s'esborra fins que tot està copiat.

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Floor_name_key" ON "Floor"("name");

-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "floorId" TEXT;

INSERT INTO "Floor" ("id", "name", "order")
SELECT gen_random_uuid()::text, "name", (ROW_NUMBER() OVER (ORDER BY "name") - 1)::int
FROM (
  SELECT MODE() WITHIN GROUP (ORDER BY BTRIM("floor") COLLATE "C") AS "name"
  FROM "Space"
  WHERE BTRIM(COALESCE("floor", '')) <> ''
  GROUP BY LOWER(BTRIM("floor"))
) AS "existing";

UPDATE "Space"
SET "floorId" = "Floor"."id"
FROM "Floor"
WHERE LOWER(BTRIM("Space"."floor")) = LOWER("Floor"."name");

-- AlterTable
ALTER TABLE "Space" DROP COLUMN "floor";

-- CreateIndex
CREATE INDEX "Space_floorId_idx" ON "Space"("floorId");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
