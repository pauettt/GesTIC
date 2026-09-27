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

test("una hora fixa s'obre cada setmana; treta, es tanca menys on ja hi ha cita", async ({ browser }) => {
  // Setmanes dins el curs (a l'estiu, les del següent) i una sessió, el divendres a
  // 7a hora, que no fa servir cap altra prova: totes comparteixen la base de dades.
  const { fixedWeek } = readFixtures();
  const weekUrl = `/cites?week=${later(fixedWeek, 7)}`;
  const bookedWeekUrl = `/cites?week=${later(fixedWeek, 14)}`;
  const laterWeekUrl = `/cites?week=${later(fixedWeek, 21)}`;

  const coordtic = await pageAs(browser, "superAdmin");
  await coordtic.goto("/cites");
  await coordtic.getByRole("button", { name: "Hores fixes" }).click();
  const dialog = coordtic.getByRole("dialog");
  await dialog.getByRole("button", { name: /^Fes fixa: Divendres · 7a hora/ }).click();
  await expect(coordtic.getByText(/^Oberta cada divendres a 7a hora · \d+ setmanes$/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^Treu l'hora fixa: Divendres · 7a hora/ })).toBeVisible();
  await coordtic.keyboard.press("Escape");

  // Al professorat li surt oberta totes les setmanes, i n'agafa una.
  const professor = await pageAs(browser, "professor");
  await professor.goto(laterWeekUrl);
  await expect(cell(professor, "7a hora", 5).getByRole("button", { name: "Lliure" })).toBeVisible();
  await professor.goto(bookedWeekUrl);
  await cell(professor, "7a hora", 5).getByRole("button", { name: "Lliure" }).click();
  await professor.getByPlaceholder("Per a què la vols?").fill("Hores fixes E2E");
  await professor.getByRole("button", { name: "Demana aquesta cita" }).click();
  await expect(cell(professor, "7a hora", 5)).toContainText("La teva cita");

  // Una setmana concreta es tanca sola, sense tocar l'hora fixa.
  await coordtic.goto(weekUrl);
  await cell(coordtic, "7a hora", 5).getByRole("button", { name: "Lliure" }).click();
  await coordtic.getByRole("button", { name: "Tanca-la només aquesta setmana" }).click();
  await expect(coordtic.getByText("Hora tancada")).toBeVisible();
  await professor.goto(weekUrl);
  await expect(cell(professor, "7a hora", 5).getByRole("button", { name: "Lliure" })).toHaveCount(0);
  await professor.goto(laterWeekUrl);
  await expect(cell(professor, "7a hora", 5).getByRole("button", { name: "Lliure" })).toBeVisible();

  // Treta l'hora fixa, les setmanes sense cita es tanquen i la de la cita es queda.
  await coordtic.getByRole("button", { name: "Hores fixes" }).click();
  await dialog.getByRole("button", { name: /^Treu l'hora fixa: Divendres · 7a hora/ }).click();
  await coordtic.getByRole("alertdialog").getByRole("button", { name: "Treu-la" }).click();
  await expect(coordtic.getByText(/^Ja no és fixa cada divendres a 7a hora · \d+ hores tancades · es manté 1 cita/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^Fes fixa: Divendres · 7a hora/ })).toBeVisible();

  await professor.goto(laterWeekUrl);
  await expect(cell(professor, "7a hora", 5).getByRole("button", { name: "Lliure" })).toHaveCount(0);
  await professor.goto(bookedWeekUrl);
  await expect(cell(professor, "7a hora", 5)).toContainText("La teva cita");

  // La cancel·la, perquè no toqui les altres proves.
  await cell(professor, "7a hora", 5).getByRole("button", { name: "Cancel·la la cita" }).click();
  await expect(professor.getByText("Cita cancel·lada")).toBeVisible();
  await expect(cell(professor, "7a hora", 5)).not.toContainText("La teva cita");
});
