import { expect, test, type Page } from "@playwright/test";

import { DEV_ACCOUNT_INCIDENT_TITLE, PRIVATE_INCIDENT_TITLE } from "./data";
import { BASE_URL } from "./env";
import { authFile, pageAs } from "./helpers";

/** La taula d'usuaris filtrada per un sol correu. */
async function openUserRow(page: Page, email: string) {
  await page.goto("/usuaris");
  await page.getByLabel("Cerca usuaris").fill(email);
}

/**
 * Les accions de servidor de /usuaris són un POST a la mateixa pàgina. Amb
 * aquest retard, un control que esperés la resposta no canviaria dins el marge
 * que li donen les proves; un que canviï al moment, sí.
 */
async function slowServerActions(page: Page) {
  await page.route("**/usuaris", async (route) => {
    if (route.request().method() === "POST") await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.continue();
  });
}

test.describe("coordinació TIC", () => {
  test.use({ storageState: authFile("admin") });

  test("no entra a l'administració", async ({ page }) => {
    for (const path of ["/administracio", "/administracio/cartell"]) {
      await page.goto(path);
      await expect(page, `${path} hauria de tornar a l'inici`).toHaveURL(`${BASE_URL}/`);
    }
  });
});

test.describe("superadministració", () => {
  test.use({ storageState: authFile("superAdmin") });

  test("veu com està configurat el servidor", async ({ page }) => {
    await page.goto("/administracio");
    await expect(page.getByRole("heading", { name: "Administració" })).toBeVisible();
    // El servidor de proves arrenca sense correu a propòsit: la pàgina ho ha de dir.
    await expect(page.getByText("Sense configurar: no s'envia cap avís")).toBeVisible();
  });

  test("imprimeix el cartell de la sala de professors", async ({ page }) => {
    await page.goto("/administracio");
    await page.getByRole("link", { name: "Obre el cartell" }).click();
    await expect(page.getByRole("heading", { name: "Cartell per a la sala de professors" })).toBeVisible();
    await expect(page.getByAltText("QR de gesTIC")).toBeVisible();
    // El servidor de proves arrenca sense APP_URL: el QR apuntaria a localhost.
    await expect(page.getByText("No imprimeixis encara")).toBeVisible();
  });

  test("treure l'accés a qui deixa el centre li tanca la sessió, i queda registrat", async ({
    page,
    browser,
  }) => {
    const leaver = await pageAs(browser, "leaver");
    await leaver.goto("/");
    await expect(leaver.getByRole("heading", { name: "Hola, Substituta" })).toBeVisible();

    await page.goto("/usuaris");
    await page.getByLabel("Cerca usuaris").fill("substituta");
    const row = page.locator("tr", { hasText: "substituta@e2e.test" });
    await row.getByRole("button", { name: "Treu l'accés" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Treu l'accés" }).click();
    await expect(row.getByText("Sense accés")).toBeVisible();

    await leaver.goto("/");
    await expect(leaver).toHaveURL(/\/login/);

    await row.getByRole("button", { name: "Torna l'accés" }).click();
    await expect(row.getByText("Sense accés")).toHaveCount(0);

    await page.goto("/administracio");
    await expect(page.getByText("Accés retirat a Substituta E2E (substituta@e2e.test)")).toBeVisible();
    await expect(page.getByText("Accés retornat a Substituta E2E (substituta@e2e.test)")).toBeVisible();
  });

  test("la casella de tutor/a es marca al moment, sense esperar el servidor", async ({ page }) => {
    const checkbox = page.getByRole("checkbox", { name: "Tutor/a de grup: Professor Un" });

    await openUserRow(page, "professor@e2e.test");
    await expect(checkbox).not.toBeChecked();

    await slowServerActions(page);
    await checkbox.click();
    await expect(checkbox).toBeChecked({ timeout: 1_000 });
    await expect(page.getByText("Professor Un ara consta com a tutor/a")).toBeVisible();
    await page.unroute("**/usuaris");

    await openUserRow(page, "professor@e2e.test");
    await expect(checkbox).toBeChecked();

    // Es deixa com estava: el Professor Un de les dades de prova no és tutor.
    await checkbox.click();
    await expect(page.getByText("Professor Un ja no consta com a tutor/a")).toBeVisible();
    await openUserRow(page, "professor@e2e.test");
    await expect(checkbox).not.toBeChecked();
  });

  test("el desplegable de permís canvia al moment, sense esperar el servidor", async ({ page }) => {
    const trigger = page.getByLabel("Permís de Professor Un");

    await openUserRow(page, "professor@e2e.test");
    await expect(trigger).toContainText("Professorat");

    await slowServerActions(page);
    await trigger.click();
    await page.getByRole("option", { name: "Coordinador/a TIC" }).click();
    await expect(trigger).toContainText("Coordinador/a TIC", { timeout: 1_000 });
    await expect(page.getByText("Permisos de Professor Un actualitzats")).toBeVisible();
    await page.unroute("**/usuaris");

    await openUserRow(page, "professor@e2e.test");
    await expect(trigger).toContainText("Coordinador/a TIC");

    // Es deixa com estava: les altres proves entren com a Professor Un sense
    // cap permís de coordinació.
    await trigger.click();
    await page.getByRole("option", { name: "Professorat" }).click();
    await expect(page.getByText("Permisos de Professor Un actualitzats")).toBeVisible();
    await openUserRow(page, "professor@e2e.test");
    await expect(trigger).toContainText("Professorat");
  });

  test("esborra els comptes de prova i el que en penja, i res més", async ({ page }) => {
    await page.goto("/administracio");
    await expect(page.getByText("2 comptes de prova")).toBeVisible();

    await page.getByRole("button", { name: "Esborra les dades de prova" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Esborra-ho" }).click();
    await expect(page.getByText("No hi ha cap compte de prova.")).toBeVisible();

    // Les dades de debò hi continuen; les del compte de prova, no.
    await page.goto("/incidencies?curs=TOTS");
    await expect(page.getByText(PRIVATE_INCIDENT_TITLE)).toBeVisible();
    await expect(page.getByText(DEV_ACCOUNT_INCIDENT_TITLE)).toHaveCount(0);
  });
});
