# Contributing to AUS Property Intelligence DB

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on the code, not the person
- Provide constructive feedback
- Help others learn and improve

## Getting Started

### Prerequisites

- Node.js 18+ (tested with v24)
- pnpm 9.x (package manager)
- Docker and Docker Compose (for local dev)
- PostgreSQL 16+ (via Docker)
- Redis 7+ (via Docker)

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/aus-property-intelligence-db.git
cd aus-property-intelligence-db

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local

# Start services (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Run database migrations
pnpm db:migrate

# Seed with demo data
pnpm db:seed

# Start development servers
pnpm dev
```

## Development Workflow

### Branch Naming

- `feature/short-description` - New features
- `fix/short-description` - Bug fixes
- `docs/short-description` - Documentation
- `refactor/short-description` - Code improvements
- `chore/short-description` - Maintenance tasks

### Commits

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Example:

```
feat(auth): add magic link email verification

Implement JWT token generation and magic link workflow
for passwordless authentication.

Closes #42
```

### Code Style

- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier formatting applied
- 2-space indentation
- 80-character line length (soft)

### Testing Requirements

- Unit tests for utility functions (geo, address parsing)
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 70% code coverage

```bash
# Run tests
pnpm test

# Generate coverage report
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

## Project Structure

```
├── apps/
│   ├── api/              # NestJS REST API
│   ├── web/              # Next.js frontend
│   └── workers/          # Bull.js job processors
├── packages/
│   ├── shared/           # Shared schemas & types
│   ├── db/               # Prisma ORM
│   ├── geo/              # Geolocation algorithms
│   ├── connectors/       # Data source adapters
│   ├── observability/    # Logging
│   ├── eslint-config/    # Shared ESLint config
│   ├── typescript-config/# Shared TypeScript config
│   └── ui/               # Reusable UI components
├── infra/                # Infrastructure configs
└── docs/                 # Documentation site
```

## Adding a New Connector

1. Create new class in `packages/connectors/src/connectors/`
2. Extend `BaseSourceConnector`
3. Implement required methods: `discoverListings()`, `fetchListingDetails()`, `normalize()`, `healthCheck()`
4. Register in `ConnectorRegistry` in `src/index.ts`
5. Create Source record in database with ToS and robots.txt info
6. Add unit tests in `src/__tests__/`

Example:

```typescript
import { BaseSourceConnector } from '../base.connector';
import { NormalizedListing } from '@aus-prop/shared';

export class MyConnector extends BaseSourceConnector {
  constructor() {
    super({
      name: 'my-source',
      baseUrl: 'https://api.mysource.com',
      rateLimitPerMinute: 60,
    });
  }

  async discoverListings() {
    // Your implementation
  }

  async fetchListingDetails(url: string) {
    // Your implementation
  }

  async normalize(rawListing: any): Promise<NormalizedListing> {
    // Your implementation
  }

  async healthCheck(): Promise<boolean> {
    // Your implementation
  }
}
```

## API Development Guidelines

### Module Structure

Each module should follow this structure:

```
modules/
├── {module}.module.ts       # NestJS module
├── {module}.controller.ts   # HTTP endpoints
├── {module}.service.ts      # Business logic
├── dto/
│   ├── create-{entity}.dto.ts
│   └── update-{entity}.dto.ts
└── __tests__/
    └── {module}.service.spec.ts
```

### Controllers

- Use OpenAPI decorators for documentation
- Return consistent response envelopes
- Handle errors with proper HTTP status codes
- Apply rate limiting with `@UseGuards(ThrottlerGuard)`

### Services

- One service per domain entity
- Use Prisma for database access
- Implement business logic separately from HTTP
- Return typed responses (TypeScript interfaces)

## Frontend Development Guidelines

### Component Structure

```
components/
├── common/              # Shared UI components
├── features/            # Feature-specific components
└── layouts/             # Page layouts
```

### Pages

- Use Next.js App Router
- Implement server components when possible
- Use Suspense for loading states
- Implement error boundaries

## Database Changes

### Creating Migrations

```bash
# After modifying schema.prisma
pnpm db:migrate:dev --name migration_name
```

### Seed Data

Add seed logic to `packages/db/src/seed.ts` for development data.

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments to exported functions
- Create ADR (Architecture Decision Record) for significant decisions
- Keep API documentation in OpenAPI format

## Pull Request Process

1. Create branch from `main`
2. Make changes with atomic commits
3. Write tests
4. Update documentation
5. Push and create PR
6. Request reviews from maintainers
7. Address feedback
8. Squash and merge when approved

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] TypeScript errors resolved
- [ ] Linting passes
- [ ] No console.log statements (use logger)
- [ ] Environment variables added to `.env.example`
- [ ] Database changes create migrations

## Performance Guidelines

- Monitor query performance with `npm run db:analyze`
- Use Prisma `select` for field filtering
- Implement pagination for list endpoints
- Cache with Redis when appropriate
- Profile with Chrome DevTools for frontend

## Security Considerations

- Never commit secrets (.env files)
- Validate all user input with Zod
- Use parameterized queries (Prisma does this)
- Implement rate limiting
- Add CORS properly
- Use HTTPS in production
- Rotate credentials regularly

## Common Tasks

### Run Linting

```bash
pnpm lint
```

### Format Code

```bash
pnpm format
```

### Type Check All Packages

```bash
pnpm type-check
```

### Build All Apps

```bash
pnpm build
```

## Getting Help

- Check existing issues and discussions
- Read the README and architecture docs
- Open a discussion for questions
- Use GitHub Issues for bugs

## Recognition

All contributors will be recognized in the project's CONTRIBUTORS file.

Thank you for contributing! 🙏
