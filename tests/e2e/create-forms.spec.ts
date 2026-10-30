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
    await page.goto("/admin/clientes/nuevo");
    await page
      .getByRole("textbox", { name: "Razón social" })
      .fill(`Cliente E2E ${STAMP}`);
    await page.getByRole("textbox", { name: "NIT" }).fill(String(STAMP));
    await page.getByRole("button", { name: "Crear cliente" }).click();
    await expect(page).toHaveURL(/\/admin\/clientes\/[0-9a-f-]{36}$/);

    // TRAMPA: la ficha recién creada sigue montada y oculta; getByRole ignora lo oculto, getByLabel no.
    await page.goBack();
    await expect(
      page.getByRole("textbox", { name: "Razón social" }),
    ).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "NIT" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "País" })).toHaveValue(
      "Bolivia",
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
