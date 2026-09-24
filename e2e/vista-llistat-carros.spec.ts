import { expect, test } from "@playwright/test";
import { pageAs } from "./helpers";

test("vista de llistat al menú dels carros per al professorat", async ({ browser }) => {
  const professor = await pageAs(browser, "professor");
  await professor.goto("/chromebooks");

  // El menú dels carros conté el botó per canviar a la vista de llistat
  const listButton = professor.getByRole("link", { name: "Vista de llistat" });
  await expect(listButton).toBeVisible();

  // Canviem a la vista de llistat
  await listButton.click();
  await expect(professor).toHaveURL(/\/chromebooks(\?vista=llistat|\/llistat)/);

  // La vista de llistat mostra les columnes d'interès per al professorat:
  // Carro i aula, Clau, Equips, Disponibilitat, Previsió, Acció
  await expect(professor.getByRole("columnheader", { name: "Carro i aula" })).toBeVisible();
  await expect(professor.getByRole("columnheader", { name: "Clau" })).toBeVisible();
  await expect(professor.getByRole("columnheader", { name: "Equips" })).toBeVisible();
  await expect(professor.getByRole("columnheader", { name: "Disponibilitat ara" })).toBeVisible();
  await expect(professor.getByRole("columnheader", { name: "Previsió d'avui" })).toBeVisible();
  await expect(professor.getByRole("columnheader", { name: "Acció" })).toBeVisible();

  // Hi ha botons de reserva directa per a cada carro
  const reserveButtons = professor.getByRole("link", { name: "Reserva" });
  await expect(reserveButtons.first()).toBeVisible();

  // El filtre ràpid permet cercar per nom de carro o aula
  const searchInput = professor.getByLabel("Filtra la llista de carros");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("E2E");
  await expect(professor.getByText("Carro E2E")).toBeVisible();

  // El menú ara ofereix tornar a la vista de targetes
  const cardsButton = professor.getByRole("link", { name: "Vista de targetes" });
  await expect(cardsButton).toBeVisible();
  await cardsButton.click();
  await expect(professor.getByRole("link", { name: "Vista de llistat" })).toBeVisible();

  // Accés directe a la ruta /chromebooks/llistat
  await professor.goto("/chromebooks/llistat");
  await expect(professor.getByRole("columnheader", { name: "Carro i aula" })).toBeVisible();
});
