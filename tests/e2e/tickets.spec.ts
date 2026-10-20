// tests/e2e/tickets.spec.ts
// Recorrido de la F3 (AGENTS.md §11): el coordinador crea un ticket y le suma la bolsa del CV de saldo inicial
// aprobado del seed; la ingeniera trabaja con el contador y lo resuelve; el coordinador lo cierra y ve el descuento
// redondeado a 30 min (§2.6).
import { type Browser, expect, type Page, test } from "@playwright/test";
import { storageFor } from "./users";

test.describe.configure({ mode: "serial" });

const TITLE = `E2E ${Date.now()}`;
let ticketUrl = "";

async function as(
  browser: Browser,
  role: "coordinador" | "ingeniero",
): Promise<Page> {
  const context = await browser.newContext({ storageState: storageFor(role) });
  return context.newPage();
}

async function pick(page: Page, id: string, text: string) {
  await page.locator(`#${id}`).fill(text);
  // POR QUÉ: la lista se filtra al escribir; se espera la opción en lugar de confiar en el Enter.
  await page
    .getByRole("option", { name: new RegExp(text) })
    .first()
    .click();
}

test("el coordinador crea el ticket con encargado y le suma una bolsa", async ({
  browser,
}) => {
  const page = await as(browser, "coordinador");
  await page.goto("/tickets");
  await page.getByRole("button", { name: "Nuevo ticket" }).click();
  await pick(page, "new-ticket-customerId", "Banco Andino");
  await pick(page, "new-ticket-cityId", "La Paz");
  await pick(page, "new-ticket-areas", "DIMAHELP");
  await page.locator("#new-ticket-title").fill(TITLE);
  await page
    .locator("#new-ticket-description")
    .fill("Prueba de punta a punta.");
  await pick(page, "new-ticket-ownerId", "Elena");
  await page.getByRole("button", { name: "Crear ticket" }).click();
  await page.waitForURL(/\/tickets\/[0-9a-f-]{36}$/);
  ticketUrl = new URL(page.url()).pathname;
  await expect(
    page.getByRole("heading", { level: 1, name: TITLE }),
  ).toBeVisible();

  await page.goto("/tickets");
  const card = page.locator("li", { hasText: TITLE });
  await card.getByRole("button", { name: /Cambiar el estado/ }).click();
  await expect(page.getByRole("menuitem", { name: "Trabajar" })).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Cancelar ticket" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto(ticketUrl);
  await page.getByRole("tab", { name: /Bolsas/ }).click();
  await page.getByLabel("Sumar una bolsa").click();
  await page
    .getByRole("option", { name: /Soporte 8x5/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Guardar orden" }).click();
  await expect(page.getByRole("button", { name: "Guardar orden" })).toHaveCount(
    0,
  );
});

test("la ingeniera usa el contador y lo resuelve", async ({ browser }) => {
  const page = await as(browser, "ingeniero");
  await page.goto(ticketUrl);
  await page.getByRole("button", { name: "Iniciar" }).click();
  await expect(page.getByText(/^Corriendo/)).toBeVisible();
  await page.getByRole("button", { name: "Terminar" }).click();
  await expect(page.getByText(/^Sin contador/)).toBeVisible();
  await page.getByRole("button", { name: "Marcar resuelto" }).click();
  await expect(
    page.locator('[data-slot="badge"]', { hasText: /^Resuelto$/ }),
  ).toBeVisible();
});

test("el coordinador cierra y ve el descuento redondeado", async ({
  browser,
}) => {
  const page = await as(browser, "coordinador");
  await page.goto(ticketUrl);
  await page.getByRole("button", { name: "Cerrar ticket" }).click();
  await page.getByRole("button", { name: "Cerrar y descontar horas" }).click();
  const summary = page.getByRole("dialog");
  await expect(summary.getByText("Descontado")).toBeVisible();
  await expect(summary.getByText("30 min")).toBeVisible();
  await summary.getByRole("button", { name: "Listo" }).click();
  await expect(
    page.locator('[data-slot="badge"]', { hasText: /^Cerrado$/ }),
  ).toBeVisible();
});
