import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";

import { USERS } from "./data";
import { assertLocalDatabase, E2E_DATABASE_URL } from "./env";
import { authFile, pageAs } from "./helpers";

test.use({ storageState: authFile("admin") });

test("els avisos de préstec porten a la gestió concreta i el resum a la seva secció", async ({ page, browser }) => {
  // Préstecs propis sobre un equip i un usuari de les fixtures: cap altra prova
  // depèn del seu estat, i es retiren encara que la navegació falli.
  assertLocalDatabase(E2E_DATABASE_URL);
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  const pendingId = `navegacio-pendent-${randomUUID()}`;
  const overdueId = `navegacio-retard-${randomUUID()}`;
  await client.connect();

  try {
    const { rows: [fixture] } = await client.query<{ itemId: string; requesterId: string }>(
      `SELECT i.id AS "itemId", u.id AS "requesterId"
       FROM "InventoryItem" i CROSS JOIN "User" u
       WHERE i.model = 'ThinkPad E2E' AND u.email = $1`,
      [USERS.professor2.email],
    );
    expect(fixture).toBeDefined();
    await client.query(
      `INSERT INTO "LoanRequest" (id, "itemId", "requesterId", "startDate", "endDate", status, purpose)
       VALUES ($1, $3, $4, NOW() + INTERVAL '10 days', NOW() + INTERVAL '11 days', 'PENDENT', 'Navegació E2E pendent'),
              ($2, $3, $4, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', 'APROVADA', 'Navegació E2E retorn')`,
      [pendingId, overdueId, fixture.itemId, fixture.requesterId],
    );

    for (const [id, action, section] of [
      [pendingId, "Aprova", "prestecs-pendents"],
      [overdueId, "Marca com retornat", "prestecs-actius"],
    ] as const) {
      await page.goto("/panell");
      await page.locator(`a[href="/inventari#prestec-${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/inventari#prestec-${id}$`));
      const target = page.locator(`#${section} tr:target`);
      await expect(target).toHaveAttribute("id", `prestec-${id}`);
      await expect(target).toContainText("Professora Dos");
      await expect(target).toHaveCSS("outline-width", "2px");
      await expect(target.getByRole("button", { name: action, exact: true })).toBeInViewport();
      // El capçal fix no ha de tapar la fila on s'ha arribat.
      const header = await page.locator("header").boundingBox();
      const row = await target.boundingBox();
      expect(row!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    }

    for (const section of ["prestecs-pendents", "prestecs-actius"]) {
      await page.goto("/");
      const summary = page.locator('[data-slot="card"]', {
        has: page.getByRole("heading", { name: "Feina pendent" }),
      });
      await summary.locator(`a[href="/inventari#${section}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/inventari#${section}$`));
      await expect(page.locator("section:target")).toHaveAttribute("id", section);
      await expect(page.locator(`#${section}`).getByRole("heading")).toBeInViewport();
    }

    // Conèixer l'ancoratge no dona accés a la gestió de coordinació.
    const professor = await pageAs(browser, "professor");
    await professor.goto(`/inventari#prestec-${pendingId}`);
    await expect(professor.getByRole("heading", { name: "Préstec de material", exact: true })).toBeVisible();
    await expect(professor.locator("#prestecs-pendents, #prestecs-actius")).toHaveCount(0);
    await expect(professor.getByRole("button", { name: "Aprova", exact: true })).toHaveCount(0);
    await professor.context().close();
  } finally {
    try {
      await client.query('DELETE FROM "LoanRequest" WHERE id IN ($1, $2)', [pendingId, overdueId]);
    } finally {
      await client.end();
    }
  }
});
