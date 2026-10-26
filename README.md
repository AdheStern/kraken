# Kraken by DIMA

Plataforma interna de DIMA Ltda.: Control de Venta y su aprobación por área, bolsas de horas, tickets,
inventario y tableros. Reemplaza los Excel con los que hoy se maneja el negocio.

- **Reglas, arquitectura y forma de trabajar:** [AGENTS.md](AGENTS.md) (fuente de verdad; léelo antes de tocar código).
- **Identidad visual «La red viva»:** [DESIGN.md](DESIGN.md) y [PRODUCT.md](PRODUCT.md).
- **Despliegue, respaldos y recuperación:** [deploy/README.md](deploy/README.md).

## Requisitos

- Node.js 24 y pnpm 11 (`corepack enable`).
- Docker, para el Postgres y el correo de desarrollo y para los tests de integración.

## Puesta en marcha en desarrollo

```bash
pnpm install                                   # dependencias, cliente Prisma y ganchos de git (lefthook)
cp .env.example .env                           # y completa los valores (ver AGENTS.md §10)
docker compose -f deploy/compose.dev.yml up -d # Postgres 18 y Mailpit (correo falso en http://localhost:8025)
pnpm prisma migrate dev                        # esquema de la base
pnpm db:seed:dev                               # catálogos base, datos demo y usuarios demo
pnpm db:seed:admin                             # cuenta de emergencia del administrador del sistema
pnpm dev                                       # la app en http://localhost:3000
pnpm worker:dev                                # en otra terminal: correo, tipo de cambio y vencimientos
```

En desarrollo no hay Entra ID: con `AUTH_DEV_PASSWORD_LOGIN=true` los usuarios demo
(`gg@dima.local`, `gerente.dimanet@dima.local`, `comercial@dima.local`, `administracion@dima.local`…) entran
con `DEV_SEED_PASSWORD`. En producción solo la cuenta de emergencia entra con contraseña.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm test` | Dominio, autorización y unitarios (Vitest) |
| `pnpm test:int` | Integración contra Postgres real (Testcontainers) |
| `pnpm build && pnpm test:e2e` | E2E con Playwright sobre el build (puerto 3100) |
| `pnpm biome check --write` | Lint y formato |
| `pnpm db:seed:base` | Catálogos base, apto para producción |
| `pnpm worker:migrate` | Esquema de pg-boss con el usuario de migraciones |

Los ganchos de git corren Biome antes de cada commit, y tipos y tests antes de cada push.
