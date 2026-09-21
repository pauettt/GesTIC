import { expect, test } from "@playwright/test";

import { STALLED_INCIDENT_TITLE } from "./data";
import { authFile } from "./helpers";

test.use({ storageState: authFile("admin") });

test("el panell marca les incidències aturades encara que tinguin responsable", async ({ page }) => {
  await page.goto("/panell");
  const stalled = page.locator('[data-slot="card"]', {
    // El títol porta el comptador al costat: «Incidències aturades 1».
    has: page.locator('[data-slot="card-title"]', { hasText: "Incidències aturades" }),
  });
  const row = stalled.getByRole("link", { name: new RegExp(STALLED_INCIDENT_TITLE) });
  await expect(row).toBeVisible();
  await expect(row.getByText("10 dies")).toBeVisible();
  await expect(row.getByText("Responsable: Coordinadora E2E")).toBeVisible();

  // La llista sencera fa servir el mateix criteri, i és de tots els cursos.
  await page.goto("/incidencies?vista=aturades");
  await expect(page.getByText(/Només les incidències aturades/)).toBeVisible();
  await expect(page.getByRole("link", { name: STALLED_INCIDENT_TITLE })).toBeVisible();

  // Un comentari és moviment: deixa de ser aturada.
  await page.getByRole("link", { name: STALLED_INCIDENT_TITLE }).click();
  await page.getByPlaceholder("Afegeix un comentari de seguiment…").fill("Demà hi passo.");
  await page.getByRole("button", { name: "Comenta" }).click();
  await expect(page.getByText("Demà hi passo.")).toBeVisible();

  await page.goto("/panell");
  await expect(row).toHaveCount(0);
});
