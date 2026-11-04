// tests/e2e/inventory.spec.ts
// Recorrido de la F4 (AGENTS.md §11) con el almacenero: entra al POS, ingresa un producto nuevo pegando desde
// Excel, lo traspasa a Santa Cruz con una diferencia, toca el mosaico del FortiGate que reservó el CV demo, elige
// su serial, lo despacha y descarga el comprobante, registra la devolución de esa salida; Administración ve el
// ingreso con costos y el comercial no.
// También abre la cámara del POS (simulada) para cuidar que la cabecera Permissions-Policy la permita.
import { type Browser, expect, type Page, test } from "@playwright/test";
import { storageFor } from "./users";

test.describe.configure({ mode: "serial" });

const CODE = `E2E-${Date.now().toString(36).toUpperCase()}`;

async function as(
  browser: Browser,
  role: "almacen" | "comercial" | "administracion",
): Promise<Page> {
  const context = await browser.newContext({ storageState: storageFor(role) });
  return context.newPage();
}

// POR QUÉ: el proyecto tablet corre en vertical, donde el panel de la operación empieza plegado.
async function openPanel(page: Page, title: "Salida" | "Traspaso" | "Ingreso") {
  await page.getByRole("button", { name: new RegExp(`^${title} ·`) }).click();
}

async function scan(page: Page, text: string) {
  const input = page.getByLabel("Escanear serial o código");
  await input.fill(text);
  await input.press("Enter");
}

test("el almacenero entra al POS e ingresa un producto nuevo pegando desde Excel", async ({
  browser,
}) => {
  const page = await as(browser, "almacen");
  await page.goto("/inicio");
  await page.waitForURL(/\/inventario\/pos/);
  await page.goto("/inventario/ingresos/nuevo?almacen=LP");
  // TRAMPA: el pegado es un evento sintético; antes de hidratar React no lo escucha.
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Pegar desde Excel" }).click();
  const first = page.getByLabel("Código, fila 1");
  await first.focus();
  await page.evaluate((text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    document.activeElement?.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true }),
    );
  }, `${CODE}\tPatch cord E2E\t5\t2,50\t`);
  await openPanel(page, "Ingreso");
  await expect(
    page.getByText("1 línea · 5 unidades · USD 12.50"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Registrar ingreso" }).click();
  await expect(
    page.getByText(/Ingreso N\.º \d+ registrado en Almacén La Paz/),
  ).toBeVisible();
  await expect(page.getByText(CODE)).toBeVisible();
});

test("ingresa un producto del catálogo tocando su mosaico", async ({
  browser,
}) => {
  const page = await as(browser, "almacen");
  await page.goto("/inventario/ingresos/nuevo?almacen=LP");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /^CAB-UTP-CAT6,/ }).click();
  const dialog = page.getByRole("dialog", { name: "Ingreso de CAB-UTP-CAT6" });
  await dialog.getByLabel("Cantidad").fill("2");
  await dialog.getByLabel("Costo unit. USD").fill("118.40");
  await dialog.getByRole("button", { name: "Guardar línea" }).click();
  await openPanel(page, "Ingreso");
  await expect(
    page.getByText("1 línea · 2 unidades · USD 236.80"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Registrar ingreso" }).click();
  await expect(
    page.getByText(/Ingreso N\.º \d+ registrado en Almacén La Paz/),
  ).toBeVisible();
});

test("traspasa a Santa Cruz y la diferencia queda en tránsito", async ({
  browser,
}) => {
  const page = await as(browser, "almacen");
  await page.goto("/inventario/traspasos/nuevo?origen=LP");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Almacén de destino").click();
  await page.getByRole("option", { name: "Almacén Santa Cruz" }).click();
  for (let i = 0; i < 3; i++) await scan(page, CODE);
  await openPanel(page, "Traspaso");
  await page.getByRole("button", { name: "Crear y enviar" }).click();
  await page.waitForURL(/\/inventario\/traspasos\/[0-9a-f-]{36}$/);
  await expect(page.getByText("En tránsito").first()).toBeVisible();
  await page.getByLabel(`Cantidad recibida de ${CODE}`).fill("2");
  await page.getByRole("button", { name: "Confirmar recepción" }).click();
  await expect(
    page.getByText("Con diferencias", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dar de baja lo que falta" }),
  ).toBeVisible();
});

test("despacha el FortiGate reservado por el CV demo y el comprobante es un PDF", async ({
  browser,
}) => {
  const page = await as(browser, "almacen");
  await page.goto("/inventario/pos?almacen=LP");
  await page.waitForLoadState("networkidle");
  // Se toca el mosaico del FortiGate y se elige su serial, como en la caja de un supermercado.
  await page.getByRole("button", { name: /^FG-100F,/ }).click();
  const picker = page.getByRole("dialog", { name: "Seriales de FG-100F" });
  await picker.getByRole("button", { name: "FG100F0001" }).click();
  await picker.getByRole("button", { name: "Listo · 1 unidad" }).click();
  await openPanel(page, "Salida");
  await expect(
    page.getByRole("button", { name: "Quitar el serial FG100F0001" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Minera Illimani/ }).click();
  await page.getByRole("button", { name: "Confirmar salida" }).click();
  await expect(page.getByText(/Salida N\.º \d+ registrada/)).toBeVisible();
  const href = await page
    .getByRole("link", { name: "Descargar comprobante" })
    .getAttribute("href");
  const response = await page.request.get(href ?? "");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");

  // El equipo vuelve: devolución de esa salida por el número de su comprobante.
  const heading = await page
    .getByText(/Salida N\.º \d+ registrada/)
    .innerText();
  const number = heading.match(/\d+/)?.[0];
  await page.goto(`/inventario/devoluciones/nueva?salida=${number}`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Registrar devolución" }).click();
  await expect(page.getByText(/Devolución N\.º \d+ registrada/)).toBeVisible();
});

test("Administración ve el costo del ingreso y el comercial solo cantidades", async ({
  browser,
}) => {
  const admin = await as(browser, "administracion");
  await admin.goto(`/inventario?almacen=LP&q=${CODE}`);
  await expect(
    admin.getByRole("columnheader", { name: "Valor USD" }),
  ).toBeVisible();
  const commercial = await as(browser, "comercial");
  await commercial.goto(`/inventario?almacen=LP&q=${CODE}`);
  await expect(commercial.getByText(CODE)).toBeVisible();
  await expect(
    commercial.getByRole("columnheader", { name: "Valor USD" }),
  ).toHaveCount(0);
});

test("el POS abre la cámara para escanear", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: storageFor("almacen"),
    permissions: ["camera"],
  });
  const page = await context.newPage();
  await page.goto("/inventario/pos");
  await page.getByRole("button", { name: "Escanear con la cámara" }).click();
  const dialog = page.getByRole("dialog", { name: "Escanear con la cámara" });
  await expect(dialog.getByText("Buscando un código…")).toBeVisible();
  await expect
    .poll(() =>
      dialog.locator("video").evaluate((v: HTMLVideoElement) => v.videoWidth),
    )
    .toBeGreaterThan(0);
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});
