import { test, expect, type Page } from "@playwright/test";
import { pageAs } from "./helpers";

// Totes les proves comparteixen la base de dades, i n'hi ha que creen carros (la
// importació, les reserves fixes). Aquesta mira només l'ordre relatiu dels dos
// carros que mou, i les posicions es llegeixen de la pantalla: així no depèn de
// quants carros hi hagi.
const FIRST = "Carro E2E";
const SECOND = "Carro Reserves E2E";
const FIRST_TITLE = "Carro E2E · Aula E2E";

const titles = (page: Page) =>
  page
    .locator('[aria-label="Llista de carros"]')
    .locator('[data-slot="card-title"]')
    .filter({ hasText: /^Carro (E2E|Reserves E2E)( ·|$)/ });

/** El botó d'un carro en el mode d'ordenar: «Carro E2E, posició 2». */
const orderButton = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`^${name}, posició \\d+$`) });

async function positionOf(page: Page, name: string) {
  const label = await orderButton(page, name).getAttribute("aria-label");
  return Number(label?.split("posició ")[1]);
}

test("ordre dels carros per clic, cancel·lació, persistència i restauració per a tothom", async ({ browser }) => {
  const admin = await pageAs(browser, "admin");
  await admin.goto("/chromebooks");
  await expect(titles(admin)).toHaveText([FIRST_TITLE, SECOND]);

  await admin.getByRole("button", { name: "Ordena amb clics" }).click();
  const target = await positionOf(admin, FIRST);
  await orderButton(admin, SECOND).click();
  await orderButton(admin, FIRST).click();
  await expect(admin.getByRole("button", { name: `${SECOND}, posició ${target}` })).toBeVisible();
  await admin.getByRole("button", { name: "Cancel·la", exact: true }).click();
  await expect(titles(admin)).toHaveText([FIRST_TITLE, SECOND]);

  await admin.getByRole("button", { name: "Ordena amb clics" }).click();
  // El mateix gest també funciona amb teclat, sense arrossegar.
  await orderButton(admin, SECOND).focus();
  await admin.keyboard.press("Enter");
  await orderButton(admin, FIRST).focus();
  await admin.keyboard.press("Enter");
  await admin.getByRole("button", { name: "Desa l'ordre" }).click();
  await expect(admin.getByText("Ordre dels carros desat")).toBeVisible();
  await admin.reload();
  await expect(titles(admin)).toHaveText([SECOND, FIRST_TITLE]);

  const professor = await pageAs(browser, "professor");
  await professor.goto("/chromebooks");
  await expect(professor.getByRole("button", { name: "Ordena amb clics" })).toHaveCount(0);
  await expect(titles(professor)).toHaveText([SECOND, FIRST_TITLE]);

  await admin.getByRole("button", { name: "Ordena amb clics" }).click();
  await admin.getByRole("button", { name: "Ordre alfanumèric", exact: true }).click();
  await admin.getByRole("button", { name: "Desa l'ordre" }).click();
  await expect(admin.getByText("Ordre dels carros desat")).toBeVisible();
  await admin.reload();
  await expect(titles(admin)).toHaveText([FIRST_TITLE, SECOND]);
  await professor.reload();
  await expect(titles(professor)).toHaveText([FIRST_TITLE, SECOND]);
});
