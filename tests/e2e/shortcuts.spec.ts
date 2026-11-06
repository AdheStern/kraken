// tests/e2e/shortcuts.spec.ts
// Atajos de teclado (decisión 2026-11-05): «?» abre el resumen con los atajos que valen en la pantalla, «G» y
// luego una letra lleva al módulo, y mientras se escribe en un campo las teclas sueltas no navegan.
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
