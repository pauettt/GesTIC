-- CreateTable
CREATE TABLE "SchoolHoliday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolHoliday_startDate_idx" ON "SchoolHoliday"("startDate");
