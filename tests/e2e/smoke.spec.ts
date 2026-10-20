// tests/e2e/smoke.spec.ts
// Recorrido de humo de la F0 (AGENTS.md §11, §12): cada rol entra, ve sus módulos y no ve los ajenos.
// El recorrido de tickets (bolsa → contador → cierre con descuento) está en tickets.spec.ts.
import { expect, test } from "@playwright/test";
import { storageFor } from "./users";

test("sin sesión, cualquier pantalla lleva al inicio de sesión", async ({
  page,
}) => {
  await page.goto("/cv");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /Microsoft/ })).toBeVisible();
});

test("la salud del nodo responde para HAProxy", async ({ request }) => {
  expect((await request.get("/api/health/live")).ok()).toBe(true);
  // POR QUÉ: con el servidor en frío la primera conexión a la base puede pasar de 2 s; HAProxy reintenta igual.
  await expect
    .poll(
      async () => (await (await request.get("/api/health/ready")).json()).ready,
      {
        timeout: 15_000,
      },
    )
    .toBe(true);
});

test.describe("gerente general", () => {
  test.use({ storageState: storageFor("gg") });

  test("recorre inicio, CV y bolsas, sin la administración", async ({
    page,
  }) => {
    await page.goto("/inicio");
    const nav = page.locator('[data-sidebar="sidebar"]');
    for (const module of [
      "Control de Venta",
      "Bolsas de horas",
      "Aprobaciones",
    ])
      await expect(nav.getByRole("link", { name: module })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Administración" })).toHaveCount(
      0,
    );
    await page.goto("/cv");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Control de Venta",
    );
    await page.goto("/horas");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Bolsas de horas",
    );
  });
});

test.describe("administrador del sistema", () => {
  test.use({ storageState: storageFor("admin") });

  test("entra a la administración y al correo", async ({ page }) => {
    await page.goto("/admin");
    for (const section of [
      "Usuarios y roles",
      "Parámetros",
      "Correo",
      "Auditoría",
    ])
      await expect(page.getByRole("link", { name: section })).toBeVisible();
    await page.goto("/admin/correo");
    await expect(
      page.getByRole("button", { name: "Enviarme un correo de prueba" }),
    ).toBeVisible();
  });
});

test.describe("comercial", () => {
  test.use({ storageState: storageFor("comercial") });

  test("no entra a la administración y la página le dice adónde ir", async ({
    page,
  }) => {
    await page.goto("/admin/usuarios");
    await expect(page.getByText("No encontramos esta página.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Usuarios y roles" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Ir al inicio" }),
    ).toBeVisible();
  });
});
