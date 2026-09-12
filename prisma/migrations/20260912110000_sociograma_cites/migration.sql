-- Sociograma: l'agenda de cites del professorat. gesTIC només guarda l'hora —
-- qui ve, quin grup i quan—; el sociograma es passa fora, així que aquí no hi
-- entra cap dada d'alumnat.
--
-- La coordinació obre les hores una per una damunt la graella de l'horari del
-- centre, i `startDate` és únic perquè una hora oberta és per a una tutoria:
-- no es reparteixen equips, es reparteix l'agenda.
CREATE TABLE "SociogramSlot" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SociogramSlot_pkey" PRIMARY KEY ("id")
);

-- Cancel·lar una cita l'esborra i l'hora torna a quedar lliure: no es guarda
-- historial de cancel·lades perquè no hi ha res a reclamar-ne després.
CREATE TABLE "SociogramBooking" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SociogramBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SociogramSlot_startDate_key" ON "SociogramSlot"("startDate");

-- Una hora, una cita. Aquest índex és l'única protecció real contra que dos
-- tutors es presentin a la mateixa hora: la comprovació de l'aplicació llegeix
-- i després escriu, i dos clics simultanis la superen tots dos.
CREATE UNIQUE INDEX "SociogramBooking_slotId_key" ON "SociogramBooking"("slotId");

-- CreateIndex
CREATE INDEX "SociogramBooking_userId_idx" ON "SociogramBooking"("userId");

-- AddForeignKey
ALTER TABLE "SociogramBooking" ADD CONSTRAINT "SociogramBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "SociogramSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SociogramBooking" ADD CONSTRAINT "SociogramBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
