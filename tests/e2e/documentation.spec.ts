// tests/e2e/documentation.spec.ts
// Recorrido de la documentación por proyecto (AGENTS.md §2.10, §11): el administrador del sistema crea una fase,
// la ingeniera crea un proyecto, sube un documento a esa fase y lo descarga; el comercial lo ve pero no lo quita.
// La ingeniera escribe una lección aprendida con formato; el comercial la edita y su .txt guarda el Markdown.
import { readFile } from "node:fs/promises";
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

test("la ingeniera escribe una lección aprendida con formato en la fase", async ({
  browser,
}) => {
  const page = await as(browser, "ingeniero");
  await page.goto(projectUrl);
  const phase = page.getByRole("region", { name: PHASE });
  await phase.getByRole("button", { name: "Lección aprendida" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título").fill("Energía del rack");
  const editor = dialog.getByRole("textbox", { name: /Qué pasó/ });
  await editor.click();
  await dialog.getByRole("button", { name: "Negrita" }).click();
  await page.keyboard.type("Validar la UPS");
  await dialog.getByRole("button", { name: "Guardar lección" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    phase.getByRole("button", { name: "Energía del rack", exact: true }),
  ).toBeVisible();
});

test("el comercial edita la lección, no la quita, y el .txt guarda el Markdown", async ({
  browser,
}) => {
  const page = await as(browser, "comercial");
  await page.goto(projectUrl);
  const phase = page.getByRole("region", { name: PHASE });
  await phase
    .getByRole("button", { name: "Energía del rack", exact: true })
    .click();
  const editor = page.getByRole("dialog").getByRole("textbox");
  await expect(editor).toContainText("Validar la UPS");
  await editor.press("ControlOrMeta+End");
  await page.keyboard.type(" antes del corte");
  await page.getByRole("button", { name: "Guardar lección" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(phase.getByText(/Editada por Ana/)).toBeVisible();
  await expect(
    phase.getByRole("button", { name: "Quitar Energía del rack" }),
  ).toHaveCount(0);

  const download = page.waitForEvent("download");
  await phase.getByRole("link", { name: "Descargar Energía del rack" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(
    "Lección aprendida - Energía del rack.txt",
  );
  const text = await readFile((await file.path()) ?? "", "utf-8");
  expect(text).toContain("**Validar la UPS");
  expect(text).toContain("antes del corte");
});
