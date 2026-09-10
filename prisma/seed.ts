import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const aula203 = await db.space.upsert({
    where: { name: "Aula 2.03" },
    update: {},
    create: { name: "Aula 2.03", building: "Edifici principal", floor: "2a planta" },
  });
  const salaProfes = await db.space.upsert({
    where: { name: "Sala de professorat" },
    update: {},
    create: { name: "Sala de professorat", building: "Edifici principal", floor: "Planta baixa" },
  });
  const aulaInformatica = await db.space.upsert({
    where: { name: "Aula d'informàtica" },
    update: {},
    create: { name: "Aula d'informàtica", building: "Edifici principal", floor: "1a planta" },
  });

  const categoryNames = [
    "Ordinador de sobretaula",
    "Portàtil",
    "iPad",
    "Monitor",
    "Projector",
    "Pissarra digital",
    "Impressora",
    "Rotlladors de pissarra",
    "Altaveus",
    "Equip de xarxa",
    "Altre",
  ];
  const categoriesByName: Record<string, { id: string }> = {};
  for (const [index, name] of categoryNames.entries()) {
    categoriesByName[name] = await db.inventoryCategory.upsert({
      where: { name },
      update: {},
      create: { name, order: index },
    });
  }

  await db.inventoryItem.upsert({
    where: { serialNumber: "PROJ-2203-01" },
    update: { categoryId: categoriesByName["Projector"].id },
    create: {
      categoryId: categoriesByName["Projector"].id,
      brand: "Epson",
      model: "EB-X41",
      serialNumber: "PROJ-2203-01",
      spaceId: aula203.id,
      status: "ACTIU",
      isLoanable: false,
    },
  });
  await db.inventoryItem.upsert({
    where: { serialNumber: "PDI-2203-01" },
    update: { categoryId: categoriesByName["Pissarra digital"].id },
    create: {
      categoryId: categoriesByName["Pissarra digital"].id,
      brand: "Promethean",
      model: "ActivPanel 9",
      serialNumber: "PDI-2203-01",
      spaceId: aula203.id,
      status: "ACTIU",
      isLoanable: false,
    },
  });
  await db.inventoryItem.upsert({
    where: { serialNumber: "IMPR-SP-01" },
    update: { categoryId: categoriesByName["Impressora"].id },
    create: {
      categoryId: categoriesByName["Impressora"].id,
      brand: "HP",
      model: "LaserJet Pro M404",
      serialNumber: "IMPR-SP-01",
      spaceId: salaProfes.id,
      status: "ACTIU",
      isLoanable: false,
    },
  });
  await db.inventoryItem.upsert({
    where: { serialNumber: "PORT-PREST-01" },
    update: { categoryId: categoriesByName["Portàtil"].id },
    create: {
      categoryId: categoriesByName["Portàtil"].id,
      brand: "Lenovo",
      model: "ThinkPad L14",
      serialNumber: "PORT-PREST-01",
      spaceId: salaProfes.id,
      status: "ACTIU",
      isLoanable: true,
    },
  });
  await db.inventoryItem.upsert({
    where: { serialNumber: "IPAD-PREST-01" },
    update: { categoryId: categoriesByName["iPad"].id },
    create: {
      categoryId: categoriesByName["iPad"].id,
      brand: "Apple",
      model: "iPad 10a generació",
      serialNumber: "IPAD-PREST-01",
      spaceId: salaProfes.id,
      status: "ACTIU",
      isLoanable: true,
    },
  });

  const cart = await db.cart.upsert({
    where: { name: "Carro 1 - Primària" },
    update: {},
    create: { name: "Carro 1 - Primària", spaceId: aulaInformatica.id },
  });
  for (let i = 1; i <= 15; i += 1) {
    const assetTag = `CB-${String(i).padStart(3, "0")}`;
    await db.chromebook.upsert({
      where: { assetTag },
      update: {},
      create: { cartId: cart.id, assetTag },
    });
  }

  const trainingDate = new Date();
  trainingDate.setDate(trainingDate.getDate() + 14);
  await db.trainingSession.create({
    data: {
      title: "Introducció a Google Classroom",
      description:
        "Sessió pràctica per aprendre a crear classes, assignar tasques i corregir des de Google Classroom.",
      date: trainingDate,
      spaceId: aulaInformatica.id,
      capacity: 20,
    },
  });

  await db.faqEntry.createMany({
    data: [
      {
        category: "Chromebooks",
        question: "Com reservo un carro de Chromebooks?",
        answer: "Vés a l'apartat Chromebooks, selecciona el carro i indica les dates a l'apartat de reserves.",
        order: 1,
      },
      {
        category: "Chromebooks",
        question: "Què faig si un Chromebook no s'engega?",
        answer: "Reporta-ho com a incidència des de l'apartat Incidències TIC, indicant el carro i el Chromebook afectat.",
        order: 2,
      },
      {
        category: "Incidències",
        question: "Quant triga a resoldre's una incidència?",
        answer: "Depèn de la prioritat i disponibilitat de material, però el coordinador TIC en farà seguiment i podràs veure'n l'estat en tot moment.",
        order: 1,
      },
    ],
    skipDuplicates: true,
  });

  const categoria = await db.tutorialCategory.upsert({
    where: { name: "Primers passos" },
    update: {},
    create: { name: "Primers passos", order: 1 },
  });
  await db.tutorialArticle.upsert({
    where: { slug: "com-reportar-una-incidencia" },
    update: {},
    create: {
      categoryId: categoria.id,
      title: "Com reportar una incidència TIC",
      slug: "com-reportar-una-incidencia",
      contentMarkdown:
        "# Com reportar una incidència\n\n1. Ves a **Incidències TIC**.\n2. Clica a *Nova incidència*.\n3. Selecciona el tipus d'equip afectat i descriu el problema.\n4. Adjunta una foto si és possible.\n\nEl coordinador TIC rebrà la incidència i en farà seguiment.",
    },
  });

  console.log("Seed completat correctament.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
