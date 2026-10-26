// tests/e2e/documentation.spec.ts
// Recorrido de la documentación por proyecto (AGENTS.md §2.10, §11): el administrador del sistema crea una fase,
// la ingeniera crea un proyecto, sube un documento a esa fase y lo descarga; el comercial lo ve pero no lo quita.
import { type Browser, expect, type Page, test } from "@playwright/test";
import { type E2E_USERS, storageFor } from "./users";

test.describe.configure({ mode: "serial" });

const STAMP = Date.now();
const PHASE = `Fase E2E ${STAMP}`;
const PROJECT = `Proyecto E2E ${STAMP}`;
let projectUrl = "";

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

test("el administrador del sistema crea una fase de documentación", async ({
  browser,
}) => {
  const page = await as(browser, "admin");
  await page.goto("/admin/fases-documentacion");
  await page.getByLabel("Nombre de la nueva fase").fill(PHASE);
  await page.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText(PHASE)).toBeVisible();
});

test("la ingeniera crea un proyecto, sube un documento a la fase y lo descarga", async ({
  browser,
}) => {
  const page = await as(browser, "ingeniero");
  await page.goto("/documentacion");
  await page.getByRole("link", { name: "Nuevo proyecto" }).click();
  await page.locator("#doc-new-name").fill(PROJECT);
  await pick(page, "doc-new-customer", "Banco Andino");
  await pick(page, "doc-new-owner", "Elena Ingeniera");
  await page.locator("#doc-new-contact-name").fill("Jefa de TI");
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await page.waitForURL(/\/documentacion\/[0-9a-f-]{36}$/);
  projectUrl = page.url();
  await expect(page.getByRole("heading", { name: PROJECT })).toBeVisible();

  const phase = page.getByRole("region", { name: PHASE });
  await phase.locator('input[type="file"]').setInputFiles({
    name: "acta.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Acta de inicio"),
  });
  await expect(phase.getByText("acta.txt")).toBeVisible();
  const download = page.waitForEvent("download");
  await phase.getByRole("link", { name: "Descargar" }).click();
  expect((await download).suggestedFilename()).toBe("acta.txt");
});

test("el comercial ve el documento pero no lo quita", async ({ browser }) => {
  const page = await as(browser, "comercial");
  await page.goto(projectUrl);
  const phase = page.getByRole("region", { name: PHASE });
  await expect(phase.getByText("acta.txt")).toBeVisible();
  await expect(
    phase.getByRole("button", { name: "Quitar acta.txt" }),
  ).toHaveCount(0);
});
