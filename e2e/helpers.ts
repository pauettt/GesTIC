import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Browser, type Page } from "@playwright/test";

import type { Fixtures, UserKey } from "./data";
import { AUTH_DIR } from "./env";

/** Fitxer de sessió d'un usuari de prova, per a `storageState`. */
export const authFile = (user: UserKey) => path.join(AUTH_DIR, `${user}.json`);

/** Identificadors de l'execució en curs. Es llegeix dins les proves, no en carregar-les. */
export function readFixtures(): Fixtures {
  return JSON.parse(readFileSync(path.join(AUTH_DIR, "fixtures.json"), "utf8"));
}

/** Una pestanya amb la sessió d'un usuari, per a les proves on hi intervé més d'un rol. */
export async function pageAs(browser: Browser, user: UserKey): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile(user) });
  return context.newPage();
}

/** La coordinació marca una incidència com a resolta des de la seva fitxa. */
export async function resolveIncident(page: Page, incidentUrl: string) {
  await page.goto(incidentUrl);
  await page.locator("#status-control").click();
  await page.getByRole("option", { name: "Resolta" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Resol/ }).click();
  // A les proves no hi ha correu configurat: l'estat es desa igualment i el
  // missatge ho diu ("Incidència resolta, però no s'ha pogut avisar…").
  await expect(page.getByText(/Incidència resolta/)).toBeVisible();
}
