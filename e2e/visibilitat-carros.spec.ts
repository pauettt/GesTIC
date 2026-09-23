import { expect, test, type Page } from "@playwright/test";
import { pageAs, readFixtures } from "./helpers";

async function visibility(page: Page, visible: boolean) {
  await page.getByRole("button", { name: "Edita", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edita el carro" });
  await dialog.getByRole("checkbox", { name: "Visible per al professorat" }).setChecked(visible);
  await dialog.getByRole("button", { name: "Desa", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("Carro actualitzat", { exact: true })).toBeVisible();
}

test("oculta el carro, bloqueja reserves des de pantalles antigues i permet tornar-lo a mostrar", async ({ browser }) => {
  const { cartId, cartChromebooks, nextWeek } = readFixtures();
  const url = `/chromebooks/${cartId}?week=${nextWeek}`;
  const admin = await pageAs(browser, "admin");
  const professor = await pageAs(browser, "professor");
  const devicePage = await pageAs(browser, "professor");
  const fixedPage = await pageAs(browser, "professor");

  await professor.goto(url);
  await professor.locator("tr", { hasText: "2a hora" }).locator("td").nth(2).getByRole("button", { name: "Lliure", exact: true }).click();
  await devicePage.goto(url);
  await devicePage.getByRole("button", { name: /^E2E-02 / }).click();
  await devicePage.getByRole("button", { name: "Reserva aquest equip" }).click();
  await devicePage.getByRole("dialog").getByLabel("Dia").fill(nextWeek);
  await fixedPage.goto(url);
  await fixedPage.getByRole("button", { name: "Demana una reserva fixa" }).click();
  const fixedDialog = fixedPage.getByRole("dialog");
  await fixedDialog.getByLabel("Dia").click();
  await fixedPage.getByRole("option", { name: "Dijous", exact: true }).click();
  await fixedDialog.getByLabel("Sessió").click();
  await fixedPage.getByRole("option", { name: /^4a hora/ }).click();
  await fixedDialog.getByLabel("Motiu").fill("Classe d'informàtica");

  await admin.goto(url);
  await visibility(admin, false);
  await admin.reload();
  await expect(admin.getByText("Ocult al professorat · ús intern")).toBeVisible();
  // Tornar a obrir l'editor reflecteix el valor desat.
  await admin.getByRole("button", { name: "Edita", exact: true }).click();
  await expect(admin.getByRole("checkbox", { name: "Visible per al professorat" })).not.toBeChecked();
  await admin.screenshot({ path: "/tmp/coordtic-cart-visibility-desktop.png", animations: "disabled" });
  await admin.setViewportSize({ width: 390, height: 667 });
  await expect(admin.getByRole("dialog").getByRole("button", { name: "Desa", exact: true })).toBeInViewport();
  await admin.screenshot({ path: "/tmp/coordtic-cart-visibility-mobile.png", animations: "disabled" });
  await admin.setViewportSize({ width: 1280, height: 720 });
  await admin.getByRole("dialog").getByRole("button", { name: "Cancel·la" }).click();

  const denied = "Aquest carro és d'ús intern i no està disponible per al professorat";
  await professor.getByRole("button", { name: "Reserva aquesta sessió" }).click();
  await expect(professor.getByText(denied)).toBeVisible();
  await devicePage.getByRole("dialog").getByRole("button", { name: "Reserva", exact: true }).click();
  await expect(devicePage.getByText(denied)).toBeVisible();
  await fixedDialog.getByRole("button", { name: "Demana-la" }).click();
  await expect(fixedPage.getByText(denied)).toBeVisible();

  await professor.goto(`/chromebooks?dia=${nextWeek}&sessio=2&equips=0`);
  await expect(professor.locator(`a[href^="/chromebooks/${cartId}"]`)).toHaveCount(0);
  await expect(professor.getByText("Carro E2E", { exact: true })).toHaveCount(0);
  for (const path of [`/chromebooks/${cartId}`, `/q/carro/${cartId}`, `/q/chromebook/${cartChromebooks["E2E-02"]}`]) {
    await professor.goto(path);
    await expect(professor.getByRole("heading", { name: /^(404|Aquesta pàgina no existeix)$/ })).toBeVisible();
    await expect(professor.getByText("Carro E2E", { exact: true })).toHaveCount(0);
    await expect(professor.getByRole("button", { name: /Reserva/ })).toHaveCount(0);
  }
  await professor.goto("/incidencies/nova?tipus=carro");
  await professor.getByLabel("1. Quin carro?").click();
  await expect(professor.getByRole("option", { name: "Carro E2E", exact: true })).toHaveCount(0);
  await admin.goto("/chromebooks");
  await expect(admin.locator(`a[href="/chromebooks/${cartId}"]`)).toContainText("Ocult al professorat");
  const superAdmin = await pageAs(browser, "superAdmin");
  await superAdmin.goto(`/chromebooks/${cartId}`);
  await expect(superAdmin.getByRole("heading", { name: "Carro E2E" })).toBeVisible();

  await admin.goto(url);
  await admin.locator("tr", { hasText: "2a hora" }).locator("td").nth(2).getByRole("button", { name: "Lliure", exact: true }).click();
  await admin.getByRole("button", { name: "Reserva aquesta sessió" }).click();
  await expect(admin.locator("tr", { hasText: "2a hora" }).locator("td").nth(2)).toContainText("Coordinadora E2E");
  // Les reserves anteriors tampoc no s'han eliminat en ocultar-lo.
  await admin.goto(`/chromebooks/${cartId}`);
  await expect(admin.locator("table").getByText("Professor Un", { exact: true }).first()).toBeVisible();
  await visibility(admin, true);
  await professor.goto("/chromebooks");
  await expect(professor.locator(`a[href="/chromebooks/${cartId}"]`)).toBeVisible();
  await professor.goto(url);
  await expect(professor.getByRole("heading", { name: "Carro E2E" })).toBeVisible();
});
