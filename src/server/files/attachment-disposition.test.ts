// src/server/files/attachment-disposition.test.ts
// Nombre de descarga: respaldo ASCII sin comillas ni saltos y nombre real en UTF-8.
import { describe, expect, it } from "vitest";
import { attachmentDisposition } from "./attachment-disposition";

describe("attachmentDisposition", () => {
  it("quita tildes en el respaldo y conserva el nombre real codificado", () => {
    expect(attachmentDisposition("Devolución 12.pdf")).toBe(
      `attachment; filename="Devolucion 12.pdf"; filename*=UTF-8''Devoluci%C3%B3n%2012.pdf`,
    );
  });

  it("neutraliza comillas y saltos de línea", () => {
    const header = attachmentDisposition('a"b\r\nSet-Cookie: x.pdf');
    expect(header).not.toMatch(/[\r\n]/);
    expect(
      header.startsWith(`attachment; filename="a_b__Set-Cookie: x.pdf"`),
    ).toBe(true);
  });
});
