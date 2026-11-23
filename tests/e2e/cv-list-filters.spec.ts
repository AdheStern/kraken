// tests/e2e/cv-list-filters.spec.ts
// Filtros del listado de CV (AGENTS.md §5, decisión 2026-11-23): el vendedor filtra, los filtros siguen al volver
// de un CV y «Borrar filtros» los quita sin que vuelvan.
import { expect, test } from "@playwright/test";
import { storageFor } from "./users";

test.use({ storageState: storageFor("gg") });

test("los filtros se mantienen al volver de un CV y se borran con un botón", async ({
  page,
}) => {
  await page.goto("/cv");
  const seller = page.getByRole("combobox", { name: "Filtrar por vendedor" });
  await seller.click();
  await page.getByRole("option", { name: /Ana Comercial/ }).click();
  await expect(page).toHaveURL(/vendedor=/);
  await page.getByRole("searchbox", { name: "Buscar CV" }).fill("LP");
  await expect(page).toHaveURL(/q=LP/);

  await page.locator('main a[href^="/cv/"]').first().click();
  await expect(page).toHaveURL(/\/cv\/[0-9a-f-]{36}/);
  await page.getByRole("link", { name: "Control de Venta" }).first().click();
  await expect(page).toHaveURL(/vendedor=.*q=LP|q=LP.*vendedor=/);
  await expect(seller).toHaveValue(/Ana Comercial/);
  await expect(page.getByRole("searchbox", { name: "Buscar CV" })).toHaveValue(
    "LP",
  );

  await page.getByRole("button", { name: "Borrar filtros" }).click();
  await expect(page).not.toHaveURL(/vendedor=|q=/);
  await expect(seller).toHaveValue("Todos los vendedores");
  await page.goto("/cv");
  await expect(
    page.getByRole("button", { name: "Borrar filtros" }),
  ).toHaveCount(0);
  await expect(page).not.toHaveURL(/vendedor=/);
});
