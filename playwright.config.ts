import { defineConfig, devices } from "@playwright/test";

import { BASE_URL, E2E_DATABASE_URL, E2E_PORT, E2E_VAULT_KEY, assertLocalDatabase } from "./e2e/env";

// Abans de res: les proves buiden la base de dades on s'executen. Si l'adreça no
// és local i de proves, no s'arrenca ni el servidor.
assertLocalDatabase(E2E_DATABASE_URL);

/**
 * Proves end-to-end contra el build de producció, en local i amb un PostgreSQL
 * local que es buida i es torna a omplir a cada execució (e2e/global-setup.ts).
 * No envien cap correu ni pugen cap fitxer.
 *
 * Només Chromium: és el navegador dels Chromebooks i el que fa servir el claustre.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Totes les proves comparteixen la mateixa base de dades: una darrere l'altra.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "ca-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
  },
  projects: [
    // Comprova que el servidor llegeix la base de dades de proves. Si no, no
    // s'executa cap altra prova.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${E2E_PORT}`,
    url: `${BASE_URL}/login`,
    timeout: 300_000,
    // Mai no s'aprofita un servidor que ja estigui en marcha: podria ser un de
    // desenvolupament connectat a les dades reals.
    reuseExistingServer: false,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      DIRECT_URL: E2E_DATABASE_URL,
      // Buides a propòsit. Next no omple amb el .env les variables que ja
      // existeixen, encara que siguin buides: sense SMTP ni token de Blob, les
      // proves no poden enviar correus ni pujar fitxers.
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      BLOB_READ_WRITE_TOKEN: "",
      APP_URL: "",
      ENABLE_DEV_LOGIN: "",
      // La de les proves, mai la del .env: amb la real, les dades de prova es
      // xifrarien amb la clau que protegeix les contrasenyes del centre.
      VAULT_ENCRYPTION_KEY: E2E_VAULT_KEY,
      AUTH_TRUST_HOST: "true",
    },
  },
});
