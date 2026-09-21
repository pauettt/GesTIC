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
  // L'aula del Carro E2E és d'un altre edifici: filtrant per un de nou, no surt.
  await page.getByRole("button", { name: "Edificis" }).click();
  const manager = page.getByRole("dialog");
  await manager.getByPlaceholder("Nou edifici").fill("Annex E2E");
  await manager.getByRole("button", { name: "Afegeix" }).click();
  await expect(manager.getByText("Annex E2E")).toBeVisible();

  await page.goto("/chromebooks");
  await expect(page.getByText("Carro E2E", { exact: true })).toBeVisible();

  // Per l'aula on és, hi surt.
  await page.getByLabel("Aula", { exact: true }).click();
  await page.getByRole("option", { name: "Aula E2E" }).click();
  await expect(page).toHaveURL(/aula=/);
  await expect(page.getByText("Carro E2E", { exact: true })).toBeVisible();

  // Triar un edifici treu l'aula, que no n'és.
  await page.getByLabel("Edifici", { exact: true }).click();
  await page.getByRole("option", { name: "Annex E2E" }).click();
  await expect(page.getByText("No hi ha cap carro a Annex E2E.")).toBeVisible();
  await expect(page.getByLabel("Planta", { exact: true })).toBeDisabled();
  await expect(page).not.toHaveURL(/aula=/);
});

test("l'inventari es filtra per aula, i una aula que no existeix no filtra", async ({ page }) => {
  await page.goto("/inventari");
  await page.getByRole("button", { name: "Nou equip" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Categoria").click();
  await page.getByRole("option", { name: "Portàtil" }).click();
  await dialog.getByRole("textbox", { name: "Marca", exact: true }).fill("Epson");
  await dialog.getByRole("textbox", { name: "Model", exact: true }).fill("Projector E2E");
  await dialog.getByLabel("Ubicació").click();
  await page.getByRole("option", { name: "Aula E2E" }).click();
  await dialog.getByRole("button", { name: "Desa" }).click();
  await expect(dialog).toHaveCount(0);

  // Amb l'aula triada, només surt el que hi ha a dins.
  await page.getByLabel("Aula", { exact: true }).click();
  await page.getByRole("option", { name: "Aula E2E" }).click();
  await expect(page).toHaveURL(/aula=/);
  await expect(page.getByRole("link", { name: "Epson Projector E2E" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lenovo ThinkPad E2E" })).toHaveCount(0);

  // Un enllaç vell a una aula esborrada ensenya tot l'inventari, no una llista buida.
  await page.goto("/inventari?aula=no-existeix");
  await expect(page.getByRole("link", { name: "Lenovo ThinkPad E2E" })).toBeVisible();
});

test("duplicar un equip en copia les dades menys el número de sèrie", async ({ page }) => {
  await page.goto("/inventari");
  await page.getByRole("row", { name: /Lenovo ThinkPad E2E/ }).getByRole("button", { name: "Duplica" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Duplica l'equip" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Marca", exact: true })).toHaveValue("Lenovo");
  await expect(dialog.getByLabel("Número de sèrie")).toHaveValue("");

  await dialog.getByRole("textbox", { name: "Model", exact: true }).fill("Duplicat E2E");
  await dialog.getByRole("button", { name: "Desa" }).click();
  await expect(dialog).toHaveCount(0);

  // L'original hi continua, i la còpia n'hereta el que no s'ha tocat.
  await expect(page.getByRole("link", { name: "Lenovo ThinkPad E2E" })).toBeVisible();
  const copy = page.getByRole("row", { name: /Lenovo Duplicat E2E/ });
  await expect(copy.getByText("Portàtil")).toBeVisible();
  await expect(copy.getByText("Prestable")).toBeVisible();
});
