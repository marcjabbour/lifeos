FROM node:20-slim AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY backend ./backend
COPY tsconfig.json ./

RUN pnpm --filter @lifeos/shared build
RUN pnpm --filter @lifeos/backend build

FROM base AS runner

ENV NODE_ENV=production

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/db/src ./packages/db/src
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

WORKDIR /app/backend

EXPOSE 4000

CMD ["node", "dist/index.js"]
