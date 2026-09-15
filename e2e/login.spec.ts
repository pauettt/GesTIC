import { expect, test } from "@playwright/test";

// Un doble toc començava dues entrades amb Google, i la segona feia fallar la
// primera (vegeu `GoogleSignInButton`). El botó ha de quedar aturat des del
// primer toc.
test("el botó d'entrar amb Google queda aturat des del primer toc", async ({ page }) => {
  // L'acció d'entrar no rep mai resposta: així el botó es queda pendent i la prova
  // no surt cap a Google.
  await page.route("**/login", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Inicia sessió amb Google" }).dblclick();
  await expect(page.getByRole("button", { name: "Obrint Google…" })).toBeDisabled();

  await page.unrouteAll({ behavior: "ignoreErrors" });
});
