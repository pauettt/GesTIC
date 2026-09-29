import { test, expect } from "@playwright/test";
import { BASE_URL } from "./env";
import { pageAs } from "./helpers";

test("la coordinació troba un equip pel número de sèrie i sap a quin carro i posició és", async ({ browser }) => {
  const admin = await pageAs(browser, "admin");
  await admin.goto("/chromebooks");
  await admin.getByRole("link", { name: "Dispositius" }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "Dispositius" })).toBeVisible();
  const rows = admin.getByRole("table").getByRole("row");

  // En minúscules i a mitges: el número de sèrie es copia de qualsevol lloc.
  await admin.getByLabel("Cerca un dispositiu").fill("sn-e2e");
  await admin.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(rows).toHaveCount(2);
  const found = rows.nth(1);
  await expect(found).toContainText("E2E-03");
  await expect(found).toContainText("SN-E2E-03");
  await expect(found.getByRole("link", { name: "Carro E2E" })).toBeVisible();
  await expect(found).toContainText("Edifici Nord E2E, Planta 2 E2E, Aula E2E");
  await expect(found.getByRole("cell").nth(4)).toHaveText("3");
  await found.getByRole("link", { name: "E2E-03" }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "E2E-03" })).toBeVisible();
  await admin.goBack();

  // Els del préstec a l'alumnat també hi són, amb la seva fitxa.
  await admin.getByLabel("Cerca un dispositiu").fill("SN-ALU");
  await admin.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("Préstec a l'alumnat");

  // Per carro, sense cerca: qui té un equip reservat surt a l'estat.
  await admin.getByRole("link", { name: "Neteja la cerca" }).click();
  await admin.getByRole("combobox", { name: "On és" }).click();
  await admin.getByRole("option", { name: "Carro Reserves E2E" }).click();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("RES-01");
  await expect(rows.nth(2)).toContainText("La té Professora Dos");
  await expect(admin.getByRole("status")).toHaveText(/^2 de \d+ dispositius$/);

  // El professorat no hi entra.
  const professor = await pageAs(browser, "professor");
  await professor.goto("/chromebooks");
  await expect(professor.getByRole("link", { name: "Dispositius" })).toHaveCount(0);
  await professor.goto("/chromebooks/equips");
  await expect(professor).toHaveURL(`${BASE_URL}/`);
});
