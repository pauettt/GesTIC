-- Sol·licituds de préstec de Chromebook per a l'alumnat, que fan els tutors i
-- decideix la coordinació TIC. En aprovar-ne una s'hi assigna un equip del pool
-- (`Chromebook.isStudentLoanable`), que passa a ASSIGNAT fins a la devolució.
--
-- És la primera taula de gesTIC amb dades personals de MENORS: nom, cognoms i
-- el motiu pel qual se'ls deixa un equip. Per això el motiu és un enum i no
-- text lliure, no s'hi desa cap identificador acadèmic, i qui ho pot llegir són
-- només el tutor que ho ha demanat i la coordinació. Queda per decidir quan
-- s'esborren aquestes files a fi de curs: PENDENTS.md §21.

-- CreateEnum
CREATE TYPE "StudentDeviceReason" AS ENUM ('SENSE_DISPOSITIU', 'DISPOSITIU_AVARIAT', 'NECESSITAT_EDUCATIVA', 'ALTRE');

-- CreateEnum
CREATE TYPE "StudentDeviceRequestStatus" AS ENUM ('PENDENT', 'APROVADA', 'REBUTJADA', 'RETORNADA', 'CANCELLADA');

-- CreateTable
CREATE TABLE "StudentDeviceRequest" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "studentFirstName" TEXT NOT NULL,
    "studentLastName" TEXT NOT NULL,
    "groupName" TEXT,
    "reason" "StudentDeviceReason" NOT NULL,
    "reasonNote" TEXT,
    "status" "StudentDeviceRequestStatus" NOT NULL DEFAULT 'PENDENT',
    "chromebookId" TEXT,
    "responseNote" TEXT,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDeviceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentDeviceRequest_tutorId_idx" ON "StudentDeviceRequest"("tutorId");

-- CreateIndex
CREATE INDEX "StudentDeviceRequest_status_idx" ON "StudentDeviceRequest"("status");

-- CreateIndex
CREATE INDEX "StudentDeviceRequest_chromebookId_idx" ON "StudentDeviceRequest"("chromebookId");

-- AddForeignKey
ALTER TABLE "StudentDeviceRequest" ADD CONSTRAINT "StudentDeviceRequest_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeviceRequest" ADD CONSTRAINT "StudentDeviceRequest_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeviceRequest" ADD CONSTRAINT "StudentDeviceRequest_chromebookId_fkey" FOREIGN KEY ("chromebookId") REFERENCES "Chromebook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

