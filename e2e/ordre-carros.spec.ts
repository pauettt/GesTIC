import { test, expect } from "@playwright/test";
import { pageAs } from "./helpers";

test("ordre dels carros per clic, cancel·lació, persistència i restauració per a tothom", async ({ browser }) => {
  const admin = await pageAs(browser, "admin");
  await admin.goto("/chromebooks");
  const grid = admin.locator('[aria-label="Llista de carros"]');
  const cartNames = () => grid.locator('[data-slot="card-title"]').filter({ hasText: /^Carro / });
  await expect(cartNames()).toHaveText(["Carro E2E · Aula E2E", "Carro Reserves E2E"]);

  await admin.getByRole("button", { name: "Ordena amb clics" }).click();
  await admin.getByRole("button", { name: "Carro Reserves E2E, posició 2" }).click();
  await admin.getByRole("button", { name: "Carro E2E, posició 1" }).click();
  await expect(admin.getByRole("button", { name: "Carro Reserves E2E, posició 1" })).toBeVisible();
  await admin.getByRole("button", { name: "Cancel·la", exact: true }).click();
  await expect(cartNames()).toHaveText(["Carro E2E · Aula E2E", "Carro Reserves E2E"]);

  await admin.getByRole("button", { name: "Ordena amb clics" }).click();
  // El mateix gest també funciona amb teclat, sense arrossegar.
  await admin.getByRole("button", { name: "Carro Reserves E2E, posició 2" }).focus();
  await admin.keyboard.press("Enter");
  await admin.getByRole("button", { name: "Carro E2E, posició 1" }).focus();
  await admin.keyboard.press("Enter");
  await admin.getByRole("button", { name: "Desa l'ordre" }).click();
  await expect(admin.getByText("Ordre dels carros desat")).toBeVisible();
  await admin.reload();
  await expect(cartNames()).toHaveText(["Carro Reserves E2E", "Carro E2E · Aula E2E"]);

  const professor = await pageAs(browser, "professor");
  await professor.goto("/chromebooks");
  await expect(professor.getByRole("button", { name: "Ordena amb clics" })).toHaveCount(0);
  const profGrid = professor.locator('[aria-label="Llista de carros"]');
  await expect(profGrid.locator('[data-slot="card-title"]').filter({ hasText: /^Carro / })).toHaveText([
    "Carro Reserves E2E",
    "Carro E2E · Aula E2E",
  ]);

  await admin.getByRole("button", { name: "Ordena amb clics" }).click();
  await admin.getByRole("button", { name: "Ordre alfanumèric", exact: true }).click();
  await admin.getByRole("button", { name: "Desa l'ordre" }).click();
  await expect(admin.getByText("Ordre dels carros desat")).toBeVisible();
  await admin.reload();
  await expect(cartNames()).toHaveText(["Carro E2E · Aula E2E", "Carro Reserves E2E"]);
  await professor.reload();
  await expect(profGrid.locator('[data-slot="card-title"]').filter({ hasText: /^Carro / })).toHaveText([
    "Carro E2E · Aula E2E",
    "Carro Reserves E2E",
  ]);
});
