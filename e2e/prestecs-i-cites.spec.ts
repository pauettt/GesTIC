import { expect, test } from "@playwright/test";

import { authFile, readFixtures } from "./helpers";

test.use({ storageState: authFile("professor") });

test("un préstec que ja ha començat no es pot cancel·lar; un de pendent sí", async ({ page }) => {
  await page.goto("/inventari");

  const started = page.locator("tr", { hasText: "ThinkPad E2E" }).filter({ hasText: "Aprovada" });
  await expect(started).toBeVisible();
  await expect(started.getByRole("button", { name: "Cancel·la" })).toHaveCount(0);

  const pending = page.locator("tr", { hasText: "iPad E2E" }).filter({ hasText: "Pendent" });
  await pending.getByRole("button", { name: "Cancel·la" }).click();
  await expect(page.locator("tr", { hasText: "iPad E2E" }).filter({ hasText: "Cancel·lada" })).toBeVisible();
});

test("demana una hora a la coordinació i la veu a l'inici", async ({ page }) => {
  const { nextWeek } = readFixtures();
  await page.goto(`/cites?week=${nextWeek}`);

  const tuesdaySecondPeriod = page.locator("tr", { hasText: "2a hora" }).locator("td").nth(2);
  await tuesdaySecondPeriod.getByRole("button", { name: "Lliure" }).click();
  await page.getByPlaceholder("Per a què la vols?").fill("Passar el sociograma de 1r A");
  await page.getByRole("button", { name: "Demana aquesta cita" }).click();
  await expect(tuesdaySecondPeriod).toContainText("La teva cita");

  await page.goto("/");
  await expect(page.getByText("Les meves cites")).toBeVisible();
  await expect(page.getByText("Passar el sociograma de 1r A")).toBeVisible();
});
