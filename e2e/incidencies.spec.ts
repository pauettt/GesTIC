import { expect, test } from "@playwright/test";

import { pageAs, resolveIncident } from "./helpers";

test("una incidència de l'entorn Google va i torna entre el professorat i la coordinació", async ({
  browser,
}) => {
  const professor = await pageAs(browser, "professor");
  await professor.goto("/incidencies/nova");

  // A la pàgina hi ha tres formularis; aquest és el de l'entorn Google.
  const form = professor.locator("form", { has: professor.locator("#google-service") });
  await professor.locator("#google-service").click();
  await professor.getByRole("option", { name: "Classroom" }).click();
  await professor.locator("#google-description").fill("No puc entrar a la classe de 3r B des d'aquest matí.");
  await form.getByRole("button", { name: "Crea la incidència" }).click();

  await expect(professor.getByRole("heading", { name: "Entorn Google — Classroom" })).toBeVisible();
  // L'error fals de l'11 de setembre: la incidència es creava però sortia aquest missatge.
  await expect(professor.getByText("No s'ha pogut completar l'acció")).toHaveCount(0);
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
