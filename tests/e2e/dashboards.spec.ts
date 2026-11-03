// tests/e2e/dashboards.spec.ts
// Tableros de la F5 (AGENTS.md §6, §2.9 "Tableros", §11) con los datos demo: el GG ve todo y exporta, el gerente de
// DIMANET solo su área y sus metas, el comercial solo ventas y el ingeniero solo su operación y su desempeño, sin montos.
import { type Browser, expect, type Page, test } from "@playwright/test";
import { type E2E_USERS, storageFor } from "./users";

const YEAR = String(new Date().getFullYear());

async function as(
  browser: Browser,
  role: keyof typeof E2E_USERS,
): Promise<Page> {
  const context = await browser.newContext({ storageState: storageFor(role) });
  return context.newPage();
}

test("el GG entra al tablero de ventas, ve todas las áreas y exporta a Excel", async ({
  browser,
}) => {
  const page = await as(browser, "gg");
  await page.goto("/tableros");
  await page.waitForURL(/\/tableros\/ventas/);
  await page.goto(`/tableros/ventas?periodo=${YEAR}`);
  await expect(
    page.getByRole("heading", { name: "Tablero de ventas" }),
  ).toBeVisible();
  await expect(page.getByText(`Ventas por mes · ${YEAR}`)).toBeVisible();
  const table = page.locator("table").filter({ hasText: "Participación" });
  await expect(table.getByText("DIMANET")).toBeVisible();
  await expect(table.getByText("DIMATEL")).toBeVisible();
  await expect(page.getByText(/de la meta de US\$/)).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar a Excel" }).click();
  expect((await download).suggestedFilename()).toBe(
    `tablero-ventas-${YEAR}.xlsx`,
  );
});

test("el gerente de DIMANET solo ve las líneas de su área y define sus metas", async ({
  browser,
}) => {
  const page = await as(browser, "gerenteNet");
  await page.goto(`/tableros/ventas?periodo=${YEAR}`);
  const table = page.locator("table").filter({ hasText: "Participación" });
  await expect(table.getByText("DIMANET")).toBeVisible();
  await expect(table.getByText("DIMATEL")).toHaveCount(0);

  await page.goto(`/tableros/metas?anio=${YEAR}`);
  await expect(page.getByRole("rowheader", { name: "DIMANET" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Empresa" })).toHaveCount(0);
  await expect(page.getByLabel(`Meta de DIMANET en Ene ${YEAR}`)).toHaveValue(
    "18000.00",
  );
});

test("el comercial solo tiene el tablero de ventas", async ({ browser }) => {
  const page = await as(browser, "comercial");
  await page.goto("/tableros/ventas");
  await expect(
    page.getByRole("heading", { name: "Tablero de ventas" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Tableros" })).toHaveCount(
    0,
  );
  await page.goto("/tableros/operacion");
  await expect(page.getByText("No encontramos esta página.")).toBeVisible();
});

test("el ingeniero ve su operación y ningún monto", async ({ browser }) => {
  const page = await as(browser, "ingeniero");
  await page.goto("/tableros");
  await page.waitForURL(/\/tableros\/operacion/);
  await expect(
    page.getByRole("heading", { name: "Tablero de operación" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Elena Ingeniera (demo)" }),
  ).toBeVisible();
  // REGLA: el ingeniero nunca recibe costos ni montos, tampoco en el HTML (regla 12).
  expect(await page.content()).not.toContain("US$");
  const exported = await page.request.get("/api/dashboards/ventas/export.xlsx");
  expect(exported.status()).toBe(403);
});

test("el GG compara a los ingenieros y abre el detalle de una", async ({
  browser,
}) => {
  const page = await as(browser, "gg");
  await page.goto(`/tableros/ingenieros?periodo=${YEAR}`);
  await expect(
    page.getByRole("heading", { name: "Tablero de ingenieros" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Elena Ingeniera (demo)" }).click();
  await expect(
    page.getByText("Tiempo registrado", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Sus tickets en el periodo")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Todos los ingenieros" }),
  ).toBeVisible();
});

test("el ingeniero entra directo a su desempeño y no abre el de otro", async ({
  browser,
}) => {
  const page = await as(browser, "ingeniero");
  await page.goto("/tableros/ingenieros");
  await page.waitForURL(/\/tableros\/ingenieros\/[0-9a-f-]{36}/);
  await expect(
    page.getByText("Tiempo registrado", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Todos los ingenieros" }),
  ).toHaveCount(0);
  // REGLA: sin montos para el ingeniero (regla 12).
  expect(await page.content()).not.toContain("US$");
  await page.goto("/tableros/ingenieros/00000000-0000-7000-8000-000000000000");
  await expect(page.getByText("No encontramos esta página.")).toBeVisible();
});
