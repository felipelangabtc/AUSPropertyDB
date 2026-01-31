# Architecture Overview

Complete architecture documentation for AUS Property Intelligence DB.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Monorepo Structure](#monorepo-structure)
3. [Technology Stack](#technology-stack)
4. [Data Flow](#data-flow)
5. [Module Descriptions](#module-descriptions)
6. [Database Schema](#database-schema)
7. [API Design](#api-design)
8. [Job Processing](#job-processing)
9. [Deployment Architecture](#deployment-architecture)

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Application                        │
│  (Next.js - React - TanStack Query - Mapbox)             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              REST API Layer                              │
│  (NestJS - OpenAPI/Swagger - Rate Limiting)              │
│  - Health Module                                         │
│  - Auth Module (JWT + Magic Links)                       │
│  - User Module (Profiles, Watchlists)                    │
│  - Property Module (Listings, Queries)                   │
│  - Search Module (Advanced Filters)                      │
│  - Admin Module (Metrics, Queue Status)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    ┌────────┐   ┌────────┐    ┌────────┐
    │Cache   │   │Queue   │    │Logging │
    │(Redis) │   │(Bull) │    │(Winston)│
    └────────┘   └────────┘    └────────┘
         │             │             │
         └─────────────┼─────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            Background Job Processing                     │
│  (Bull.js Worker Processes)                              │
│  - Crawl: Fetch from data sources                        │
│  - Normalize: Parse and validate                         │
│  - Dedupe: Entity resolution & merging                   │
│  - Geo: Distance & convenience scoring                   │
│  - Alerts: Dispatch notifications                        │
│  - Index: Update search indexes                          │
│  - Reports: Generate analytics                           │
│  - Cleanup: Archive and delete old data                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│          PostgreSQL Database                             │
│  (16 tables, PostGIS extension)                          │
│  - Properties (deduplicated records)                     │
│  - Listings (source-specific)                            │
│  - Users & Sessions                                      │
│  - Alerts & Watchlists                                   │
│  - Audit & Compliance Logs                               │
└─────────────────────────────────────────────────────────┘
```

## Monorepo Structure

### Apps (User-facing)

```
apps/
├── api/                    # NestJS REST API
│   ├── src/
│   │   ├── main.ts        # Bootstrap & Helmet setup
│   │   ├── app.module.ts  # Root module
│   │   └── modules/       # Feature modules
│   │       ├── health/    # Health checks
│   │       ├── auth/      # Authentication
│   │       ├── user/      # User management
│   │       ├── property/  # Property queries
│   │       ├── search/    # Advanced search
│   │       └── admin/     # Admin endpoints
│   ├── Dockerfile         # Multi-stage build
│   └── package.json
│
├── web/                   # Next.js Frontend
│   ├── app/
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Home page
│   │   └── [features]/    # Feature pages
│   ├── components/
│   │   ├── common/        # Shared components
│   │   ├── features/      # Feature components
│   │   └── layouts/       # Layout components
│   ├── Dockerfile
│   └── package.json
│
└── workers/               # Bull.js Job Processors
    ├── src/
    │   ├── main.ts       # Bootstrap 8 job processors
    │   └── queues/       # Queue initialization
    ├── Dockerfile
    └── package.json
```

### Packages (Shared Libraries)

```
packages/
├── shared/                # Schemas & Types
│   ├── src/
│   │   ├── schemas/      # 16 Zod entity schemas
│   │   └── types/        # TypeScript types
│   └── package.json
│
├── db/                    # Database & ORM
│   ├── prisma/
│   │   └── schema.prisma # Complete DB schema
│   ├── src/
│   │   ├── seed.ts       # Demo data
│   │   └── index.ts      # Prisma client
│   └── package.json
│
├── geo/                   # Geolocation & Scoring
│   ├── src/
│   │   ├── distance.ts   # Haversine calculations
│   │   ├── scoring.ts    # Convenience scores
│   │   ├── address.ts    # Address parsing
│   │   └── index.ts      # Exports
│   └── package.json
│
├── connectors/            # Data Source Adapters
│   ├── src/
│   │   ├── base.connector.ts # Abstract base
│   │   ├── connectors/       # Implementations
│   │   │   ├── demo-json.connector.ts
│   │   │   └── realestate-au.connector.ts
│   │   └── index.ts          # Registry
│   └── package.json
│
├── observability/         # Logging & Tracing
│   ├── src/
│   │   ├── logger.ts     # Winston config
│   │   └── index.ts      # Exports
│   └── package.json
│
├── eslint-config/         # Shared ESLint config
├── typescript-config/     # Shared tsconfig
└── ui/                    # Reusable UI components
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Styling**: Tailwind CSS 3
- **UI Components**: shadcn/ui
- **State Management**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **Mapping**: Mapbox GL JS
- **Charts**: Recharts
- **HTTP**: axios

### Backend
- **Runtime**: Node.js 18+
- **API Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL 16 + PostGIS 3.4
- **Cache/Queue**: Redis 7 + Bull.js
- **Validation**: Zod
- **Logging**: Winston

### DevOps
- **Package Manager**: pnpm 9
- **Monorepo**: Turborepo
- **Containerization**: Docker
- **Orchestration**: Docker Compose / Kubernetes
- **CI/CD**: GitHub Actions
- **Error Tracking**: Sentry

### Testing
- **Unit**: Jest / Vitest
- **E2E**: Playwright
- **Coverage**: 70%+ target

## Data Flow

### Property Ingestion Pipeline

```
External Sources
    │
    ├─► RealEstate.com.au
    ├─► Domain.com.au
    ├─► Realestate.com.au
    └─► Custom Connectors
        │
        ▼
    Crawl Job
    (Discover & Fetch)
        │
        ▼
    Raw Listings Data
    (Stored in Redis Queue)
        │
        ▼
    Normalize Job
    (Parse & Validate)
        │
        ├─► Zod Validation
        ├─► Price extraction
        └─► URL normalization
        │
        ▼
    Normalized Listings
    (Ready for deduplication)
        │
        ▼
    Dedupe Job
    (Entity Resolution)
        │
        ├─► Fuzzy address matching
        ├─► Geocoding proximity
        └─► Attribute comparison
        │
        ▼
    Deduplicated Properties
    (Stored in Database)
        │
        ▼
    Geo Job
    (Enrichment)
        │
        ├─► Calculate POI distances
        ├─► Compute convenience scores
        └─► Update spatial indexes
        │
        ▼
    Enriched Properties
    (Ready for search/alerts)
```

### User Query Flow

```
User Search Request
    │
    ▼
Web Frontend
(React Component)
    │
    ▼
API Gateway
(Rate Limiting, Auth)
    │
    ▼
Search Module Controller
    │
    ▼
Query Builder
    │
    ├─► Filter builder
    ├─► Geographic radius
    ├─► Price range
    └─► Convenience score
    │
    ▼
Cache Check (Redis)
    │
    ├─► Hit: Return cached
    └─► Miss: Query database
        │
        ▼
    Database Query
    (Prisma ORM)
        │
        ├─► Spatial query (PostGIS)
        ├─► Index usage
        └─► Join with listings
        │
        ▼
    Results Set
    (Properties + Listings)
        │
        ▼
    Cache Store
    (5 min TTL)
        │
        ▼
    API Response
    (JSON + OpenAPI)
        │
        ▼
    Web Frontend
    (Display map + list)
```

## Module Descriptions

### Health Module ✅
- **Status**: Complete
- **Purpose**: System health checks
- **Endpoints**:
  - `GET /health` - Overall system
  - `GET /health/db` - Database connectivity
  - `GET /health/redis` - Cache connectivity
  - `GET /health/connectors` - Data source status
- **Responses**: `{status: 'ok'|'degraded'|'down', timestamp, details}`

### Auth Module 🟡
- **Status**: Scaffolded
- **Purpose**: Authentication & authorization
- **Endpoints**:
  - `POST /auth/signup` - User registration
  - `POST /auth/magic-link` - Request magic link
  - `POST /auth/verify-magic-link` - Verify token
  - `POST /auth/refresh` - Refresh JWT
- **Implementation**: JWT + Magic Links (passwordless)

### User Module 🟡
- **Status**: Scaffolded
- **Purpose**: User profiles & preferences
- **Endpoints**:
  - `GET /users/me` - Current user profile
  - `PUT /users/me` - Update profile
  - `GET /users/:id/watchlist` - Saved properties
  - `POST /users/:id/watchlist` - Add to watchlist
  - `DELETE /users/:id/watchlist/:property_id` - Remove

### Property Module 🟡
- **Status**: Scaffolded
- **Purpose**: Property queries & details
- **Endpoints**:
  - `GET /properties` - List with pagination
  - `GET /properties/:id` - Property detail
  - `GET /properties/:id/listings` - Source listings
  - `GET /properties/:id/price-history` - Historical prices
  - `GET /properties/:id/pois` - Nearby points of interest

### Search Module 🟡
- **Status**: Scaffolded
- **Purpose**: Advanced property search
- **Endpoints**:
  - `POST /search` - Advanced search with filters
  - `GET /search/suggestions` - Address autocomplete
  - `POST /search/saved` - Save search
  - `GET /search/saved` - List saved searches
- **Filters**: Price, suburb, convenience score, POI proximity, property type

### Admin Module 🟡
- **Status**: Scaffolded
- **Purpose**: Administrative operations
- **Endpoints**:
  - `GET /admin/metrics` - System metrics
  - `GET /admin/queue/status` - Job queue status
  - `POST /admin/connectors/:id/test` - Test connector
  - `GET /admin/audit-log` - Audit trail
  - `POST /admin/merge-review` - Manual deduplication

## Database Schema

### Core Tables (16 total)

#### Properties
```sql
CREATE TABLE "Property" (
  id UUID PRIMARY KEY,
  canonical_address VARCHAR(255),
  suburb VARCHAR(100),
  state VARCHAR(3),
  postcode VARCHAR(4),
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  property_type ENUM('house','apartment','land','townhouse'),
  bedrooms INT,
  bathrooms INT,
  parking INT,
  land_size_sqm FLOAT,
  building_size_sqm FLOAT,
  convenience_score INT (0-100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  SPATIAL INDEX (lat, lng),
  UNIQUE INDEX (address_fingerprint)
);
```

#### Listings
```sql
CREATE TABLE "Listing" (
  id UUID PRIMARY KEY,
  property_id UUID (FK),
  source_id UUID (FK),
  source_listing_id VARCHAR(255),
  price_aud INT,
  price_range_min INT,
  price_range_max INT,
  listing_url VARCHAR(500),
  agent_name VARCHAR(255),
  agent_phone VARCHAR(20),
  status ENUM('active','sold','withdrawn'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE (source_id, source_listing_id),
  INDEX (property_id)
);
```

#### ListingEvents
```sql
CREATE TABLE "ListingEvent" (
  id UUID PRIMARY KEY,
  listing_id UUID (FK),
  event_type ENUM('price_changed','status_changed','delisted'),
  old_value VARCHAR(255),
  new_value VARCHAR(255),
  created_at TIMESTAMP
);
```

#### Users, Sessions, Alerts, Watchlists, etc.
(See [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma))

## API Design

### Response Envelope

All API responses follow consistent structure:

```json
{
  "success": boolean,
  "data": {},
  "error": {
    "code": string,
    "message": string,
    "details": {}
  },
  "meta": {
    "timestamp": ISO8601,
    "version": "v1",
    "requestId": UUID
  }
}
```

### Pagination

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Handling

- **400**: Bad request (validation error)
- **401**: Unauthorized (missing JWT)
- **403**: Forbidden (insufficient permissions)
- **404**: Not found
- **429**: Rate limited
- **500**: Server error

## Job Processing

### Bull.js Queue Architecture

```
Redis
  │
  ├─► crawlQueue (rate: 3/min)
  ├─► normalizeQueue (rate: unlimited)
  ├─► dedupeQueue (rate: 10/sec)
  ├─► geoQueue (rate: 10/sec)
  ├─► alertQueue (rate: 15/min)
  ├─► indexQueue (rate: unlimited)
  ├─► reportQueue (rate: unlimited)
  └─► cleanupQueue (rate: daily)
```

### Job Lifecycle

```
Job Created
    ▼
Queued (waiting for worker)
    ▼
Processing (worker acquired)
    ▼
Completed / Failed
    ▼
Archived (7 day retention)
    ▼
Deleted
```

### Recurring Jobs (Cron)

```
crawlQueue:      0 */6 * * *  (every 6 hours)
dedupeQueue:     0 2 * * *    (2:00 AM daily)
geoQueue:        0 3 * * *    (3:00 AM daily)
alertQueue:      */15 * * * * (every 15 min)
cleanupQueue:    0 4 * * 0    (4:00 AM Sunday)
```

## Deployment Architecture

### Development
- Docker Compose (PostgreSQL, Redis, API, Workers, Web)
- Hot-reload enabled
- Mock data seeded

### Staging
- Kubernetes cluster
- Replicas: 2 (API, Workers)
- Full monitoring stack
- Production secrets injected

### Production
- **Database**: AWS RDS PostgreSQL (Multi-AZ)
- **Cache**: AWS ElastiCache Redis (Cluster mode)
- **API**: Kubernetes on EKS (Auto-scaling 2-10 replicas)
- **Workers**: Kubernetes on EKS (2-5 replicas)
- **Frontend**: Vercel (CDN, Edge Functions)
- **Storage**: AWS S3 (CloudFront CDN)
- **Monitoring**: Datadog + Sentry
- **DNS**: Route53 with health checks
- **SSL/TLS**: ACM certificates + CloudFront

### High Availability

- Multi-region database replicas
- Worker queue redundancy
- Graceful shutdown (30s drain period)
- Health checks every 10s
- Auto-restart on failure
- Database connection pooling

---

For more details, see:
- [README.md](README.md) - Project overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guide
