import { expect, test, type Page } from "@playwright/test";

import { pageAs, readFixtures } from "./helpers";

/** Casella de la graella setmanal: fila de la sessió i columna del dia (1 = dilluns). */
const cell = (page: Page, period: string, weekday: number) =>
  page.locator("tr", { hasText: period }).locator("td").nth(weekday);

/** Obre la fitxa d'un equip del carro i el reserva un dia, d'una sessió a una altra. */
async function reserveDevice(page: Page, assetTag: string, day: string, from: string, to: string) {
  await page.getByRole("button", { name: new RegExp(`^${assetTag} `) }).click();
  await page.getByRole("button", { name: "Reserva aquest equip" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Dia").fill(day);
  await dialog.getByLabel("Des de").click();
  await page.getByRole("option", { name: new RegExp(`^${from}`) }).click();
  await dialog.getByLabel("Fins a").click();
  await page.getByRole("option", { name: new RegExp(`^${to}`) }).click();
  await dialog.getByRole("button", { name: "Reserva", exact: true }).click();
}

// Va primer: fins que la Professora Dos torna el RES-02, falta al carro a totes
// les sessions que vindran, i la prova següent compta els equips que hi falten.
test("un equip que no ha tornat surt com a no disponible amb el nom de qui el té, fins que el torna", async ({
  browser,
}) => {
  const { reservationCartId, reservationDevices } = readFixtures();
  const url = `/chromebooks/${reservationCartId}`;

  // La Professora Dos té el RES-02 des d'ahir.
  const professor = await pageAs(browser, "professor");
  await professor.goto(url);
  await expect(professor.getByText("1 de 2 dispositius disponibles.")).toBeVisible();
  await professor.getByRole("button", { name: /^RES-02 .*No disponible/ }).click();
  const reservations = professor.getByRole("list", { name: "Reserves de l'equip" });
  await expect(reservations).toContainText("Reserva · Professora Dos");
  await expect(reservations).toContainText("L'havia de tornar");
  // No es pot reservar mentre no torni, i només ella o la coordinació el poden donar per tornat.
  await expect(professor.getByRole("button", { name: "Reserva aquest equip" })).toHaveCount(0);
  await expect(reservations.getByRole("button")).toHaveCount(0);

  // També ho diu el QR de l'equip.
  await professor.goto(`/q/chromebook/${reservationDevices["RES-02"]}`);
  await expect(professor.getByText("No disponible", { exact: true })).toBeVisible();
  await expect(professor.getByText(/Reserva · Professora Dos/)).toBeVisible();

  // La coordinació el té a la feina pendent i al panell.
  const admin = await pageAs(browser, "admin");
  await admin.goto("/");
  await expect(admin.getByRole("link", { name: /^1 equip de carro sense tornar$/ })).toBeVisible();
  await admin.goto("/panell");
  const queue = admin.locator('[data-slot="card"]', {
    has: admin.locator('[data-slot="card-title"]', { hasText: "Equips de carro sense tornar" }),
  });
  await expect(queue.getByRole("link", { name: /RES-02 · Carro Reserves E2E/ })).toContainText("Professora Dos");

  // Ella el veu a l'inici i el marca com a tornat d'allà mateix.
  const holder = await pageAs(browser, "professor2");
  await holder.goto("/");
  const card = holder.locator('[data-slot="card"]', {
    has: holder.getByText("Els equips que tens reservats", { exact: true }),
  });
  await expect(card).toContainText("Chromebook RES-02 · Carro Reserves E2E");
  await expect(card).toContainText("L'havies de tornar");
  await card.getByRole("button", { name: "L'he tornat" }).click();
  await expect(holder.getByText("Equip tornat al carro")).toBeVisible();
  await expect(card).toHaveCount(0);

  await professor.goto(url);
  await expect(professor.getByText("2 de 2 dispositius disponibles.")).toBeVisible();
  await admin.reload();
  await expect(queue.getByText("Tots els equips reservats a part han tornat al carro.")).toBeVisible();
});

test("un professor reserva un equip sol i ningú més no el pot agafar aquelles hores", async ({ browser }) => {
  const { reservationCartId, nextWeek } = readFixtures();
  const url = `/chromebooks/${reservationCartId}?week=${nextWeek}`;

  const professor = await pageAs(browser, "professor");
  await professor.goto(url);
  await reserveDevice(professor, "RES-01", nextWeek, "2a hora", "3a hora");
  await expect(professor.getByText("Equip reservat")).toBeVisible();

  // Qui reservi el carro sencer aquelles hores ja veu que n'hi faltarà un.
  await expect(cell(professor, "2a hora", 1)).toContainText("Falta 1 equip");
  await expect(cell(professor, "3a hora", 1)).toContainText("Falta 1 equip");
  await expect(cell(professor, "4a hora", 1)).not.toContainText("Falta");

  // Una companya ho veu a la fitxa de l'equip, i no el pot reservar a la vegada.
  const colleague = await pageAs(browser, "professor2");
  await colleague.goto(url);
  await colleague.getByRole("button", { name: /^RES-01 / }).click();
  await expect(colleague.getByRole("list", { name: "Reserves de l'equip" })).toContainText(
    "Professor Un",
  );
  await expect(colleague.getByRole("list", { name: "Reserves de l'equip" })).toContainText(
    "2a a 3a hora (08:55–10:45)",
  );
  await colleague.keyboard.press("Escape");
  await reserveDevice(colleague, "RES-01", nextWeek, "3a hora", "3a hora");
  await expect(colleague.getByText("Ja el té reservat Professor Un: 2a a 3a hora (08:55–10:45)")).toBeVisible();

  // Si ella té el carro sencer a 5a hora, a ell no li'n pot treure cap equip.
  await colleague.keyboard.press("Escape");
  await cell(colleague, "5a hora", 1).getByRole("button", { name: /Lliure/ }).click();
  await colleague.getByRole("button", { name: "Reserva aquesta sessió" }).click();
  await expect(cell(colleague, "5a hora", 1)).toContainText("Professora Dos");
  await professor.reload();
  await reserveDevice(professor, "RES-01", nextWeek, "5a hora", "5a hora");
  await expect(professor.getByText(/El carro sencer és de Professora Dos a la 5a hora/)).toBeVisible();

  // Encara no ha començat: la pot cancel·lar, i l'equip torna a ser lliure aquelles hores.
  await professor.keyboard.press("Escape");
  await professor.getByRole("button", { name: /^RES-01 / }).click();
  const reservations = professor.getByRole("list", { name: "Reserves de l'equip" });
  await reservations.getByRole("button", { name: "Cancel·la" }).click();
  await expect(professor.getByText("Reserva cancel·lada")).toBeVisible();
  await expect(reservations).toHaveCount(0);
  await expect(cell(professor, "2a hora", 1)).not.toContainText("Falta");
});
