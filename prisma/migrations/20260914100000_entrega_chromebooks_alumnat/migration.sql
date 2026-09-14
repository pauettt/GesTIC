-- Entrega dels Chromebooks d'alumnat i historial de cada equip (2026-09-14).
--
-- Aprovar una sol·licitud aparta l'equip; que l'alumne se l'endugui és un pas a
-- part, ENTREGADA, amb el moment i qui l'entrega. La devolució també desa qui
-- rep l'equip. Cap d'aquestes dates no s'edita: són el registre de quan va passar.
--
-- No s'esborra ni es canvia cap dada. Les sol·licituds aprovades que ja hi havia
-- es queden com a APROVADA, és a dir, pendents d'entrega: no s'inventa cap data
-- d'entrega, la coordinació la registra quan toqui.
--
-- Les sol·licituds ja no es buiden en acabar el curs: es guarden per saber quins
-- alumnes ha tingut cada equip (decisió del 2026-09-14, PENDENTS.md §22).

-- AlterEnum
-- Un valor nou d'enum no es pot fer servir dins la mateixa migració que el crea,
-- i aquesta no el fa servir. AFTER només és perquè l'ordre quedi com a l'esquema.
ALTER TYPE "StudentDeviceRequestStatus" ADD VALUE 'ENTREGADA' AFTER 'APROVADA';

-- AlterTable
ALTER TABLE "StudentDeviceRequest" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveredById" TEXT,
ADD COLUMN     "returnedById" TEXT;

-- AddForeignKey
-- Si s'esborra qui va entregar o rebre l'equip, el préstec es queda sense aquesta
-- dada però no desapareix de l'historial.
ALTER TABLE "StudentDeviceRequest" ADD CONSTRAINT "StudentDeviceRequest_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeviceRequest" ADD CONSTRAINT "StudentDeviceRequest_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
