import { expect, test } from "@playwright/test";

import { CREDENTIALS } from "./data";
import { authFile } from "./helpers";

// Qui veu cada contrasenya, que no viatgen amb la pàgina i que cada consulta queda apuntada.

const { shared, restricted } = CREDENTIALS;

test.describe("coordinació TIC", () => {
  test.use({ storageState: authFile("admin") });

  test("veu les compartides, no les del superadministrador, i les contrasenyes només quan les demana", async ({
    page,
  }) => {
    await page.goto("/contrasenyes");
    const card = page.getByRole("listitem").filter({ hasText: shared.name });
    await expect(card).toBeVisible();

    // Ni a la pantalla ni a les dades que arriben al navegador.
    const html = await page.content();
    expect(html).not.toContain(restricted.name);
    expect(html).not.toContain(shared.password);

    await card.getByRole("button", { name: `Mostra la contrasenya de ${shared.name}` }).click();
    await expect(card.getByText(shared.password)).toBeVisible();
    await card.getByRole("button", { name: `Amaga la contrasenya de ${shared.name}` }).click();
    await expect(card.getByText(shared.password)).toHaveCount(0);
  });
});

test.describe("superadministració", () => {
  test.use({ storageState: authFile("superAdmin") });

  test("veu també les restringides, i la consulta queda al registre d'activitat", async ({ page }) => {
    await page.goto("/contrasenyes");
    const card = page.getByRole("listitem").filter({ hasText: restricted.name });
    await expect(card.getByText("Només superadmin")).toBeVisible();

    await card.getByRole("button", { name: `Mostra la contrasenya de ${restricted.name}` }).click();
    await expect(card.getByText(restricted.password)).toBeVisible();

    await page.goto("/administracio");
    await expect(page.getByText(`ha vist la contrasenya de «${restricted.name}»`)).toBeVisible();
  });

  test("importa el full de contrasenyes i en marca una com a només seva", async ({ page }) => {
    await page.goto("/contrasenyes");
    await page.getByRole("button", { name: "Importa", exact: true }).click();

    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "contrasenyes.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        [
          ",Usuari,Contrasenya,OBSERVACIONS",
          ",,XARXA,",
          "Router del hall E2E,admin,Prova-importada-3,Planta 0",
          "Wifi professorat E2E,,Prova-importada-4,",
          `,,${shared.category.toUpperCase()},`,
          // Ja hi és: no s'ha de tornar a crear.
          `${shared.name},${shared.username},Prova-compartida-1,`,
        ].join("\r\n"),
      ),
    });

    await expect(dialog.getByText("Router del hall E2E")).toBeVisible();
    await expect(dialog.getByText("Ja hi és")).toBeVisible();
    await dialog.getByRole("checkbox", { name: "Només superadmin: Wifi professorat E2E" }).click();
    await dialog.getByRole("button", { name: "Importa 2 contrasenyes" }).click();

    await expect(page.getByRole("heading", { name: /^Xarxa/ })).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Wifi professorat E2E" }).getByText("Només superadmin"),
    ).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: shared.name })).toHaveCount(1);
  });
});
