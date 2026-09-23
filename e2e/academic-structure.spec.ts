import { expect, test, type Page } from "@playwright/test";

import { pageAs } from "./helpers";

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("dialog").getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function add(page: Page, placeholder: string, name: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder(placeholder).fill(name);
  await dialog.getByRole("button", { name: "Afegeix" }).click();
  await expect(dialog.getByRole("button", { name: `Edita ${name}`, exact: true })).toBeVisible();
}

test("etapes, cursos i grups administrats limiten el formulari i conserven l'historial", async ({ browser }, testInfo) => {
  const admin = await pageAs(browser, "admin");
  await admin.goto("/espais");
  await admin.getByRole("button", { name: "Etapes, cursos i grups" }).click();
  let dialog = admin.getByRole("dialog");
  await add(admin, "Nova etapa (p. ex. ESO)", "Batxillerat E2E");

  await dialog.getByRole("tab", { name: "Cursos", exact: true }).click();
  await choose(admin, "Etapa", "Batxillerat E2E");
  await add(admin, "Nou curs (p. ex. 2n)", "1r");
  // 2n també existeix a ESO: els noms són únics només dins de cada etapa.
  await add(admin, "Nou curs (p. ex. 2n)", "2n");
  await dialog.getByRole("tab", { name: "Grups", exact: true }).click();
  await choose(admin, "Curs", "1r");
  await add(admin, "Nou grup (p. ex. B)", "A");
  await choose(admin, "Curs", "2n");
  await expect(dialog.getByRole("button", { name: "Edita A", exact: true })).toHaveCount(0);
  await add(admin, "Nou grup (p. ex. B)", "B");
  await dialog.screenshot({ path: testInfo.outputPath("academic-manager.png") });
  await dialog.getByPlaceholder("Nou grup (p. ex. B)").fill("B");
  await dialog.getByRole("button", { name: "Afegeix" }).click();
  await expect(admin.getByText("Aquest curs ja té un grup amb aquest nom")).toBeVisible();
  await admin.keyboard.press("Escape");

  const tutor = await pageAs(browser, "tutor");
  await tutor.goto("/alumnat");
  await tutor.getByRole("button", { name: "Demana un Chromebook" }).click();
  const form = tutor.getByRole("dialog");
  await form.getByLabel("Nom", { exact: true }).fill("Alumna Grups");
  await form.getByLabel("Cognoms", { exact: true }).fill("E2E");
  await expect(form.getByLabel("Curs", { exact: true })).toBeDisabled();
  await expect(form.getByLabel("Grup (opcional)")).toBeDisabled();
  await choose(tutor, "Etapa", "Batxillerat E2E");
  await choose(tutor, "Curs", "1r");
  await form.getByLabel("Grup (opcional)").click();
  await expect(tutor.getByRole("option", { name: "B", exact: true })).toHaveCount(0);
  await tutor.getByRole("option", { name: "A", exact: true }).click();
  await choose(tutor, "Curs", "2n");
  await expect(form.getByLabel("Grup (opcional)")).toHaveText(/Sense indicar/);
  await choose(tutor, "Grup (opcional)", "B");
  await choose(tutor, "Etapa", "ESO");
  await expect(form.getByLabel("Curs", { exact: true })).toHaveText(/Tria el curs/);
  await expect(form.getByLabel("Grup (opcional)")).toBeDisabled();
  await choose(tutor, "Etapa", "Batxillerat E2E");
  await choose(tutor, "Curs", "2n");
  await choose(tutor, "Grup (opcional)", "B");
  await tutor.setViewportSize({ width: 390, height: 844 });
  await form.screenshot({ path: testInfo.outputPath("student-request-mobile.png") });
  await form.getByRole("button", { name: "Envia la sol·licitud" }).click();
  await expect(form).toHaveCount(0);
  await expect(tutor.locator("tr", { hasText: "Alumna Grups E2E" })).toContainText("2n Batxillerat E2E B");

  // El grup en ús no s'elimina. Reanomenar-lo no reescriu les peticions antigues.
  await admin.reload();
  await admin.getByRole("button", { name: "Etapes, cursos i grups" }).click();
  dialog = admin.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Elimina Batxillerat E2E", exact: true })).toBeDisabled();
  await dialog.getByRole("tab", { name: "Cursos", exact: true }).click();
  await choose(admin, "Etapa", "Batxillerat E2E");
  await expect(dialog.getByRole("button", { name: "Elimina 2n", exact: true })).toBeDisabled();
  await dialog.getByRole("tab", { name: "Grups", exact: true }).click();
  await choose(admin, "Curs", "2n");
  await expect(dialog.getByRole("button", { name: "Elimina B", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Edita B", exact: true }).click();
  await dialog.getByRole("textbox").first().fill("C");
  await dialog.getByRole("button", { name: "Desa", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Edita C", exact: true })).toBeVisible();
  await tutor.reload();
  await expect(tutor.locator("tr", { hasText: "Alumna Grups E2E" })).toContainText("2n Batxillerat E2E B");
});
