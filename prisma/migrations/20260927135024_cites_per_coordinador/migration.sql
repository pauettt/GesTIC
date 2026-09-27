-- Cada hora de l'agenda de cites és d'un coordinador TIC concret, i si a la
-- mateixa hora n'hi ha dos, hi ha dues places: qui demana la cita tria amb qui.
-- Fins ara hi havia una sola plaça per hora, i "openedById" era qui l'havia
-- oberta, que era també amb qui es tenia la cita. Ara les obre el
-- superadministrador per a cada coordinador, i el que cal saber és qui l'atén.
--
-- Es reanomenen les columnes en comptes de crear-ne de noves: les hores i les
-- cites que ja hi ha continuen sent amb qui les va obrir, com fins ara.

ALTER TABLE "AppointmentSlot" RENAME COLUMN "openedById" TO "coordinatorId";
ALTER TABLE "AppointmentSlot" RENAME CONSTRAINT "AppointmentSlot_openedById_fkey" TO "AppointmentSlot_coordinatorId_fkey";

-- Una hora i un coordinador, una sola plaça.
DROP INDEX "AppointmentSlot_startDate_key";
CREATE UNIQUE INDEX "AppointmentSlot_startDate_coordinatorId_key" ON "AppointmentSlot"("startDate", "coordinatorId");

ALTER TABLE "AppointmentAvailability" RENAME COLUMN "createdById" TO "coordinatorId";

-- Una hora fixa sense ningú que l'atengui no pot existir. Només en quedaria
-- alguna si s'hagués esborrat el compte que la va marcar; les setmanes que en
-- van sortir es queden, desenganxades (SET NULL), com obertes a mà.
DELETE FROM "AppointmentAvailability" WHERE "coordinatorId" IS NULL;
ALTER TABLE "AppointmentAvailability" ALTER COLUMN "coordinatorId" SET NOT NULL;

-- Si es va el coordinador, se'n van les seves hores fixes.
ALTER TABLE "AppointmentAvailability" DROP CONSTRAINT "AppointmentAvailability_createdById_fkey";
ALTER TABLE "AppointmentAvailability" ADD CONSTRAINT "AppointmentAvailability_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Un dia i una sessió, una sola vegada per curs i coordinador.
DROP INDEX "AppointmentAvailability_weekday_periodId_schoolYear_key";
CREATE UNIQUE INDEX "AppointmentAvailability_weekday_periodId_schoolYear_coordin_key" ON "AppointmentAvailability"("weekday", "periodId", "schoolYear", "coordinatorId");
