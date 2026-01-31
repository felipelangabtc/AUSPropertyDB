# Multi-stage build for API

FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY packages/geo ./packages/geo
COPY packages/connectors ./packages/connectors
COPY packages/observability ./packages/observability
COPY apps/api ./apps/api

RUN npm install --frozen-lockfile
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env.example ./.env.example

EXPOSE 3001

CMD ["node", "dist/apps/api/src/main.js"]
