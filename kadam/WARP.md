# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Development Server
```bash
npm run dev           # Start development server with hot reload (uses tsx)
npm run build         # Build TypeScript to JavaScript
npm start             # Start production server from built files
```

### Database Operations
```bash
npm run migrate       # Run database migrations (builds first, then runs migrate.js)
npm run seed          # Seed database with sample data (builds first, then runs seed.js)
```

### Background Jobs
```bash
npm run bullmq        # Initialize standalone BullMQ workers and cron jobs
```

### Docker Operations
```bash
npm run docker:start # Start all services (app, db, redis, jaeger)
npm run docker:dev   # Development mode with Docker
npm run docker:stop  # Stop all Docker services
npm run docker:logs  # View container logs
npm run docker:status # Check container status
npm run docker:clean # Clean up containers and volumes
```

### Testing & Single File Execution
```bash
# Run a single test file (when tests are added)
npm test -- --testPathPattern=filename.test.ts

# Run TypeScript files directly
npx tsx src/path/to/file.ts

# Run specific worker or job processor
npx tsx src/workers/email.worker.ts
```

## High-Level Architecture

### Framework & Core Technology Stack
- **Fastify** with TypeScript for high-performance web server
- **PostgreSQL** with connection pooling for primary database
- **Redis** for caching and pub/sub messaging
- **BullMQ** for background job processing with Redis
- **OpenTelemetry** for distributed tracing and observability
- **AWS S3** for file storage (courses, videos, media)

### Layered Architecture Pattern
The codebase follows a clean layered architecture:

1. **Controllers** (`src/controller/`): Handle HTTP routes, request validation, and response formatting
2. **Services** (`src/service/`): Contain business logic and orchestrate repository calls
3. **Repositories** (`src/repository/`): Handle database queries and data persistence
4. **Infrastructure** (`src/infra/`): Manage external dependencies (DB, Redis, S3, tracing)
5. **Schemas** (`src/schemas/`): TypeBox validation schemas for API requests/responses
6. **Shared** (`src/shared/`): Common types, middleware, and utilities

### Key Architectural Patterns

#### Centralized Configuration System
- All environment variables validated and typed in `src/config/index.ts`
- Exports structured config objects (`appConfig`, `dbConfig`, `redisConfig`, etc.)
- Strict validation ensures all required variables are present at startup

#### Infrastructure Initialization
- Centralized infrastructure management in `src/infra/index.ts`
- `connectInfrastructure()` and `checkInfrastructureHealth()` functions
- Modular connection to database, Redis, S3, and tracing services

#### Authentication & Authorization
- JWT-based authentication with role-based access control
- Three user types: `user`, `creator`, `admin`
- Middleware functions: `requireAdmin`, `requireCreator`, `requireUser`, `requireAdminOrUser`
- Token payload contains `userID` and `userType`

#### Type-Safe API Schemas
- Uses TypeBox for runtime validation and TypeScript type generation
- Schemas in `src/schemas/` automatically generate Swagger documentation
- TypeScript types exported from schemas ensure type safety across layers

### Background Job Processing Architecture

#### BullMQ Integration
- Singleton `BullMQManager` class handles all queue operations
- Four main queue types:
  - **Email Queue**: Welcome emails, course completions, password resets
  - **Notifications Queue**: SMS, push notifications, OTP delivery
  - **Course Ranking Queue**: Course popularity calculations and rankings
  - **Video Processing Queue**: Video encoding, thumbnail generation, subtitle extraction

#### Queue Management Features
- Bull Board dashboard at `/admin/queues` for monitoring
- Job retry logic with exponential backoff
- Configurable job retention policies
- Cron-based recurring jobs support

#### Worker Architecture
- Workers defined in `src/workers/` with separate processor files
- `initializeWorkers()` function initializes all background processors
- Error handling and logging for job failures

### Data Flow Patterns

#### Request Processing Flow
1. **Fastify Router** → **Auth Middleware** → **Controller**
2. **Controller** validates request → calls **Service**
3. **Service** applies business logic → calls **Repository**
4. **Repository** executes database queries
5. Response flows back through layers with proper error handling

#### Background Job Flow
1. **Service layer** queues jobs using `QueueService` or `bullMQManager`
2. **Workers** process jobs asynchronously
3. **Job results** can trigger additional jobs or cache updates
4. **Error handling** includes retry logic and failure notifications

### Database Architecture
- Uses raw PostgreSQL queries with connection pooling
- Migration system using Postgrator
- Comprehensive seeding system for development data
- Database health monitoring and connection management

### Caching Strategy
- Redis for application-level caching
- Pub/sub messaging for real-time features
- Cache invalidation patterns through background jobs
- Structured cache key patterns (e.g., `user:*`, `course:*`)

### Observability & Monitoring
- OpenTelemetry integration for distributed tracing
- Structured logging with configurable levels
- Health check endpoints at `/health`
- Infrastructure status monitoring
- Jaeger UI available when running with Docker

### API Documentation
- Auto-generated Swagger UI at `/documentation`
- TypeBox schemas provide comprehensive API validation
- Bearer token authentication documented in OpenAPI spec

## Development Workflow Notes

### Environment Setup
1. Copy `.env.example` to `.env` and configure all required variables
2. Start dependencies: `npm run docker:start` (PostgreSQL, Redis, Jaeger)
3. Run migrations: `npm run migrate`
4. Seed database: `npm run seed`
5. Start development server: `npm run dev`

### Working with Background Jobs
- Individual workers can be tested by running: `npx tsx src/workers/[worker-name].worker.ts`
- Monitor jobs via Bull Board dashboard at `http://localhost:3001/admin/queues`
- Queue operations available through `QueueService` class methods

### Database Operations
- Migration files should be created in SQL format for Postgrator
- Seeding script clears all data before inserting fresh sample data
- Database queries use the centralized `db` object from `src/infra/db.ts`

### Adding New Features
1. Define TypeScript types in `src/shared/types/`
2. Create TypeBox schemas in `src/schemas/`
3. Implement repository methods for data access
4. Add service layer business logic
5. Create controller endpoints with proper auth middleware
6. Register routes in `src/server.ts`

### Code Quality Conventions
- Follow .cursorrules and .windsurfrules for coding standards
- Use TypeScript strict mode throughout
- Implement proper error handling with try/catch blocks
- Use the centralized logging system from shared middleware
- Follow REST API conventions for endpoint design
- Separate concerns clearly between controller/service/repository layers

### Testing Philosophy
- Controllers should focus on request/response handling
- Services contain testable business logic
- Repositories handle data access with proper error handling
- Infrastructure connections are health-monitored and gracefully degrade