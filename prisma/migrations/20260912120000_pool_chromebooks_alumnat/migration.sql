-- Pool de Chromebooks de préstec individual a l'alumnat.
--
-- `isStudentLoanable` marca els equips que no són de cap carro i que es deixen
-- a un alumne per a tot el curs. Va a banda de `cartId`: un `cartId` buit vol
-- dir "ara mateix fora del carro" (taller, magatzem) i l'equip hi ha de tornar,
-- mentre que aquests no hi tornen mai. Si els equips de préstec sortissin dels
-- carros, les reserves d'aula per hores deixarien de quadrar i no es notaria
-- fins que falten equips a classe.
--
-- BEFORE 'EN_INCIDENCIA' manté l'ordre del valor igual que a schema.prisma; si
-- no, la següent comparació d'esquema hi detectaria una diferència. ASSIGNAT va
-- després de RESERVAT perquè és l'altre estat d'equip ocupat, però dura tot el
-- curs i només el tanca la devolució, no l'horari.
ALTER TYPE "ChromebookStatus" ADD VALUE 'ASSIGNAT' BEFORE 'EN_INCIDENCIA';

ALTER TABLE "Chromebook" ADD COLUMN "isStudentLoanable" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Chromebook_isStudentLoanable_idx" ON "Chromebook"("isStudentLoanable");
