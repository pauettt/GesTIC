import { expect, test, type Page } from "@playwright/test";

import { pageAs, readFixtures } from "./helpers";

/** Casella de la graella setmanal: fila de la sessió i columna del dia (1 = dilluns). */
const cell = (page: Page, period: string, weekday: number) =>
  page.locator("tr", { hasText: period }).locator("td").nth(weekday);

test("un professor reserva una sessió lliure i ja no la pot agafar ningú més", async ({ browser }) => {
  const { cartId, nextWeek } = readFixtures();
  const url = `/chromebooks/${cartId}?week=${nextWeek}`;

  const professor = await pageAs(browser, "professor");
  await professor.goto(url);
  await cell(professor, "2a hora", 2).getByRole("button", { name: "Lliure" }).click();
  await professor.getByRole("button", { name: "Reserva aquesta sessió" }).click();
  await expect(cell(professor, "2a hora", 2)).toContainText("Professor Un");

  const colleague = await pageAs(browser, "professor2");
  await colleague.goto(url);
  await expect(cell(colleague, "2a hora", 2)).toContainText("Professor Un");
  await expect(cell(colleague, "2a hora", 2).getByRole("button", { name: "Lliure" })).toHaveCount(0);

  // A l'inici la té a la vista, i porta a la setmana del carro on és.
  await professor.goto("/");
  const reservations = professor.locator('[data-slot="card"]', {
    has: professor.getByText("Les meves reserves de carros", { exact: true }),
  });
  const link = reservations.locator(`a[href="/chromebooks/${cartId}?week=${nextWeek}"]`);
  await expect(link).toContainText("Carro E2E");
  await link.click();
  await expect(cell(professor, "2a hora", 2)).toContainText("Professor Un");
});

test("consergeria entrega la clau d'una reserva d'avui i el professor la veu a l'inici", async ({ browser }) => {
  const concierge = await pageAs(browser, "concierge");
  await concierge.goto("/consergeria");

  const reservationRow = concierge.locator("tr", { hasText: "Carro E2E" }).filter({ hasText: "Professor Un" });
  await reservationRow.getByRole("button", { name: "Entrega la clau" }).click();
  const dialog = concierge.getByRole("dialog");
  await dialog.getByRole("button", { name: "Conserge E2E" }).click();
  await dialog.getByRole("button", { name: "Entrega la clau" }).click();
  await expect(reservationRow.getByText("Entregada")).toBeVisible();

  const professor = await pageAs(browser, "professor");
  await professor.goto("/");
  await expect(professor.getByText("Claus que tens")).toBeVisible();
  await expect(professor.getByText("C-E2E — Clau del carro")).toBeVisible();

  await concierge.getByRole("button", { name: "Tornada" }).click();
  await expect(concierge.getByText("Totes les claus són al taulell.")).toBeVisible();

  await professor.reload();
  await expect(professor.getByText("Claus que tens")).toHaveCount(0);
});
