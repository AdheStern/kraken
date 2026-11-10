// tests/e2e/cv-attachments.spec.ts
// Adjuntos del CV (AGENTS.md §2.1, ADR-16): el comercial adjunta un detalle a su CV, lo descarga y lo quita.
import { expect, type Page, test } from "@playwright/test";
import { storageFor } from "./users";

test.use({ storageState: storageFor("comercial") });

async function pick(page: Page, id: string, text: string) {
  await page.locator(`#${id}`).fill(text);
  await page
    .getByRole("option", { name: new RegExp(text) })
    .first()
    .click();
}

test("adjuntar, descargar y quitar un archivo del CV", async ({ page }) => {
  await page.goto("/cv");
  await page.getByRole("button", { name: "Nuevo CV" }).click();
  await pick(page, "new-cv-city", "La Paz");
  await pick(page, "new-cv-customer", "Banco Andino");
  await page.locator("#new-cv-title").fill(`CV adjuntos E2E ${Date.now()}`);
  await page.getByRole("button", { name: "Crear CV" }).click();
  await expect(page).toHaveURL(/\/cv\/[0-9a-f-]{36}$/);

  const section = page.getByRole("region", { name: "Adjuntos" });
  await expect(section.getByText(/Sin adjuntos/)).toBeVisible();
  await section.getByLabel("Archivos para adjuntar").setInputFiles({
    name: "conformacion-licencias.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("codigo;detalle\nV-1;Veeam\n"),
  });
  const item = section.getByRole("listitem").filter({
    hasText: "conformacion-licencias.csv",
  });
  await expect(item).toBeVisible();

  const href = await item
    .getByRole("link", { name: "Descargar" })
    .getAttribute("href");
  const download = await page.request.get(href ?? "");
  expect(download.status()).toBe(200);
  expect(await download.text()).toContain("V-1;Veeam");

  await item
    .getByRole("button", { name: "Quitar conformacion-licencias.csv" })
    .click();
  await expect(item).toHaveCount(0);
  await expect(section.getByText(/Sin adjuntos/)).toBeVisible();
});
