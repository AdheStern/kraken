// tests/e2e/shortcuts.spec.ts
// Atajos de teclado (decisión 2026-11-05): «?» abre el resumen con los atajos que valen en la pantalla, «G + letra»
// lleva al módulo, mientras se escribe en un campo las teclas sueltas no navegan y Ctrl+K ejecuta las acciones de la
// pantalla (decisión 2026-11-07).
import { expect, test } from "@playwright/test";
import { storageFor } from "./users";

test.use({ storageState: storageFor("comercial") });

test("«?» muestra los atajos y «G C» lleva a Control de Venta", async ({
  page,
}) => {
  await page.goto("/ayuda");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Shift+?");
  const dialog = page.getByRole("dialog", { name: "Atajos de teclado" });
  await expect(dialog.getByText("Ir a Control de Venta")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.keyboard.press("g");
  await page.keyboard.press("c");
  await page.waitForURL(/\/cv$/);
});

test("escribir «gc» en un campo no navega", async ({ page }) => {
  await page.goto("/cv");
  await page.waitForLoadState("networkidle");
  const search = page.getByRole("searchbox").first();
  await search.fill("");
  await search.press("g");
  await search.press("t");
  await expect(page).toHaveURL(/\/cv/);
  await expect(search).toHaveValue("gt");
});

test("Ctrl+K busca un CV por su cliente y lo abre con Enter", async ({
  page,
}) => {
  await page.goto("/inicio");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("combobox", { name: "Buscar en Kraken" });
  await search.fill("Minera");
  const results = page.getByRole("group", { name: "Control de Venta" });
  await expect(results.getByRole("option").first()).toBeVisible();
  await results.getByRole("option").first().click();
  await page.waitForURL(/\/cv\/[0-9a-f-]{36}$/);
});

test("Ctrl+K ejecuta una acción de la pantalla: Nuevo CV", async ({ page }) => {
  await page.goto("/cv");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("combobox", { name: "Buscar en Kraken" });
  await search.fill("nuevo cv");
  await expect(
    page.getByRole("group", { name: "Acciones" }).getByRole("option"),
  ).toHaveText(/Nuevo CV/);
  await search.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Nuevo Control de Venta" }),
  ).toBeVisible();
});

test("en el CV, Alt+N abre el alta y en el editor agrega una línea", async ({
  page,
}) => {
  await page.goto("/cv");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Alt+n");
  await expect(
    page.getByRole("dialog", { name: "Nuevo Control de Venta" }),
  ).toBeVisible();
  await page.locator("#new-cv-city").fill("La Paz");
  await page
    .getByRole("option", { name: /La Paz/ })
    .first()
    .click();
  await page.locator("#new-cv-customer").fill("Banco Andino");
  await page
    .getByRole("option", { name: /Banco Andino/ })
    .first()
    .click();
  await page.locator("#new-cv-title").fill(`CV atajos E2E ${Date.now()}`);
  await page.getByRole("button", { name: "Crear CV" }).click();
  await page.waitForURL(/\/cv\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");

  // POR QUÉ: tras crear, el editor llega por streaming; los atajos valen cuando la barra ya está.
  await expect(page.getByRole("button", { name: "Lote" })).toBeVisible();
  const rows = page.locator("tr[data-line-key]");
  await expect(rows).toHaveCount(0);
  await page.keyboard.press("Alt+n");
  await page.keyboard.press("Alt+n");
  await expect(rows).toHaveCount(2);
});
