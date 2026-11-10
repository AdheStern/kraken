// tests/e2e/cv-grid-bulk.spec.ts
// Grilla del CV (AGENTS.md §2.1): BC y PO# son columnas opcionales que aparecen al marcarlas, y una columna
// desplegable se aplica a todas las líneas desde su encabezado o a las de un lote desde la fila del lote.
import { expect, type Page, test } from "@playwright/test";
import { storageFor } from "./users";

test.use({ storageState: storageFor("comercial") });

async function pick(page: Page, id: string, text: string) {
  await page.locator(`#${id}`).fill(text);
  await page
    .getByRole("option", { name: new RegExp(text) })
    .first()
    .click();
}

test("columnas opcionales y aplicar un área a todas las líneas", async ({
  page,
}) => {
  await page.goto("/cv");
  await page.getByRole("button", { name: "Nuevo CV" }).click();
  await pick(page, "new-cv-city", "La Paz");
  await pick(page, "new-cv-customer", "Banco Andino");
  await page.locator("#new-cv-title").fill(`CV grilla E2E ${Date.now()}`);
  await page.getByRole("button", { name: "Crear CV" }).click();
  await expect(page).toHaveURL(/\/cv\/[0-9a-f-]{36}$/);

  const addLine = page.getByRole("button", { name: "Línea", exact: true });
  await addLine.click();
  await addLine.click();
  await addLine.click();
  const grid = page.locator("table");
  await expect(grid.getByRole("columnheader", { name: "BC" })).toHaveCount(0);
  await expect(grid.getByRole("columnheader", { name: "PO#" })).toHaveCount(0);

  await page.getByRole("button", { name: "Columnas opcionales" }).click();
  await page.getByRole("menuitemcheckbox", { name: "BC" }).click();
  await page.keyboard.press("Escape");
  await expect(grid.getByRole("columnheader", { name: "BC" })).toBeVisible();
  await expect(grid.getByRole("textbox", { name: "BC" })).toHaveCount(3);

  await page
    .getByRole("button", { name: "Área: aplicar a todas las líneas" })
    .click();
  await page.getByLabel("Área para aplicar").click();
  await page.getByRole("option", { name: /DIMANET/ }).click();
  await page
    .getByRole("button", { name: "Aplicar a todas", exact: true })
    .click();
  await expect(page.getByText("Área: se aplicó a 3 líneas.")).toBeVisible();
  const areas = grid.getByRole("combobox", { name: "Área", exact: true });
  await expect(areas).toHaveCount(3);
  for (const area of await areas.all())
    await expect(area).toHaveValue(/DIMANET/);

  await page.getByRole("button", { name: "Lote", exact: true }).click();
  await page
    .getByRole("button", { name: "Aplicar un valor a las líneas de LOTE 1" })
    .click();
  await page.getByLabel("Columna", { exact: true }).click();
  await page.getByRole("option", { name: "Tipo", exact: true }).click();
  await page.getByLabel("Tipo para aplicar").click();
  await page.getByRole("option", { name: "Servicio" }).click();
  await page
    .getByRole("button", { name: "Solo a las vacías", exact: true })
    .click();
  await expect(
    page.getByText("Tipo: se aplicó a 1 línea de LOTE 1."),
  ).toBeVisible();
  const types = grid.getByRole("combobox", { name: "Tipo", exact: true });
  await expect(types.last()).toHaveValue("Servicio");
  await expect(types.first()).not.toHaveValue("Servicio");
});
