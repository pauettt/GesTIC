import { expect, test } from "@playwright/test";

import { FOREIGN_APPOINTMENT_PURPOSE, PRIVATE_INCIDENT_TITLE } from "./data";
import { BASE_URL } from "./env";
import { authFile, readFixtures } from "./helpers";

// Qui pot veure què. Retallar la pantalla no és seguretat: aquí es comprova que
// les pàgines redirigeixen i que les dades dels altres no arriben ni al navegador.

test.describe("professorat", () => {
  test.use({ storageState: authFile("professor") });

  test("no entra a cap pantalla de gestió", async ({ page }) => {
    for (const path of [
      "/panell",
      "/usuaris",
      "/administracio",
      "/espais",
      "/consergeria",
      "/chromebooks/alumnat/etiquetes",
    ]) {
      await page.goto(path);
      await expect(page, `${path} hauria de tornar a l'inici`).toHaveURL(`${BASE_URL}/`);
    }
  });

  test("no pot obrir ni llistar la incidència d'una companya", async ({ page }) => {
    const { privateIncidentId } = readFixtures();
    await page.goto(`/incidencies/${privateIncidentId}`);
    await expect(page).toHaveURL(`${BASE_URL}/incidencies`);

    await page.goto("/incidencies?curs=TOTS");
    await expect(page.getByRole("heading", { name: "Incidències TIC" })).toBeVisible();
    expect(await page.content()).not.toContain(PRIVATE_INCIDENT_TITLE);
  });

  test("a les cites no sap qui ha agafat les altres hores ni per a què", async ({ page }) => {
    const { nextWeek } = readFixtures();
    await page.goto(`/cites?week=${nextWeek}`);
    await expect(page.getByText("Ocupada", { exact: true })).toBeVisible();
    // Ni a la pantalla ni a les dades que viatgen al navegador.
    expect(await page.content()).not.toContain(FOREIGN_APPOINTMENT_PURPOSE);
    expect(await page.content()).not.toContain("Professora Dos");
  });
});

test.describe("coordinació TIC", () => {
  test.use({ storageState: authFile("admin") });

  test("gestiona però no reparteix permisos", async ({ page }) => {
    await page.goto("/panell");
    await expect(page.getByRole("heading", { name: "Panell del coordinador" })).toBeVisible();
    await page.goto("/usuaris");
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test("veu qui ha demanat cada cita i per a què", async ({ page }) => {
    const { nextWeek } = readFixtures();
    await page.goto(`/cites?week=${nextWeek}`);
    await expect(page.getByText(FOREIGN_APPOINTMENT_PURPOSE).first()).toBeVisible();
  });
});

test.describe("superadministració", () => {
  test.use({ storageState: authFile("superAdmin") });

  test("reparteix permisos", async ({ page }) => {
    await page.goto("/usuaris");
    await expect(page.getByRole("heading", { name: "Usuaris i permisos" })).toBeVisible();
    await expect(page.getByText("Superadministrador/a").first()).toBeVisible();
  });
});

test.describe("consergeria", () => {
  test.use({ storageState: authFile("concierge") });

  test("només entra al control de claus", async ({ page }) => {
    for (const path of ["/", "/incidencies", "/chromebooks"]) {
      await page.goto(path);
      await expect(page, `${path} hauria de portar a consergeria`).toHaveURL(`${BASE_URL}/consergeria`);
    }
  });
});
