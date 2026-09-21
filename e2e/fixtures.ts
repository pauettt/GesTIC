import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { addDays, madridDateKey, startOfWeek, zonedDateTime } from "../src/lib/date";
import { encryptSecret } from "../src/lib/vault";
import {
  CREDENTIALS,
  DEV_ACCOUNT_INCIDENT_TITLE,
  FOREIGN_APPOINTMENT_PURPOSE,
  PRIVATE_INCIDENT_TITLE,
  STALLED_INCIDENT_TITLE,
  TUTORIAL_VIDEOS,
  USERS,
  type Fixtures,
  type UserKey,
} from "./data";
import { E2E_VAULT_KEY } from "./env";

// Hores de SCHOOL_PERIODS (src/lib/schedule.ts). Van copiades i no importades
// perquè aquell fitxer fa servir l'àlies `@/`, que el carregador de Playwright no
// resol sense `baseUrl`. Si l'horari canvia, aquestes proves ho diran.
const FIRST_PERIOD = ["08:00", "08:55"] as const;
const SECOND_PERIOD = ["08:55", "09:50"] as const;
const THIRD_PERIOD = ["09:50", "10:45"] as const;

/**
 * Omple una base de dades buida amb el mínim per recórrer l'aplicació amb cada
 * rol. Retorna els identificadors que les proves necessiten i un token de
 * sessió per usuari.
 */
export async function seed(connectionString: string): Promise<{
  fixtures: Fixtures;
  tokens: Record<UserKey, string>;
}> {
  const pool = new Pool({ connectionString });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const now = new Date();
    const dayKey = (offset: number) => madridDateKey(new Date(now.getTime() + offset * 86_400_000));

    const userIds = {} as Record<UserKey, string>;
    const tokens = {} as Record<UserKey, string>;
    for (const [key, data] of Object.entries(USERS) as [UserKey, (typeof USERS)[UserKey]][]) {
      const user = await db.user.create({ data: { ...data } });
      userIds[key] = user.id;
      tokens[key] = randomBytes(32).toString("hex");
      await db.session.create({
        data: {
          sessionToken: tokens[key],
          userId: user.id,
          expires: new Date(now.getTime() + 86_400_000),
        },
      });
    }

    // Comptes del botó de dev login (`@local.test`) amb dades pròpies: són el
    // que l'esborrat de dades de prova s'ha d'endur, i res més.
    const devProfessor = await db.user.create({
      data: { email: "professor.prova@local.test", name: "Professor/a de prova", role: "PROFESSOR" },
    });
    await db.user.create({
      data: { email: "admin.prova@local.test", name: "Coordinador/a de prova", role: "ADMIN" },
    });
    await db.query.create({
      data: {
        authorId: devProfessor.id,
        title: "Consulta de prova",
        description: "Creada des del dev login mentre es provava.",
      },
    });

    // L'aula del carro és d'un edifici i d'una planta, com les de debò: el cercador
    // de carros ha de dir on és cada un.
    const building = await db.building.create({
      data: { name: "Edifici Nord E2E", floors: { create: { name: "Planta 2 E2E" } } },
      include: { floors: true },
    });
    const space = await db.space.create({
      data: { name: "Aula E2E", roomName: "Aula E2E", buildingId: building.id, floorId: building.floors[0].id },
    });
    const cart = await db.cart.create({ data: { name: "Carro E2E", spaceId: space.id } });

    await db.incident.create({
      data: {
        reporterId: devProfessor.id,
        targetType: "GENERAL",
        spaceId: space.id,
        title: DEV_ACCOUNT_INCIDENT_TITLE,
        description: "Creada des del dev login mentre es provava.",
      },
    });

    const cartChromebooks = {} as Fixtures["cartChromebooks"];
    for (const assetTag of ["E2E-01", "E2E-02", "E2E-03", "E2E-04"] as const) {
      const chromebook = await db.chromebook.create({ data: { assetTag, cartId: cart.id } });
      cartChromebooks[assetTag] = chromebook.id;
    }

    const poolChromebooks = {} as Fixtures["poolChromebooks"];
    for (const assetTag of ["ALU-01", "ALU-02"] as const) {
      const chromebook = await db.chromebook.create({
        data: { assetTag, serialNumber: `SN-${assetTag}`, isStudentLoanable: true },
      });
      poolChromebooks[assetTag] = chromebook.id;
    }

    // Préstecs del Professor Un: un d'aprovat que ja ha començat (no es pot
    // cancel·lar) i un de pendent per a d'aquí a uns dies (sí que es pot).
    const category = await db.inventoryCategory.create({ data: { name: "Portàtil" } });
    const thinkpad = await db.inventoryItem.create({
      data: { categoryId: category.id, brand: "Lenovo", model: "ThinkPad E2E", isLoanable: true },
    });
    const ipad = await db.inventoryItem.create({
      data: { categoryId: category.id, brand: "Apple", model: "iPad E2E", isLoanable: true },
    });
    await db.loanRequest.create({
      data: {
        itemId: thinkpad.id,
        requesterId: userIds.professor,
        startDate: zonedDateTime(dayKey(-1), "00:00"),
        endDate: zonedDateTime(dayKey(5), "23:59"),
        status: "APROVADA",
        respondedById: userIds.admin,
        respondedAt: now,
      },
    });
    await db.loanRequest.create({
      data: {
        itemId: ipad.id,
        requesterId: userIds.professor,
        startDate: zonedDateTime(dayKey(3), "00:00"),
        endDate: zonedDateTime(dayKey(4), "23:59"),
      },
    });

    // Consergeria: la clau del carro i una reserva d'avui del Professor Un.
    await db.concierge.create({ data: { name: "Conserge E2E" } });
    await db.key.create({ data: { number: "C-E2E", name: "Clau del carro", cartId: cart.id } });
    await db.reservation.create({
      data: {
        cartId: cart.id,
        userId: userIds.professor,
        startDate: zonedDateTime(dayKey(0), FIRST_PERIOD[0]),
        endDate: zonedDateTime(dayKey(0), FIRST_PERIOD[1]),
      },
    });

    // Cites de la setmana vinent: dilluns a 3a hora ja la té la Professora Dos;
    // dimarts a 2a hora és lliure.
    const nextMonday = addDays(startOfWeek(now), 7);
    const nextWeek = madridDateKey(nextMonday);
    const nextTuesday = madridDateKey(addDays(nextMonday, 1));
    const bookedSlot = await db.appointmentSlot.create({
      data: {
        startDate: zonedDateTime(nextWeek, THIRD_PERIOD[0]),
        endDate: zonedDateTime(nextWeek, THIRD_PERIOD[1]),
        openedById: userIds.admin,
      },
    });
    await db.appointment.create({
      data: { slotId: bookedSlot.id, userId: userIds.professor2, purpose: FOREIGN_APPOINTMENT_PURPOSE },
    });
    await db.appointmentSlot.create({
      data: {
        startDate: zonedDateTime(nextTuesday, SECOND_PERIOD[0]),
        endDate: zonedDateTime(nextTuesday, SECOND_PERIOD[1]),
        openedById: userIds.admin,
      },
    });

    for (const [order, video] of TUTORIAL_VIDEOS.entries()) {
      const tutorialCategory = await db.tutorialCategory.create({ data: { name: video.category, order } });
      await db.tutorialVideo.create({
        data: { categoryId: tutorialCategory.id, youtubeId: video.youtubeId, title: video.title },
      });
    }

    const vaultKey = Buffer.from(E2E_VAULT_KEY, "base64");
    for (const [order, credential] of Object.values(CREDENTIALS).entries()) {
      const credentialCategory = await db.credentialCategory.create({ data: { name: credential.category, order } });
      await db.credential.create({
        data: {
          categoryId: credentialCategory.id,
          name: credential.name,
          username: credential.username,
          passwordEncrypted: encryptSecret(credential.password, vaultKey),
          superAdminOnly: credential.superAdminOnly,
        },
      });
    }

    const privateIncident = await db.incident.create({
      data: {
        reporterId: userIds.professor2,
        targetType: "GENERAL",
        spaceId: space.id,
        title: PRIVATE_INCIDENT_TITLE,
        description: "Només l'han de veure la Professora Dos i la coordinació.",
      },
    });

    // Una avaria amb responsable que fa dies que ningú no toca: el panell l'ha de
    // marcar com a aturada, encara que ja tingui qui se n'encarrega.
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);
    await db.incident.create({
      data: {
        reporterId: userIds.professor2,
        assignedToId: userIds.admin,
        targetType: "GENERAL",
        spaceId: space.id,
        title: STALLED_INCIDENT_TITLE,
        description: "Assignada i oblidada.",
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      },
    });

    return {
      fixtures: {
        cartId: cart.id,
        cartChromebooks,
        poolChromebooks,
        privateIncidentId: privateIncident.id,
        nextWeek,
      },
      tokens,
    };
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}
