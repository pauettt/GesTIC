-- Reserves fixes de carros (2026-09-22).
--
-- El professorat pot demanar un carro el mateix dia i la mateixa sessió cada
-- setmana del curs, fins al 30 de juny, amb el motiu. La coordinació TIC
-- l'aprova, i llavors es crea una reserva normal per a cada setmana, lligada a
-- la fixa per `recurringId`. Una taula nova i buida i una columna nova i buida:
-- no toca cap reserva que ja hi sigui.

-- CreateEnum
CREATE TYPE "RecurringReservationStatus" AS ENUM ('PENDENT', 'APROVADA', 'REBUTJADA', 'CANCELLADA');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "recurringId" TEXT;

-- CreateTable
CREATE TABLE "RecurringReservation" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "RecurringReservationStatus" NOT NULL DEFAULT 'PENDENT',
    "responseNote" TEXT,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringReservation_cartId_schoolYear_status_idx" ON "RecurringReservation"("cartId", "schoolYear", "status");

-- CreateIndex
CREATE INDEX "RecurringReservation_userId_idx" ON "RecurringReservation"("userId");

-- CreateIndex
CREATE INDEX "RecurringReservation_status_idx" ON "RecurringReservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_recurringId_idx" ON "Reservation"("recurringId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "RecurringReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringReservation" ADD CONSTRAINT "RecurringReservation_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringReservation" ADD CONSTRAINT "RecurringReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringReservation" ADD CONSTRAINT "RecurringReservation_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
