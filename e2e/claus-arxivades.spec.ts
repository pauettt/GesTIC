import { expect, test } from "@playwright/test";

import { pageAs } from "./helpers";

test("una clau que ja no es fa servir s'arxiva: surt del taulell, en queda l'historial i es recupera", async ({
  browser,
}) => {
  const concierge = await pageAs(browser, "concierge");

  // Una clau només d'aquesta prova: la del carro la fan servir les de reserves.
  await concierge.goto("/consergeria/claus");
  await concierge.getByRole("button", { name: "Nova clau" }).click();
  const keyDialog = concierge.getByRole("dialog");
  await keyDialog.getByLabel("Número").fill("Z-E2E");
  await keyDialog.getByLabel("A què obre").fill("Magatzem E2E");
  await keyDialog.getByRole("button", { name: "Desa" }).click();
  await expect(concierge.getByText("Clau creada")).toBeVisible();

  // Es deixa i es torna: ja té historial.
  await concierge.goto("/consergeria");
  await concierge.getByRole("button", { name: "Entrega sense reserva" }).click();
  const deliver = concierge.getByRole("dialog");
  await deliver.getByLabel("Quina clau?").click();
  await concierge.getByRole("option", { name: /^Z-E2E — Magatzem E2E/ }).click();
  await deliver.getByLabel("A qui?").click();
  await concierge.getByRole("option", { name: "Professor Un" }).click();
  await deliver.getByRole("button", { name: "Conserge E2E" }).click();
  await deliver.getByRole("button", { name: "Entrega la clau" }).click();
  await expect(concierge.getByText("Clau entregada")).toBeVisible();
  const outRow = concierge.locator("tr", { hasText: "Z-E2E" });
  await expect(outRow).toContainText("Professor Un");
  await outRow.getByRole("button", { name: "Tornada" }).click();
  await concierge.getByRole("dialog").getByRole("button", { name: "Conserge E2E" }).click();
  await expect(concierge.getByText("Clau tornada")).toBeVisible();

  // Amb historial ja no es pot esborrar, però sí arxivar.
  await concierge.goto("/consergeria/claus");
  const row = concierge.locator("tr", { hasText: "Z-E2E" });
  await expect(row.getByRole("button", { name: "Elimina" })).toHaveCount(0);
  await row.getByRole("button", { name: "Arxiva" }).click();
  await expect(concierge.getByText("Clau Z-E2E arxivada")).toBeVisible();
  const archived = concierge.getByRole("region", { name: "Claus arxivades" });
  await expect(archived.locator("tr", { hasText: "Z-E2E" })).toBeVisible();

  // Ja no s'ofereix per entregar...
  await concierge.goto("/consergeria");
  await concierge.getByRole("button", { name: "Entrega sense reserva" }).click();
  await concierge.getByRole("dialog").getByLabel("Quina clau?").click();
  await expect(concierge.getByRole("option", { name: /^C-E2E/ })).toBeVisible();
  await expect(concierge.getByRole("option", { name: /^Z-E2E/ })).toHaveCount(0);

  // ...però l'historial la continua ensenyant, marcada.
  await concierge.goto("/consergeria/historial");
  const loanRow = concierge.locator("tr", { hasText: "Z-E2E" });
  await expect(loanRow).toContainText("Magatzem E2E · arxivada");
  await expect(loanRow).toContainText("Professor Un");

  // I si torna a fer falta, es recupera.
  await concierge.goto("/consergeria/claus");
  await archived.locator("tr", { hasText: "Z-E2E" }).getByRole("button", { name: "Recupera" }).click();
  await expect(concierge.getByText("Clau Z-E2E recuperada")).toBeVisible();
  await expect(archived).toHaveCount(0);
  await expect(concierge.locator("tr", { hasText: "Z-E2E" }).getByRole("button", { name: "Arxiva" })).toBeVisible();
});
