# Multi-stage build for Web

FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/web ./apps/web

RUN npm install --frozen-lockfile
RUN cd apps/web && npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package*.json ./apps/web/
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]
