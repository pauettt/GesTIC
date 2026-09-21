-- Quan es va tocar una incidència per última vegada (2026-09-21).
--
-- El panell de la coordinació marca les que fa dies que ningú no toca, encara
-- que tinguin responsable. Les que ja hi són prenen la data de creació: amb la
-- del desplegament, les aturades de debò semblarien acabades de tocar.

ALTER TABLE "Incident" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Incident" SET "updatedAt" = "createdAt";
ALTER TABLE "Incident" ALTER COLUMN "updatedAt" SET NOT NULL;
