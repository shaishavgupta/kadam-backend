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
├── infra/           # Infrastructure (DB, Cache, Tracing, BullMQ)
│   ├── bullmq.ts    # BullMQ queue management
│   ├── bullmq-init.ts # BullMQ initialization module
│   ├── db.ts        # Database connection
│   ├── cache.ts     # Redis cache operations
│   └── tracing.ts   # OpenTelemetry tracing
├── workers/         # Background job workers
│   ├── workers.ts   # Worker processors
│   └── cron.ts      # Scheduled job definitions
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

### BullMQ Job Queues

The application includes a comprehensive job queue system using BullMQ for background processing. The BullMQ infrastructure is modularized for better maintainability:

#### Architecture Overview

- **`infra/bullmq.ts`**: Core BullMQ queue management and configuration
- **`infra/bullmq-init.ts`**: Centralized initialization module for all BullMQ components
- **`workers/workers.ts`**: Worker processors for different job types
- **`workers/cron.ts`**: Scheduled job definitions and cron patterns

#### Initialization Flow

The BullMQ infrastructure follows a clean initialization pattern:

```typescript
import { initializeBullMQInfrastructure } from './infra';

// Initialize complete BullMQ infrastructure
await initializeBullMQInfrastructure(fastifyInstance);
```

This single call handles:
1. Queue setup and configuration
2. Worker initialization
3. Scheduled job setup
4. Bull Board dashboard configuration

#### Modular Architecture Benefits

The separation of BullMQ components provides several advantages:

- **Separation of Concerns**: Each module has a single responsibility
- **Easier Testing**: Individual components can be tested in isolation
- **Better Maintainability**: Changes to one component don't affect others
- **Cleaner Server Code**: Server.ts focuses on HTTP server setup
- **Reusability**: BullMQ components can be reused in other applications
- **Configuration Management**: Centralized configuration and initialization

#### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `bullmq.ts` | Queue management, job operations, Bull Board setup |
| `bullmq-init.ts` | Centralized initialization, lifecycle management |
| `workers/workers.ts` | Job processors, worker configuration |
| `workers/cron.ts` | Scheduled job definitions, cron patterns |

#### Queue Types
- **Email Queue**: Send welcome emails, notifications, password resets
- **Notifications Queue**: Push notifications, SMS, email alerts
- **Analytics Queue**: Track events, update metrics, generate reports
- **Cache Invalidation Queue**: Clean up cache entries
- **Course Processing Queue**: Process videos, generate thumbnails, extract metadata

#### Basic Queue Operations
```typescript
import { QueueService } from '../service/queue.service';

// Send welcome email
await QueueService.sendWelcomeEmail('user@example.com', 123, 'John Doe');

// Send push notification
await QueueService.sendPushNotification(123, 'New Course Available', 'Check out our latest course!');

// Track analytics event
await QueueService.trackUserEvent('course_completed', 123, { courseId: 456 });

// Invalidate cache
await QueueService.invalidateUserCache(123, 'profile_updated');
```

#### Direct Queue Management
```typescript
import { bullMQManager, QUEUE_NAMES, JOB_TYPES } from '../infra';

// Add a job directly to a queue
const job = await bullMQManager.addJob(
    QUEUE_NAMES.EMAIL,
    JOB_TYPES.EMAIL.SEND_WELCOME,
    {
        to: 'user@example.com',
        subject: 'Welcome!',
        template: 'welcome',
        data: { userId: 123, userName: 'John' }
    },
    {
        priority: 10,
        attempts: 3,
        delay: 5000, // 5 second delay
        removeOnComplete: 5,
        removeOnFail: 3
    }
);
```

#### Scheduled Jobs
```typescript
import { bullMQManager, CRON_PATTERNS } from '../infra';

// Schedule recurring job
await bullMQManager.scheduleRecurringJob(
    QUEUE_NAMES.ANALYTICS,
    'daily-report',
    { reportType: 'daily_summary' },
    CRON_PATTERNS.DAILY,
    'daily-analytics-report',
    { timezone: 'UTC', removeOnComplete: 7, removeOnFail: 3 }
);

// Schedule delayed job
await bullMQManager.scheduleDelayedJob(
    QUEUE_NAMES.EMAIL,
    'welcome-email',
    { userId: 123, email: 'user@example.com' },
    5000, // 5 second delay
    { priority: 10, attempts: 3 }
);
```

#### Job Scheduling Patterns
```typescript
import { CRON_PATTERNS } from '../workers/cron';

// Available cron patterns
CRON_PATTERNS.EVERY_MINUTE     // '* * * * *'
CRON_PATTERNS.EVERY_5_MINUTES  // '*/5 * * * *'
CRON_PATTERNS.EVERY_HOUR       // '0 * * * *'
CRON_PATTERNS.DAILY            // '0 0 * * *'
CRON_PATTERNS.WEEKLY           // '0 0 * * 0'
CRON_PATTERNS.MONTHLY          // '0 0 1 * *'
```

#### Queue Management API
```typescript
// Get queue statistics
const stats = await QueueService.getQueueStats('email-queue');

// Pause/resume queues
await QueueService.pauseQueue('email-queue');
await QueueService.resumeQueue('email-queue');

// Clean completed jobs
await QueueService.cleanQueue('email-queue', 5000);
```

#### Bull Board Dashboard
Access the queue management dashboard at: `http://localhost:3001/admin/queues`

Features:
- **Real-time Queue Monitoring**: View job counts, processing rates
- **Job Management**: Retry failed jobs, remove completed jobs
- **Queue Control**: Pause, resume, and clean queues
- **Job Details**: View job data, progress, and error messages
- **Statistics**: Monitor queue performance and health

#### Use Cases
- **Email Campaigns**: Send bulk welcome emails, course completion notifications
- **Background Processing**: Process videos, generate thumbnails, extract metadata
- **Analytics Processing**: Track user events, generate reports
- **Cache Management**: Automatically invalidate stale cache entries
- **System Maintenance**: Scheduled cleanup tasks, health checks

#### Comprehensive Examples

##### Email Jobs
```typescript
import { QueueService } from '../service/queue.service';

// Send welcome email to new user
await QueueService.sendWelcomeEmail('newuser@example.com', 123, 'John Doe');

// Batch send welcome emails
const users = [
    { id: 1, email: 'user1@example.com', name: 'Alice' },
    { id: 2, email: 'user2@example.com', name: 'Bob' },
    { id: 3, email: 'user3@example.com', name: 'Charlie' }
];
await QueueService.batchSendWelcomeEmails(users);

// Send course completion email
await QueueService.sendCourseCompletionEmail(
    'user@example.com',
    123,
    456,
    'Advanced React Development'
);

// Send password reset email
await QueueService.sendPasswordResetEmail('user@example.com', 'reset-token-123');
```

##### Notification Jobs
```typescript
// Send push notification
await QueueService.sendPushNotification(
    123,
    'New Course Available',
    'Check out our latest React course!',
    { courseId: 456, courseName: 'React Fundamentals' }
);

// Send email notification
await QueueService.sendEmailNotification(
    123,
    'Course Update',
    'Your enrolled course has been updated with new content.',
    { courseId: 456 }
);

// Send SMS notification
await QueueService.sendSmsNotification(123, 'Your course assignment is due tomorrow!');
```

##### Analytics Jobs
```typescript
// Track user events
await QueueService.trackUserEvent('course_started', 123, {
    courseId: 456,
    courseName: 'React Fundamentals',
    timestamp: new Date().toISOString()
});

await QueueService.trackUserEvent('video_completed', 123, {
    courseId: 456,
    videoId: 789,
    duration: 1200,
    completionRate: 100
});

// Batch track events
const events = [
    { eventType: 'page_view', userId: 123, data: { page: '/courses' } },
    { eventType: 'course_clicked', userId: 123, data: { courseId: 456 } },
    { eventType: 'enrollment_started', userId: 123, data: { courseId: 456 } }
];
await QueueService.batchTrackEvents(events);

// Update user metrics
await QueueService.updateUserMetrics(123, {
    totalCoursesCompleted: 5,
    totalHoursSpent: 120,
    averageRating: 4.5,
    lastActiveDate: new Date().toISOString()
});

// Generate analytics report
await QueueService.generateAnalyticsReport('monthly_summary', {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    includeUserMetrics: true,
    includeCourseMetrics: true
});
```

##### Cache Invalidation Jobs
```typescript
// Invalidate user cache after profile update
await QueueService.invalidateUserCache(123, 'profile_updated');

// Invalidate course cache after content update
await QueueService.invalidateCourseCache(456, 'content_updated');

// Invalidate all user-related cache
await QueueService.invalidateCachePattern('user:*', 'bulk_update');
```

##### Course Processing Jobs
```typescript
// Process course videos
await QueueService.processCourseVideos(456, [
    '/uploads/video1.mp4',
    '/uploads/video2.mp4',
    '/uploads/video3.mp4'
]);

// Generate thumbnails for course videos
await QueueService.generateCourseThumbnails(456, [789, 790, 791]);

// Extract metadata from course content
await QueueService.extractCourseMetadata(456, [
    '/uploads/video1.mp4',
    '/uploads/document1.pdf',
    '/uploads/audio1.mp3'
]);
```

##### Scheduled Jobs
```typescript
import { SchedulingUtils, jobScheduler, CRON_PATTERNS } from '../infra';

// Schedule delayed welcome email
await SchedulingUtils.scheduleWelcomeEmail(123, 'user@example.com');

// Schedule analytics event
await SchedulingUtils.scheduleAnalyticsEvent('user_signup', 123, { source: 'web' });

// Schedule recurring daily analytics report
await jobScheduler.scheduleRecurringJob({
    name: 'daily-analytics-report',
    cron: CRON_PATTERNS.DAILY,
    queueName: 'analytics-queue',
    jobName: 'generate-report',
    data: {
        eventType: 'daily_report',
        data: { reportType: 'daily_summary' },
        timestamp: new Date().toISOString()
    },
    options: {
        timezone: 'UTC',
        removeOnComplete: 7,
        removeOnFail: 3
    }
});
```

##### Queue Management
```typescript
// Get statistics for all queues
const allStats = await QueueService.getAllQueueStats();
console.log('All queue stats:', allStats);

// Get statistics for specific queue
const emailStats = await QueueService.getQueueStats('email-queue');
console.log('Email queue stats:', emailStats);

// Pause/resume queues
await QueueService.pauseQueue('email-queue');
await QueueService.resumeQueue('email-queue');

// Clean completed jobs
await QueueService.cleanQueue('email-queue', 5000);
```

##### Direct Queue Management
```typescript
import { bullMQManager, QUEUE_NAMES, JOB_TYPES } from '../infra';

// Add a job directly to a queue
const job = await bullMQManager.addJob(
    QUEUE_NAMES.EMAIL,
    JOB_TYPES.EMAIL.SEND_WELCOME,
    {
        to: 'user@example.com',
        subject: 'Welcome!',
        template: 'welcome',
        data: { userId: 123, userName: 'John' }
    },
    {
        priority: 10,
        attempts: 3,
        delay: 5000, // 5 second delay
        removeOnComplete: 5,
        removeOnFail: 3
    }
);

console.log('Job added:', job.id);
```

##### Error Handling & Best Practices
```typescript
// Retry logic with exponential backoff
await bullMQManager.addJob(
    QUEUE_NAMES.EMAIL,
    JOB_TYPES.EMAIL.SEND_WELCOME,
    emailData,
    {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 10,
        removeOnFail: 5
    }
);

// Error handling
try {
    await QueueService.sendWelcomeEmail('user@example.com', 123, 'John');
} catch (error) {
    console.error('Failed to queue welcome email:', error);
    // Handle error appropriately
}

// Monitor failed jobs
const queue = bullMQManager.getQueue('email-queue');
const failedJobs = await queue?.getJobs(['failed'], 0, 10);
for (const job of failedJobs || []) {
    console.error('Failed job:', {
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade
    });
}
```

##### Integration Examples

**User Registration Flow:**
```typescript
async function handleUserRegistration(userData: any) {
    try {
        // Create user in database
        const user = await createUser(userData);

        // Queue welcome email
        await QueueService.sendWelcomeEmail(user.email, user.id, user.name);

        // Track registration event
        await QueueService.trackUserEvent('user_registered', user.id, {
            source: userData.source,
            timestamp: new Date().toISOString()
        });

        // Invalidate user cache
        await QueueService.invalidateUserCache(user.id, 'user_created');

        return user;
    } catch (error) {
        console.error('User registration failed:', error);
        throw error;
    }
}
```

**Course Completion Flow:**
```typescript
async function handleCourseCompletion(userId: number, courseId: number) {
    try {
        // Update user progress in database
        await updateUserProgress(userId, courseId, 100);

        // Queue completion email
        await QueueService.sendCourseCompletionEmail(
            user.email,
            userId,
            courseId,
            course.name
        );

        // Track completion event
        await QueueService.trackUserEvent('course_completed', userId, {
            courseId,
            courseName: course.name,
            completionDate: new Date().toISOString()
        });

        // Update user metrics
        await QueueService.updateUserMetrics(userId, {
            totalCoursesCompleted: user.totalCoursesCompleted + 1,
            lastActiveDate: new Date().toISOString()
        });

        // Invalidate user cache
        await QueueService.invalidateUserCache(userId, 'course_completed');

    } catch (error) {
        console.error('Course completion handling failed:', error);
        throw error;
    }
}
```

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
