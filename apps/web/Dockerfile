FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
WORKDIR /app

FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @starium-orchestra/types build
RUN pnpm --filter @starium-orchestra/web build
# Standalone n’embarque pas automatiquement `public` + `.next/static` (doc Next.js).
# Sans ça : 404 sur une partie des chunks sous `/_next/static/*`.
RUN mkdir -p apps/web/.next/standalone/apps/web/.next \
  && cp -r apps/web/public apps/web/.next/standalone/apps/web/public \
  && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000
# Next 15 + monorepo : le point d’entrée standalone n’est pas à la racine de `.next/standalone`
CMD ["node", "apps/web/.next/standalone/apps/web/server.js"]