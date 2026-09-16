import { expect, test } from "@playwright/test";

import { pageAs } from "./helpers";

// La categoria ja no s'escriu a cada pregunta: es tria d'una llista que manté
// la coordinació. Aquí es comprova tot el camí, des de crear-la fins que el
// professorat veu la pregunta a dins.
test("la coordinació crea una categoria, hi posa una pregunta i el professorat la veu", async ({
  browser,
}) => {
  const page = await pageAs(browser, "admin");
  await page.goto("/dubtes");

  await page.getByRole("button", { name: "Categories" }).click();
  const manager = page.getByRole("dialog");
  await manager.getByPlaceholder("Nova categoria").fill("Impressores");
  await manager.getByRole("button", { name: "Afegeix" }).click();
  await expect(manager.getByText("Impressores")).toBeVisible();
  await manager.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Nova pregunta" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Categoria").click();
  await page.getByRole("option", { name: "Impressores" }).click();
  await form.getByLabel("Pregunta").fill("Com imprimeixo des del Chromebook?");
  await form.getByLabel("Resposta").fill("Amb la impressora ja afegida al compte del centre, Fitxer → Imprimeix.");
  await form.getByRole("button", { name: "Desa" }).click();
  await expect(page.getByText("Pregunta afegida")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Impressores" })).toBeVisible();
  await expect(page.getByText("Com imprimeixo des del Chromebook?")).toBeVisible();

  const professor = await pageAs(browser, "professor");
  await professor.goto("/dubtes");
  await expect(professor.getByRole("heading", { name: "Impressores" })).toBeVisible();
  await expect(professor.getByText("Com imprimeixo des del Chromebook?")).toBeVisible();
  // El professorat no gestiona res: ni categories ni preguntes.
  await expect(professor.getByRole("button", { name: "Categories" })).toHaveCount(0);
  await expect(professor.getByRole("button", { name: "Nova pregunta" })).toHaveCount(0);
});
