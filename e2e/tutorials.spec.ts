import { expect, test } from "@playwright/test";

import { TUTORIAL_VIDEOS } from "./data";
import { authFile, pageAs } from "./helpers";

test.use({ storageState: authFile("professor") });

test("el professorat troba un tutorial, el mira dins l'aplicació i el pot compartir", async ({ page }) => {
  const [classroom, chromebook] = TUTORIAL_VIDEOS;
  // Les proves no surten a internet: el reproductor de YouTube no cal que carregui.
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.abort());
  await page.goto("/tutorials");

  await expect(page.getByRole("button", { name: "Afegeix un vídeo" })).toHaveCount(0);

  // La cerca no distingeix accents ni majúscules.
  const search = page.getByPlaceholder("Cerca un vídeo…");
  await search.fill("SESSIO");
  await expect(page.getByRole("button", { name: chromebook.title })).toBeVisible();
  await expect(page.getByRole("button", { name: classroom.title })).toHaveCount(0);
  await search.fill("");

  await page.getByRole("button", { name: chromebook.category, exact: true }).click();
  await expect(page.getByRole("button", { name: classroom.title })).toHaveCount(0);
  await page.getByRole("button", { name: "Tots", exact: true }).click();

  await page.getByRole("button", { name: classroom.title }).click();
  await expect(page.getByRole("dialog").locator("iframe")).toHaveAttribute(
    "src",
    new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${classroom.youtubeId}\\?`),
  );
  await expect(page).toHaveURL(new RegExp(`/tutorials\\?v=${classroom.youtubeId}$`));

  // Enrere tanca el vídeo i deixa la llista on era.
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/tutorials$/);

  // Un enllaç compartit obre el vídeo directament, i tancar-lo el treu de l'adreça.
  await page.goto(`/tutorials?v=${chromebook.youtubeId}`);
  await expect(page.getByRole("dialog").locator("iframe")).toHaveAttribute("src", new RegExp(chromebook.youtubeId));
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/tutorials$/);
});

test("la coordinació veu on afegir i editar vídeos", async ({ browser }) => {
  const [classroom] = TUTORIAL_VIDEOS;
  const page = await pageAs(browser, "admin");
  await page.goto("/tutorials");

  await expect(page.getByRole("button", { name: "Afegeix un vídeo" })).toBeVisible();
  await expect(page.getByRole("button", { name: `Edita «${classroom.title}»` })).toBeVisible();
});
