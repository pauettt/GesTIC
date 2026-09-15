-- Contrasenyes del centre (2026-09-15).
--
-- Secció nova per a la coordinació TIC: comptes, impressores, ordinadors... per
-- categories. La contrasenya i les observacions es desen xifrades amb AES-256-GCM
-- i la clau VAULT_ENCRYPTION_KEY, que no és a la base de dades: aquí només hi ha
-- text xifrat. Una categoria amb contrasenyes no es pot esborrar (RESTRICT).
-- No toca cap taula que ja existís.

-- CreateTable
CREATE TABLE "CredentialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CredentialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "url" TEXT,
    "passwordEncrypted" TEXT NOT NULL,
    "notesEncrypted" TEXT,
    "superAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CredentialCategory_name_key" ON "CredentialCategory"("name");

-- CreateIndex
CREATE INDEX "Credential_categoryId_idx" ON "Credential"("categoryId");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CredentialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
