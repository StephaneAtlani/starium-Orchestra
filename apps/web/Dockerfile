FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
WORKDIR /app

FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Rewrites serveur → API (bridge Docker : http://api:3001). Build-time : doit être défini avant `next build`.
ARG INTERNAL_API_URL=http://api:3001
ENV INTERNAL_API_URL=${INTERNAL_API_URL}
COPY . .
# Ne PAS poser NODE_ENV=production ici : pnpm skipperait les devDependencies
# (prisma) et le postinstall `apps/api` (`prisma generate`) échouerait.
RUN pnpm install --frozen-lockfile || pnpm install
# `next build` exige un NODE_ENV standard (production) — pas `preproduction`.
ENV NODE_ENV=production
# prebuild web : types + rbac-permissions + budget-exercise-calendar (workspace dist/)
RUN pnpm --filter @starium-orchestra/web build
# Standalone n’embarque pas automatiquement `public` + `.next/static` (doc Next.js).
# Sans ça : 404 sur une partie des chunks sous `/_next/static/*`.
RUN mkdir -p apps/web/.next/standalone/apps/web/.next \
  && cp -r apps/web/public apps/web/.next/standalone/apps/web/public \
  && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

FROM base AS runner
# Runtime : Dokploy `NODE_ENV=preproduction` (compose environment).
# Ne pas figer NODE_ENV ici via ARG — Next standalone le force à production au boot.
# L’entrypoint copie NODE_ENV → STARIUM_NODE_ENV avant `server.js`.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

COPY --from=builder /app /app
COPY apps/web/docker-entrypoint.sh /app/apps/web/docker-entrypoint.sh
RUN chmod +x /app/apps/web/docker-entrypoint.sh

EXPOSE 3000
CMD ["sh", "/app/apps/web/docker-entrypoint.sh"]
