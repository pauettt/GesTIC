import { expect, test } from "@playwright/test";

import { authFile } from "./helpers";

test.use({ storageState: authFile("admin") });

test("la coordinació importa carros i Chromebooks d'un full, i se'n creen les aules", async ({ page }) => {
  await page.goto("/chromebooks");
  await page.getByRole("button", { name: "Importa", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "chromebooks.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "f,Marca,NS,nº Carretó,Nº aula,NOM AULA,INCIDÈNCIES",
        "1,asus,IMP-001,7,B.201,Informàtica,",
        "2,asus,IMP-002,7,B.201,Informàtica,pantalla ratllada",
        ",lenovo,IMP-POOL-1,,,,",
        // Ja és al pool de préstec (fixtures): no s'ha de tornar a crear.
        ",lenovo,SN-ALU-01,,,,",
      ].join("\n"),
    ),
  });

  await expect(dialog.getByRole("cell", { name: "Carro 7 (B.201)" })).toBeVisible();
  await expect(dialog.getByText("Ja hi ha un dispositiu amb el número de sèrie SN-ALU-01")).toBeVisible();
  // El full no diu què són: fins que no es tria, no s'importa res.
  await expect(dialog.getByRole("button", { name: /^Importa/ })).toBeDisabled();
  await dialog.getByLabel("Tipus de les files que no el diuen").click();
  await page.getByRole("option", { name: "Chromebook" }).click();
  await dialog.getByRole("button", { name: "Importa 3 dispositius" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.getByText("Carro 7 (B.201)").first()).toBeVisible();
  await expect(page.getByText("B.201 · Informàtica").first()).toBeVisible();
  // Els equips sense carro van al préstec a l'alumnat, que té la seva secció.
  await page.goto("/alumnat");
  await expect(page.getByText("ALU-03").first()).toBeVisible();

  await page.goto("/espais");
  await expect(page.getByText("B.201 · Informàtica")).toBeVisible();
});

test("en crear un carro, s'hi importen els dispositius del full d'Excel, sense repetir-ne cap", async ({ page }) => {
  await page.goto("/chromebooks");
  await page.getByRole("button", { name: "Nou carro" }).click();
  const cartDialog = page.getByRole("dialog");
  await cartDialog.getByLabel("Nom del carro").fill("Carro importat E2E");
  await cartDialog.getByRole("button", { name: "Desa" }).click();

  // El carro nou s'obre sol, buit, i convida a importar.
  await expect(page.getByRole("heading", { name: "Carro importat E2E" })).toBeVisible();
  await expect(page.getByText("Aquest carro encara no té dispositius.")).toBeVisible();
  await page.getByRole("button", { name: "Importa des d'un full" }).click();

  const dialog = page.getByRole("dialog");
  // Com el desa l'Excel en castellà: punt i coma i Windows-1252 (la «ó» és 0xF3).
  const csv = [
    "Nombre;Número de serie;Marca;Tipo",
    "CI-01;SN-CI-01;Lenovo;Chromebook",
    "CI-02;SN-CI-02;Lenovo;Portátil",
    // Ja és al Carro E2E (fixtures): no s'ha de tornar a crear.
    "E2E-01;SN-NOVA;Lenovo;Chromebook",
    "CI-01;SN-CI-99;Lenovo;Chromebook",
  ].join("\r\n");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "carro.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "latin1"),
  });

  await expect(dialog.getByRole("cell", { name: "Portàtil" })).toBeVisible();
  await expect(dialog.getByText("Ja hi ha un dispositiu amb l'etiqueta E2E-01")).toBeVisible();
  await expect(dialog.getByText("L'etiqueta CI-01 ja surt a la fila 2")).toBeVisible();
  await dialog.getByRole("button", { name: "Afegeix 2 dispositius" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.getByText("CI-01", { exact: true })).toBeVisible();
  await expect(page.getByText("CI-02", { exact: true })).toBeVisible();
  await expect(page.getByText("Aquest carro encara no té dispositius.")).toHaveCount(0);
});
