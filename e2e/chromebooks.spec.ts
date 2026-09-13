import { expect, test } from "@playwright/test";

import { pageAs, readFixtures, resolveIncident } from "./helpers";

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

  const tutor = await pageAs(browser, "tutor");
  await tutor.goto("/chromebooks");
  await tutor.getByRole("button", { name: "Demana un Chromebook" }).click();
  const requestDialog = tutor.getByRole("dialog");
  await requestDialog.locator("#studentFirstName").fill("Aina");
  await requestDialog.locator("#studentLastName").fill("Serra Vidal");
  await requestDialog.locator("#groupName").fill("2n ESO B");
  await requestDialog.getByRole("button", { name: "Envia la sol·licitud" }).click();
  await expect(tutor.getByText("Aina Serra Vidal")).toBeVisible();

  const admin = await pageAs(browser, "admin");
  await admin.goto("/chromebooks");
  await admin.locator("tr", { hasText: "Aina Serra Vidal" }).getByRole("button", { name: "Aprova" }).click();
  const approveDialog = admin.getByRole("dialog");
  await approveDialog.locator('[id^="device-"]').click();
  await admin.getByRole("option", { name: "ALU-01 · SN-ALU-01" }).click();
  await approveDialog.getByRole("button", { name: "Aprova i assigna" }).click();
  await expect(admin.getByText("Sol·licitud aprovada i equip assignat")).toBeVisible();

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
  await admin
    .locator("tr", { hasText: "Aina Serra Vidal" })
    .getByRole("button", { name: "Marca com retornat" })
    .click();
  await expect(admin.getByText("Devolució registrada i equip alliberat")).toBeVisible();
  await professor.goto(qr);
  await expect(professor.getByText("Disponible", { exact: true })).toBeVisible();
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
