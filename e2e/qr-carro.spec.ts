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

test("amb una sessió caducada al mòbil, el QR del carro porta a entrar i després al carro", async ({
  browser,
  baseURL,
}) => {
  const { cartId } = readFixtures();
  // Una cookie de sessió que ja no és a la base de dades, com la del mòbil
  // d'algú que havia entrat abans que la sessió caduqués o s'esborrés.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  await context.addCookies([{ name: "authjs.session-token", value: "caducada", url: baseURL! }]);
  const page = await context.newPage();

  await page.goto(`/q/carro/${cartId}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?callbackUrl=%2Fq%2Fcarro%2F${cartId}$`));
  await expect(page.locator('input[name="callbackUrl"]')).toHaveValue(`/q/carro/${cartId}`);
  await context.close();
});
