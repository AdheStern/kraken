// tests/e2e/users.ts
// Usuarios demo de `pnpm db:seed:dev` que recorren las pruebas E2E, y dónde se guarda la sesión de cada uno.

export const E2E_USERS = {
  gg: "gg@dima.local",
  admin: "admin@dima.local",
  comercial: "comercial@dima.local",
  coordinador: "coordinador@dima.local",
  ingeniero: "ingeniero@dima.local",
} as const;

export function storageFor(role: keyof typeof E2E_USERS): string {
  return `tests/e2e/.auth/${role}.json`;
}
