import { expect, test } from "@playwright/test";

import { authFile } from "./helpers";

test.use({ storageState: authFile("admin") });

test("la IP es posa a la fitxa de l'equip i la secció Xarxa en surt sola", async ({ page }) => {
  await page.goto("/inventari");
  await page.getByRole("row", { name: /Apple iPad E2E/ }).getByRole("button", { name: "Edita" }).click();
  let dialog = page.getByRole("dialog");
  // Escrita amb zeros davant, es desa normalitzada.
  await dialog.getByLabel("Adreça IP").fill("10.77.1.010");
  await dialog.getByLabel("Nom a la xarxa").fill("IPAD-E2E");
  await dialog.getByRole("button", { name: "Desa" }).click();
  await expect(dialog).toHaveCount(0);

  // Una altra amb la mateixa IP: no es desa, i diu qui la té.
  await page.getByRole("row", { name: /Lenovo ThinkPad E2E/ }).getByRole("button", { name: "Edita" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Adreça IP").fill("10.77.1.10");
  await dialog.getByRole("button", { name: "Desa" }).click();
  await expect(page.getByText("La IP 10.77.1.10 ja la té Apple iPad E2E")).toBeVisible();
  await dialog.getByLabel("Adreça IP").fill("10.77.1.x");
  await dialog.getByRole("button", { name: "Desa" }).click();
  await expect(dialog.getByText(/La IP no és vàlida/)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/xarxa");
  const row = page.getByRole("row", { name: /10\.77\.1\.10/ });
  await expect(row.getByText("IPAD-E2E")).toBeVisible();
  await expect(row.getByRole("link", { name: "Apple iPad E2E" })).toBeVisible();

  // Les lliures de la seva xarxa, amb la primera a la vista.
  await expect(page.getByText("10.77.1.x")).toBeVisible();
  await expect(page.getByText("Primera lliure:").filter({ hasText: "10.77.1.1" }).first()).toBeVisible();

  // Una IP sencera es busca exacta i diu si és lliure.
  await page.getByPlaceholder("Cerca per IP, nom a la xarxa, equip o aula…").fill("10.77.1.11");
  await expect(page.getByText("La IP 10.77.1.11 és lliure: cap equip de l'inventari no la fa servir.")).toBeVisible();
  await page.getByPlaceholder("Cerca per IP, nom a la xarxa, equip o aula…").fill("ipad-e2e");
  await expect(row).toBeVisible();
});
