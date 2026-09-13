-- Administració del superadministrador (2026-09-13).
--
-- `User.disabledAt`: accés retirat a qui ja no és al centre però conserva el
-- compte de Google (una substitució acabada, un trasllat). Nul·la i sense valor
-- per defecte: tothom qui ja hi és continua tenint accés. L'usuari no s'esborra
-- perquè el que va fer ha de continuar dient qui ho va fer.
ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMP(3);

-- Registre de les accions de govern: canvis de permisos, accessos retirats,
-- esborrats definitius i neteges de dades. `action` és text i no un enum perquè
-- afegir-ne una de nova no demani cap migració.
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- Es llegeix sempre dels més recents als més antics.
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- Si s'esborra qui va fer l'acció, l'entrada es queda sense autor però no
-- desapareix: el resum ja porta el nom.
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
