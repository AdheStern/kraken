// tests/e2e/create-forms.spec.ts
// Las altas empiezan en blanco después de crear: con Cache Components la página anterior se conserva al volver
// (<Activity>) y antes mostraba los datos del alta anterior (cliente y CV; el ticket, en tickets.spec.ts).
import { expect, type Page, test } from "@playwright/test";
import { storageFor } from "./users";

const STAMP = Date.now();

async function pick(page: Page, id: string, text: string) {
  await page.locator(`#${id}`).fill(text);
  await page
    .getByRole("option", { name: new RegExp(text) })
    .first()
    .click();
}

test.describe("Administración", () => {
  test.use({ storageState: storageFor("administracion") });

  test("al volver de la ficha del cliente creado, el alta está en blanco", async ({
    page,
  }) => {
    await page.goto("/clientes/nuevo");
    await page
      .getByRole("textbox", { name: "Razón social" })
      .fill(`Cliente E2E ${STAMP}`);
    await page.getByRole("textbox", { name: "NIT" }).fill(String(STAMP));
    // Rubro y municipio del catálogo (decisión 2026-11-06): cualquier municipio de Bolivia, no solo LP, SC y CB.
    await pick(page, "customer-industry", "Minería");
    await pick(page, "customer-municipality", "Yacuiba");
    await page.getByRole("button", { name: "Crear cliente" }).click();
    await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("combobox", { name: "Municipio" })).toHaveValue(
      "Yacuiba",
    );
    await expect(page.getByRole("combobox", { name: "Rubro" })).toHaveValue(
      "Minería",
    );
    // Sucursales en su pestaña (decisión 2026-11-06).
    await page.getByRole("tab", { name: /Sucursales/ }).click();
    await page.getByRole("button", { name: "Nueva sucursal" }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva sucursal" });
    await dialog
      .getByRole("textbox", { name: /^Nombre/ })
      .fill("Planta Yacuiba");
    await dialog.locator("#branch-municipality").fill("Yacuiba");
    await page
      .getByRole("option", { name: /Yacuiba/ })
      .first()
      .click();
    await dialog.getByRole("button", { name: "Agregar sucursal" }).click();
    await expect(page.getByText("Planta Yacuiba")).toBeVisible();
    // Contactos con municipio y áreas de DIMA (decisión 2026-11-06).
    await page.getByRole("tab", { name: /Contactos/ }).click();
    await page.getByRole("button", { name: "Nuevo contacto" }).click();
    const contact = page.getByRole("dialog", { name: "Nuevo contacto" });
    await contact
      .getByRole("textbox", { name: "Nombre" })
      .fill(`Rosa Choque ${STAMP}`);
    await contact.getByRole("textbox", { name: "Cargo" }).fill("Jefa de TI");
    await contact.locator("#contact-municipality").fill("Yacuiba");
    await page
      .getByRole("option", { name: /Yacuiba/ })
      .first()
      .click();
    await contact.locator("#contact-areas").fill("DIMANET");
    await page
      .getByRole("option", { name: /DIMANET/ })
      .first()
      .click();
    await contact.getByRole("heading", { name: "Nuevo contacto" }).click();
    await contact.getByRole("button", { name: "Agregar contacto" }).click();
    await expect(page.getByText(`Rosa Choque ${STAMP}`)).toBeVisible();
    await expect(page.getByText(/Jefa de TI · Yacuiba/)).toBeVisible();

    // TRAMPA: la ficha recién creada sigue montada y oculta; getByRole ignora lo oculto, getByLabel no.
    await page.goBack();
    await expect(
      page.getByRole("textbox", { name: "Razón social" }),
    ).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "NIT" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "País" })).toHaveValue(
      "Bolivia",
    );
    await expect(page.getByRole("combobox", { name: "Municipio" })).toHaveValue(
      "",
    );
  });
});

test.describe("Comercial", () => {
  test.use({ storageState: storageFor("comercial") });

  test("al volver del editor del CV creado, el alta está cerrada y en blanco", async ({
    page,
  }) => {
    await page.goto("/cv");
    await page.getByRole("button", { name: "Nuevo CV" }).click();
    await pick(page, "new-cv-city", "La Paz");
    await pick(page, "new-cv-customer", "Banco Andino");
    await page.locator("#new-cv-title").fill(`CV E2E ${STAMP}`);
    await page.getByRole("button", { name: "Crear CV" }).click();
    await expect(page).toHaveURL(/\/cv\/[0-9a-f-]{36}$/);

    await page.goBack();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { name: "Nuevo CV" }).click();
    await expect(page.locator("#new-cv-title")).toHaveValue("");
    await expect(page.locator("#new-cv-customer")).toHaveValue("");
    await expect(page.locator("#new-cv-cost-fx")).toHaveValue("6.97");
  });
});
