-- Categories dels Dubtes freqüents (2026-09-16).
--
-- La categoria s'escrivia a mà a cada pregunta (`FaqEntry.category`), així que
-- una errada d'escriptura creava una secció nova sense que ningú se n'adonés.
-- Passa a ser una llista pròpia, com a Tutorials, Inventari i Contrasenyes: es
-- tria d'un desplegable i es gestiona des del botó «Categories».
--
-- Les que hi havia escrites passen a la llista, una per nom sense distingir
-- majúscules ni espais als extrems —es queda la forma que comença en
-- majúscula—, i cada pregunta queda enllaçada a la seva. Cap pregunta no es
-- perd: les que no en tinguessin cap van a «General».

CREATE TABLE "FaqCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FaqCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaqCategory_name_key" ON "FaqCategory"("name");

INSERT INTO "FaqCategory" ("id", "name", "order")
SELECT gen_random_uuid()::text, name, (ROW_NUMBER() OVER (ORDER BY lower(name)) - 1)::int
FROM (
  SELECT DISTINCT ON (lower(btrim("category"))) btrim("category") AS name
  FROM "FaqEntry"
  WHERE btrim("category") <> ''
  ORDER BY lower(btrim("category")), (btrim("category") ~ '^[[:upper:]]') DESC, btrim("category")
) AS noms;

ALTER TABLE "FaqEntry" ADD COLUMN "categoryId" TEXT;

UPDATE "FaqEntry" e
SET "categoryId" = c."id"
FROM "FaqCategory" c
WHERE lower(btrim(e."category")) = lower(c."name");

-- Només si cal: una pregunta sense categoria no pot quedar fora de la llista.
INSERT INTO "FaqCategory" ("id", "name", "order")
SELECT gen_random_uuid()::text, 'General', COALESCE((SELECT MAX("order") + 1 FROM "FaqCategory"), 0)
WHERE EXISTS (SELECT 1 FROM "FaqEntry" WHERE "categoryId" IS NULL)
  AND NOT EXISTS (SELECT 1 FROM "FaqCategory" WHERE lower("name") = 'general');

UPDATE "FaqEntry"
SET "categoryId" = (SELECT "id" FROM "FaqCategory" WHERE lower("name") = 'general')
WHERE "categoryId" IS NULL;

-- Un cop copiat tot, ja es pot deixar anar el text (i el seu índex).
ALTER TABLE "FaqEntry" DROP COLUMN "category";
ALTER TABLE "FaqEntry" ALTER COLUMN "categoryId" SET NOT NULL;

CREATE INDEX "FaqEntry_categoryId_idx" ON "FaqEntry"("categoryId");

ALTER TABLE "FaqEntry" ADD CONSTRAINT "FaqEntry_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "FaqCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
