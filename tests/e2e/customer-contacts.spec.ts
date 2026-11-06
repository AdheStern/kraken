// tests/e2e/customer-contacts.spec.ts
// Contactos que cambian de empresa (decisión 2026-11-06): al crear un contacto con un correo ya registrado en
// otro cliente, Kraken lo avisa y lo transfiere sin duplicar la persona; en el cliente anterior queda como anterior.
// Quien no gestiona contactos agrega uno con sus áreas, ve solo los de sus áreas y no edita ni exporta.
import { expect, type Page, test } from "@playwright/test";
import { storageFor } from "./users";

test.use({ storageState: storageFor("administracion") });
test.describe.configure({ mode: "serial" });

const STAMP = Date.now();
const EMAIL = `mario.${STAMP}@empresa.bo`;
let origin = "";

async function newCustomer(page: Page, name: string): Promise<string> {
  await page.goto("/clientes/nuevo");
  await page.getByRole("textbox", { name: "Razón social" }).fill(name);
  await page.getByRole("button", { name: "Crear cliente" }).click();
  await page.waitForURL(/\/clientes\/[0-9a-f-]{36}$/);
  return page.url();
}

async function addContact(page: Page, url: string) {
  await page.goto(`${url}?pestana=contactos`);
  await page.getByRole("button", { name: "Nuevo contacto" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo contacto" });
  await dialog
    .getByRole("textbox", { name: "Nombre" })
    .fill(`Mario Vargas ${STAMP}`);
  await dialog.getByRole("textbox", { name: "Correo" }).fill(EMAIL);
  await dialog.getByRole("button", { name: "Agregar contacto" }).click();
  return dialog;
}

test("un contacto con el mismo correo se transfiere sin duplicarse", async ({
  page,
}) => {
  const first = await newCustomer(page, `Empresa Origen ${STAMP}`);
  origin = first;
  await addContact(page, first);
  await expect(page.getByText(`Mario Vargas ${STAMP}`)).toBeVisible();

  const second = await newCustomer(page, `Empresa Destino ${STAMP}`);
  const dialog = await addContact(page, second);
  await expect(dialog.getByText("¿Es alguna de estas personas?")).toBeVisible();
  await dialog
    .getByRole("button", { name: `Transferir desde Empresa Origen ${STAMP}` })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(`Mario Vargas ${STAMP}`)).toBeVisible();

  await page.goto(`${first}?pestana=contactos`);
  await expect(
    page.getByRole("heading", { name: /Anteriores · 1/ }),
  ).toBeVisible();
  await expect(page.getByText(/Pasó a Empresa Destino/)).toBeVisible();
});

test("el directorio encuentra al contacto, muestra su historial y exporta a Excel", async ({
  page,
}) => {
  await page.goto(`/clientes/contactos?q=${STAMP}&todos=1`);
  await expect(page.getByText(`Mario Vargas ${STAMP}`).first()).toBeVisible();
  const href = await page
    .getByRole("link", { name: /Exportar a Excel/ })
    .getAttribute("href");
  const file = await page.request.get(href ?? "");
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toContain("spreadsheetml");

  await page
    .getByRole("link", { name: new RegExp(`Mario Vargas ${STAMP}`) })
    .first()
    .click();
  await page.waitForURL(/\/clientes\/contactos\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/Pasó a Empresa Destino/)).toBeVisible();

  await page.keyboard.press("Control+k");
  await page
    .getByRole("textbox", { name: "Buscar en Kraken" })
    .fill(`Vargas ${STAMP}`);
  await expect(
    page.getByRole("region", { name: "Contactos" }).getByRole("button").first(),
  ).toBeVisible();
});

test.describe("sin gestionar contactos", () => {
  test.use({ storageState: storageFor("ingeniero") });

  test("agrega un contacto de su área y no edita ni exporta", async ({
    page,
  }) => {
    await page.goto(origin);
    await expect(
      page.getByRole("textbox", { name: "Razón social" }),
    ).toBeDisabled();
    await page.getByRole("tab", { name: /Contactos/ }).click();
    await expect(
      page.getByRole("link", { name: /Exportar a Excel/ }),
    ).toHaveCount(0);
    await expect(page.getByText(`Mario Vargas ${STAMP}`)).toHaveCount(0);
    await page.getByRole("button", { name: "Nuevo contacto" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo contacto" });
    await dialog
      .getByRole("textbox", { name: "Nombre" })
      .fill(`Lucía Ríos ${STAMP}`);
    await dialog.getByRole("button", { name: "Agregar contacto" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(`Lucía Ríos ${STAMP}`)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Editar / })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^Dar de baja/ }),
    ).toHaveCount(0);
  });
});
