// src/server/files/safe-content-type.test.ts
// Tipo de descarga de los adjuntos (ADR-16): pasivos conocidos tal cual; lo activo, como binario.
import { describe, expect, it } from "vitest";
import { safeContentType } from "./safe-content-type";

describe("safeContentType", () => {
  it.each([
    ["application/pdf", "application/pdf"],
    ["IMAGE/PNG", "image/png"],
    ["text/plain; charset=utf-8", "text/plain"],
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  ])("%s se sirve como %s", (declared, served) => {
    expect(safeContentType(declared)).toBe(served);
  });

  it.each([
    "text/html",
    "image/svg+xml",
    "application/javascript",
    "text/xml",
    "",
  ])("%s se sirve como binario", (declared) => {
    expect(safeContentType(declared)).toBe("application/octet-stream");
  });
});
