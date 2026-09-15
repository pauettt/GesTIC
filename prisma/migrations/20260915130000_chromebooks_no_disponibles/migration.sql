-- Chromebooks no disponibles (2026-09-15).
--
-- La coordinació pot marcar a mà un equip com a no disponible, amb el motiu, per
-- qualsevol raó que no sigui una incidència: surt en vermell i no compta com a
-- disponible fins que el torna a posar com a disponible. El motiu queda també a
-- les notes de l'equip. No es canvia l'estat de cap equip existent.

-- AlterEnum
-- Un valor nou d'enum no es pot fer servir dins la mateixa migració que el crea,
-- i aquesta no el fa servir. AFTER només és perquè l'ordre quedi com a l'esquema.
ALTER TYPE "ChromebookStatus" ADD VALUE 'NO_DISPONIBLE' AFTER 'EN_INCIDENCIA';

-- AlterTable
ALTER TABLE "Chromebook" ADD COLUMN     "unavailableReason" TEXT;
