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
WORKDIR /app

COPY --from=builder /app /app

# 🔴 ENTRYPOINT : garantit JWT_SECRET au runtime
RUN echo '#!/bin/sh' > /entrypoint.sh \
 && echo 'export JWT_SECRET=${JWT_SECRET:-hardcoded_dev_secret_123456}' >> /entrypoint.sh \
 && echo 'echo "JWT_SECRET set: ${JWT_SECRET:+OK}"' >> /entrypoint.sh \
 && echo 'exec node apps/api/dist/main.js' >> /entrypoint.sh \
 && chmod +x /entrypoint.sh

EXPOSE 3001

CMD ["/entrypoint.sh"]