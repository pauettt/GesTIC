-- Hores fixes de l'agenda de cites. El superadministrador —el compte de
-- coordinació TIC, que és l'únic que obre hores— marca un dia i una sessió, i
-- aquella hora s'obre cada setmana del curs fins al 30 de juny, menys els
-- festius. Fins ara s'obrien a mà cada setmana.
--
-- Cada setmana continua sent un "AppointmentSlot" normal, amb el lligam a
-- l'hora fixa d'on surt: si l'hora fixa es treu, les setmanes amb cita es
-- queden (SET NULL) i s'han de cancel·lar a part.

-- AlterTable
ALTER TABLE "AppointmentSlot" ADD COLUMN     "availabilityId" TEXT;

-- CreateTable
CREATE TABLE "AppointmentAvailability" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentAvailability_pkey" PRIMARY KEY ("id")
);

-- Un dia i una sessió, una sola vegada per curs: l'agenda és una.
CREATE UNIQUE INDEX "AppointmentAvailability_weekday_periodId_schoolYear_key" ON "AppointmentAvailability"("weekday", "periodId", "schoolYear");

-- CreateIndex
CREATE INDEX "AppointmentSlot_availabilityId_idx" ON "AppointmentSlot"("availabilityId");

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "AppointmentAvailability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAvailability" ADD CONSTRAINT "AppointmentAvailability_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
