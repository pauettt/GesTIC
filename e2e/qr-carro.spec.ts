import { expect, test } from "@playwright/test";

import { authFile, pageAs, readFixtures, resolveIncident } from "./helpers";

test.use({ storageState: authFile("professor") });

test("el professorat escaneja el QR del carro, tria el dispositiu i en reporta l'avaria", async ({
  page,
  browser,
}) => {
  const { cartId } = readFixtures();

  await page.goto(`/q/carro/${cartId}`);
  await expect(page.getByText("Carro E2E", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^E2E-02 / }).click();
  await expect(page.getByText("Quin problema té?")).toBeVisible();
  await page.getByRole("button", { name: "Teclat" }).click();
  await expect(page.getByText("Incidència enviada.")).toBeVisible();
  await expect(page).toHaveURL(/\/incidencies\/[^/?]+$/);
  const incidentUrl = page.url();

  // Qui escaneja després el veu en vermell al mateix QR.
  await page.goto(`/q/carro/${cartId}`);
  await expect(page.getByRole("button", { name: /^E2E-02 .*En incidència/ })).toBeVisible();

  // La coordinació imprimeix per defecte el QR del carro, i en resol l'avaria.
  const admin = await pageAs(browser, "admin");
  await admin.goto(`/chromebooks/${cartId}/etiquetes`);
  await expect(admin.getByText("QR del carro — Carro E2E")).toBeVisible();
  await admin.getByRole("link", { name: /una etiqueta per a cada dispositiu/ }).click();
  await expect(admin.getByText("Etiquetes QR per dispositiu — Carro E2E")).toBeVisible();
  await expect(admin.getByAltText("QR E2E-02")).toBeVisible();
  await resolveIncident(admin, incidentUrl);
});
