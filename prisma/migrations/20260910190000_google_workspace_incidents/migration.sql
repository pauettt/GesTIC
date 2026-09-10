-- Tercera via per reportar: incidències de l'entorn Google (Classroom, correu,
-- Drive, Meet, YouTube, contrasenyes...). No tenen ni aula ni equip
-- d'inventari, així que el servei afectat es desa en una columna pròpia.
--
-- BEFORE 'GENERAL' manté l'ordre del valor igual que a schema.prisma; si no,
-- la següent comparació d'esquema hi detectaria una diferència.
ALTER TYPE "IncidentTargetType" ADD VALUE 'GOOGLE_WORKSPACE' BEFORE 'GENERAL';

CREATE TYPE "GoogleService" AS ENUM (
  'CLASSROOM',
  'COMPTE',
  'GMAIL',
  'DRIVE',
  'MEET',
  'CALENDAR',
  'YOUTUBE',
  'CHROME',
  'ALTRE'
);

ALTER TABLE "Incident" ADD COLUMN "googleService" "GoogleService";
