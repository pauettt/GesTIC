import { expect, test } from "@playwright/test";

import { authFile } from "./helpers";

test.use({ storageState: authFile("admin") });

test("una categoria que no hi és es crea des del mateix formulari de l'equip i queda triada", async ({ page }) => {
  await page.goto("/inventari");
  await page.getByRole("button", { name: "Nou equip" }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByLabel("Categoria").click();
  await page.getByRole("option", { name: "Nova categoria…" }).click();
  await dialog.getByLabel("Nom de la nova categoria").fill("Document càmera E2E");
  // Enter crea la categoria, no l'equip.
  await dialog.getByLabel("Nom de la nova categoria").press("Enter");
  await expect(dialog.getByLabel("Categoria")).toHaveText(/Document càmera E2E/);

  await dialog.getByRole("textbox", { name: "Marca", exact: true }).fill("Ipevo");
  await dialog.getByRole("textbox", { name: "Model", exact: true }).fill("V4K");
  await dialog.getByRole("button", { name: "Desa" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.getByRole("link", { name: "Ipevo V4K" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Ipevo V4K/ }).getByText("Document càmera E2E")).toBeVisible();
});

test("els carros es filtren per edifici", async ({ page }) => {
  await page.goto("/espais");
  // L'aula del Carro E2E no és de cap edifici: filtrant per un de nou, no surt.
  await page.getByRole("button", { name: "Edificis" }).click();
  const manager = page.getByRole("dialog");
  await manager.getByPlaceholder("Nou edifici").fill("Annex E2E");
  await manager.getByRole("button", { name: "Afegeix" }).click();
  await expect(manager.getByText("Annex E2E")).toBeVisible();

  await page.goto("/chromebooks");
  await expect(page.getByText("Carro E2E", { exact: true })).toBeVisible();
  await page.getByLabel("Edifici", { exact: true }).click();
  await page.getByRole("option", { name: "Annex E2E" }).click();
  await expect(page.getByText("No hi ha cap carro a Annex E2E.")).toBeVisible();
  await expect(page.getByLabel("Planta", { exact: true })).toBeDisabled();
});
