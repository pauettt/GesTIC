-- Tipus de dispositiu (2026-09-15).
--
-- Un carro no només porta Chromebooks: també portàtils, iPads o tauletes. Cada
-- equip passa a tenir el seu tipus, i el carro en mostra el recompte. Tots els que
-- ja hi havia queden com a Chromebook, que és el que eren fins ara.

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('CHROMEBOOK', 'PORTATIL', 'IPAD', 'TAULETA', 'ALTRE');

-- AlterTable
ALTER TABLE "Chromebook" ADD COLUMN     "deviceType" "DeviceType" NOT NULL DEFAULT 'CHROMEBOOK';
