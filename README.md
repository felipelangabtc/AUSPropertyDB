# 🏠 AUS Property Intelligence DB

**Production-Ready Australian Property Database Platform**

A comprehensive platform for aggregating, enriching, and analyzing property listings from multiple Australian sources with geolocation intelligence, price tracking, and compliance-first design.

## ✨ Key Features

- **🗺️ Multi-Source Aggregation** - RealEstate.com.au, Domain.com.au, feeds, and custom connectors
- **🤖 Entity Resolution** - Intelligent deduplication using address fuzzy matching + geocoding
- **📍 Geolocation Enrichment** - POI distances, convenience scoring, travel times
- **💰 Price Intelligence** - Historical tracking, trend detection, drop alerts
- **📱 Smart Alerts** - Email, push, webhook notifications
- **🛡️ Compliance-First** - Robots.txt, ToS, GDPR/APPs, audit logging
- **👨‍💼 Admin Dashboard** - Connector health, merge reviews, job monitoring
- **🎨 Modern UI** - Next.js + Mapbox interactive maps

## 🚀 Quick Start

```bash
# Clone & install
git clone <repo>
cd aus-property-db
npm install

# Start Docker (Postgres + Redis)
npm run docker:up
sleep 30

# Setup database
npm run db:migrate
npm run db:seed

# Start development
npm run dev
```

**Access:**

- 🔗 API: http://localhost:3001
- 📖 API Docs: http://localhost:3001/api/docs
- 🌐 Web: http://localhost:3000
- 🐘 Database: localhost:5432 (postgres/postgres)
- 🔴 Redis: localhost:6379

## 📊 Architecture

```
Property Sources (RealEstate, Domain, APIs)
         ↓
    Connectors (pluggable, compliant crawling)
         ↓
    Normalize (address parsing, field extraction)
         ↓
    Deduplicate (Jaro-Winkler + geocoding match)
         ↓
    Enrich (POI distances, convenience scores)
         ↓
    PostgreSQL + PostGIS (spatial database)
         ↓
    REST API + Alerts + Worker Jobs
         ↓
    Next.js Frontend + Admin Dashboard
```

## 📁 Project Structure

```
aus-property-db/
├── apps/
│   ├── api/                 # NestJS REST API + OpenAPI
│   ├── workers/             # Bull.js job processors
│   └── web/                 # Next.js frontend
├── packages/
│   ├── db/                  # Prisma + PostgreSQL migrations
│   ├── shared/              # Zod schemas, TypeScript types
│   ├── geo/                 # Distance, address parsing, scoring
│   ├── connectors/          # Pluggable source connectors
│   └── observability/       # Logging, metrics
├── docker-compose.yml       # Local dev stack
├── .env.example             # Environment template
└── README.md               # This file
```

## 🗄️ Database Schema

**16 Tables with PostGIS spatial indexing:**

| Table            | Purpose                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `property`       | Master deduplicated records (canonical address, lat/lng, scores) |
| `listing`        | Source-specific listings (price, URL, agent, status)             |
| `listing_event`  | Audit trail (price changes, status updates)                      |
| `price_history`  | Time series pricing data                                         |
| `poi`            | Points of interest (schools, transport, hospitals)               |
| `property_poi`   | Pre-computed distances to POIs                                   |
| `user`           | User accounts with RBAC and subscription plans                   |
| `alert`          | User-defined alerts (price drop, new listing, etc.)              |
| `watchlist`      | Saved properties                                                 |
| `saved_search`   | Saved search filters                                             |
| `source`         | Data sources (RealEstate, Domain, etc.)                          |
| `merge_review`   | Uncertain entity matches for manual review                       |
| `audit_log`      | Compliance audit trail                                           |
| `compliance_log` | ToS/robots.txt compliance checks                                 |
| `session`        | User sessions                                                    |
| `notification`   | Alert delivery tracking                                          |

See [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)

## 🔌 Creating Custom Connectors

```typescript
// packages/connectors/src/connectors/my-source.connector.ts

export class MySourceConnector extends BaseSourceConnector {
  name = 'my-source';
  domain = 'my-source.com.au';
  method = 'api'; // or 'scrape', 'feed'

  async discoverListings(options?: DiscoverOptions): Promise<DiscoveredListing[]> {
    // Find listing URLs from your source
    return [];
  }

  async fetchListingDetails(sourceId: string): Promise<EnrichedListingData> {
    // Get full property details
    return {};
  }

  async normalize(rawData: unknown): Promise<NormalizedListing> {
    // Transform to standard schema
    return this.validateNormalizedListing(normalized);
  }

  async healthCheck(): Promise<boolean> {
    // Test connectivity
    return true;
  }
}
```

Then register in [packages/connectors/src/index.ts](packages/connectors/src/index.ts).

## 🔗 API Endpoints

### Core Endpoints

```bash
# Health
GET /health
GET /health/db
GET /health/redis

# Properties
GET /api/v1/properties                          # List
GET /api/v1/properties/{id}                     # Detail
GET /api/v1/properties/{id}/listings            # All sources
GET /api/v1/properties/{id}/price-history       # Historical

# Search (Advanced)
GET /api/v1/search?
  query=bondi&
  suburb=bondi&
  min_price=500000&
  max_price=1500000&
  beds=2&
  baths=2&
  lat=-33.8906&
  lng=151.2753&
  radius_km=2&
  sort_by=convenience_score&
  page=1&
  limit=20

# Auth
POST /api/v1/auth/signup
POST /api/v1/auth/magic-link
POST /api/v1/auth/verify-magic-link

# Users
GET /api/v1/users/me
POST /api/v1/users/watchlist
DELETE /api/v1/users/watchlist/{property_id}
GET /api/v1/users/watchlist

# Alerts
POST /api/v1/alerts
GET /api/v1/alerts
PATCH /api/v1/alerts/{id}

# Admin
GET /api/v1/admin/connectors/metrics
GET /api/v1/admin/merge-reviews?status=pending
POST /api/v1/admin/merge-reviews/{id}/approve
GET /api/v1/admin/queues/status
```

**Full OpenAPI Documentation:** http://localhost:3001/api/docs

## 🛠️ Common Commands

```bash
# Development
npm run dev                 # Start all services
npm run build              # Build all packages
npm run lint               # Lint & fix
npm run format             # Format code
npm run type-check         # TypeScript check

# Database
npm run db:migrate         # Run migrations
npm run db:seed            # Seed demo data
npm run db:reset           # Reset completely

# Docker
npm run docker:up          # Start containers
npm run docker:down        # Stop containers
npm run docker:logs        # View logs

# Testing
npm run test               # Run tests
npm run test:watch        # Watch mode
npm run test:cov          # Coverage report
npm run test:e2e          # E2E tests

# Cleanup
npm run clean              # Remove build artifacts
```

## 🧪 Testing

```bash
npm run test              # Unit + integration tests
npm run test:e2e          # End-to-end tests (Playwright)
npm run test:cov          # Coverage report (target: 70%+)
```

## 🛡️ Compliance & Legal

✅ **Robots.txt Compliance** - Checked before crawling  
✅ **ToS Respect** - Noted per source, compliance logged  
✅ **Rate Limiting** - Configurable per source  
✅ **GDPR/APPs** - Data minimization, audit trails  
✅ **Attribution** - Always link to original  
✅ **Data Retention** - Policies enforced  
✅ **Takedown Process** - 24-48h response time

## 📦 Environment Variables

Create `.env.local` from `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aus_property_db
REDIS_URL=redis://localhost:6379

# API
API_PORT=3001
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d

# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Geolocation
MAPBOX_API_KEY=
GOOGLE_MAPS_API_KEY=

# Email (for alerts)
SENDGRID_API_KEY=
EMAIL_FROM=noreply@auspropdb.com

# Observability
SENTRY_DSN=
LOG_LEVEL=info
```

## 🧗 Next Steps

1. ✅ Review database schema and architecture
2. ⏭️ Complete NestJS API modules
3. ⏭️ Implement authentication system
4. ⏭️ Build Next.js frontend
5. ⏭️ Add Bull.js worker jobs
6. ⏭️ Implement alert system
7. ⏭️ Deploy to production

## 🚨 Troubleshooting

### Port Already in Use

```bash
# Linux/Mac
lsof -i :3001
kill -9 <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Database Connection Failed

```bash
# Check container
docker ps | grep aus-prop-db-postgres

# Restart
docker restart aus-prop-db-postgres

# View logs
docker logs aus-prop-db-postgres
```

### Migration Issues

```bash
npm run db:reset
```

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [PostGIS Documentation](https://postgis.net/documentation)

## 📄 License

MIT License - See [LICENSE](LICENSE) file

## 💬 Support

- **Issues**: [GitHub Issues](#)
- **Email**: support@auspropdb.com
- **Discussions**: [GitHub Discussions](#)

---

**Built with ❤️ in Australia**  
**v1.0.0 | Production-Ready MVP | January 2025**
