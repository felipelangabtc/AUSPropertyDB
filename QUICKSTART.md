# Quick Start Guide

Get AUS Property Intelligence DB running in 5 minutes.

## Prerequisites

Ensure you have:
- **Node.js** 18+ (v24 recommended): `node --version`
- **pnpm** 9.x: `npm install -g pnpm`
- **Docker Desktop**: Download from https://www.docker.com/products/docker-desktop
- **Git**: `git --version`

## 1. Clone & Install (1 min)

```bash
# Clone repository
git clone https://github.com/yourusername/aus-property-intelligence-db.git
cd aus-property-intelligence-db

# Install all dependencies (pnpm workspace)
pnpm install

# Verify installation
pnpm --version
node --version
```

## 2. Setup Environment (1 min)

```bash
# Copy environment template
cp .env.example .env.local

# For local development, defaults in .env.example work fine
# (PostgreSQL and Redis will run in Docker)
```

## 3. Start Services (1 min)

```bash
# Start PostgreSQL and Redis in Docker
docker-compose up -d

# Verify services are running
docker-compose ps

# You should see:
# postgres    Running
# redis       Running
# adminer     Running
# redis-commander Running
```

## 4. Setup Database (1 min)

```bash
# Create database tables (migrations)
pnpm db:migrate

# Seed with demo data (3 Sydney properties)
pnpm db:seed

# Verify with Adminer (optional)
# Open http://localhost:8080
# User: postgres, Password: postgres, Server: postgres
```

## 5. Start Development Servers (1 min)

```bash
# Start all apps in development mode
pnpm dev

# Terminal output will show:
# ✓ apps/api    http://localhost:3001
# ✓ apps/web    http://localhost:3000
# ✓ apps/workers running
```

## Access the Application

| Service | URL | Notes |
|---------|-----|-------|
| **API** | http://localhost:3001 | REST API |
| **API Docs** | http://localhost:3001/api/docs | OpenAPI/Swagger |
| **Web** | http://localhost:3000 | React Frontend |
| **Database** | http://localhost:8080 | Adminer (DB UI) |
| **Redis** | http://localhost:8081 | Redis Commander |

## Test Health Endpoints

```bash
# API health check
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-15T10:00:00Z"}

# Database check
curl http://localhost:3001/health/db

# Redis check
curl http://localhost:3001/health/redis

# Worker status
curl http://localhost:3001/health/workers
```

## Common Commands

```bash
# Development
pnpm dev              # Start all services
pnpm dev:api          # Start only API
pnpm dev:web          # Start only web app

# Database
pnpm db:migrate       # Apply migrations
pnpm db:seed          # Seed demo data
pnpm db:reset         # ⚠️ DANGER: Reset everything
pnpm db:studio        # Open Prisma Studio (data browser)

# Code Quality
pnpm lint             # Check for errors
pnpm format           # Auto-fix formatting
pnpm type-check       # TypeScript type checking

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report

# Building
pnpm build            # Build for production
pnpm build:api        # Build only API

# Cleaning
pnpm clean            # Remove all build outputs
docker-compose down   # Stop and remove containers
```

## Project Structure

```
├── apps/
│   ├── api/           # 🔧 NestJS API (port 3001)
│   ├── web/           # 🎨 Next.js Frontend (port 3000)
│   └── workers/       # 🔄 Bull.js Job Processors
├── packages/
│   ├── shared/        # 📦 Shared types & schemas
│   ├── db/            # 🗄️  Database schema & ORM
│   ├── geo/           # 📍 Geolocation algorithms
│   ├── connectors/    # 🔗 Data source adapters
│   └── observability/ # 📊 Logging
└── docs/              # 📚 Documentation
```

## API Examples

### Search Properties

```bash
curl -X GET "http://localhost:3001/search?suburb=Bondi&minPrice=500000&maxPrice=1500000" \
  -H "Content-Type: application/json"
```

### Get Property Details

```bash
curl -X GET "http://localhost:3001/properties/{id}" \
  -H "Content-Type: application/json"
```

### View API Documentation

Open http://localhost:3001/api/docs in your browser

## Troubleshooting

### Docker Not Running
```bash
# Start Docker Desktop or run:
docker-compose up -d
```

### Port Already in Use
```bash
# If port 3001 (API) or 3000 (Web) is in use:
# Stop other services or change PORT in .env.local

# Find process on port 3001
lsof -i :3001
# Kill it
kill -9 <PID>
```

### Database Migration Failed
```bash
# Reset database and migrations
pnpm db:migrate:resolve
pnpm db:migrate:deploy
pnpm db:seed
```

### Dependency Issues
```bash
# Clear cache and reinstall
rm -rf node_modules
pnpm install --force
```

## Next Steps

1. **Explore the API**: Open http://localhost:3001/api/docs
2. **Check the data**: Visit http://localhost:8080 (Adminer)
3. **View frontend**: Open http://localhost:3000
4. **Read documentation**: See [README.md](README.md)
5. **Study code**: Look at `apps/api/src/modules/health` for examples

## Documentation

- **[README.md](README.md)** - Project overview
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production setup
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development guidelines
- **[API Docs](http://localhost:3001/api/docs)** - OpenAPI specification

## Get Help

```bash
# Check logs
docker-compose logs -f api
pnpm dev

# Database studio
pnpm db:studio

# Type check all packages
pnpm type-check

# Run linter
pnpm lint
```

---

**That's it!** 🎉 You now have a fully functional AUS Property Intelligence DB running locally.

For more information, see the [README.md](README.md)
