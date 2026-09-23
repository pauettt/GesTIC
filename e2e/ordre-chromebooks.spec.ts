import { test, expect } from "@playwright/test";
import { pageAs, readFixtures } from "./helpers";

test("ordre del carro per clic, cancel·lació, persistència i restauració per a tothom", async ({ browser }) => {
  const { cartId } = readFixtures();
  const admin = await pageAs(browser, "admin");
  await admin.goto(`/chromebooks/${cartId}`);
  const grid = admin.locator('[aria-label="Dispositius del carro"]');
  const tags = () => grid.locator('button').filter({ hasText: /^E2E-/ });
  await expect(tags()).toHaveText(["E2E-01", "E2E-02", "E2E-03", "E2E-04"]);

  await admin.getByRole("button", { name: "Ordena els dispositius" }).click();
  await admin.getByRole("button", { name: "E2E-04, posició 4" }).click();
  await admin.getByRole("button", { name: "E2E-01, posició 1" }).click();
  await expect(admin.getByRole("button", { name: "E2E-04, posició 1" })).toBeVisible();
  await admin.getByRole("button", { name: "Cancel·la", exact: true }).click();
  await expect(tags()).toHaveText(["E2E-01", "E2E-02", "E2E-03", "E2E-04"]);

  await admin.getByRole("button", { name: "Ordena els dispositius" }).click();
  // El mateix gest també funciona amb teclat, sense arrossegar.
  await admin.getByRole("button", { name: "E2E-04, posició 4" }).focus();
  await admin.keyboard.press("Enter");
  await admin.getByRole("button", { name: "E2E-01, posició 1" }).focus();
  await admin.keyboard.press("Enter");
  await admin.getByRole("button", { name: "Desa l'ordre" }).click();
  await expect(admin.getByText("Ordre dels dispositius desat")).toBeVisible();
  await admin.reload();
  await expect(tags()).toHaveText(["E2E-04", "E2E-01", "E2E-02", "E2E-03"]);

  const professor = await pageAs(browser, "professor");
  await professor.goto(`/chromebooks/${cartId}`);
  await expect(professor.getByRole("button", { name: "Ordena els dispositius" })).toHaveCount(0);
  await expect(professor.getByRole("button", { name: /^E2E-/ })).toHaveText(["E2E-04", "E2E-01", "E2E-02", "E2E-03"]);
  await professor.goto(`/q/carro/${cartId}`);
  await expect(professor.getByRole("button", { name: /^E2E-/ })).toHaveText(["E2E-04", "E2E-01", "E2E-02", "E2E-03"]);

  await admin.getByRole("button", { name: "Ordena els dispositius" }).click();
  await admin.getByRole("button", { name: "Ordre alfanumèric", exact: true }).click();
  await admin.getByRole("button", { name: "Desa l'ordre" }).click();
  await expect(admin.getByText("Ordre dels dispositius desat")).toBeVisible();
  await admin.reload();
  await expect(tags()).toHaveText(["E2E-01", "E2E-02", "E2E-03", "E2E-04"]);
  await professor.reload();
  await expect(professor.getByRole("button", { name: /^E2E-/ })).toHaveText(["E2E-01", "E2E-02", "E2E-03", "E2E-04"]);
});

test("ordena arrossegant i amb clics en una pantalla petita", async ({ browser }) => {
  const { cartId } = readFixtures();
  const admin = await pageAs(browser, "admin");
  await admin.goto(`/chromebooks/${cartId}`);
  await admin.getByRole("button", { name: "Ordena els dispositius" }).click();
  await admin.getByRole("button", { name: "E2E-01, posició 1" })
    .dragTo(admin.getByRole("button", { name: "E2E-04, posició 4" }));
  await expect(admin.getByRole("button", { name: "E2E-01, posició 4" })).toBeVisible();
  await admin.screenshot({ path: "/tmp/coordtic-order-desktop.png", fullPage: true });

  await admin.setViewportSize({ width: 390, height: 844 });
  await admin.getByRole("button", { name: "E2E-01, posició 4" }).click();
  await admin.getByRole("button", { name: "E2E-02, posició 1" }).click();
  await expect(admin.getByRole("button", { name: "E2E-01, posició 1" })).toBeVisible();
  await admin.screenshot({ path: "/tmp/coordtic-order-mobile.png", fullPage: true });
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await admin.getByRole("button", { name: "Cancel·la", exact: true }).click();
});

test("permet arrossegar directament una targeta sense activar primer el mode d'ordre", async ({ browser }) => {
  const { cartId } = readFixtures();
  const admin = await pageAs(browser, "admin");
  await admin.goto(`/chromebooks/${cartId}`);
  // El clic curt continua obrint els detalls, encara que la targeta sigui arrossegable.
  await admin.getByRole("button", { name: "E2E-04", exact: true }).click();
  await expect(admin.getByText("Historial de notes", { exact: true })).toBeVisible();
  await admin.keyboard.press("Escape");
  await admin.getByRole("button", { name: "E2E-04", exact: true })
    .dragTo(admin.getByRole("button", { name: "E2E-01", exact: true }));
  await expect(admin.getByRole("button", { name: "E2E-04, posició 1" })).toBeVisible();
  await admin.getByRole("button", { name: "Desa l'ordre" }).click();
  await expect(admin.getByText("Ordre dels dispositius desat")).toBeVisible();
  await admin.reload();
  await expect(admin.locator('[aria-label="Dispositius del carro"] button').filter({ hasText: /^E2E-/ }))
    .toHaveText(["E2E-04", "E2E-01", "E2E-02", "E2E-03"]);
});

test("accepta deixar anar el dispositiu a l'espai entre targetes", async ({ browser }) => {
  const { cartId } = readFixtures();
  const admin = await pageAs(browser, "admin");
  await admin.goto(`/chromebooks/${cartId}`);
  await admin.getByRole("button", { name: "Ordena els dispositius" }).click();
  await admin.getByRole("button", { name: "Ordre alfanumèric", exact: true }).click();
  const grid = admin.locator('[aria-label="Dispositius del carro"]');
  const gridBox = (await grid.boundingBox())!;
  const target = (await admin.getByRole("button", { name: "E2E-02, posició 2" }).boundingBox())!;
  await admin.getByRole("button", { name: "E2E-04, posició 4" }).dragTo(grid, {
    targetPosition: { x: target.x + target.width + 2 - gridBox.x, y: target.y + target.height / 2 - gridBox.y },
  });
  await expect(admin.getByRole("button", { name: "E2E-04, posició 2" })).toBeVisible();
  await admin.getByRole("button", { name: "Cancel·la", exact: true }).click();
});
