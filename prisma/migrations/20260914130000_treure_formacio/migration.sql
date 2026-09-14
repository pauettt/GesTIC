-- Fora l'apartat de Formació (2026-09-14, PENDENTS.md).
--
-- No el feia servir ningú: a producció només hi havia dues sessions de prova i
-- cap inscripció, i totes les dades de l'aplicació encara són inventades. Una
-- sessió presencial s'anuncia on el professorat ja mira (correu, claustre,
-- Calendar). Esborra les dues taules amb el que tenen i no toca res més.

-- DropForeignKey
ALTER TABLE "TrainingSession" DROP CONSTRAINT "TrainingSession_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingEnrollment" DROP CONSTRAINT "TrainingEnrollment_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingEnrollment" DROP CONSTRAINT "TrainingEnrollment_userId_fkey";

-- DropTable
DROP TABLE "TrainingSession";

-- DropTable
DROP TABLE "TrainingEnrollment";
