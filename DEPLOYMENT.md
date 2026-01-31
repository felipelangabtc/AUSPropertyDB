# Deployment Guide

Complete guide for deploying AUS Property Intelligence DB to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Platforms](#cloud-platforms)
6. [Database Migrations](#database-migrations)
7. [Environment Setup](#environment-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Node.js**: v18+ (tested with v24)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **PostgreSQL**: 16+ (for production, can use RDS/Cloud SQL)
- **Redis**: 7+ (for caching and queues)
- **Git**: 2.30+
- **pnpm**: 9.x (package manager)

### Required Services (External)

- **Mapbox**: API key for geocoding
- **SendGrid**: API key for emails
- **AWS S3** (optional): For file storage
- **Sentry**: For error tracking
- **MongoDB Atlas** (optional): For analytics

## Local Development

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/aus-property-intelligence-db.git
cd aus-property-intelligence-db

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Start Docker services (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Run database migrations
pnpm db:migrate

# Seed with demo data
pnpm db:seed

# Start development servers
pnpm dev
```

### Accessing the Application

- **API**: http://localhost:3001
- **Web**: http://localhost:3000
- **API Docs**: http://localhost:3001/api/docs
- **Adminer** (DB UI): http://localhost:8080
- **Redis Commander**: http://localhost:8081

### Development Workflow

```bash
# Start all services in watch mode
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Format code
pnpm format

# Lint code
pnpm lint

# Type check
pnpm type-check
```

## Docker Deployment

### Build Images

```bash
# Build all services
docker compose build

# Build specific service
docker compose build api

# Build with specific stage (production)
docker compose build --target production api
```

### Run with Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data!)
docker compose down -v
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: aus_property_db
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: production
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${DATABASE_PASSWORD}@postgres:5432/aus_property_db
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    ports:
      - "3001:3001"

  workers:
    build:
      context: .
      dockerfile: apps/workers/Dockerfile
      target: production
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${DATABASE_PASSWORD}@postgres:5432/aus_property_db
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    deploy:
      replicas: 2

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: production
    environment:
      NEXT_PUBLIC_API_URL: https://api.example.com
    restart: always
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:
```

Run with:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Kubernetes Deployment

### Prerequisites

- **kubectl**: 1.24+
- **Helm**: 3.10+ (optional but recommended)
- Kubernetes cluster (EKS, GKE, AKS, or self-managed)

### Create Namespace

```bash
kubectl create namespace aus-property-db
kubectl config set-context --current --namespace=aus-property-db
```

### Deploy PostgreSQL

```bash
# Using PostgreSQL Helm chart
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install postgres bitnami/postgresql \
  --set auth.password=<secure-password> \
  --set persistence.size=100Gi
```

### Deploy Redis

```bash
helm install redis bitnami/redis \
  --set auth.password=<secure-password> \
  --set master.persistence.size=10Gi
```

### Create ConfigMaps and Secrets

```bash
# Create secrets
kubectl create secret generic database-credentials \
  --from-literal=password=<secure-password>

kubectl create secret generic redis-credentials \
  --from-literal=password=<secure-password>

kubectl create secret generic api-keys \
  --from-literal=jwt-secret=<secure-jwt-secret> \
  --from-literal=mapbox-api-key=<key>
```

### Deploy Application

Create `k8s/api-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: aus-property-db
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: yourusername/aus-property-db-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: aus-property-db
spec:
  selector:
    app: api
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
```

Deploy:

```bash
kubectl apply -f k8s/
```

## Cloud Platforms

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy web app
cd apps/web
vercel --prod
```

### Railway.app (Backend + Database)

1. Push code to GitHub
2. Connect repository in Railway dashboard
3. Add environment variables
4. Deploy

### Render.com (Full Stack)

```bash
# Create render.yaml in root
```

### AWS ECS (Elastic Container Service)

```bash
# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster aus-property-db \
  --service-name api \
  --task-definition api:1 \
  --desired-count 3 \
  --load-balancers targetGroupArn=arn:aws:...,containerName=api,containerPort=3001
```

## Database Migrations

### Development

```bash
# Create new migration
pnpm db:migrate:dev --name add_new_table

# Preview migrations
pnpm db:migrate:resolve

# Reset database (WARNING: destroys data!)
pnpm db:migrate:reset
```

### Production

```bash
# View pending migrations
pnpm db:migrate:status

# Apply migrations
pnpm db:migrate:deploy

# Create migration from schema changes
pnpm db:migrate:diff --name changes
```

### Backup Before Migration

```bash
# PostgreSQL backup
pg_dump -U postgres -h localhost aus_property_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -U postgres -h localhost aus_property_db < backup_20250115_120000.sql
```

## Environment Setup

### Production Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/aus_property_db
DATABASE_REPLICA_URL=postgresql://user:pass@host:5432/aus_property_db_replica

# Redis
REDIS_URL=redis://user:pass@host:6379

# Security
JWT_SECRET=<64-char-random-string>
MAGIC_LINK_SECRET=<64-char-random-string>

# API Keys
MAPBOX_API_KEY=<key>
SENDGRID_API_KEY=<key>

# Services
SENTRY_DSN=<dsn>
STRIPE_SECRET_KEY=<key>

# Email
EMAIL_FROM=noreply@auspropdb.com
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
```

### Generate Secure Secrets

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Monitoring & Logging

### Application Logs

```bash
# View API logs
docker compose logs -f api

# View worker logs
docker compose logs -f workers

# Filter by service
docker compose logs -f api | grep ERROR
```

### Database Monitoring

```bash
# Monitor active queries
SELECT * FROM pg_stat_activity;

# Check index usage
SELECT * FROM pg_stat_user_indexes;

# Monitor slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC;
```

### Redis Monitoring

```bash
# Connect to Redis CLI
redis-cli

# Check memory usage
INFO memory

# Monitor commands
MONITOR
```

### Sentry Integration

1. Create Sentry account
2. Create project
3. Add DSN to `.env`
4. Errors automatically tracked

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql -h localhost -U postgres -d aus_property_db

# Check PostgreSQL logs
docker compose logs postgres

# Verify credentials
echo $DATABASE_URL
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check Redis logs
docker compose logs redis

# Verify password
redis-cli -a <password> ping
```

### Worker Job Stuck

```bash
# Check queue status
curl http://localhost:3001/health/queue

# Clear stuck jobs
redis-cli KEYS "bull:*" | xargs redis-cli DEL
```

### High Memory Usage

```bash
# Check memory in PostgreSQL
SELECT pg_database.datname,
       pg_size_pretty(pg_database_size(pg_database.datname))
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;
```

### Slow API Responses

```bash
# Check query performance
EXPLAIN ANALYZE SELECT * FROM "Property" LIMIT 10;

# Add missing indexes if needed
```

## Health Checks

Verify deployment health:

```bash
# Check API health
curl http://localhost:3001/health

# Check database connection
curl http://localhost:3001/health/db

# Check Redis connection
curl http://localhost:3001/health/redis

# Check worker health
curl http://localhost:3001/health/workers
```

## Rollback Procedure

```bash
# In case of failed deployment
docker compose down
docker pull yourusername/aus-property-db-api:previous-version
docker compose up -d

# Or in Kubernetes
kubectl rollout undo deployment/api
```

## Performance Optimization

### Database

- Add indexes on frequently queried columns
- Enable query logging in Prisma
- Use read replicas for scaling queries

### Redis

- Set appropriate memory limits
- Use Redis persistence (RDB/AOF)
- Configure eviction policy

### API

- Enable caching for listing queries
- Implement pagination (limit 50 items)
- Use compression (gzip)

### Frontend

- Enable static generation (ISR)
- Compress images and assets
- Use CDN for static files

---

For more information, see [README.md](README.md)
