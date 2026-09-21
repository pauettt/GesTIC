-- IP i nom a la xarxa de l'equipament (2026-09-21).
--
-- La secció «Xarxa» surt de l'inventari: cada equip actiu pot portar la seva IP
-- fixa i el seu nom a la xarxa. Dues columnes noves i buides; no toca res del
-- que ja hi ha. La IP és única: dos equips amb la mateixa és un conflicte.

ALTER TABLE "InventoryItem" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "hostname" TEXT;

CREATE UNIQUE INDEX "InventoryItem_ipAddress_key" ON "InventoryItem"("ipAddress");
