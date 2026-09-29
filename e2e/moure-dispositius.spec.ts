import { test, expect } from "@playwright/test";
import { pageAs, readFixtures } from "./helpers";

test("la coordinació mou uns quants equips a un altre carro d'un sol cop", async ({ browser }) => {
  const { moveFromCartId, moveToCartId, moveDevices } = readFixtures();
  const admin = await pageAs(browser, "admin");
  const tags = () => admin.locator('[aria-label="Dispositius del carro"]').getByRole("button", { name: /^(MOU|TRA)-/ });
  const pick = async (...assetTags: string[]) => {
    for (const assetTag of assetTags) await admin.getByRole("button", { name: assetTag, exact: true }).click();
  };

  await admin.goto(`/chromebooks/${moveFromCartId}`);
  await admin.getByRole("button", { name: "Mou a un altre carro" }).click();
  await pick("MOU-01", "MOU-03");
  await expect(admin.getByRole("button", { name: "MOU-01", pressed: true })).toBeVisible();
  await expect(admin.getByRole("button", { name: "MOU-02", pressed: false })).toBeVisible();
  // Sense triar on van, encara no es poden moure.
  await expect(admin.getByRole("button", { name: "Mou-ne 2" })).toBeDisabled();

  // Cancel·lar no en mou cap.
  await admin.getByRole("button", { name: "Cancel·la", exact: true }).click();
  await expect(tags()).toHaveText(["MOU-01", "MOU-02", "MOU-03"]);

  await admin.getByRole("button", { name: "Mou a un altre carro" }).click();
  await pick("MOU-01", "MOU-03");
  await admin.getByRole("combobox", { name: "Carro de destí" }).click();
  // El carro on ja són no hi surt.
  await expect(admin.getByRole("option", { name: "Carro Origen E2E" })).toHaveCount(0);
  await admin.getByRole("option", { name: "Carro Destí E2E" }).click();
  await admin.getByRole("button", { name: "Mou-ne 2" }).click();
  await expect(admin.getByText("2 dispositius moguts a Carro Destí E2E")).toBeVisible();
  await expect(tags()).toHaveText(["MOU-02"]);

  await admin.goto(`/chromebooks/${moveToCartId}`);
  // Arriben al final de l'ordre que el carro ja tenia desat.
  await expect(tags()).toHaveText(["TRA-01", "MOU-01", "MOU-03"]);
  await admin.goto(`/chromebooks/equips/${moveDevices["MOU-01"]}`);
  await expect(admin.getByRole("link", { name: "Carro Destí E2E" }).first()).toBeVisible();

  // El professorat veu el carro, però no pot moure'n res.
  const professor = await pageAs(browser, "professor");
  await professor.goto(`/chromebooks/${moveToCartId}`);
  await expect(professor.getByRole("heading", { name: "Carro Destí E2E" })).toBeVisible();
  await expect(professor.getByRole("button", { name: "Mou a un altre carro" })).toHaveCount(0);
});
