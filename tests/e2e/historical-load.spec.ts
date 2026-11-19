// tests/e2e/historical-load.spec.ts
// Carga histórica de trabajo previo (AGENTS.md §2.6, §11, decisión 2026-11-19): el coordinador pega desde Excel dos
// tramos de un mismo ticket, elige su bolsa, valida y carga; el ticket queda cerrado con su descuento y volver a
// cargar la misma referencia no lo duplica.
import { expect, type Page, test } from "@playwright/test";
import { storageFor } from "./users";

const STAMP = Date.now();
const REF = `E2E-H-${STAMP}`;
const TITLE = `Trabajo previo E2E ${STAMP}`;
const DAY_MS = 86_400_000;

test.use({ storageState: storageFor("coordinador") });

// POR QUÉ: días distintos en cada corrida para que los tramos de la ingeniera demo no se solapen entre corridas.
function pastDay(daysAgo: number): string {
  const date = new Date(STAMP - daysAgo * DAY_MS);
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/La_Paz",
  }).format(date);
}

async function pasteBlock(page: Page, cell: string, text: string) {
  await page.locator(`[data-cell="${cell}"]`).focus();
  await page.evaluate((tsv) => {
    const data = new DataTransfer();
    data.setData("text/plain", tsv);
    document.activeElement?.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, text);
}

test("el coordinador pega trabajo previo, lo carga cerrado y no lo duplica", async ({
  page,
}) => {
  const offset = 20 + (STAMP % 300);
  const [day1, day2] = [pastDay(offset + 1), pastDay(offset)];
  const head = [
    REF,
    day1,
    TITLE,
    "",
    "Banco Andino S.A. (demo)",
    "LP",
    "DIMAHELP",
    "",
    "Media",
    "Elena Ingeniera (demo)",
    "Cerrado",
  ];
  const tsv = [
    [...head, day1, "09:00", "11:00", "", "", ""].join("\t"),
    [REF, "", "", "", "", "", "", "", "", "", "", day2, "10:00", "11:00"].join(
      "\t",
    ),
  ].join("\n");

  await page.goto("/tickets/carga-historica");
  await pasteBlock(page, "0:0", `${tsv}\n`);
  await expect(page.locator('[data-cell="0:2"]')).toHaveValue(TITLE);
  await page.locator('[data-cell="0:15"]').click();
  await page
    .getByRole("option", { name: /Soporte 8x5/ })
    .first()
    .click();

  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("Tickets: 1 · tiempo real: 3 h")).toBeVisible();
  await page.getByRole("button", { name: "Cargar" }).click();
  await expect(
    page.getByText(/Creados: 1 · ya cargados antes: 0 · con error: 0/),
  ).toBeVisible();
  await expect(page.getByText(/descontó/)).toBeVisible();

  await pasteBlock(page, "0:0", `${tsv}\n`);
  await page.locator('[data-cell="0:15"]').click();
  await page
    .getByRole("option", { name: /Soporte 8x5/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Cargar" }).click();
  await expect(
    page.getByText(/Creados: 0 · ya cargados antes: 1/),
  ).toBeVisible();

  await page
    .getByRole("link", { name: /^#\d+$/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: TITLE }),
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="badge"]', { hasText: /^Cerrado$/ }).first(),
  ).toBeVisible();
});
