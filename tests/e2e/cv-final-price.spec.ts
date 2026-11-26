// tests/e2e/cv-final-price.spec.ts
// Precio final del CV (AGENTS.md §2.3, decisión 2026-11-19): el GG lo fija con confirmación sin tocar el calculado,
// Administración lo ve y lo cambia en el borrador, y el comercial no tiene el botón. El diálogo abre con el total
// vigente, los Bs siguen al USD hasta que se editen y los montos se escriben con separador de miles.
import { type Browser, expect, type Page, test } from "@playwright/test";
import { type E2E_USERS, storageFor } from "./users";

test.describe.configure({ mode: "serial" });

let cvPath = "";
const title = `CV precio final ${Date.now()}`;

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

const totals = (page: Page) =>
  page.getByRole("complementary", { name: "Totales del CV" });

test("el comercial crea un CV y no puede fijar el precio final", async ({
  browser,
}) => {
  const page = await as(browser, "comercial");
  await page.goto("/cv");
  await page.getByRole("button", { name: "Nuevo CV" }).click();
  await pick(page, "new-cv-city", "La Paz");
  await pick(page, "new-cv-customer", "Banco Andino");
  await page.locator("#new-cv-title").fill(title);
  await page.getByRole("button", { name: "Crear CV" }).click();
  await expect(page).toHaveURL(/\/cv\/[0-9a-f-]{36}$/);
  cvPath = new URL(page.url()).pathname;
  await expect(totals(page).getByText("Venta total")).toBeVisible();
  await expect(
    totals(page).getByRole("button", { name: /precio final/i }),
  ).toHaveCount(0);
});

test("el GG fija el precio final tras confirmar", async ({ browser }) => {
  const page = await as(browser, "gg");
  await page.goto(cvPath);
  await totals(page).getByRole("button", { name: "Precio final" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Precio final USD")).toHaveValue("0.00");
  await expect(dialog.getByLabel("Precio final Bs")).toHaveValue("0.00");
  const usd = dialog.getByLabel("Precio final USD");
  await usd.fill("");
  await usd.pressSequentially("1234567.89");
  await expect(usd).toHaveValue("1,234,567.89");
  await usd.fill("");
  await usd.pressSequentially("12,5");
  await expect(usd).toHaveValue("12.5");
  await usd.fill("12500");
  await expect(dialog.getByLabel("Precio final Bs")).not.toHaveValue("0.00");
  await expect(dialog.getByText(/Los Bs siguen al USD/)).toBeVisible();
  await dialog.getByLabel("Motivo").fill("Redondeo acordado con el cliente");
  await dialog.getByRole("button", { name: "Revisar" }).click();
  await expect(
    dialog.getByText("¿Estás seguro de que deseas cambiar el precio final?"),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Sí, cambiar el precio final" })
    .click();
  await expect(dialog).toBeHidden();
  await expect(totals(page).getByText("Ajustado")).toBeVisible();
  await expect(totals(page).getByText("USD 12,500.00")).toBeVisible();
  await expect(totals(page).getByText(/Calculado por líneas/)).toBeVisible();

  await page.goto(`/cv?q=${encodeURIComponent(title)}`);
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toContainText("12,500.00");
  await expect(row.getByText("Ajustado")).toBeVisible();
});

test("Administración ve el borrador y cambia el precio final", async ({
  browser,
}) => {
  const page = await as(browser, "administracion");
  await page.goto(cvPath);
  await expect(totals(page).getByText("USD 12,500.00")).toBeVisible();
  await totals(page)
    .getByRole("button", { name: "Cambiar precio final" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Precio final USD")).toHaveValue("12,500.00");
  await dialog.getByLabel("Precio final USD").fill("");
  await dialog.getByLabel("Precio final Bs").fill("87000");
  await dialog.getByLabel("Motivo").fill("Redondeo de la factura en Bs");
  await dialog.getByRole("button", { name: "Revisar" }).click();
  await dialog
    .getByRole("button", { name: "Sí, cambiar el precio final" })
    .click();
  await expect(dialog).toBeHidden();
  await expect(totals(page).getByText("Bs 87,000.00")).toBeVisible();
});
