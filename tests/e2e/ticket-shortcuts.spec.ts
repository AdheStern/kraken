// tests/e2e/ticket-shortcuts.spec.ts
// Atajos de tickets (decisión 2026-11-05): «/» lleva al buscador del tablero, que filtra por número o título, y en
// el detalle Alt+C abre Comentarios con el foco en el texto y Alt+R abre Registros (y su carga manual, si puede).
import { expect, test } from "@playwright/test";
import { storageFor } from "./users";

test.use({ storageState: storageFor("coordinador") });

test("«/» busca en el tablero y Alt+C / Alt+R abren su pestaña", async ({
  page,
}) => {
  await page.goto("/tickets");
  await page.waitForLoadState("networkidle");
  const hrefs = await page
    .locator('a[href^="/tickets/"]')
    .evaluateAll((links) => links.map((l) => l.getAttribute("href") ?? ""));
  const href = hrefs.find((h) => /^\/tickets\/[0-9a-f-]{36}$/.test(h)) ?? "";
  await page.keyboard.press("/");
  const search = page.getByRole("searchbox", { name: "Buscar ticket" });
  await expect(search).toBeFocused();
  await search.fill("zzz-sin-coincidencias");
  await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);

  await page.goto(href);
  await page.waitForLoadState("networkidle");
  await page.locator("body").click();
  await page.keyboard.press("Alt+c");
  await expect(page.locator("[data-comment-body]")).toBeFocused();
  await page.locator("body").click();
  await page.keyboard.press("Alt+r");
  // POR QUÉ: el coordinador no carga tiempo; Alt+R abre Registros y el foco va al formulario solo si puede.
  await expect(page.getByRole("tab", { name: /Registros/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
