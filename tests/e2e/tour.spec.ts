// tests/e2e/tour.spec.ts
// Recorrido guiado (driver.js, decisión 2026-11-05): el botón «Recorrido» lo abre en Inicio, recorre los pasos
// del rol y se cierra con Escape.
import { expect, test } from "@playwright/test";
import { storageFor } from "./users";

test.use({ storageState: storageFor("comercial") });

test("el recorrido de Inicio se abre a pedido y avanza", async ({ page }) => {
  await page.goto("/inicio");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Recorrido" }).click();
  const popover = page.locator(".driver-popover");
  await expect(popover.getByText("Bienvenido a Kraken")).toBeVisible();
  await popover.getByRole("button", { name: "Siguiente" }).click();
  await expect(popover.getByText("Tus módulos")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
});
