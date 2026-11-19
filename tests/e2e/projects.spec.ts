// tests/e2e/projects.spec.ts
// Detalle de un proyecto (AGENTS.md §2.6, §11): el coordinador crea un proyecto del cliente demo, abre su detalle,
// crea un ticket con el alta prellenada con el cliente y el proyecto, lo ve en el resumen, en el tablero y en la
// lista del proyecto (y en la lista de /tickets), y ve en «Bolsas» las del cliente que sus tickets pueden usar.
import { expect, test } from "@playwright/test";
import { storageFor } from "./users";

const STAMP = Date.now();
const PROJECT = `Proyecto E2E ${STAMP}`;
const TITLE = `Ticket de proyecto E2E ${STAMP}`;

test.use({ storageState: storageFor("coordinador") });

test("el coordinador crea un ticket desde el detalle del proyecto", async ({
  page,
}) => {
  await page.goto("/tickets/proyectos");
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.locator("#new-project-name").fill(PROJECT);
  await page.locator("#new-project-customer").fill("Banco Andino");
  await page
    .getByRole("option", { name: /Banco Andino/ })
    .first()
    .click();
  await page.locator("#new-project-areas").fill("DIMAHELP");
  await page
    .getByRole("option", { name: /DIMAHELP/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Crear proyecto" }).click();

  await page.getByRole("link", { name: PROJECT }).click();
  await page.waitForURL(/\/tickets\/proyectos\/[0-9a-f-]{36}$/);
  const projectUrl = new URL(page.url()).pathname;
  await expect(
    page.getByRole("heading", { level: 1, name: PROJECT }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuevo ticket" }).click();
  await expect(page.locator("#new-ticket-customerId")).toHaveValue(
    /Banco Andino/,
  );
  await page.locator("#new-ticket-cityId").fill("La Paz");
  await page
    .getByRole("option", { name: /La Paz/ })
    .first()
    .click();
  await page.locator("#new-ticket-title").fill(TITLE);
  await page.locator("#new-ticket-description").fill("Desde el proyecto.");
  await page.getByRole("button", { name: "Crear ticket" }).click();
  await page.waitForURL(/\/tickets\/[0-9a-f-]{36}$/);

  await page.goto(projectUrl);
  await expect(page.getByText("0 de 1 terminados · 1 abierto")).toBeVisible();
  await page.goto(`${projectUrl}?pestana=tickets`);
  // POR QUÉ: la tarjeta enlaza con su número; el título es texto de la tarjeta.
  await expect(
    page.getByRole("listitem").filter({ hasText: TITLE }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Lista" }).click();
  await expect(page.getByRole("row").filter({ hasText: TITLE })).toBeVisible();
  await expect(page.getByText("Mostrando 1–1 de 1 tickets")).toBeVisible();

  await page.goto(`/tickets?modo=lista&q=${encodeURIComponent(TITLE)}`);
  await expect(page.getByRole("row").filter({ hasText: TITLE })).toBeVisible();
  await page.goto(`${projectUrl}?pestana=bolsas`);
  await expect(page.getByText(/Soporte 8x5/).first()).toBeVisible();
});
