import { expect, test, type Page } from "@playwright/test";

import { pageAs, readFixtures } from "./helpers";

/** Casella de la graella setmanal: fila de la sessió i columna del dia (1 = dilluns). */
const cell = (page: Page, period: string, weekday: number) =>
  page.locator("tr", { hasText: period }).locator("td").nth(weekday);

/** El dilluns `weeks` setmanes després d'un altre, "YYYY-MM-DD". */
function laterWeek(monday: string, weeks: number) {
  const [year, month, day] = monday.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + weeks * 7, 12)).toISOString().slice(0, 10);
}

/** Des de la pàgina del carro, demana'l cada setmana un dia i una sessió. */
async function requestFixed(page: Page, cartId: string, day: string, period: string, purpose: string) {
  await page.goto(`/chromebooks/${cartId}`);
  await page.getByRole("button", { name: "Demana una reserva fixa" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Dia").click();
  await page.getByRole("option", { name: day, exact: true }).click();
  await dialog.getByLabel("Sessió").click();
  await page.getByRole("option", { name: new RegExp(`^${period}`) }).click();
  await dialog.getByLabel("Motiu").fill(purpose);
  await dialog.getByRole("button", { name: "Demana-la" }).click();
}

test("un professor té un carro cada setmana un cop la coordinació ho aprova", async ({ browser }) => {
  const { recurringCartId, fixedWeek } = readFixtures();
  const week = (offset: number) => `/chromebooks/${recurringCartId}?week=${laterWeek(fixedWeek, offset)}`;

  const professor = await pageAs(browser, "professor");
  await requestFixed(professor, recurringCartId, "Dijous", "4a hora", "Robòtica de 2n d'ESO");
  await expect(professor.getByText("Reserva fixa demanada: la coordinació TIC l'ha d'aprovar")).toBeVisible();

  // Mentre no s'aprova, la sessió continua lliure per a tothom.
  await professor.goto(week(1));
  await expect(professor.getByText("Pendent d'aprovar")).toBeVisible();
  await expect(cell(professor, "4a hora", 4)).toContainText("Lliure");

  // La coordinació la té a la feina pendent, i veu quina setmana ja té algú altre.
  const admin = await pageAs(browser, "admin");
  await admin.goto("/");
  await admin.getByRole("link", { name: /^1 reserva fixa per aprovar$/ }).click();
  await expect(admin).toHaveURL(/\/chromebooks\/reserves-fixes$/);
  const request = admin.locator("li", { hasText: "Robòtica de 2n d'ESO" });
  await expect(request).toContainText("1 setmana ja la té algú altre");
  await request.getByRole("button", { name: "Aprova" }).click();
  await admin.getByRole("alertdialog").getByRole("button", { name: "Aprova-la" }).click();
  await expect(admin.getByText("Reserva fixa aprovada")).toBeVisible();

  // La setmana que ja tenia la Professora Dos es respecta; les altres són seves.
  await professor.goto(week(0));
  await expect(cell(professor, "4a hora", 4)).toContainText("Professora Dos");
  await professor.goto(week(1));
  await expect(cell(professor, "4a hora", 4)).toContainText("Professor Un");
  await expect(cell(professor, "4a hora", 4)).toContainText("Reserva fixa");

  // Ningú més no la pot demanar aquest curs.
  const colleague = await pageAs(browser, "professor2");
  await requestFixed(colleague, recurringCartId, "Dijous", "4a hora", "Laboratori");
  await expect(colleague.getByText("Aquesta sessió ja és fixa de Professor Un aquest curs")).toBeVisible();

  // Una setmana que no el necessita, l'allibera sola.
  await cell(professor, "4a hora", 4).getByRole("button", { name: "Allibera aquesta setmana" }).click();
  await expect(professor.getByText("Setmana alliberada")).toBeVisible();
  await expect(cell(professor, "4a hora", 4)).toContainText("Lliure");
  await professor.goto(week(2));
  await expect(cell(professor, "4a hora", 4)).toContainText("Professor Un");

  // I si ja no la vol, l'anul·la sencera: les setmanes que queden tornen a ser lliures.
  await professor.goto("/chromebooks/reserves-fixes");
  const mine = professor.locator("li", { hasText: "Robòtica de 2n d'ESO" });
  await expect(mine).toContainText("Aprovada");
  await mine.getByRole("button", { name: "Anul·la-la" }).click();
  await professor.getByRole("alertdialog").getByRole("button", { name: "Anul·la-la" }).click();
  await expect(professor.getByText("Reserva fixa anul·lada")).toBeVisible();
  await professor.goto(week(2));
  await expect(cell(professor, "4a hora", 4)).toContainText("Lliure");
});

test("si la coordinació no l'aprova, qui l'ha demanada en veu el motiu", async ({ browser }) => {
  const { recurringCartId } = readFixtures();

  const colleague = await pageAs(browser, "professor2");
  await requestFixed(colleague, recurringCartId, "Dilluns", "1a hora", "Tutoria amb Classroom");
  await expect(colleague.getByText("Reserva fixa demanada: la coordinació TIC l'ha d'aprovar")).toBeVisible();

  const admin = await pageAs(browser, "admin");
  await admin.goto("/chromebooks/reserves-fixes");
  await admin.locator("li", { hasText: "Tutoria amb Classroom" }).getByRole("button", { name: "Rebutja" }).click();
  await admin.getByRole("dialog").getByLabel("Motiu (opcional)").fill("A 1a hora el carro és a l'aula de música");
  await admin.getByRole("dialog").getByRole("button", { name: "Rebutja" }).click();
  await expect(admin.getByText("Reserva fixa rebutjada")).toBeVisible();

  await colleague.goto("/chromebooks/reserves-fixes");
  const request = colleague.locator("li", { hasText: "Tutoria amb Classroom" });
  await expect(request).toContainText("No aprovada");
  await expect(request).toContainText("A 1a hora el carro és a l'aula de música");
});
