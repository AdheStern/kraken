// tests/e2e/cv-customer-change.spec.ts
// Cambio del cliente de un CV (AGENTS.md §2.3, decisión 2026-11-12): el comercial crea un CV y solo el administrador
// del sistema lo encuentra en /admin/cv-cliente y le cambia el cliente; Administración no entra a esa pantalla.
import { type Browser, expect, type Page, test } from "@playwright/test";
import { type E2E_USERS, storageFor } from "./users";

test.describe.configure({ mode: "serial" });

const STAMP = Date.now();
let cvCode = "";

async function as(
  browser: Browser,
  role: keyof typeof E2E_USERS,
): Promise<Page> {
  const context = await browser.newContext({ storageState: storageFor(role) });
  return context.newPage();
}

async function pick(page: Page, id: string, text: string) {
  await page.locator(`#${id}`).fill(text);
  await page
    .getByRole("option", { name: new RegExp(text) })
    .first()
    .click();
}

test("el comercial crea un CV de Banco Andino", async ({ browser }) => {
  const page = await as(browser, "comercial");
  await page.goto("/cv");
  await page.getByRole("button", { name: "Nuevo CV" }).click();
  await pick(page, "new-cv-city", "La Paz");
  await pick(page, "new-cv-customer", "Banco Andino");
  await page.locator("#new-cv-title").fill(`CV cliente E2E ${STAMP}`);
  await page.getByRole("button", { name: "Crear CV" }).click();
  await expect(page).toHaveURL(/\/cv\/[0-9a-f-]{36}$/);
  cvCode = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  expect(cvCode).toMatch(/^\d+LP-\d{2}$/);
});

test("el administrador del sistema le cambia el cliente", async ({
  browser,
}) => {
  const page = await as(browser, "admin");
  await page.goto(`/admin/cv-cliente?q=${encodeURIComponent(cvCode)}`);
  const row = page.getByRole("listitem").filter({ hasText: cvCode });
  await expect(row).toContainText("Cliente: Banco Andino");
  await row.getByRole("button", { name: "Cambiar cliente" }).click();
  const dialog = page.getByRole("dialog");
  await pick(page, `cv-customer-${await cvId(page)}`, "Minera Illimani");
  await dialog.getByLabel(/Motivo/).fill("Se creó con el cliente equivocado");
  await dialog.getByRole("button", { name: "Cambiar cliente" }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toContainText("Cliente: Minera Illimani");
});

test("Administración no entra a la pantalla", async ({ browser }) => {
  const page = await as(browser, "administracion");
  await page.goto(`/admin/cv-cliente?q=${cvCode}`);
  await expect(page.getByText("No encontramos esta página.")).toBeVisible();
  await expect(page.getByText("Cambiar cliente")).toHaveCount(0);
});

// POR QUÉ: el combobox lleva el id del CV para no repetir ids entre filas.
async function cvId(page: Page): Promise<string> {
  const id = await page
    .getByRole("dialog")
    .locator('input[id^="cv-customer-"]')
    .first()
    .getAttribute("id");
  return (id ?? "").replace("cv-customer-", "");
}
