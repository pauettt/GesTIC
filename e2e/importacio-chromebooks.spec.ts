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
  await expect(dialog.getByText("Ja hi ha un Chromebook amb el número de sèrie SN-ALU-01")).toBeVisible();
  await dialog.getByRole("button", { name: "Importa 3 Chromebooks" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.getByText("Carro 7 (B.201)").first()).toBeVisible();
  await expect(page.getByText("B.201 · Informàtica").first()).toBeVisible();
  await expect(page.getByText("ALU-03").first()).toBeVisible();

  await page.goto("/espais");
  await expect(page.getByText("B.201 · Informàtica")).toBeVisible();
});
