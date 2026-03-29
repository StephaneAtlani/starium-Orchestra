FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
WORKDIR /app

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @starium-orchestra/types build
RUN pnpm --filter @starium-orchestra/api exec prisma generate
RUN pnpm --filter @starium-orchestra/api build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
WORKDIR /app
COPY --from=builder /app /app

EXPOSE 3001
CMD ["sh", "-c", "pnpm --filter @starium-orchestra/api prisma:migrate && node apps/api/dist/main.js"]