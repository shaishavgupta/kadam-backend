# Kadam Backend

A comprehensive learning platform backend built with Fastify, TypeScript, PostgreSQL, and Redis.

## Table of Contents

- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database](#database)
- [API Schemas](#api-schemas)
- [Architecture](#architecture)
- [Development](#development)
- [Deployment](#deployment)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd kadam-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
npm run migrate
```

5. Seed the database:
```bash
npm run seed
```

6. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001` with Swagger documentation at `http://localhost:3001/documentation`.

## Configuration

This project uses a centralized configuration system for better maintainability, type safety, and validation.

### Configuration File

The main configuration file is located at `src/config/index.ts` and exports:

- `config`: Complete configuration object
- `appConfig`: Application-specific settings
- `dbConfig`: Database connection settings
- `redisConfig`: Redis cache settings
- `authConfig`: Authentication settings
- `tracingConfig`: OpenTelemetry tracing settings

### Environment Variables

#### Application Settings
- `NODE_ENV`: Environment (development, production, local)
- `PORT`: Server port (default: 3001)
- `DOMAIN`: Server domain (default: http://localhost)
- `LOG_LEVEL`: Logging level (default: info)

#### Database Settings
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: kadam_db)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (default: password)

#### Redis Cache Settings
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_USERNAME`: Redis username (optional)
- `REDIS_PASSWORD`: Redis password (optional)

#### Authentication Settings
- `JWT_SECRET`: JWT signing secret (required)

#### OpenTelemetry Settings
- `OTEL_SERVICE_NAME`: Service name for tracing (default: kadam-backend)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP endpoint (default: http://localhost:4318)

### Usage

```typescript
import { config, appConfig, dbConfig, authConfig } from '../config';

// Use complete config
console.log(config.NODE_ENV);

// Use specific config sections
console.log(appConfig.PORT);
console.log(dbConfig.host);
console.log(authConfig.JWT_SECRET);
```

### Benefits

1. **Centralized Management**: All configuration in one place
2. **Type Safety**: Full TypeScript support with interfaces
3. **Validation**: Built-in validation and error handling
4. **Maintainability**: Easy to modify and extend
5. **Documentation**: Self-documenting configuration structure
6. **Testing**: Easy to mock and test configuration

## Database

This directory contains database migration and seeding scripts for the Kadam backend.

### Files

- `migrate.ts` - Database migration script using Postgrator
- `seed.ts` - Database seeding script to populate with sample data

### Usage

#### Running Migrations

```bash
# Run database migrations
npm run migrate

# For development
npm run migrate:dev
```

#### Running Seeds

```bash
# Seed the database with sample data
npm run seed

# For development
npm run seed:dev
```

### Seeded Data

The seed script populates the database with sample data including:

#### Core Entities
- **Admins** (2 records) - System administrators
- **Categories** (5 records) - Course categories like Programming, Design, etc.
- **Tags** (20+ records) - Technology and skill tags
- **Creators** (4 records) - Course creators/instructors
- **Users** (3 records) - Platform users with different plan types

#### Course Content
- **Courses** (4 records) - Sample courses with ratings and pricing
- **Modules** (8-12 records) - Course modules
- **Contents** (12-28 records) - Video, quiz, and notes content
- **Qualifications** (4 records) - Creator qualifications
- **Achievements** (4 records) - Creator achievements

#### User Activity
- **User Enrollments** - Users enrolled in courses with progress
- **User Badges** - Achievement badges for users
- **User Certificates** - Course completion certificates
- **User Quiz Attempts** - Quiz attempt records

#### Admin Data
- **Admin Configurations** - System configuration settings
- **Admin Activities** - Admin activity logs

#### Relationships
The script automatically creates proper relationships between:
- Courses ↔ Categories (many-to-many)
- Courses ↔ Tags (many-to-many)
- Courses ↔ Creators (many-to-many)
- Creators ↔ Qualifications (many-to-many)
- Creators ↔ Achievements (many-to-many)
- Users ↔ Courses (enrollments)
- Contents ↔ Modules ↔ Courses

### Important Notes

1. **Data Clearing**: The seed script will clear all existing data before seeding
2. **Order Dependency**: Data is seeded in dependency order to maintain referential integrity
3. **Random Elements**: Some data like course-tag associations and user enrollments are randomized
4. **Environment**: Uses the same database configuration as the migration script

### Development Workflow

1. First, run migrations to create the database schema:
   ```bash
   npm run migrate
   ```

2. Then, seed the database with sample data:
   ```bash
   npm run seed
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The seeded data provides a good foundation for testing API endpoints and frontend development.

## API Schemas

This directory contains TypeBox schemas for API validation and documentation. TypeBox provides native JSON Schema generation and seamless integration with Fastify + Swagger.

### Structure

- `common.ts` - Shared utilities (ApiResponseSchema, PaginationQuerySchema, etc.)
- `user.ts` - User-related schemas (authentication, profile, etc.)
- `course.ts` - Course-related schemas (courses, content, modules, etc.)
- `creator.ts` - Creator-related schemas (creators, qualifications, achievements)
- `admin.ts` - Admin-related schemas (configurations, dashboard data)
- `interaction.ts` - Interaction schemas (likes, comments, shares, ratings, etc.)
- `index.ts` - Central export file for all schemas

### Alignment with Existing Types

These schemas are designed to match your existing TypeScript interfaces in `src/shared/types/`:
- `users.types.ts` → `user.ts` schemas
- `courses.types.ts` → `course.ts` schemas
- `creators.types.ts` → `creator.ts` schemas
- `admin.types.ts` → `admin.ts` schemas
- `interactions.types.ts` → `interaction.ts` schemas
- `common.types.ts` → `common.ts` schemas

### Usage

#### In Controllers

```typescript
import { SendOtpRequestSchema, SendOtpResponseSchema } from '../schemas/user';
import type { SendOtpRequest } from '../shared/types/users.types';

fastify.post('/send-otp', {
    schema: {
        body: SendOtpRequestSchema,
        response: {
            200: SendOtpResponseSchema
        }
    }
}, async (request: FastifyRequest<{ Body: SendOtpRequest }>, reply: FastifyReply) => {
    // Handler logic
});
```

#### Schema Definition Pattern

```typescript
import { Type } from '@sinclair/typebox';

// Request schema
export const CreateUserRequestSchema = Type.Object({
    name: Type.String(),
    email: Type.String({ format: 'email' }),
    phone: Type.String({ pattern: '^[0-9]{10}$' })
});

// Response schema
export const UserResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(CreateUserRequestSchema),
    message: Type.String()
});

// TypeScript type (automatically inferred)
export type CreateUserRequest = typeof CreateUserRequestSchema.static;
```

### Benefits

1. **Native JSON Schema**: TypeBox generates JSON Schema natively
2. **Type Safety**: TypeScript types are automatically inferred using `.static`
3. **Swagger Integration**: Schemas automatically appear in Swagger UI
4. **Validation**: Fastify validates requests/responses against schemas
5. **Documentation**: Self-documenting API with proper types

### Validation Features

- **Pattern Matching**: Phone numbers, emails, etc.
- **Format Validation**: Dates, URIs, emails
- **Required Fields**: Automatic validation of required properties
- **Nested Objects**: Complex nested structures
- **Arrays**: Typed arrays with item validation
- **Enums**: Union types for predefined values

### Error Handling

When validation fails, Fastify automatically returns a 400 status with detailed error messages:

```json
{
  "success": false,
  "message": "body/phone must match pattern \"^[0-9]{10}$\""
}
```

## Architecture

### Project Structure

```
src/
├── config/           # Centralized configuration
├── controller/       # API route handlers
├── service/         # Business logic layer
├── repository/      # Data access layer
├── schemas/         # TypeBox validation schemas
├── shared/          # Shared utilities and types
│   ├── middleware/   # Custom middleware
│   ├── types/       # TypeScript interfaces
│   └── enums/       # Application enums
├── infra/           # Infrastructure (DB, Cache, Tracing)
├── db/              # Database migrations and seeds
└── server.ts        # Application entry point
```

### Key Features

- **Fastify Framework**: High-performance web framework
- **TypeScript**: Full type safety throughout the application
- **PostgreSQL**: Robust relational database
- **Redis**: High-performance caching and pub/sub messaging
- **JWT Authentication**: Secure token-based authentication
- **OpenTelemetry**: Distributed tracing and observability
- **Swagger Documentation**: Auto-generated API documentation
- **Centralized Configuration**: Type-safe environment management
- **Real-time Messaging**: Redis pub/sub for notifications and events

### Redis Pub/Sub

The application includes enhanced Redis functionality with pub/sub messaging:

#### Basic Cache Operations
```typescript
import { cache } from '../infra/cache';

// Set/get/delete operations
await cache.set('key', { data: 'value' }, 3600);
const data = await cache.get('key');
await cache.delete('key');

// Batch operations
await cache.mset({ 'key1': 'value1', 'key2': 'value2' }, 1800);
const values = await cache.mget(['key1', 'key2']);
```

#### Pub/Sub Messaging
```typescript
// Publishing messages
await cache.publish('notifications', 'New user registered');
await cache.publish('user-events', { type: 'user_created', userId: 123 });

// Subscribing to channels
await cache.subscribe('notifications', (message, channel) => {
    console.log(`Received: ${message} on ${channel}`);
});

// Pattern-based subscriptions
await cache.psubscribe('user:*', (message, channel) => {
    console.log(`User event on ${channel}:`, message);
});

// Unsubscribing
await cache.unsubscribe('notifications');
await cache.unsubscribeAll();
```

#### Use Cases
- **Real-time Notifications**: Send notifications to users and admins
- **Cache Invalidation**: Automatically invalidate related cache entries
- **Analytics Events**: Track user actions and system events
- **Live Updates**: Push real-time updates to connected clients

For detailed examples, see `src/infra/cache-examples.md`.

### Authentication & Authorization

- **JWT Tokens**: Access and refresh token system
- **Role-based Access**: User, Creator, Admin roles
- **Middleware Protection**: Route-level authentication
- **OTP Verification**: Phone-based verification system

### API Endpoints

#### Authentication
- `POST /auth/send-otp` - Send OTP for verification
- `POST /auth/verify-otp` - Verify OTP and authenticate

#### Users
- `GET /users` - Get paginated users (Admin)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

#### Courses
- `GET /courses/list` - Get course list with categories
- `GET /courses/categories` - Get course categories
- `GET /courses/category/:categoryId` - Get courses by category
- `GET /courses/get-user-stats` - Get user statistics
- `POST /courses` - Create course (Creator)
- `PUT /courses/:id` - Update course
- `POST /courses/publish` - Publish course (Admin)

#### Creators
- `GET /creators` - Get paginated creators
- `GET /creators/:id` - Get creator by ID
- `POST /creators` - Create creator
- `PUT /creators/:id` - Update creator
- `GET /creators/:id/stats` - Get creator statistics

#### Interactions
- `POST /likes` - Create like
- `GET /likes` - Get likes
- `POST /comments` - Create comment
- `GET /comments/parent/:parentType/:parentId` - Get comments
- `POST /shares` - Create share
- `POST /saves` - Save content
- `POST /views` - Record view
- `POST /ratings` - Create rating

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run start        # Start production server

# Database
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode

# Linting
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Development Workflow

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

2. **Database Setup**:
   ```bash
   npm run migrate
   npm run seed
   ```

3. **Start Development**:
   ```bash
   npm run dev
   ```

4. **Access Documentation**:
   - API Documentation: http://localhost:3001/documentation
   - Health Check: http://localhost:3001/health

### Environment File

Create a `.env` file in the project root with your configuration:

```env
# Application
NODE_ENV=development
PORT=3001
DOMAIN=http://localhost
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kadam_db
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# OpenTelemetry
OTEL_SERVICE_NAME=kadam-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t kadam-backend .

# Run with Docker Compose
docker-compose up -d
```

### Environment Variables for Production

Ensure all required environment variables are set in your production environment:

- `NODE_ENV=production`
- `JWT_SECRET` (use a strong, unique secret)
- Database credentials
- Redis credentials
- OpenTelemetry endpoint (if using)

### Health Checks

The application provides health check endpoints:

- `GET /health` - Basic health check
- Database connectivity check
- Redis connectivity check

### Monitoring

- **OpenTelemetry**: Distributed tracing and metrics
- **Logging**: Structured logging with configurable levels
- **Health Checks**: Built-in health monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license information here]
