# Development Guidelines

## Code Style & Standards

### TypeScript

- **Strict mode**: Always enable `strict: true` in tsconfig
- **Typing**: Always use explicit types, avoid `any`
- **Interfaces**: Prefer for public APIs, types for internal use
- **Generics**: Use meaningful type parameter names (K, V, T, U)

```typescript
// Good
interface PropertyFilter {
  minPrice?: number;
  maxPrice?: number;
}

function findProperties<T extends Property>(
  filters: PropertyFilter,
  mapper: (p: Property) => T,
): T[] {
  // ...
}

// Avoid
function findProperties(filters: any, mapper: any): any {
  // ...
}
```

### NestJS Patterns

#### Controllers
- Endpoint per resource action (CRUD + domain-specific)
- Use `@Param`, `@Query`, `@Body` decorators properly
- Include SwaggerAPI decorators for documentation
- Always use DTOs for request/response

```typescript
@Controller('properties')
export class PropertyController {
  constructor(private service: PropertyService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  @ApiResponse({ status: 200, type: PropertyDto })
  getProperty(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
```

#### Services
- Business logic only (no HTTP concerns)
- Dependency injection for external services
- Explicit error handling
- Logging for operations

```typescript
@Injectable()
export class PropertyService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async create(data: PropertyCreateDto) {
    this.logger.debug('Creating property', { address: data.address });
    return this.prisma.property.create({ data });
  }
}
```

#### Guards
- Use for authentication/authorization
- One responsibility per guard
- Return `true`/`false` or throw exception

```typescript
@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    // Validate and attach user to request
    return !!token;
  }
}
```

#### Middleware
- Use for cross-cutting concerns (logging, metrics, etc.)
- Don't do authentication here (use guards)
- Pass control with `next()`

### Repository Pattern

Use Prisma directly in services (no extra repository layer needed).

```typescript
// In service
const user = await this.prisma.user.findUnique({ where: { id } });
```

### Error Handling

- Use NestJS HTTP exceptions
- Always include error messages
- Log errors for debugging

```typescript
if (!property) {
  this.logger.warn('Property not found', { propertyId: id });
  throw new NotFoundException('Property not found');
}
```

## Database

### Prisma Conventions

- Table names: plural, snake_case (`properties`, `price_history`)
- Column names: snake_case
- Relations: explicit `@relation()` decorator
- Timestamps: `created_at`, `updated_at`
- Foreign keys: `{entity}_{idField}` (e.g., `property_id`)

```prisma
model Property {
  id            String   @id @default(cuid())
  address       String
  suburb        String
  lat           Float
  lng           Float
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  listings      Listing[]

  @@map("properties")
}

model Listing {
  id            String   @id @default(cuid())
  property_id   String
  property      Property @relation(fields: [property_id], references: [id])
  price         Int
  created_at    DateTime @default(now())

  @@map("listings")
}
```

### Query Optimization

- Use `select` to limit returned fields
- Use `where` for filtering before joining
- Pagination with `skip`/`take`
- Index frequently queried fields

```typescript
const properties = await prisma.property.findMany({
  where: {
    suburb: 'Sydney',
    lat: { gte: -33.95, lte: -33.85 },
  },
  select: { id: true, address: true, lat: true, lng: true },
  take: 20,
  skip: 0,
});
```

## Testing

### Unit Tests

- Test one thing per test
- Use descriptive names
- Mock external dependencies
- Test happy path + error cases

```typescript
describe('PropertyService', () => {
  let service: PropertyService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new PropertyService(prisma);
  });

  it('should create property with valid data', async () => {
    const data = { address: '123 Main St', suburb: 'Sydney' };
    const result = await service.create(data);
    expect(result.id).toBeDefined();
  });

  it('should throw error if address invalid', async () => {
    const data = { address: '', suburb: 'Sydney' };
    await expect(service.create(data)).rejects.toThrow();
  });
});
```

### E2E Tests

- Test full request/response cycle
- Use test database
- Clean up after each test
- Test edge cases and error scenarios

```typescript
describe('Property API', () => {
  it('GET /properties/:id should return property', async () => {
    const res = await request(app.getHttpServer())
      .get('/properties/123')
      .expect(200);

    expect(res.body).toHaveProperty('id');
    expect(res.body.id).toBe('123');
  });

  it('GET /properties/:id should return 404 for unknown ID', async () => {
    await request(app.getHttpServer())
      .get('/properties/unknown')
      .expect(404);
  });
});
```

## API Design

### RESTful Endpoints

```
GET    /properties              - List all
GET    /properties?skip=0&take=20 - Paginated list
GET    /properties/:id          - Get one
POST   /properties              - Create
PATCH  /properties/:id          - Update
DELETE /properties/:id          - Delete
```

### Response Format

```typescript
// Success (2xx)
{
  "data": { ... },
  "pagination": { "total": 100, "skip": 0, "take": 20, "hasMore": true }
}

// Error (4xx/5xx)
{
  "error": {
    "code": "PROPERTY_NOT_FOUND",
    "message": "Property not found",
    "details": { "propertyId": "123" }
  }
}
```

### Pagination

Always support `skip` and `take` query parameters:
- `skip`: Number of records to skip (default 0)
- `take`: Number of records to return (default 20, max 100)

## Documentation

### Code Comments

- Document `why`, not `what` (code shows what)
- Use JSDoc for public APIs
- Keep comments up to date

```typescript
/**
 * Search for properties near a location
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @param radius - Search radius in km
 * @returns Array of matching properties sorted by distance
 */
async searchNearby(lat: number, lng: number, radius: number) {
  // Retrieve properties within bounding box first
  // then calculate exact distance using geo functions
  return properties;
}
```

### README.md

- Project overview
- Installation instructions
- Quick start guide
- API documentation (or link to Swagger)
- Development setup
- Testing instructions

## Deployment

### Docker

- Use multi-stage builds
- Minimal final image size
- Health checks included
- Environment variables documented

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /build
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
HEALTHCHECK --interval=30s --timeout=3s CMD node healthcheck.js
CMD ["node", "dist/main.js"]
```

### Environment Variables

- Use `.env` for local development
- Use `.env.production` for production values
- Document all variables in `.env.example`
- Never commit actual secrets

```env
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
LOG_LEVEL=info
NODE_ENV=development
```

## Git Workflow

### Commit Messages

Follow conventional commits:

```
feat: add price prediction endpoint
fix: handle null values in property listing
docs: update API documentation
test: add E2E tests for search
refactor: extract ML service to separate file
```

### Branch Names

```
feature/feature-name
fix/bug-description
docs/documentation-update
refactor/code-cleanup
```

### PR Guidelines

- Atomic commits (one feature per PR)
- Descriptive PR title
- Link related issues
- Add tests for new features
- Update documentation

## Performance

### Caching Strategy

- Use Redis for frequently accessed data
- 1-hour TTL for predictions
- 5-minute TTL for search results
- Invalidate cache on mutations

### Query Optimization

- Use indexes on frequently queried columns
- Limit result sets with `take`
- Use projections with `select`
- Avoid N+1 queries (use `include` wisely)

### Monitoring

- Track request latency via Prometheus metrics
- Monitor database query performance
- Alert on error rates >1%
- Track cache hit rate

## Security

### Input Validation

- Always validate request data with Zod
- Use type-safe schemas
- Validate query parameters
- Sanitize file uploads

### Authentication

- Use JWT tokens
- Implement refresh tokens
- Rotate secrets quarterly
- Hash passwords with bcrypt

### Authorization

- Check user permissions on every endpoint
- Use role-based access control
- Log all admin actions
- Implement soft deletes for audit trail

### Secrets

- Store in environment variables
- Rotate API keys quarterly
- Use separate credentials per service
- Never log sensitive data

## Troubleshooting

### Common Issues

**"Cannot find module"**
- Run `pnpm install`
- Check tsconfig paths configuration
- Verify file exists

**"Database connection failed"**
- Check DATABASE_URL
- Verify database service is running
- Check firewall rules

**"Port already in use"**
- Find process: `lsof -i :3000`
- Kill process: `kill -9 <PID>`
- Or use different port: `PORT=3001 npm start`

**"Rate limit exceeded"**
- Check `THROTTLER_LIMIT` environment variable
- Increase rate limit for specific endpoints
- Implement exponential backoff in client

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [REST API Best Practices](https://restfulapi.net/)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance.html)
