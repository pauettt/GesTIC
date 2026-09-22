-- Qui anul·la una reserva fixa, i quan (2026-09-22).
--
-- La coordinació en té l'historial: qui la va demanar, qui la va decidir i qui
-- la va anul·lar. Dues columnes noves i buides. Si ja n'hi havia cap
-- d'anul·lada, surt a l'historial sense qui ni quan: no es va desar.

-- AlterTable
ALTER TABLE "RecurringReservation" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT;

-- AddForeignKey
ALTER TABLE "RecurringReservation" ADD CONSTRAINT "RecurringReservation_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
