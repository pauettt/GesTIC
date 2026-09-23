-- Catàleg buit perquè cada centre el configuri des d'Aules i espais.
-- Les peticions existents mantenen groupName; no se n'infereixen grups.
-- AlterTable
ALTER TABLE "StudentDeviceRequest" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "AcademicStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AcademicStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicCourse" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AcademicCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicGroup" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AcademicGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicStage_name_key" ON "AcademicStage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicCourse_stageId_name_key" ON "AcademicCourse"("stageId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicGroup_courseId_name_key" ON "AcademicGroup"("courseId", "name");

-- CreateIndex
CREATE INDEX "StudentDeviceRequest_groupId_idx" ON "StudentDeviceRequest"("groupId");

-- AddForeignKey
ALTER TABLE "AcademicCourse" ADD CONSTRAINT "AcademicCourse_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "AcademicStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicGroup" ADD CONSTRAINT "AcademicGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AcademicCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeviceRequest" ADD CONSTRAINT "StudentDeviceRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademicGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
