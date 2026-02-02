FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY backend/package.json ./backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY backend ./backend
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Build packages in order
RUN pnpm --filter @lifeos/shared build
RUN pnpm --filter @lifeos/db build
RUN pnpm --filter @lifeos/backend build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono
USER hono

# Copy built assets
COPY --from=builder --chown=hono:nodejs /app/backend/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/backend/package.json ./package.json
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hono:nodejs /app/packages/shared/dist ./node_modules/@lifeos/shared/dist
COPY --from=builder --chown=hono:nodejs /app/packages/shared/package.json ./node_modules/@lifeos/shared/package.json
COPY --from=builder --chown=hono:nodejs /app/packages/db/dist ./node_modules/@lifeos/db/dist
COPY --from=builder --chown=hono:nodejs /app/packages/db/package.json ./node_modules/@lifeos/db/package.json

EXPOSE 4000

ENV PORT=4000

CMD ["node", "dist/index.js"]
