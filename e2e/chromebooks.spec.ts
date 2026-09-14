import { expect, test, type Browser, type Page } from "@playwright/test";

import { pageAs, readFixtures, resolveIncident } from "./helpers";

/** El tutor demana un equip per a un alumne/a del seu grup. */
async function requestDevice(browser: Browser, firstName: string, lastName: string) {
  const tutor = await pageAs(browser, "tutor");
  await tutor.goto("/chromebooks");
  await tutor.getByRole("button", { name: "Demana un Chromebook" }).click();
  const dialog = tutor.getByRole("dialog");
  await dialog.locator("#studentFirstName").fill(firstName);
  await dialog.locator("#studentLastName").fill(lastName);
  await dialog.locator("#groupName").fill("2n ESO B");
  await dialog.getByRole("button", { name: "Envia la sol·licitud" }).click();
  await expect(tutor.getByText(`${firstName} ${lastName}`)).toBeVisible();
  return tutor;
}

/** La coordinació aprova la sol·licitud i hi aparta un equip concret. */
async function approveWith(admin: Page, student: string, device: string) {
  await admin.goto("/chromebooks");
  await admin.locator("tr", { hasText: student }).getByRole("button", { name: "Aprova" }).click();
  const dialog = admin.getByRole("dialog");
  await dialog.locator('[id^="device-"]').click();
  await admin.getByRole("option", { name: device }).click();
  await dialog.getByRole("button", { name: "Aprova i assigna" }).click();
  await expect(admin.getByText("Sol·licitud aprovada i equip assignat")).toBeVisible();
}

/** Entregar, anul·lar i tornar demanen confirmació abans de desar res. */
async function confirmStep(admin: Page, student: string, button: string, confirm: string) {
  await admin.locator("tr", { hasText: student }).getByRole("button", { name: button }).click();
  await admin.getByRole("alertdialog").getByRole("button", { name: confirm }).click();
}

test("una avaria reportada des del QR treu l'equip de servei fins que es resol", async ({ browser }) => {
  const { cartChromebooks } = readFixtures();
  const qr = `/q/chromebook/${cartChromebooks["E2E-01"]}`;
  const professor = await pageAs(browser, "professor");

  await professor.goto(qr);
  await expect(professor.getByText("Disponible", { exact: true })).toBeVisible();
  await professor.getByRole("button", { name: "Pantalla" }).click();
  await expect(professor).toHaveURL(/\/incidencies\/[^/]+$/);
  const incidentUrl = professor.url();

  await professor.goto(qr);
  await expect(professor.getByText("En incidència", { exact: true })).toBeVisible();
  // Un segon toc no en crea una altra: porta a la que ja hi ha.
  await professor.getByRole("button", { name: "Pantalla" }).click();
  await expect(professor).toHaveURL(incidentUrl);

  const admin = await pageAs(browser, "admin");
  await resolveIncident(admin, incidentUrl);

  await professor.goto(qr);
  await expect(professor.getByText("Disponible", { exact: true })).toBeVisible();
});

test("un equip del pool que passa per una incidència torna a l'alumne, no queda lliure", async ({
  browser,
}) => {
  const { poolChromebooks } = readFixtures();
  const qr = `/q/chromebook/${poolChromebooks["ALU-01"]}`;

  await requestDevice(browser, "Aina", "Serra Vidal");
  const admin = await pageAs(browser, "admin");
  await approveWith(admin, "Aina Serra Vidal", "ALU-01 · SN-ALU-01");

  // Aprovar només l'aparta: fins que no se li entrega, no se'n pot registrar la
  // devolució.
  const row = admin.locator("tr", { hasText: "Aina Serra Vidal" });
  await expect(row.getByRole("button", { name: "Marca com entregat" })).toBeVisible();
  await expect(row.getByRole("button", { name: "Marca com retornat" })).toHaveCount(0);
  await confirmStep(admin, "Aina Serra Vidal", "Marca com entregat", "Registra l'entrega");
  await expect(admin.getByText("Entrega registrada")).toBeVisible();

  const professor = await pageAs(browser, "professor");
  await professor.goto(qr);
  await expect(professor.getByText("Assignat a alumnat", { exact: true })).toBeVisible();
  // Qui escaneja l'etiqueta no ha de saber de quin alumne és.
  expect(await professor.content()).not.toContain("Aina");

  await professor.getByRole("button", { name: "No s'engega" }).click();
  await expect(professor).toHaveURL(/\/incidencies\/[^/]+$/);
  const incidentUrl = professor.url();
  await professor.goto(qr);
  await expect(professor.getByText("En incidència", { exact: true })).toBeVisible();

  await resolveIncident(admin, incidentUrl);
  await professor.goto(qr);
  // Abans tornava com a "Disponible" i es podia assignar a un segon alumne.
  await expect(professor.getByText("Assignat a alumnat", { exact: true })).toBeVisible();

  await admin.goto("/chromebooks");
  await confirmStep(admin, "Aina Serra Vidal", "Marca com retornat", "Registra la devolució");
  await expect(admin.getByText("Devolució registrada i equip alliberat")).toBeVisible();
  await professor.goto(qr);
  await expect(professor.getByText("Disponible", { exact: true })).toBeVisible();
});

test("anul·lar un equip que ningú no ha vingut a buscar l'allibera, i la fitxa diu qui l'ha tingut", async ({
  browser,
}) => {
  const { poolChromebooks } = readFixtures();
  const admin = await pageAs(browser, "admin");

  // Un alumne a qui s'aparta l'equip però que no el ve a buscar.
  const tutor = await requestDevice(browser, "Pol", "Garcia Ferrer");
  await approveWith(admin, "Pol Garcia Ferrer", "ALU-02 · SN-ALU-02");
  await confirmStep(admin, "Pol Garcia Ferrer", "Anul·la", "Anul·la l'assignació");
  await expect(admin.getByText("Assignació anul·lada i equip alliberat")).toBeVisible();

  await tutor.reload();
  await expect(tutor.locator("tr", { hasText: "Pol Garcia Ferrer" }).getByText("Cancel·lada")).toBeVisible();

  // L'equip torna a ser lliure: se'l pot endur un altre alumne, que després el torna.
  await requestDevice(browser, "Nil", "Roca Puig");
  await approveWith(admin, "Nil Roca Puig", "ALU-02 · SN-ALU-02");
  await confirmStep(admin, "Nil Roca Puig", "Marca com entregat", "Registra l'entrega");
  await expect(admin.getByText("Entrega registrada")).toBeVisible();
  await confirmStep(admin, "Nil Roca Puig", "Marca com retornat", "Registra la devolució");
  await expect(admin.getByText("Devolució registrada i equip alliberat")).toBeVisible();

  await admin.goto(`/chromebooks/alumnat/${poolChromebooks["ALU-02"]}`);
  await expect(admin.getByRole("heading", { name: "ALU-02" })).toBeVisible();
  const nil = admin.locator("tr", { hasText: "Nil Roca Puig" });
  await expect(nil.getByText("Retornada")).toBeVisible();
  // Qui l'ha entregat i qui l'ha rebut, cadascun amb el seu moment.
  await expect(nil.getByText("per Coordinadora E2E", { exact: true })).toHaveCount(2);
  const pol = admin.locator("tr", { hasText: "Pol Garcia Ferrer" });
  await expect(pol.getByText("Cancel·lada")).toBeVisible();
});

test("un equip donat de baixa ja no accepta incidències", async ({ browser }) => {
  const { cartId, cartChromebooks } = readFixtures();

  const admin = await pageAs(browser, "admin");
  await admin.goto(`/chromebooks/${cartId}`);
  await admin.getByRole("button", { name: "E2E-04" }).click();
  await admin.getByRole("button", { name: "Dona de baixa" }).click();
  await expect(admin.getByText("Chromebook donat de baixa")).toBeVisible();

  const professor = await pageAs(browser, "professor");
  await professor.goto(`/q/chromebook/${cartChromebooks["E2E-04"]}`);
  await expect(professor.getByText("Aquest Chromebook està donat de baixa")).toBeVisible();
  await expect(professor.getByRole("button", { name: "Pantalla" })).toHaveCount(0);
});
