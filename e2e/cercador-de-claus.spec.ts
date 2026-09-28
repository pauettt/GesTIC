import { expect, test } from "@playwright/test";

import { pageAs } from "./helpers";

test("consergeria troba una clau pel número o per l'aula, i el professor pel nom", async ({ browser }) => {
  const concierge = await pageAs(browser, "concierge");

  // Dues claus només d'aquesta prova, amb números que l'ordre alfabètic
  // capgiraria: la 4 ha de sortir abans que la 14.
  await concierge.goto("/consergeria/claus");
  for (const [number, name] of [
    ["Q-14", "Laboratori E2E"],
    ["Q-4", "Aula de Música E2E"],
  ]) {
    await concierge.getByRole("button", { name: "Nova clau" }).click();
    const keyDialog = concierge.getByRole("dialog");
    await keyDialog.getByLabel("Número").fill(number);
    await keyDialog.getByLabel("A què obre").fill(name);
    await keyDialog.getByRole("button", { name: "Desa" }).click();
    await expect(concierge.getByText("Clau creada")).toBeVisible();
    await expect(keyDialog).toHaveCount(0);
  }

  // A la gestió, sense accents ni majúscules.
  const search = concierge.getByLabel("Cerca una clau");
  const rows = concierge.locator("tbody tr");
  await search.fill("musica");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Q-4");
  await search.fill("q-");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Q-4");
  await expect(rows.nth(1)).toContainText("Q-14");
  await search.fill("no existeix");
  await expect(concierge.getByText("Cap clau amb «no existeix».")).toBeVisible();

  // A l'entrega sense reserva, la clau per l'aula i el professor pel nom.
  await concierge.goto("/consergeria");
  await concierge.getByRole("button", { name: "Entrega sense reserva" }).click();
  const deliver = concierge.getByRole("dialog");
  await deliver.getByLabel("Quina clau?").fill("laboratori");
  await expect(concierge.getByRole("option")).toHaveCount(1);
  await concierge.getByRole("option", { name: /^Q-14 — Laboratori E2E/ }).click();
  await deliver.getByLabel("A qui?").fill("dos");
  await expect(concierge.getByRole("option")).toHaveCount(1);
  await concierge.getByRole("option", { name: "Professora Dos" }).click();
  await deliver.getByRole("button", { name: "Conserge E2E" }).click();
  await deliver.getByRole("button", { name: "Entrega la clau" }).click();
  await expect(concierge.getByText("Clau entregada")).toBeVisible();

  // Es torna, perquè les altres proves trobin totes les claus al taulell.
  const outRow = concierge.locator("tr", { hasText: "Q-14" });
  await expect(outRow).toContainText("Professora Dos");
  await outRow.getByRole("button", { name: "Tornada" }).click();
  await concierge.getByRole("dialog").getByRole("button", { name: "Conserge E2E" }).click();
  await expect(concierge.getByText("Clau tornada")).toBeVisible();
});
