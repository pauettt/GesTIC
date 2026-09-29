import { expect, test } from "@playwright/test";

import { CART_INCIDENT_TITLES, DEVICE_INCIDENT_TITLE } from "./data";
import { BASE_URL } from "./env";
import { pageAs, readFixtures, resolveIncident } from "./helpers";

test("la fitxa del carro ensenya les seves incidències, i la de cada dispositiu, les seves", async ({ browser }) => {
  const { incidentCartId } = readFixtures();

  // La coordinació les veu totes, amb qui les ha reportat, i el nombre d'obertes a dalt.
  const admin = await pageAs(browser, "admin");
  await admin.goto(`/chromebooks/${incidentCartId}`);
  await expect(admin.getByRole("heading", { name: "Historial d'incidències" })).toBeVisible();
  await expect(admin.getByRole("row", { name: new RegExp(CART_INCIDENT_TITLES.professor) })).toContainText(
    "Professor Un",
  );
  await expect(admin.getByRole("link", { name: CART_INCIDENT_TITLES.professor2 })).toBeVisible();
  await expect(admin.getByRole("link", { name: "2 incidències obertes" })).toBeVisible();

  // La del dispositiu no és del carro: surt a la fitxa de l'equip.
  await expect(admin.getByText(DEVICE_INCIDENT_TITLE)).toHaveCount(0);
  await admin.getByRole("button", { name: /INC-01/ }).click();
  // A la finestreta, les obertes; a la fitxa de l'equip, l'historial sencer.
  const openIncidents = admin.getByRole("list", { name: "Incidències obertes de l'equip" });
  await expect(openIncidents.getByRole("link", { name: DEVICE_INCIDENT_TITLE })).toBeVisible();
  await admin.getByRole("link", { name: /Obre la fitxa/ }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "INC-01" })).toBeVisible();
  await expect(admin.getByRole("row", { name: new RegExp(DEVICE_INCIDENT_TITLE) })).toContainText("Professora Dos");
  await expect(admin.getByRole("heading", { name: "Historial de reserves" })).toBeVisible();
  await expect(admin.getByRole("link", { name: "Carro Incidències E2E" }).first()).toBeVisible();
  const deviceRecordUrl = admin.url();

  // El professorat, només les seves.
  const professor = await pageAs(browser, "professor");
  await professor.goto(`/chromebooks/${incidentCartId}`);
  await expect(professor.getByRole("heading", { name: "Les meves incidències d'aquest carro" })).toBeVisible();
  await expect(professor.getByRole("link", { name: CART_INCIDENT_TITLES.professor })).toBeVisible();
  await expect(professor.getByText(CART_INCIDENT_TITLES.professor2)).toHaveCount(0);
  // La fitxa de l'equip, que diu qui ha obert cada incidència, és de la coordinació.
  await professor.goto(deviceRecordUrl);
  await expect(professor).toHaveURL(`${BASE_URL}/`);
});

test("una incidència de l'entorn Google va i torna entre el professorat i la coordinació", async ({
  browser,
}) => {
  const professor = await pageAs(browser, "professor");
  await professor.goto("/incidencies/nova");

  // Primer es tria on és el problema, i només surt aquell formulari.
  await professor.getByRole("link", { name: /Incidència de l'entorn Google/ }).click();
  await expect(professor.locator("#cart-cartId")).toHaveCount(0);
  const form = professor.locator("form", { has: professor.locator("#google-service") });
  await professor.locator("#google-service").click();
  await professor.getByRole("option", { name: "Classroom" }).click();
  await professor.locator("#google-description").fill("No puc entrar a la classe de 3r B des d'aquest matí.");
  await form.getByRole("button", { name: "Crea la incidència" }).click();

  await expect(professor.getByRole("heading", { name: "Entorn Google — Classroom" })).toBeVisible();
  // Qui la crea ha de saber que s'ha enviat.
  await expect(professor.getByText("Incidència enviada.")).toBeVisible();
  // L'error fals de l'11 de setembre: la incidència es creava però sortia aquest missatge.
  await expect(professor.getByText("No s'ha pogut completar l'acció")).toHaveCount(0);
  // L'avís surt un cop: l'adreça ja no el porta.
  await expect(professor).toHaveURL(/\/incidencies\/[^/?]+$/);
  const incidentUrl = professor.url();

  const admin = await pageAs(browser, "admin");
  await admin.goto(incidentUrl);
  const question = "Et va bé que en parlem a la sala de professorat a 3a hora?";
  await admin.getByPlaceholder("Afegeix un comentari de seguiment…").fill(question);
  await admin.getByRole("button", { name: "Comenta" }).click();
  await expect(admin.getByText(question)).toBeVisible();

  await resolveIncident(admin, incidentUrl);

  await professor.reload();
  await expect(professor.getByText("Resolta", { exact: true }).first()).toBeVisible();
  await expect(professor.getByText(question)).toBeVisible();
});

test("els filtres d'estat dins l'historial d'un equip continuen mirant aquell equip", async ({ browser }) => {
  const { cartChromebooks } = readFixtures();
  const admin = await pageAs(browser, "admin");

  await admin.goto(`/incidencies?chromebookId=${cartChromebooks["E2E-04"]}`);
  const heading = admin.getByRole("heading", { name: /^Historial: .*E2E-04/ });
  await expect(heading).toBeVisible();

  await admin.getByRole("link", { name: "Tancades" }).click();
  await expect(admin).toHaveURL(/chromebookId=.+&status=TANCADA/);
  // Sense cap incidència tancada, el títol encara diu de quin equip és.
  await expect(heading).toBeVisible();
});

test("des del QR d'un equip, «amb més detall» obre el formulari amb l'equip ja triat", async ({ browser }) => {
  const { cartChromebooks } = readFixtures();
  const professor = await pageAs(browser, "professor");
  await professor.goto(`/q/chromebook/${cartChromebooks["E2E-03"]}`);
  await professor.getByRole("link", { name: /Reporta'l amb més detall/ }).click();

  await expect(professor.getByText("Incidència en un carro o un dispositiu")).toBeVisible();
  await expect(professor.locator("#cart-cartId")).toHaveText(/Carro E2E/);
  await expect(professor.locator("#cart-objectId")).toHaveText(/E2E-03/);
  await professor.getByRole("link", { name: "Canvia el tipus d'incidència" }).click();
  await expect(professor.getByText("On és el problema?")).toBeVisible();
});

test("el professorat reporta un carro sencer des de la seva pàgina, amb les dreceres habituals", async ({ browser }) => {
  // Un carro sense incidències de les altres proves: aquesta no els canvia els recomptes.
  const { moveToCartId } = readFixtures();
  const professor = await pageAs(browser, "professor");
  await professor.goto(`/chromebooks/${moveToCartId}`);
  await professor.getByRole("link", { name: "Reporta una incidència del carro" }).click();

  // Arriba amb el carro sencer ja triat i les dreceres a la vista.
  await expect(professor.locator("#cart-objectId")).toContainText("El carro sencer");
  const shortcuts = professor.getByRole("group", { name: "Problemes habituals del carro" });
  const description = professor.locator("#cart-description");
  await shortcuts.getByRole("button", { name: "Chromebooks fora del carro" }).click();
  await shortcuts.getByRole("button", { name: "Carro no endollat a la corrent" }).click();
  await expect(shortcuts.getByRole("button", { name: "Chromebooks fora del carro", pressed: true })).toBeVisible();
  await expect(description).toHaveValue(
    "Hi ha Chromebooks fora del carro. El carro no està endollat a la corrent.",
  );
  // Un segon clic ho treu, i el que s'hi ha escrit a mà es queda.
  await description.fill(`${await description.inputValue()} És a la sala de professorat.`);
  await shortcuts.getByRole("button", { name: "Chromebooks fora del carro" }).click();
  await expect(description).toHaveValue(
    "El carro no està endollat a la corrent. És a la sala de professorat.",
  );

  await professor.getByRole("button", { name: "Crea la incidència" }).click();
  await expect(professor.getByText("Incidència enviada.")).toBeVisible();
  await expect(professor.getByText(/El carro no està endollat a la corrent/)).toBeVisible();
});
