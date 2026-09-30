-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "label" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_label_key" ON "InventoryItem"("label");
