// tests/e2e/ticket-requests.spec.ts
// Solicitudes de ticket (AGENTS.md §2.6, §11): la comercial pide un ticket a DIMAHELP, el coordinador lo crea desde
// la bandeja con el alta prellenada y ella ve el ticket en «Mis solicitudes»; una segunda se descarta con motivo.
import { type Browser, expect, type Page, test } from "@playwright/test";
import { storageFor } from "./users";

test.describe.configure({ mode: "serial" });

const TITLE = `Solicitud E2E ${Date.now()}`;
const DISCARDED = `Descartada E2E ${Date.now()}`;

async function as(
  browser: Browser,
  role: "comercial" | "coordinador",
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

async function request(page: Page, title: string) {
  await page.goto("/solicitudes");
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  await pick(page, "request-area", "DIMAHELP");
  await page.locator("#request-title").fill(title);
  await page
    .locator("#request-description")
    .fill("La VPN rechaza mis credenciales desde hoy.");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.locator("li", { hasText: title })).toContainText(
    "Pendiente",
  );
}

test("la comercial pide un ticket y el coordinador lo crea prellenado", async ({
  browser,
}) => {
  await request(await as(browser, "comercial"), TITLE);

  const page = await as(browser, "coordinador");
  await page.goto("/tickets");
  await page.getByRole("link", { name: /Solicitudes/ }).click();
  const row = page.locator("li", { hasText: TITLE });
  await row.getByRole("button", { name: "Crear ticket" }).click();
  await expect(page.locator("#new-ticket-title")).toHaveValue(TITLE);
  await pick(page, "new-ticket-customerId", "Banco Andino");
  await pick(page, "new-ticket-cityId", "La Paz");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Crear ticket" })
    .click();
  await page.waitForURL(/\/tickets\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: TITLE }),
  ).toBeVisible();
  await page.goto("/tickets/solicitudes");
  await expect(page.locator("li", { hasText: TITLE })).toHaveCount(0);
});

test("la comercial ve el ticket que nació de su solicitud", async ({
  browser,
}) => {
  const page = await as(browser, "comercial");
  await page.goto("/solicitudes");
  const row = page.locator("li", { hasText: TITLE });
  await expect(row).toContainText(/Ticket #\d+/);
  await expect(row).toContainText("Nuevo");
});

test("el coordinador descarta una solicitud con motivo", async ({
  browser,
}) => {
  const requester = await as(browser, "comercial");
  await request(requester, DISCARDED);

  const page = await as(browser, "coordinador");
  await page.goto("/tickets/solicitudes");
  await page
    .locator("li", { hasText: DISCARDED })
    .getByRole("button", { name: "Descartar" })
    .click();
  await page.getByRole("dialog").locator("textarea").fill("Duplicada");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Descartar" })
    .click();
  await expect(page.locator("li", { hasText: DISCARDED })).toHaveCount(0);

  await requester.goto("/solicitudes");
  const row = requester.locator("li", { hasText: DISCARDED });
  await expect(row).toContainText("Descartada");
  await expect(row).toContainText("Duplicada");
});
