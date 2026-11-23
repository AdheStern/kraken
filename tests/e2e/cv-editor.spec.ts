// tests/e2e/cv-editor.spec.ts
// Editor del CV (AGENTS.md §2.1): el contacto de la cabecera se elige entre los registrados del cliente y
// prellena sus datos y el de soporte y licencias va enlazado hasta romper la cadena (decisión 2026-11-16); las observaciones de una línea admiten varias líneas (Alt+Enter, como en Excel) y la
// fila se colorea con la paleta de Excel; la descripción crece con el texto; una línea pasa a subítem de la anterior
// y se numera 1.1. El pago en el exterior se marca con su interruptor (decisión 2026-11-19).
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
  const payment = page.getByRole("switch", { name: "Pago en el exterior" });
  await expect(payment).not.toBeChecked();
  await payment.click();
  await page.getByRole("button", { name: "Guardar cabecera" }).click();
  await expect(page.getByText("Cabecera guardada.")).toBeVisible();

  await page.reload();
  await expect(page.locator("#cv-contact")).toHaveValue(/Lucía Mamani/);
  // El teléfono guardado como «+591 2 2440011» se ve con su país y en bloques.
  await expect(page.locator("#cv-contact-phone")).toHaveValue("2 244 0011");
  await expect(
    page
      .getByRole("combobox", { name: "País de teléfono del contacto" })
      .first(),
  ).toHaveValue("🇧🇴 +591");
  await expect(payment).toBeChecked();

  const chain = page.getByTestId("cv-end-contact-chain");
  await expect(chain).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByText("Mismo contacto del cliente: Lucía Mamani (demo)."),
  ).toBeVisible();
  await chain.click();
  await pick(page, "cv-end-contact", "Jorge Quispe");
  await expect(page.locator("#cv-endContactEmail")).toHaveValue(
    "jorge.quispe@bancoandino.demo",
  );
  await page.getByRole("button", { name: "Guardar cabecera" }).click();
  await expect(page.getByText("Cabecera guardada.")).toBeVisible();
  await page.reload();
  await expect(chain).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#cv-endContactName")).toHaveValue(
    "Jorge Quispe (demo)",
  );
  await expect(page.locator("#cv-contact-name")).toHaveValue(
    "Lucía Mamani (demo)",
  );

  await page.getByRole("button", { name: "Línea", exact: true }).click();
  const notes = page.getByRole("textbox", { name: "Observaciones" });
  await notes.fill("Entrega en dos partes");
  await notes.press("Alt+Enter");
  await notes.pressSequentially("Soporte desde la segunda");
  await expect(notes).toHaveValue(
    "Entrega en dos partes\nSoporte desde la segunda",
  );

  // POR QUÉ: los nombres largos de producto se leen enteros; la descripción crece con el texto.
  const description = page.getByRole("textbox", { name: "Descripción" });
  await description.fill(
    "Veeam Data Platform Essentials Universal Subscription License. Includes Enterprise Plus Edition features and Production Support",
  );
  const height = await description.evaluate((el) => el.clientHeight);
  expect(height).toBeGreaterThan(40);

  const row = page.locator("tr", { has: notes });
  await row.getByRole("button", { name: "Color de la fila" }).click();
  await page.getByRole("button", { name: "Oro, claro 80 %" }).click();
  await expect(row).toHaveCSS("background-color", "rgb(255, 242, 204)");

  // REGLA: el rango de activación solo se habilita en licencias (tipo Intangible).
  const activation = row.getByLabel("Rango de activación");
  await expect(activation).toBeDisabled();
  await row.getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Intangible" }).click();
  await expect(activation).toBeEnabled();

  await page.getByRole("button", { name: "Línea", exact: true }).click();
  const child = page.locator("tbody tr").last();
  await expect(child.locator("td").first()).toHaveText("2");
  await child
    .getByRole("button", { name: "Convertir en subítem de la línea anterior" })
    .click();
  await expect(child.locator("td").first()).toHaveText("1.1");
});

// TRAMPA: con el React Compiler, form.formState quedaba memorizado (el botón no se encendía) y, tras guardar,
// reset() soltaba los campos de register() (lo escrito se perdía): cambiar el TC exigía recargar la página.
test("la cabecera se guarda varias veces seguidas sin recargar", async ({
  page,
}) => {
  await page.goto("/cv");
  await page.getByRole("button", { name: "Nuevo CV" }).click();
  await pick(page, "new-cv-city", "La Paz");
  await pick(page, "new-cv-customer", "Banco Andino");
  await page.locator("#new-cv-title").fill(`CV TC E2E ${STAMP}`);
  await page.getByRole("button", { name: "Crear CV" }).click();
  await expect(page).toHaveURL(/\/cv\/[0-9a-f-]{36}$/);

  const save = page.getByRole("button", { name: "Guardar cabecera" });
  const costFx = page.locator("#cv-cost-fx");
  await expect(save).toBeDisabled();
  for (const rate of ["6.9800", "6.9900", "7.0000"]) {
    await costFx.fill(rate);
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText("Cabecera guardada.")).toBeVisible();
    await expect(save).toBeDisabled();
  }
  await page.reload();
  await expect(costFx).toHaveValue(/^7(\.0+)?$/);
});
