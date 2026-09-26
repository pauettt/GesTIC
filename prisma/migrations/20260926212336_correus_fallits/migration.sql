-- CreateTable
CREATE TABLE "EmailFailure" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailFailure_createdAt_idx" ON "EmailFailure"("createdAt");
