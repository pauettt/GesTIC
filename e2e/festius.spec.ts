import { expect, test, type Page } from "@playwright/test";

import { pageAs, readFixtures } from "./helpers";

/** Casella de la graella setmanal: fila de la sessió i columna del dia (1 = dilluns). */
const cell = (page: Page, period: string, weekday: number) =>
  page.locator("tr", { hasText: period }).locator("td").nth(weekday);

/** Un "YYYY-MM-DD" uns dies després. */
function later(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
}

test("un festiu no es reserva, les reserves fixes se'l salten i, si s'esborra, hi tornen", async ({ browser }) => {
  // La setmana després de la de `reserves-fixes`, i una sessió que no fa servir
  // ningú més: totes les proves comparteixen la base de dades.
  const { recurringCartId, fixedWeek } = readFixtures();
  const monday = later(fixedWeek, 7);
  const wednesday = later(monday, 2);
  const weekUrl = `/chromebooks/${recurringCartId}?week=${monday}`;

  // Una reserva fixa aprovada: cada dimecres a 6a hora.
  const professor = await pageAs(browser, "professor2");
  await professor.goto(`/chromebooks/${recurringCartId}`);
  await professor.getByRole("button", { name: "Demana una reserva fixa" }).click();
  const request = professor.getByRole("dialog");
  await request.getByLabel("Dia").click();
  await professor.getByRole("option", { name: "Dimecres", exact: true }).click();
  await request.getByLabel("Sessió").click();
  await professor.getByRole("option", { name: /^6a hora/ }).click();
  await request.getByLabel("Motiu").fill("Festius E2E");
  await request.getByRole("button", { name: "Demana-la" }).click();
  await expect(professor.getByText("Reserva fixa demanada: la coordinació TIC l'ha d'aprovar")).toBeVisible();

  const admin = await pageAs(browser, "admin");
  await admin.goto("/chromebooks/reserves-fixes");
  await admin.locator("li", { hasText: "Festius E2E" }).getByRole("button", { name: "Aprova" }).click();
  await admin.getByRole("alertdialog").getByRole("button", { name: "Aprova-la" }).click();
  await expect(admin.getByText("Reserva fixa aprovada")).toBeVisible();
  await professor.goto(weekUrl);
  await expect(cell(professor, "6a hora", 3)).toContainText("Professora Dos");

  // La coordinació entra el festiu des del panell.
  await admin.goto("/panell");
  await admin.getByRole("button", { name: "Festius i vacances" }).click();
  const dialog = admin.getByRole("dialog");
  await dialog.getByLabel("Nom").fill("Festa E2E");
  await dialog.getByLabel("Primer dia").fill(wednesday);
  await dialog.getByLabel("Últim dia").fill(wednesday);
  await dialog.getByRole("button", { name: "Afegeix el festiu" }).click();
  await expect(admin.getByText(/^Festiu desat · 1 sessió de reserves fixes alliberada/)).toBeVisible();
  await expect(dialog.getByRole("list", { name: "Festius per endavant" })).toContainText("Festa E2E");

  // Aquell dia no es pot reservar, i la setmana de la fixa ja no hi és.
  await professor.goto(weekUrl);
  await expect(professor.getByRole("columnheader", { name: /Festiu · Festa E2E/ })).toBeVisible();
  await expect(cell(professor, "6a hora", 3)).toHaveText("Festiu");
  await expect(cell(professor, "1a hora", 3).getByRole("button", { name: "Lliure" })).toHaveCount(0);
  await expect(cell(professor, "1a hora", 2).getByRole("button", { name: "Lliure" })).toHaveCount(1);
  await professor.goto(`/chromebooks?dia=${wednesday}&sessio=1&equips=0`);
  await expect(professor.getByText("Aquest dia és festiu (Festa E2E).")).toBeVisible();

  // Esborrat, la setmana torna a ser de qui tenia la fixa.
  await dialog.getByRole("button", { name: "Esborra Festa E2E" }).click();
  await admin.getByRole("alertdialog").getByRole("button", { name: "Elimina" }).click();
  await expect(admin.getByText("Festiu esborrat · 1 sessió de reserves fixes tornada a posar")).toBeVisible();
  await professor.goto(weekUrl);
  await expect(cell(professor, "6a hora", 3)).toContainText("Professora Dos");
  await expect(professor.getByRole("columnheader", { name: /Festiu/ })).toHaveCount(0);

  // L'anul·la, perquè no toqui les altres proves.
  await professor
    .getByRole("list", { name: "Reserves fixes d'aquest carro" })
    .locator("li", { hasText: "Festius E2E" })
    .getByRole("button", { name: "Anul·la-la" })
    .click();
  await professor.getByRole("alertdialog").getByRole("button", { name: "Anul·la-la" }).click();
  await expect(professor.getByText("Reserva fixa anul·lada")).toBeVisible();
});
