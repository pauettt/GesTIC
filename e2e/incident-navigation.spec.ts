import { expect, test } from "@playwright/test";
import { Client } from "pg";

import { PRIVATE_INCIDENT_TITLE, USERS } from "./data";
import { E2E_DATABASE_URL, assertLocalDatabase } from "./env";
import { authFile, pageAs, readFixtures } from "./helpers";

const TERM = "Navegacio-E2E";

test.use({ storageState: authFile("admin") });

test.beforeAll(async () => {
  assertLocalDatabase(E2E_DATABASE_URL);
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    // Dades pròpies de la prova: més d'una pàgina, un altre autor i un estat
    // tancat, sense modificar les incidències que necessiten altres proves.
    await client.query(
      `INSERT INTO "Incident" (id, "reporterId", "assignedToId", "targetType", title, description, "createdAt", "updatedAt")
       SELECT 'navegacio-e2e-' || n, reporter.id, coordinator.id, 'GENERAL',
              $1 || ' ' || lpad(n::text, 2, '0'), 'Descripció cercable 50%_literal',
              now() - n * interval '1 minute', now()
       FROM generate_series(1, 26) n
       CROSS JOIN "User" reporter CROSS JOIN "User" coordinator
       WHERE reporter.email = $2 AND coordinator.email = $3`,
      [TERM, USERS.professor.email, USERS.admin.email],
    );
    await client.query(
      `INSERT INTO "Incident" (id, "reporterId", "assignedToId", "targetType", title, description, status, "updatedAt")
       SELECT 'navegacio-e2e-' || extra.suffix, reporter.id, coordinator.id, 'GENERAL',
              $1 || ' ' || extra.suffix, 'Cas addicional', extra.status::"IncidentStatus", now()
       FROM (VALUES ('altre-autor', 'OBERTA'), ('tancada', 'TANCADA')) extra(suffix, status)
       CROSS JOIN "User" reporter CROSS JOIN "User" coordinator
       WHERE reporter.email = $2 AND coordinator.email = $3`,
      [TERM, USERS.professor2.email, USERS.admin.email],
    );
  } finally {
    await client.end();
  }
});

test.afterAll(async () => {
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query('DELETE FROM "Incident" WHERE id LIKE $1', ["navegacio-e2e-%"]);
  } finally {
    await client.end();
  }
});

test("cerca i pagina conservant filtres quan s'obre una incidència i es torna", async ({ page }) => {
  await page.goto("/incidencies?status=OBERTA&assignada=jo&curs=TOTS");
  await page.getByRole("searchbox", { name: "Cerca incidències" }).fill(TERM.toLowerCase());
  await page.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("1–25 de 27 incidències");
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(26);
  await page.getByRole("link", { name: "Següent", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("26–27 de 27 incidències");
  const listUrl = page.url();
  await page.getByRole("link", { name: `${TERM} 26`, exact: true }).click();
  await page.getByRole("link", { name: "Torna a la llista" }).click();
  await expect(page).toHaveURL(listUrl);
  await expect(page.getByRole("searchbox")).toHaveValue(TERM.toLowerCase());
  await expect(page.getByRole("status")).toHaveText("26–27 de 27 incidències");

  // Canviar un filtre reinicia la pàgina però manté la cerca i l'assignació.
  await page.getByRole("link", { name: "Tancades", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("1–1 de 1 incidència");
  await expect(page).not.toHaveURL(/pagina=/);
  await expect(page).toHaveURL(/assignada=jo/);
  await expect(page.getByRole("link", { name: `${TERM} tancada`, exact: true })).toBeVisible();
});

test("la cerca respecta l'autor i cerca literalment també dins la descripció", async ({ browser }) => {
  const professor = await pageAs(browser, "professor");
  await professor.goto(`/incidencies?q=${TERM}`);
  await expect(professor.getByRole("status")).toHaveText("1–25 de 26 incidències");
  await expect(professor.getByRole("link", { name: `${TERM} altre-autor` })).toHaveCount(0);
  await professor.getByRole("link", { name: "Següent", exact: true }).click();
  await expect(professor.getByRole("status")).toHaveText("26–26 de 26 incidències");

  await professor.getByRole("searchbox").fill("50%_literal");
  await professor.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(professor).not.toHaveURL(/pagina=/);
  await expect(professor.getByRole("status")).toHaveText("1–25 de 26 incidències");
  await professor.getByRole("searchbox").fill(PRIVATE_INCIDENT_TITLE);
  await professor.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(professor.getByRole("status")).toHaveText("No hi ha cap incidència amb aquest filtre.");
  await expect(professor.getByRole("navigation", { name: "Paginació d'incidències" })).toHaveCount(0);
  await professor.context().close();
});

test("l'historial d'un equip conserva objecte i cerca, i les vistes no s'amplien amb un estat incompatible", async ({ page }) => {
  const { incidentCartId } = readFixtures();
  await page.goto(`/incidencies?cartId=${incidentCartId}&q=regleta&pagina=999`);
  await expect(page.getByRole("status")).toHaveText("1–1 de 1 incidència");
  await page.getByRole("link", { name: "La regleta del carro no carrega", exact: true }).click();
  await page.getByRole("link", { name: "Torna a la llista" }).click();
  await expect(page).toHaveURL(new RegExp(`cartId=${incidentCartId}&q=regleta$`));
  await page.goto("/incidencies?vista=sense-responsable&status=RESOLTA");
  await expect(page.getByRole("status")).toHaveText("No hi ha cap incidència amb aquest filtre.");
});

test("al mòbil hi ha targetes sense desplaçament lateral i els controls continuen funcionant", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/incidencies?q=${encodeURIComponent(`${TERM} 01`)}`);
  const list = page.getByRole("list", { name: "Incidències", exact: true });
  await expect(list).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(list).toContainText("Professor Un");
  await expect(list).toContainText("Coordinadora E2E");
  const priority = list.getByRole("combobox", { name: "Canvia la prioritat de la incidència" });
  await priority.click();
  await page.getByRole("option", { name: "Alta", exact: true }).click();
  await expect(priority).toHaveText(/Alta/);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/incidencies-mobile.png", fullPage: true });
  await list.getByRole("link", { name: `${TERM} 01`, exact: true }).click();
  await page.getByRole("link", { name: "Torna a la llista" }).click();
  await expect(list).toBeVisible();
  await expect(priority).toHaveText(/Alta/);
});
