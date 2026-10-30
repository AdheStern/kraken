// tests/e2e/cv-editor.spec.ts
// Editor del CV (AGENTS.md §2.1): el contacto de la cabecera se elige entre los registrados del cliente y
// prellena sus datos; las observaciones de una línea admiten varias líneas (Alt+Enter, como en Excel) y la
// fila se colorea con la paleta de Excel; una línea pasa a subítem de la anterior y se numera 1.1.
import { expect, type Page, test } from "@playwright/test";
import { storageFor } from "./users";

test.use({ storageState: storageFor("comercial") });

const STAMP = Date.now();

async function pick(page: Page, id: string, text: string) {
  await page.locator(`#${id}`).fill(text);
  await page
    .getByRole("option", { name: new RegExp(text) })
    .first()
    .click();
}

test("el contacto se elige del cliente y las observaciones son texto largo", async ({
  page,
}) => {
  await page.goto("/cv");
  await page.getByRole("button", { name: "Nuevo CV" }).click();
  await pick(page, "new-cv-city", "La Paz");
  await pick(page, "new-cv-customer", "Banco Andino");
  await page.locator("#new-cv-title").fill(`CV contacto E2E ${STAMP}`);
  await page.getByRole("button", { name: "Crear CV" }).click();
  await expect(page).toHaveURL(/\/cv\/[0-9a-f-]{36}$/);

  // Sin líneas la cabecera abre desplegada.
  await pick(page, "cv-contact", "Lucía Mamani");
  await expect(page.locator("#cv-contact-name")).toHaveValue(
    "Lucía Mamani (demo)",
  );
  await expect(page.locator("#cv-contact-email")).toHaveValue(
    "lucia.mamani@bancoandino.demo",
  );
  await page.getByRole("button", { name: "Guardar cabecera" }).click();
  await expect(page.getByText("Cabecera guardada.")).toBeVisible();

  await page.reload();
  await expect(page.locator("#cv-contact")).toHaveValue(/Lucía Mamani/);
  await expect(page.locator("#cv-contact-phone")).toHaveValue("+591 2 2440011");

  await page.getByRole("button", { name: "Línea", exact: true }).click();
  const notes = page.getByRole("textbox", { name: "Observaciones" });
  await notes.fill("Entrega en dos partes");
  await notes.press("Alt+Enter");
  await notes.pressSequentially("Soporte desde la segunda");
  await expect(notes).toHaveValue(
    "Entrega en dos partes\nSoporte desde la segunda",
  );

  const row = page.locator("tr", { has: notes });
  await row.getByRole("button", { name: "Color de la fila" }).click();
  await page.getByRole("button", { name: "Oro, claro 80 %" }).click();
  await expect(row).toHaveCSS("background-color", "rgb(255, 242, 204)");

  await page.getByRole("button", { name: "Línea", exact: true }).click();
  const child = page.locator("tbody tr").last();
  await expect(child.locator("td").first()).toHaveText("2");
  await child
    .getByRole("button", { name: "Convertir en subítem de la línea anterior" })
    .click();
  await expect(child.locator("td").first()).toHaveText("1.1");
});
