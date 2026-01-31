# Multi-stage build for Workers

FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY packages/geo ./packages/geo
COPY packages/connectors ./packages/connectors
COPY packages/observability ./packages/observability
COPY apps/workers ./apps/workers

RUN npm install --frozen-lockfile
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

CMD ["node", "dist/apps/workers/src/main.js"]
