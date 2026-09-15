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

test("la coordinació crea un edifici i una planta i els tria en crear un espai", async ({ page }) => {
  await page.goto("/espais");
  await addToList(page, "Edificis", "Nou edifici", "Edifici E2E");
  await addToList(page, "Plantes", "Nova planta", "Planta E2E");

  await page.getByRole("button", { name: "Nou espai" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Número").fill("E.001");
  await dialog.getByLabel("Nom", { exact: true }).fill("Espai E2E");
  await dialog.locator("#space-building").click();
  await page.getByRole("option", { name: "Edifici E2E" }).click();
  await dialog.locator("#space-floor").click();
  await page.getByRole("option", { name: "Planta E2E" }).click();
  await dialog.getByRole("button", { name: "Desa" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.getByText("Edifici E2E, Planta E2E")).toBeVisible();

  // Amb un espai a dins, ni l'edifici ni la planta es poden eliminar.
  await page.getByRole("button", { name: "Plantes" }).click();
  const manager = page.getByRole("dialog");
  await expect(manager.getByText("1 espai · no es pot eliminar")).toBeVisible();
  await expect(manager.getByRole("button", { name: "Elimina Planta E2E" })).toBeDisabled();
});
