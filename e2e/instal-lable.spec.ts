import { expect, test } from "@playwright/test";

// Sense sessió, a propòsit: qui escaneja el cartell encara no ha entrat, i el
// mòbil demana el manifest i les icones des de la pantalla d'inici de sessió. Si
// el Proxy les enviés a /login, gesTIC no es podria instal·lar.
test("gesTIC es pot afegir a la pantalla d'inici abans d'haver entrat", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  const response = await request.get(manifestHref!, { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: "gesTIC", start_url: "/", display: "standalone" });
  // Els accessos directes de la icona porten on diuen.
  expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual([
    "/incidencies/nova",
    "/chromebooks",
  ]);

  const iconHrefs = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
  expect(iconHrefs.length).toBeGreaterThan(0);

  for (const src of [...manifest.icons.map((icon: { src: string }) => icon.src), ...iconHrefs]) {
    const icon = await request.get(src, { maxRedirects: 0 });
    expect(icon.status(), src).toBe(200);
    expect(icon.headers()["content-type"], src).toMatch(/^image\//);
  }
});
