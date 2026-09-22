-- Reserves d'equips sols dels carros (2026-09-22).
--
-- A més del carro sencer, el professorat pot reservar un equip concret per a
-- unes sessions d'un dia. Des que comença, l'equip surt com a no disponible amb
-- el nom de qui el té, fins que el torna. Una taula nova i buida: no toca cap
-- reserva de carro ni l'estat de cap equip.

-- CreateTable
CREATE TABLE "DeviceReservation" (
    "id" TEXT NOT NULL,
    "chromebookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMADA',
    "returnedAt" TIMESTAMP(3),
    "returnedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceReservation_chromebookId_status_idx" ON "DeviceReservation"("chromebookId", "status");

-- CreateIndex
CREATE INDEX "DeviceReservation_userId_status_idx" ON "DeviceReservation"("userId", "status");

-- CreateIndex
CREATE INDEX "DeviceReservation_status_endDate_idx" ON "DeviceReservation"("status", "endDate");

-- AddForeignKey
ALTER TABLE "DeviceReservation" ADD CONSTRAINT "DeviceReservation_chromebookId_fkey" FOREIGN KEY ("chromebookId") REFERENCES "Chromebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceReservation" ADD CONSTRAINT "DeviceReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceReservation" ADD CONSTRAINT "DeviceReservation_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
