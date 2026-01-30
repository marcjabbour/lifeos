FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace package.json files
COPY packages/shared/package.json ./packages/shared/
COPY services/adk-agent/package.json ./services/adk-agent/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the shared package
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/adk-agent/node_modules ./services/adk-agent/node_modules

# Copy source files
COPY packages/shared ./packages/shared
COPY services/adk-agent ./services/adk-agent
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Build shared package first
RUN pnpm --filter @lifeos/shared build

# Build the service
RUN pnpm --filter @lifeos/adk-agent build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono
USER hono

# Copy built assets
COPY --from=builder --chown=hono:nodejs /app/services/adk-agent/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/services/adk-agent/package.json ./package.json
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hono:nodejs /app/packages/shared/dist ./node_modules/@lifeos/shared/dist
COPY --from=builder --chown=hono:nodejs /app/packages/shared/package.json ./node_modules/@lifeos/shared/package.json

EXPOSE 4001

ENV PORT=4001

CMD ["node", "dist/server.js"]
