FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
WORKDIR /app

FROM base AS builder
# Pour Docker dev : le proxy Next doit appeler l’API via le nom de service (api-dev:3001).
# Passé en build arg par docker-compose pour web-dev ; défaut pour profile standard.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @starium-orchestra/types build
RUN pnpm --filter @starium-orchestra/web build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
