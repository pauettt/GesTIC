-- Aules amb número oficial i nom (2026-09-15).
--
-- El número (A.004) és el que identifica l'aula, també a les IP; el nom (Rosalia)
-- és com l'anomena el centre. `name` passa a ser el que es mostra, compost de
-- tots dos. Els espais que ja hi havia conserven el nom com a nom de l'aula i es
-- queden sense número: no se n'inventa cap.

-- AlterTable
ALTER TABLE "Space" ADD COLUMN     "number" TEXT,
ADD COLUMN     "roomName" TEXT;

UPDATE "Space" SET "roomName" = "name";

-- CreateIndex
CREATE UNIQUE INDEX "Space_number_key" ON "Space"("number");
