import { expect, test } from "@playwright/test";

// Sense sessió, a propòsit: és com hi arribaria un cercador.
test("gesTIC no surt als cercadors", async ({ request }) => {
  const robots = await request.get("/robots.txt", { maxRedirects: 0 });
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /");

  // I si un cercador hi entra igualment, la capçalera li diu que no l'indexi.
  const login = await request.get("/login", { maxRedirects: 0 });
  expect(login.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});
