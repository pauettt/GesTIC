import { expect, test } from "@playwright/test";
import { Client } from "pg";

import { E2E_DATABASE_URL } from "./env";
import { pageAs } from "./helpers";

test("si un correu no surt, la coordinació ho veu al panell i el pot donar per revisat", async ({ browser }) => {
  // Les proves no envien correus (SMTP buit): la fallada s'apunta a mà, com ho
  // faria `sendEmail` si el servidor de correu la rebutgés.
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO "EmailFailure" (id, subject, recipients, reason)
       VALUES ('fallada-e2e', 'Nova incidència (alta): Projector E2E', 2, 'Invalid login: 535-5.7.8 Username and Password not accepted')`,
    );
  } finally {
    await client.end();
  }

  const admin = await pageAs(browser, "admin");
  await admin.goto("/panell");
  const alert = admin.getByRole("alert").filter({ hasText: "no ha sortit" });
  await expect(alert).toContainText("Un correu no ha sortit");
  await expect(alert).toContainText("Nova incidència (alta): Projector E2E");
  await expect(alert).toContainText("Invalid login");

  // També a Administració, on hi ha el correu de prova per comprovar-ho.
  const superAdmin = await pageAs(browser, "superAdmin");
  await superAdmin.goto("/administracio");
  await expect(superAdmin.getByRole("alert").filter({ hasText: "no ha sortit" })).toBeVisible();

  await alert.getByRole("button", { name: "Ja està revisat" }).click();
  await expect(admin.getByText("Avís de correus tret")).toBeVisible();
  await expect(admin.getByRole("alert").filter({ hasText: "no ha sortit" })).toHaveCount(0);
});
