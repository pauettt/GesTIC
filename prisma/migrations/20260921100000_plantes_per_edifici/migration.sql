-- Plantes per edifici (2026-09-21).
--
-- Fins ara hi havia una sola llista de plantes per a tots els edificis
-- (`20260915160000_plantes`), però no tots els edificis tenen les mateixes: un
-- espai exterior no en té cap. Ara cada planta és d'un edifici, i la planta d'un
-- espai ha de ser del seu edifici.
--
-- Les plantes que ja hi havia es reparteixen així, sense perdre cap enllaç:
--  1. Cada planta es queda al primer edifici (per ordre) que té espais seus, i en
--     cada un dels altres edificis que en tenen se'n crea una còpia amb el mateix
--     nom i ordre, a la qual passen els espais d'aquell edifici.
--  2. Les que no fa servir cap espai d'un edifici van a l'edifici amb més espais:
--     la coordinació pot moure-les o esborrar-les després.
--  3. Un espai amb planta i sense edifici pren l'edifici de la planta.
--  4. Si no hi ha cap edifici, les plantes no tenen on anar i s'esborren.

ALTER TABLE "Floor" ADD COLUMN "buildingId" TEXT;

-- El nom deixa de ser únic abans de fer-ne les còpies.
DROP INDEX "Floor_name_key";

-- 1.
CREATE TEMP TABLE "FloorUse" AS
SELECT DISTINCT "floorId", "buildingId"
FROM "Space"
WHERE "floorId" IS NOT NULL AND "buildingId" IS NOT NULL;

UPDATE "Floor"
SET "buildingId" = "first"."buildingId"
FROM (
  SELECT DISTINCT ON ("FloorUse"."floorId") "FloorUse"."floorId", "FloorUse"."buildingId"
  FROM "FloorUse"
  JOIN "Building" ON "Building"."id" = "FloorUse"."buildingId"
  ORDER BY "FloorUse"."floorId", "Building"."order", "Building"."name"
) AS "first"
WHERE "Floor"."id" = "first"."floorId";

INSERT INTO "Floor" ("id", "name", "order", "buildingId")
SELECT gen_random_uuid()::text, "Floor"."name", "Floor"."order", "FloorUse"."buildingId"
FROM "FloorUse"
JOIN "Floor" ON "Floor"."id" = "FloorUse"."floorId"
WHERE "Floor"."buildingId" <> "FloorUse"."buildingId";

-- Abans, el nom era únic: dins d'un edifici, la còpia és l'única planta amb aquell nom.
UPDATE "Space"
SET "floorId" = "copy"."id"
FROM "Floor" AS "original", "Floor" AS "copy"
WHERE "Space"."floorId" = "original"."id"
  AND "Space"."buildingId" <> "original"."buildingId"
  AND "copy"."buildingId" = "Space"."buildingId"
  AND "copy"."name" = "original"."name";

DROP TABLE "FloorUse";

-- 2.
UPDATE "Floor"
SET "buildingId" = (
  SELECT "Building"."id"
  FROM "Building"
  LEFT JOIN "Space" ON "Space"."buildingId" = "Building"."id"
  GROUP BY "Building"."id", "Building"."order", "Building"."name"
  ORDER BY COUNT("Space"."id") DESC, "Building"."order", "Building"."name"
  LIMIT 1
)
WHERE "buildingId" IS NULL;

-- 3.
UPDATE "Space"
SET "buildingId" = "Floor"."buildingId"
FROM "Floor"
WHERE "Space"."floorId" = "Floor"."id" AND "Space"."buildingId" IS NULL;

-- 4.
UPDATE "Space" SET "floorId" = NULL
WHERE "floorId" IN (SELECT "id" FROM "Floor" WHERE "buildingId" IS NULL);
DELETE FROM "Floor" WHERE "buildingId" IS NULL;

ALTER TABLE "Floor" ALTER COLUMN "buildingId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Space" DROP CONSTRAINT "Space_floorId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Floor_buildingId_name_key" ON "Floor"("buildingId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_id_buildingId_key" ON "Floor"("id", "buildingId");

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_floorId_buildingId_fkey" FOREIGN KEY ("floorId", "buildingId") REFERENCES "Floor"("id", "buildingId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Amb la clau forana composta, PostgreSQL no comprova res si una de les dues
-- columnes és buida: sense això, un espai podria tenir planta i no edifici.
ALTER TABLE "Space" ADD CONSTRAINT "Space_floor_needs_building" CHECK ("floorId" IS NULL OR "buildingId" IS NOT NULL);
