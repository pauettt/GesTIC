import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { addDays, madridDateKey, startOfWeek, zonedDateTime } from "../src/lib/date";

/**
 * Dades d'exemple perquè el claustre pugui provar gesTIC amb l'aplicació plena:
 * préstecs, reserves, incidències, claus i cites que ja hi són abans d'entrar.
 *
 *   DEMO_DATABASE_URL="<DIRECT_URL>" npm run db:demo            # posa-les
 *   DEMO_DATABASE_URL="<DIRECT_URL>" npm run db:demo -- --treu   # treu-les
 *
 * L'adreça va a part a propòsit: així no pot escriure enlloc per descuit.
 *
 * Tot el que crea es pot tornar a treure sencer, perquè es reconeix:
 *  - Les persones inventades porten adreça `@local.test`, un domini reservat
 *    (RFC 2606) que cap compte del centre no pot tenir. Tot el que pengi d'elles
 *    —incidències, préstecs, reserves, cites, consultes— cau amb elles.
 *  - La resta porta `DEMO-` al número de sèrie o al número de clau, i els noms
 *    de conserge i les preguntes són els d'aquest fitxer.
 *
 * El que NO toca: les aules, els carros, els Chromebooks i les categories que hi
 * ha a producció, que són de debò. Les dades d'exemple s'hi pengen.
 *
 * Les hores surten de SCHOOL_PERIODS (src/lib/schedule.ts). Van copiades i no
 * importades perquè aquell fitxer fa servir l'àlies `@/`, que aquest script no
 * resol.
 */

const PERIOD = {
  first: ["08:00", "08:55"],
  second: ["08:55", "09:50"],
  third: ["09:50", "10:45"],
  fourth: ["11:15", "12:10"],
  fifth: ["12:10", "13:05"],
} as const;

/** Les persones inventades. La marca és el domini: no cal cap altre senyal. */
const PEOPLE = [
  { email: "marta.serra@local.test", name: "Marta Serra (exemple)", role: "PROFESSOR", isTutor: false },
  { email: "jordi.blanc@local.test", name: "Jordi Blanc (exemple)", role: "PROFESSOR", isTutor: false },
  { email: "nuria.pons@local.test", name: "Núria Pons (exemple)", role: "PROFESSOR", isTutor: true },
  { email: "carles.vidal@local.test", name: "Carles Vidal (exemple)", role: "ADMIN", isTutor: false },
] as const;

const CONCIERGES = ["Maria Fiol (exemple)", "Pep Cerdà (exemple)"];

/** Material d'exemple. El número de sèrie comença per DEMO- i això el fa trobable. */
const ITEMS = [
  { serial: "DEMO-PORT-01", category: "Portàtil", brand: "Lenovo", model: "ThinkPad L14", loanable: true },
  { serial: "DEMO-IPAD-01", category: "iPad", brand: "Apple", model: "iPad 10a generació", loanable: true },
  { serial: "DEMO-ALT-01", category: "Altaveus", brand: "JBL", model: "Flip 6", loanable: true },
  { serial: "DEMO-PROJ-01", category: "Projector", brand: "Epson", model: "EB-X41", loanable: false },
  { serial: "DEMO-IMPR-01", category: "Impressora", brand: "HP", model: "LaserJet Pro M404", loanable: false },
];

const KEYS = [
  { number: "DEMO-C1", name: "Clau del Carro 1 (exemple)", cart: "Carro 1 (A.004)" },
  { number: "DEMO-A004", name: "Clau de l'aula A.004 (exemple)", cart: null },
];

const FAQS = [
  {
    category: "Chromebooks",
    question: "Com reservo un carro de Chromebooks?",
    answer:
      "Vés a Carros, obre el carro que vulguis i clica la sessió lliure de la graella. La reserva queda al teu nom i la pots anul·lar des de l'inici.",
  },
  {
    category: "Chromebooks",
    question: "Un Chromebook no s'encén. Què faig?",
    answer:
      "Escaneja el QR del carro amb el mòbil, toca l'equip que falla i tria el problema. La coordinació TIC ho rep a l'instant.",
  },
  {
    category: "Incidències",
    question: "Quant triga a resoldre's una incidència?",
    answer:
      "Depèn de la prioritat i del material disponible. A la fitxa de la incidència hi veuràs sempre en quin estat és.",
  },
  {
    category: "Comptes i Google",
    question: "He oblidat la contrasenya del compte del centre.",
    answer: "Demana hora a la coordinació TIC des de Cites i te la restablim al moment.",
  },
];

const QUERIES = [
  {
    person: "marta.serra@local.test",
    title: "Puc fer servir el Meet amb les famílies?",
    description: "Voldria fer una tutoria en línia la setmana vinent i no sé si el compte del centre ho permet.",
    status: "OBERTA" as const,
  },
  {
    person: "jordi.blanc@local.test",
    title: "El projector de l'aula es veu groc",
    description: "Des de dilluns la imatge surt amb un to groc. Ho he provat amb dos portàtils diferents.",
    status: "RESOLTA" as const,
  },
];

const INCIDENTS = [
  {
    person: "marta.serra@local.test",
    title: "El projector de l'aula no fa color",
    description: "La imatge surt groguenca sigui quin sigui l'ordinador que s'hi connecti.",
    targetType: "INVENTORY_ITEM" as const,
    itemSerial: "DEMO-PROJ-01",
    priority: "MITJANA" as const,
    status: "EN_CURS" as const,
    comment: "Hem demanat pressupost per canviar la làmpada.",
  },
  {
    person: "jordi.blanc@local.test",
    title: "El carro no carrega tots els equips alhora",
    description: "Els de la fila de baix es queden sense bateria encara que el carro estigui endollat tota la nit.",
    targetType: "CART" as const,
    cartName: "Carro 1 (A.004)",
    priority: "ALTA" as const,
    status: "OBERTA" as const,
    comment: null,
  },
  {
    person: "nuria.pons@local.test",
    title: "No puc compartir pantalla al Meet",
    description: "Em diu que l'administrador ho té bloquejat quan intento compartir des del Chromebook.",
    targetType: "GOOGLE_WORKSPACE" as const,
    googleService: "MEET" as const,
    priority: "BAIXA" as const,
    status: "RESOLTA" as const,
    comment: "Era un permís de l'extensió. Resolt.",
  },
];

const url = process.env.DEMO_DATABASE_URL;
if (!url) {
  console.error(
    "Falta DEMO_DATABASE_URL. Fes-ho així, amb la DIRECT_URL del projecte:\n" +
      '  DEMO_DATABASE_URL="postgresql://…:5432/postgres" npm run db:demo',
  );
  process.exit(1);
}

const remove = process.argv.includes("--treu") || process.argv.includes("--remove");

// L'adreça porta la contrasenya de la base de dades. Si no es pot llegir, l'error
// de Node l'ensenyaria sencera per pantalla i als registres: val més dir només
// què s'ha de mirar.
let origen: string;
try {
  const { host, pathname } = new URL(url);
  origen = `${host}${pathname}`;
} catch {
  console.error(
    "DEMO_DATABASE_URL no és una adreça vàlida. Revisa-la al .env: ha d'anar en una sola línia i entre cometes.",
  );
  process.exit(1);
}
const pool = new Pool({ connectionString: url });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function treu() {
  const emails = PEOPLE.map((person) => person.email);
  const people = await db.user.findMany({ where: { email: { in: [...emails] } }, select: { id: true } });
  const ids = people.map((person) => person.id);

  // Les hores de cita sobreviuen a qui les va obrir (openedById és SetNull), així
  // que van a part; la resta cau amb les persones.
  const slots = await db.appointmentSlot.findMany({
    where: { OR: [{ openedById: { in: ids } }, { appointment: { userId: { in: ids } } }] },
    select: { id: true },
  });

  const [slotsEsborrats, personesEsborrades, material, claus, conserges, preguntes] = await db.$transaction([
    db.appointmentSlot.deleteMany({ where: { id: { in: slots.map((slot) => slot.id) } } }),
    db.user.deleteMany({ where: { id: { in: ids } } }),
    db.inventoryItem.deleteMany({ where: { serialNumber: { in: ITEMS.map((item) => item.serial) } } }),
    db.key.deleteMany({ where: { number: { in: KEYS.map((key) => key.number) } } }),
    db.concierge.deleteMany({ where: { name: { in: CONCIERGES } } }),
    // Pregunta I resposta alhora: només pel text de la pregunta s'enduia també
    // les que ja hi havia escrites amb el mateix títol, que són de debò.
    db.faqEntry.deleteMany({
      where: { OR: FAQS.map((faq) => ({ question: faq.question, answer: faq.answer })) },
    }),
  ]);

  console.info(
    `✓ tret: ${personesEsborrades.count} persones d'exemple i el que en penjava, ` +
      `${material.count} equips, ${claus.count} claus, ${conserges.count} conserges, ` +
      `${preguntes.count} preguntes i ${slotsEsborrats.count} hores de cita.`,
  );
  console.info("Les categories, aules, carros i Chromebooks no s'han tocat: són de debò.");
}

async function posa() {
  const now = new Date();
  const dayKey = (offset: number) => madridDateKey(addDays(now, offset));
  const nextMonday = madridDateKey(addDays(startOfWeek(now), 7));
  const nextTuesday = madridDateKey(addDays(startOfWeek(now), 8));
  const nextWednesday = madridDateKey(addDays(startOfWeek(now), 9));

  const existents = await db.user.count({ where: { email: { endsWith: "@local.test" } } });
  if (existents > 0) {
    console.error("Ja hi ha persones d'exemple. Treu-les primer amb `-- --treu` i torna-ho a executar.");
    process.exitCode = 1;
    return;
  }

  const people: Record<string, string> = {};
  for (const person of PEOPLE) {
    const created = await db.user.create({ data: { ...person } });
    people[person.email] = created.id;
  }

  for (const name of CONCIERGES) {
    await db.concierge.upsert({ where: { name }, update: {}, create: { name } });
  }
  const conserge = await db.concierge.findFirstOrThrow({ where: { name: CONCIERGES[0] } });

  // El material d'exemple es penja de les categories i les aules que ja hi ha.
  const spaces = await db.space.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const items: Record<string, string> = {};
  for (const [index, item] of ITEMS.entries()) {
    const category = await db.inventoryCategory.findUnique({ where: { name: item.category } });
    if (!category) {
      console.warn(`  (sense categoria «${item.category}»: no es crea ${item.serial})`);
      continue;
    }
    const created = await db.inventoryItem.create({
      data: {
        categoryId: category.id,
        brand: item.brand,
        model: item.model,
        serialNumber: item.serial,
        spaceId: spaces[index % spaces.length]?.id ?? null,
        isLoanable: item.loanable,
      },
    });
    items[item.serial] = created.id;
  }

  // Préstecs: un que ja corre, un per aprovar i un de tornat.
  if (items["DEMO-PORT-01"]) {
    await db.loanRequest.create({
      data: {
        itemId: items["DEMO-PORT-01"],
        requesterId: people["marta.serra@local.test"],
        startDate: zonedDateTime(dayKey(-1), "00:00"),
        endDate: zonedDateTime(dayKey(5), "23:59"),
        purpose: "Sortida de 2n ESO al parc natural",
        status: "APROVADA",
        respondedById: people["carles.vidal@local.test"],
        respondedAt: now,
      },
    });
  }
  if (items["DEMO-IPAD-01"]) {
    await db.loanRequest.create({
      data: {
        itemId: items["DEMO-IPAD-01"],
        requesterId: people["jordi.blanc@local.test"],
        startDate: zonedDateTime(dayKey(3), "00:00"),
        endDate: zonedDateTime(dayKey(4), "23:59"),
        purpose: "Gravar les presentacions de 1r BATX",
      },
    });
  }
  if (items["DEMO-ALT-01"]) {
    await db.loanRequest.create({
      data: {
        itemId: items["DEMO-ALT-01"],
        requesterId: people["nuria.pons@local.test"],
        startDate: zonedDateTime(dayKey(-10), "00:00"),
        endDate: zonedDateTime(dayKey(-7), "23:59"),
        status: "RETORNADA",
        respondedById: people["carles.vidal@local.test"],
        respondedAt: addDays(now, -11),
        returnedAt: addDays(now, -7),
        purpose: "Festa de final de trimestre",
      },
    });
  }

  // Reserves de carro: només dels carros que estan ben posats.
  const carts = await db.cart.findMany({ where: { name: { in: ["Carro 1 (A.004)", "Carro 4 (A.04)"] } } });
  const reserves = [
    { cart: "Carro 1 (A.004)", email: "marta.serra@local.test", day: 0, period: PERIOD.fourth, purpose: "Projecte de recerca" },
    { cart: "Carro 1 (A.004)", email: "jordi.blanc@local.test", day: 1, period: PERIOD.fifth, purpose: "Kahoot de repàs" },
    { cart: "Carro 4 (A.04)", email: "nuria.pons@local.test", day: 1, period: PERIOD.second, purpose: "Competència digital" },
  ];
  let reservesFetes = 0;
  for (const reserva of reserves) {
    const cart = carts.find((c) => c.name === reserva.cart);
    if (!cart) continue;
    await db.reservation.create({
      data: {
        cartId: cart.id,
        userId: people[reserva.email],
        startDate: zonedDateTime(dayKey(reserva.day), reserva.period[0]),
        endDate: zonedDateTime(dayKey(reserva.day), reserva.period[1]),
        purpose: reserva.purpose,
      },
    });
    reservesFetes += 1;
  }

  // Claus i un préstec de clau obert, que és el que veu consergeria.
  for (const key of KEYS) {
    const cart = key.cart ? carts.find((c) => c.name === key.cart) : null;
    await db.key.upsert({
      where: { number: key.number },
      update: {},
      create: { number: key.number, name: key.name, cartId: cart?.id ?? null },
    });
  }
  const clauCarro = await db.key.findUnique({ where: { number: "DEMO-C1" } });
  if (clauCarro) {
    await db.keyLoan.create({
      data: {
        keyId: clauCarro.id,
        borrowerId: people["marta.serra@local.test"],
        deliveredById: conserge.id,
        reason: "Reserva del Carro 1",
      },
    });
  }

  // Incidències en tres estats diferents, amb comentaris de la coordinació.
  for (const incident of INCIDENTS) {
    const cart = "cartName" in incident ? carts.find((c) => c.name === incident.cartName) : null;
    const itemSerial = "itemSerial" in incident ? incident.itemSerial : undefined;
    const created = await db.incident.create({
      data: {
        reporterId: people[incident.person],
        targetType: incident.targetType,
        inventoryItemId: itemSerial ? (items[itemSerial] ?? null) : null,
        cartId: cart?.id ?? null,
        googleService: "googleService" in incident ? incident.googleService : null,
        title: incident.title,
        description: incident.description,
        priority: incident.priority,
        status: incident.status,
        assignedToId: incident.status === "OBERTA" ? null : people["carles.vidal@local.test"],
        resolvedAt: incident.status === "RESOLTA" ? addDays(now, -2) : null,
      },
    });
    if (incident.comment) {
      await db.incidentComment.create({
        data: { incidentId: created.id, authorId: people["carles.vidal@local.test"], body: incident.comment },
      });
    }
  }

  // Consultes del professorat a la coordinació.
  for (const query of QUERIES) {
    await db.query.create({
      data: {
        authorId: people[query.person],
        title: query.title,
        description: query.description,
        status: query.status,
        resolvedAt: query.status === "RESOLTA" ? addDays(now, -1) : null,
      },
    });
  }

  // Hores de cita de la setmana vinent: una d'agafada i dues de lliures.
  const agafada = await db.appointmentSlot.create({
    data: {
      startDate: zonedDateTime(nextMonday, PERIOD.third[0]),
      endDate: zonedDateTime(nextMonday, PERIOD.third[1]),
      openedById: people["carles.vidal@local.test"],
    },
  });
  await db.appointment.create({
    data: {
      slotId: agafada.id,
      userId: people["jordi.blanc@local.test"],
      purpose: "Revisar el Classroom de 1r ESO",
    },
  });
  for (const [dia, period] of [
    [nextTuesday, PERIOD.second],
    [nextWednesday, PERIOD.fourth],
  ] as const) {
    await db.appointmentSlot.create({
      data: {
        startDate: zonedDateTime(dia, period[0]),
        endDate: zonedDateTime(dia, period[1]),
        openedById: people["carles.vidal@local.test"],
      },
    });
  }

  // Preguntes freqüents, cada una a la seva categoria (es crea si no hi és).
  let preguntesFetes = 0;
  for (const [order, faq] of FAQS.entries()) {
    // Si la coordinació ja té escrita aquesta pregunta, no se'n fa una còpia.
    const jaHiEs = await db.faqEntry.findFirst({ where: { question: faq.question } });
    if (jaHiEs) continue;
    const category = await db.faqCategory.upsert({
      where: { name: faq.category },
      update: {},
      create: { name: faq.category, order },
    });
    await db.faqEntry.create({
      data: { categoryId: category.id, question: faq.question, answer: faq.answer, order },
    });
    preguntesFetes += 1;
  }

  console.info(
    `✓ posat: ${PEOPLE.length} persones d'exemple, ${Object.keys(items).length} equips, ` +
      `3 préstecs, ${reservesFetes} reserves, ${INCIDENTS.length} incidències, ${QUERIES.length} consultes, ` +
      `${KEYS.length} claus amb un préstec obert, 3 hores de cita i ${preguntesFetes} preguntes freqüents.`,
  );
}

async function main() {
  console.info(`${remove ? "Traient" : "Posant"} les dades d'exemple a ${origen}…`);
  if (remove) await treu();
  else await posa();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
