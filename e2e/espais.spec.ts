import { expect, test, type Page } from "@playwright/test";

import { authFile } from "./helpers";

test.use({ storageState: authFile("admin") });

/** Afegeix un element a una de les llistes de la pàgina (Edificis, Plantes) i tanca el diàleg. */
async function addToList(page: Page, list: string, placeholder: string, name: string) {
  await page.getByRole("button", { name: list }).click();
  const manager = page.getByRole("dialog");
  await manager.getByPlaceholder(placeholder).fill(name);
  await manager.getByRole("button", { name: "Afegeix" }).click();
  await expect(manager.getByText(name)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(manager).toHaveCount(0);
}

test("la coordinació crea un edifici amb la seva planta i els tria en crear un espai", async ({ page }) => {
  await page.goto("/espais");
  await addToList(page, "Edificis", "Nou edifici", "Edifici E2E");
  await addToList(page, "Edificis", "Nou edifici", "Pati E2E");

  // Les plantes són de cada edifici: s'afegeixen a l'edifici triat.
  await page.getByRole("button", { name: "Plantes" }).click();
  const floors = page.getByRole("dialog");
  await floors.getByLabel("Edifici").click();
  await page.getByRole("option", { name: "Edifici E2E" }).click();
  await floors.getByPlaceholder("Nova planta").fill("Planta E2E");
  await floors.getByRole("button", { name: "Afegeix" }).click();
  await expect(floors.getByText("Planta E2E")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Nou espai" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Número").fill("E.001");
  await dialog.getByLabel("Nom", { exact: true }).fill("Espai E2E");
  // Un edifici sense plantes no en deixa triar cap.
  await dialog.locator("#space-building").click();
  await page.getByRole("option", { name: "Pati E2E" }).click();
  await expect(dialog.locator("#space-floor")).toBeDisabled();
  await dialog.locator("#space-building").click();
  await page.getByRole("option", { name: "Edifici E2E" }).click();
  await dialog.locator("#space-floor").click();
  await page.getByRole("option", { name: "Planta E2E" }).click();
  await dialog.getByRole("button", { name: "Desa" }).click();
  await expect(dialog).toHaveCount(0);

  // Filtrat per l'edifici i la planta, només surt aquest espai.
  await page.getByLabel("Edifici", { exact: true }).click();
  await page.getByRole("option", { name: "Edifici E2E" }).click();
  await page.getByLabel("Planta", { exact: true }).click();
  await page.getByRole("option", { name: "Planta E2E" }).click();
  await expect(page).toHaveURL(/edifici=.+&planta=.+/);
  await expect(page.getByText("E.001 · Espai E2E")).toBeVisible();
  await expect(page.getByText("1 espai", { exact: true })).toBeVisible();

  // Amb un espai a dins, ni l'edifici ni la planta es poden eliminar.
  await page.getByRole("button", { name: "Plantes" }).click();
  const manager = page.getByRole("dialog");
  await manager.getByLabel("Edifici").click();
  await page.getByRole("option", { name: "Edifici E2E" }).click();
  await expect(manager.getByText("1 espai · no es pot eliminar")).toBeVisible();
  await expect(manager.getByRole("button", { name: "Elimina Planta E2E" })).toBeDisabled();
});
