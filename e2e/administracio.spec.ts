import { expect, test } from "@playwright/test";

import { DEV_ACCOUNT_INCIDENT_TITLE, PRIVATE_INCIDENT_TITLE } from "./data";
import { BASE_URL } from "./env";
import { authFile, pageAs } from "./helpers";

test.describe("coordinació TIC", () => {
  test.use({ storageState: authFile("admin") });

  test("no entra a l'administració", async ({ page }) => {
    await page.goto("/administracio");
    await expect(page).toHaveURL(`${BASE_URL}/`);
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
