-- L'agenda de cites de la coordinació TIC. Substitueix les taules del
-- sociograma, creades aquest mateix matí: el que calia no era una agenda per a
-- una activitat concreta, sinó que la coordinació obri les hores en què hi pot
-- ser i qualsevol persona del claustre n'agafi una per al que necessiti. Passar
-- el sociograma de la tutoria és el primer ús que se li dona, no la funció.
--
-- S'esborren en comptes de reanomenar-se perquè no han arribat a tenir ni una
-- fila: es van crear i verificar amb dades de prova el 2026-09-12 i es van
-- buidar el mateix dia. Comprovat que estaven a zero abans d'escriure això.
DROP TABLE "SociogramBooking";
DROP TABLE "SociogramSlot";

-- CreateTable
CREATE TABLE "AppointmentSlot" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "openedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentSlot_pkey" PRIMARY KEY ("id")
);

-- El motiu és text lliure: l'agenda no sap de què va cada cita ni li cal.
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- Una hora oberta, una sola vegada.
CREATE UNIQUE INDEX "AppointmentSlot_startDate_key" ON "AppointmentSlot"("startDate");

-- Una hora, una cita. Aquest índex és l'única protecció real contra que dues
-- persones es presentin a la mateixa hora: la comprovació de l'aplicació
-- llegeix i després escriu, i dos clics simultanis la superen tots dos.
CREATE UNIQUE INDEX "Appointment_slotId_key" ON "Appointment"("slotId");

-- CreateIndex
CREATE INDEX "Appointment_userId_idx" ON "Appointment"("userId");

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AppointmentSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
