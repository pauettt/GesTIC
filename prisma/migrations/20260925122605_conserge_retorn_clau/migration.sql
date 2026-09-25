-- AlterTable
ALTER TABLE "KeyLoan" ADD COLUMN     "returnedById" TEXT;

-- AddForeignKey
ALTER TABLE "KeyLoan" ADD CONSTRAINT "KeyLoan_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "Concierge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
