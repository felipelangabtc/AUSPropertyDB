# Technology Stack

Complete reference of all technologies used in AUS Property Intelligence DB.

## Backend

### Runtime & Framework
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18.0+ (tested with v24) | JavaScript runtime |
| **NestJS** | 10.x | REST API framework |
| **Express** | 4.x | HTTP server (via NestJS) |

### Database
| Technology | Version | Purpose |
|-----------|---------|---------|
| **PostgreSQL** | 16 | Primary database |
| **PostGIS** | 3.4 | Spatial database extension |
| **Prisma** | 5.x | ORM and database client |
| **Redis** | 7.x | In-memory cache and queue |

### Validation & Type Safety
| Technology | Version | Purpose |
|-----------|---------|---------|
| **TypeScript** | 5.3 | Strongly typed language |
| **Zod** | 3.x | Schema validation library |

### Job Queue & Workers
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Bull.js** | 5.x | Redis-based job queue |
| **ioredis** | 5.x | Redis client library |

### Logging & Monitoring
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Winston** | 3.x | Logging library |
| **Winston Daily Rotate File** | 4.x | Log file rotation |
| **Sentry** | 7.x | Error tracking (optional) |

### Security
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Helmet** | 7.x | HTTP security headers |
| **Passport.js** | 0.6.x | Authentication middleware |
| **jsonwebtoken** | 9.x | JWT token generation |
| **bcrypt** | 5.x | Password hashing |

### Additional Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **class-validator** | 0.14.x | Decorator-based validation |
| **class-transformer** | 0.5.x | Object transformation |
| **axios** | 1.x | HTTP client |
| **cheerio** | 1.x | HTML parsing (for web scraping) |
| **OpenTelemetry** | 0.49.x | Distributed tracing (optional) |

---

## Frontend

### Framework & Runtime
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.x | UI library |
| **Next.js** | 14.x | React framework (SSR, SSG) |
| **TypeScript** | 5.3 | Strongly typed language |

### Styling
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **Tailwind UI** | - | Component library (optional) |
| **shadcn/ui** | latest | Accessible component library |

### State Management
| Technology | Version | Purpose |
|-----------|---------|---------|
| **TanStack Query** | 5.x | Data fetching & caching |
| **Zustand** | 4.x | Lightweight state management |

### Forms & Validation
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React Hook Form** | 7.x | Flexible form library |
| **Zod** | 3.x | Schema validation |

### Mapping & Geolocation
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Mapbox GL JS** | 3.x | Interactive maps |
| **geolib** | 3.x | Geolocation utilities |

### Data Visualization
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Recharts** | 2.x | React charting library |

### HTTP & API
| Technology | Version | Purpose |
|-----------|---------|---------|
| **axios** | 1.x | HTTP client |
| **swr** | 2.x | Data fetching (optional alternative to TanStack Query) |

### Additional Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **clsx** | 2.x | Conditional classnames |
| **date-fns** | 2.x | Date manipulation |
| **react-toastify** | 9.x | Toast notifications |
| **Sentry** | 7.x | Error tracking (optional) |

---

## DevOps & Infrastructure

### Containerization
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Docker** | 20.10+ | Container runtime |
| **Docker Compose** | 2.0+ | Multi-container orchestration |

### Orchestration (Future)
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Kubernetes** | 1.24+ | Container orchestration (production) |
| **Helm** | 3.10+ | Kubernetes package manager (optional) |

### CI/CD
| Technology | Version | Purpose |
|-----------|---------|---------|
| **GitHub Actions** | - | CI/CD platform |

### Cloud Platforms (Future)
- AWS (RDS, ElastiCache, ECS, EKS)
- Vercel (Frontend)
- Render.com (Full-stack)
- Kubernetes clusters

---

## Development Tools

### Package Management
| Technology | Version | Purpose |
|-----------|---------|---------|
| **pnpm** | 9.x | Fast package manager |
| **npm** | 11.x+ | Dependency installation |

### Monorepo
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Turborepo** | 1.x | Monorepo build system |
| **Workspaces** | - | npm workspaces |

### Code Quality
| Technology | Version | Purpose |
|-----------|---------|---------|
| **ESLint** | 8.x | JavaScript linter |
| **Prettier** | 3.x | Code formatter |
| **TypeScript** | 5.3 | Type checking |

### Testing
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Jest** | 29.x | Unit testing framework |
| **Vitest** | 1.x | Fast unit testing |
| **Playwright** | 1.x | E2E testing |
| **@testing-library/react** | 14.x | React component testing |

### Build & Compilation
| Technology | Version | Purpose |
|-----------|---------|---------|
| **TypeScript Compiler** | 5.3 | TypeScript compilation |
| **Next.js Build** | 14.x | Next.js production build |
| **tsc** | 5.3 | TypeScript to JavaScript |
| **ts-node** | 10.x | TypeScript execution |

### Documentation
| Technology | Version | Purpose |
|-----------|---------|---------|
| **OpenAPI/Swagger** | 3.0 | API documentation |
| **@nestjs/swagger** | 7.x | Swagger integration |
| **Markdown** | - | Documentation format |

### IDE & Editors
| Technology | Version | Purpose |
|-----------|---------|---------|
| **VS Code** | latest | Code editor |
| **Pylance** | - | TypeScript language server |
| **Prettier Extension** | - | Code formatting |
| **ESLint Extension** | - | Linting |

---

## Database Schema

### PostgreSQL
- **Version**: 16
- **Extensions**: PostGIS 3.4
- **Tables**: 16
- **Indexes**: 20+
- **Relationships**: Foreign keys + cascading deletes
- **Backup**: PostgreSQL native backups

### Prisma
- **ORM**: Prisma Client
- **Migrations**: Prisma Migrate
- **Schema**: Declarative schema.prisma
- **Relationships**: Automatic handling
- **Types**: Auto-generated TypeScript types

---

## External Services

### Geolocation & Maps
- **Mapbox**: Geocoding, maps, routing
- **Google Maps**: Backup geocoding (optional)
- **PostGIS**: Spatial queries (on-premise)

### Email & Notifications
- **SendGrid**: Email delivery
- **SMTP**: Fallback email (optional)
- **Twilio**: SMS (future)
- **Firebase Cloud Messaging**: Push notifications (future)

### Authentication (Future)
- **Auth0**: Identity provider (optional)
- **Supabase**: Backend-as-a-service (optional)

### Error Tracking
- **Sentry**: Error tracking and performance monitoring
- **Datadog**: APM and monitoring (future)
- **New Relic**: Performance monitoring (future)

### Analytics (Future)
- **Google Analytics**: Web analytics
- **Amplitude**: Product analytics
- **Mixpanel**: Event analytics

### Payment (Future)
- **Stripe**: Payment processing
- **Paddle**: Alternative payment processor

---

## Development Environment

### Recommended System
- **OS**: macOS, Linux, or Windows (WSL2)
- **Node.js**: 18.0+ (v24 tested)
- **RAM**: 4GB+ (8GB recommended)
- **Disk**: 10GB free space
- **Docker**: 20.10+
- **Git**: 2.30+

### IDE Setup
- **Editor**: VS Code
- **Extensions**:
  - Prettier (code formatter)
  - ESLint (linter)
  - Prisma (database)
  - Docker (containers)
  - GitLens (git)
  - GitHub Copilot (AI assistance)
  - Tailwind CSS IntelliSense
  - Mapbox GL (map preview)

---

## Version Compatibility

### Supported Versions
- **Node.js**: 18.0+ (EOL Sep 2024, but 18 LTS continues)
- **Node.js**: 20.0+ (LTS until Apr 2026) ✅ Recommended
- **Node.js**: 22.0+ (LTS until Oct 2027) ✅ Recommended
- **npm**: 9.0+
- **pnpm**: 8.0+
- **TypeScript**: 4.7+
- **PostgreSQL**: 13+
- **Redis**: 6.0+

### Tested Versions
- Node.js: v24 ✅
- npm: 11.4.2 ✅
- PostgreSQL: 16 ✅
- Redis: 7.2 ✅

---

## License & Open Source

### Licenses Used
| Package | License |
|---------|---------|
| TypeScript | Apache 2.0 |
| NestJS | MIT |
| Next.js | MIT |
| Prisma | Apache 2.0 |
| React | MIT |
| PostgreSQL | PostgreSQL License |
| Redis | Redis Source Available License |
| Tailwind CSS | MIT |
| shadcn/ui | MIT |
| Zod | MIT |
| Bull | MIT |
| Winston | MIT |

### Project License
- **AUS Property Intelligence DB**: MIT License

---

## Performance Considerations

### Database
- Connection pooling: 2-20 connections
- Query optimization: Indexed queries
- Caching: Redis with 5-minute TTL
- Full-text search: PostgreSQL tsearch

### API
- Response time target: < 200ms (p95)
- Concurrency: 100+ concurrent requests
- Rate limiting: 100 req/min per user
- Compression: gzip enabled

### Frontend
- Build size: < 1MB (gzipped)
- Bundle splitting: Dynamic imports
- Image optimization: Next.js Image component
- Code splitting: Route-based splitting

### Workers
- Job concurrency: 3-10 per queue
- Memory usage: < 500MB per worker
- Timeout: 5 minutes default
- Retries: 3 attempts with exponential backoff

---

## Scalability

### Horizontal Scaling
- **API**: Stateless, horizontal scaling ready
- **Workers**: Multiple instances supported
- **Database**: Read replicas supported
- **Cache**: Cluster mode supported

### Vertical Scaling
- **RAM**: Can increase for larger datasets
- **CPU**: Multi-core support for workers
- **Storage**: PostgreSQL WAL archiving

### Future Technologies
- **GraphQL**: Apollo Server (alternative to REST)
- **Microservices**: Separate services per domain
- **Event Streaming**: Apache Kafka (future)
- **NoSQL**: MongoDB for analytics (optional)

---

## Compliance & Security

### Data Protection
- **Encryption**: AES-256 at rest (future)
- **TLS**: HTTPS/TLS 1.3 in production
- **Database**: Encrypted backups

### Compliance
- **GDPR**: Ready (data privacy)
- **Privacy Act (AU)**: Ready (privacy principles)
- **SOC 2**: Ready for certification (future)

### Security Tools (Future)
- **WAF**: AWS WAF or Cloudflare
- **DDoS**: Cloudflare protection
- **Penetration Testing**: Regular security audits
- **Code Scanning**: Snyk, OWASP

---

## Monitoring & Logging

### Logging
- **Application Logs**: Winston with daily rotation
- **Error Logs**: Separate error log file
- **Audit Logs**: Database change tracking
- **Performance Logs**: API response times

### Monitoring (Future)
- **Metrics**: Prometheus
- **Visualization**: Grafana
- **Alerting**: PagerDuty
- **APM**: Datadog or New Relic

---

## Troubleshooting

### Common Issues
- Port conflicts: Change PORT in .env.local
- Database connection: Check DATABASE_URL
- Redis connection: Check REDIS_URL
- Build failures: Clear node_modules and reinstall

### Getting Help
- GitHub Issues: Report bugs
- Discussions: Ask questions
- Documentation: Check README.md and guides

---

For more information, see [ARCHITECTURE.md](ARCHITECTURE.md) and [README.md](README.md).
