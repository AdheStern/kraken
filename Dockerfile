# Dockerfile
# Imágenes de Kraken (ADR-13, AGENTS.md §10), las dos sin root:
#   app     → servidor Next.js standalone (node server.js).
#   worker  → proceso pg-boss con tsx (KISS: sin bundle aparte), solo con dependencias de producción. La
#             misma imagen corre las migraciones del despliegue: `pnpm migrate:deploy`.
# Construir: docker build --target app -t kraken-app .
# POR QUÉ: la etiqueta source enlaza el paquete de GHCR con el repositorio, que le da sus permisos y su página.

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma

# POR QUÉ: prisma generate lee prisma.config.ts, que exige la URL de migraciones aunque no se conecte;
# se da solo al paso de instalación, para que nunca quede en la imagen.
FROM base AS deps
RUN MIGRATION_DATABASE_URL=postgresql://build@localhost/build pnpm install --frozen-lockfile

FROM base AS prod-deps
RUN MIGRATION_DATABASE_URL=postgresql://build@localhost/build pnpm install --frozen-lockfile --prod

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-alpine AS app
LABEL org.opencontainers.image.source=https://github.com/AdheStern/kraken
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
# TRAMPA: un volumen con nombre copia el dueño de la carpeta de la imagen; sin ella nace de root y el usuario node no
# puede escribir los adjuntos de staging (FILES_ROOT, deploy/staging/compose.yml).
RUN mkdir -p /var/lib/kraken/files && chown node:node /var/lib/kraken/files
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health/live || exit 1
CMD ["node", "server.js"]

FROM node:24-alpine AS worker
LABEL org.opencontainers.image.source=https://github.com/AdheStern/kraken
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app ./
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node --from=build /app/src/generated ./src/generated
# POR QUÉ: worker:migrate (paso de `pnpm migrate:deploy`) lee los permisos de pgboss y de kraken_lectura de aquí.
COPY --chown=node:node deploy/sql ./deploy/sql
USER node
CMD ["node", "--import", "tsx", "src/worker/index.ts"]
