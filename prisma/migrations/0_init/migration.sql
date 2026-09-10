-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "InventoryItemStatus" AS ENUM ('ACTIU', 'EN_REPARACIO', 'BAIXA');

-- CreateEnum
CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDENT', 'APROVADA', 'REBUTJADA', 'RETORNADA', 'CANCELLADA');

-- CreateEnum
CREATE TYPE "ChromebookStatus" AS ENUM ('DISPONIBLE', 'RESERVAT', 'EN_INCIDENCIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMADA', 'CANCELLADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "IncidentTargetType" AS ENUM ('INVENTORY_ITEM', 'CHROMEBOOK', 'CART', 'GENERAL');

-- CreateEnum
CREATE TYPE "IncidentPriority" AS ENUM ('BAIXA', 'MITJANA', 'ALTA');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('PANTALLA', 'TECLAT', 'TOUCHPAD', 'WIFI_INTERNET', 'NO_S_ENCEN', 'ALTRE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OBERTA', 'EN_CURS', 'RESOLTA', 'TANCADA');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('OBERTA', 'EN_CURS', 'RESOLTA', 'TANCADA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PROFESSOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT,
    "spaceId" TEXT,
    "status" "InventoryItemStatus" NOT NULL DEFAULT 'ACTIU',
    "imageUrl" TEXT,
    "isLoanable" BOOLEAN NOT NULL DEFAULT false,
    "purchaseDate" TIMESTAMP(3),
    "warrantyUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRequest" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "status" "LoanRequestStatus" NOT NULL DEFAULT 'PENDENT',
    "responseNote" TEXT,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT,
    "spaceId" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chromebook" (
    "id" TEXT NOT NULL,
    "cartId" TEXT,
    "spaceId" TEXT,
    "assetTag" TEXT NOT NULL,
    "serialNumber" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "status" "ChromebookStatus" NOT NULL DEFAULT 'DISPONIBLE',

    CONSTRAINT "Chromebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChromebookNote" (
    "id" TEXT NOT NULL,
    "chromebookId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChromebookNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "IncidentTargetType" NOT NULL,
    "spaceId" TEXT,
    "inventoryItemId" TEXT,
    "chromebookId" TEXT,
    "cartId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "IncidentCategory",
    "priority" "IncidentPriority" NOT NULL DEFAULT 'MITJANA',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OBERTA',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentComment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAttachment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "spaceId" TEXT,
    "capacity" INTEGER,
    "materialsUrl" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEnrollment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqEntry" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FaqEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Query" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "QueryStatus" NOT NULL DEFAULT 'OBERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryComment" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TutorialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorialArticle" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorialArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Space_name_key" ON "Space"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_name_key" ON "InventoryCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_serialNumber_key" ON "InventoryItem"("serialNumber");

-- CreateIndex
CREATE INDEX "InventoryItem_spaceId_idx" ON "InventoryItem"("spaceId");

-- CreateIndex
CREATE INDEX "InventoryItem_categoryId_idx" ON "InventoryItem"("categoryId");

-- CreateIndex
CREATE INDEX "InventoryItem_isLoanable_idx" ON "InventoryItem"("isLoanable");

-- CreateIndex
CREATE INDEX "LoanRequest_itemId_startDate_endDate_idx" ON "LoanRequest"("itemId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "LoanRequest_requesterId_idx" ON "LoanRequest"("requesterId");

-- CreateIndex
CREATE INDEX "LoanRequest_status_idx" ON "LoanRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_name_key" ON "Cart"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_serialNumber_key" ON "Cart"("serialNumber");

-- CreateIndex
CREATE INDEX "Cart_spaceId_idx" ON "Cart"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Chromebook_assetTag_key" ON "Chromebook"("assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "Chromebook_serialNumber_key" ON "Chromebook"("serialNumber");

-- CreateIndex
CREATE INDEX "Chromebook_cartId_idx" ON "Chromebook"("cartId");

-- CreateIndex
CREATE INDEX "Chromebook_spaceId_idx" ON "Chromebook"("spaceId");

-- CreateIndex
CREATE INDEX "ChromebookNote_chromebookId_idx" ON "ChromebookNote"("chromebookId");

-- CreateIndex
CREATE INDEX "Reservation_cartId_startDate_endDate_idx" ON "Reservation"("cartId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- CreateIndex
CREATE INDEX "Incident_status_priority_idx" ON "Incident"("status", "priority");

-- CreateIndex
CREATE INDEX "Incident_reporterId_idx" ON "Incident"("reporterId");

-- CreateIndex
CREATE INDEX "IncidentComment_incidentId_idx" ON "IncidentComment"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentAttachment_incidentId_idx" ON "IncidentAttachment"("incidentId");

-- CreateIndex
CREATE INDEX "TrainingSession_date_idx" ON "TrainingSession"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingEnrollment_sessionId_userId_key" ON "TrainingEnrollment"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "FaqEntry_category_idx" ON "FaqEntry"("category");

-- CreateIndex
CREATE INDEX "Query_status_idx" ON "Query"("status");

-- CreateIndex
CREATE INDEX "Query_authorId_idx" ON "Query"("authorId");

-- CreateIndex
CREATE INDEX "QueryComment_queryId_idx" ON "QueryComment"("queryId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialCategory_name_key" ON "TutorialCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialArticle_slug_key" ON "TutorialArticle"("slug");

-- CreateIndex
CREATE INDEX "TutorialArticle_categoryId_idx" ON "TutorialArticle"("categoryId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chromebook" ADD CONSTRAINT "Chromebook_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chromebook" ADD CONSTRAINT "Chromebook_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChromebookNote" ADD CONSTRAINT "ChromebookNote_chromebookId_fkey" FOREIGN KEY ("chromebookId") REFERENCES "Chromebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChromebookNote" ADD CONSTRAINT "ChromebookNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_chromebookId_fkey" FOREIGN KEY ("chromebookId") REFERENCES "Chromebook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentComment" ADD CONSTRAINT "IncidentComment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentComment" ADD CONSTRAINT "IncidentComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAttachment" ADD CONSTRAINT "IncidentAttachment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryComment" ADD CONSTRAINT "QueryComment_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryComment" ADD CONSTRAINT "QueryComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorialArticle" ADD CONSTRAINT "TutorialArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TutorialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

