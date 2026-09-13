import { expect, test as setup } from "@playwright/test";

import { authFile } from "./helpers";

// Si el servidor de proves no llegeix la base de dades de proves —per exemple,
// perquè ha agafat les variables del .env—, la sessió de prova no hi existeix i
// la pàgina porta a /login. Llavors aquesta prova falla i no s'executa cap de
// les altres: no han de poder escriure mai a les dades reals.
setup("el servidor de proves fa servir la base de dades de proves", async ({ browser }) => {
  const context = await browser.newContext({ storageState: authFile("professor") });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hola, Professor" })).toBeVisible();
  await context.close();
});
