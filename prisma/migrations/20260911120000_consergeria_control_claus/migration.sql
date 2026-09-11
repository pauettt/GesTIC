-- Consergeria: control de les claus del centre (aules, magatzems i carros de
-- Chromebooks). Les claus de carro porten `cartId` i hereten les reserves, que
-- és el que permet saber a quina hora havien de tornar; les d'aula no en tenen.
--
-- `Concierge` no són usuaris: consergeria comparteix un únic compte de domini i
-- poden ser-hi tots tres alhora, així que qui entrega la clau es tria amb un
-- clic i es desa aquí.
--
-- BEFORE 'PROFESSOR' manté l'ordre del valor igual que a schema.prisma; si no,
-- la següent comparació d'esquema hi detectaria una diferència.
ALTER TYPE "Role" ADD VALUE 'CONSERGERIA' BEFORE 'PROFESSOR';

-- CreateTable
CREATE TABLE "Concierge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Concierge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Key" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cartId" TEXT,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyLoan" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "deliveredById" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "reservationId" TEXT,
    "reason" TEXT,
    "remindedAt" TIMESTAMP(3),
    "remindedById" TEXT,

    CONSTRAINT "KeyLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Concierge_name_key" ON "Concierge"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Key_number_key" ON "Key"("number");

-- CreateIndex
CREATE INDEX "Key_cartId_idx" ON "Key"("cartId");

-- CreateIndex
CREATE INDEX "KeyLoan_keyId_returnedAt_idx" ON "KeyLoan"("keyId", "returnedAt");

-- CreateIndex
CREATE INDEX "KeyLoan_borrowerId_idx" ON "KeyLoan"("borrowerId");

-- AddForeignKey
ALTER TABLE "Key" ADD CONSTRAINT "Key_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyLoan" ADD CONSTRAINT "KeyLoan_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "Key"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyLoan" ADD CONSTRAINT "KeyLoan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyLoan" ADD CONSTRAINT "KeyLoan_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "Concierge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyLoan" ADD CONSTRAINT "KeyLoan_remindedById_fkey" FOREIGN KEY ("remindedById") REFERENCES "Concierge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyLoan" ADD CONSTRAINT "KeyLoan_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

