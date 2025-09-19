# Database Seeding

This directory contains database migration and seeding scripts for the Kadam backend.

## Files

- `migrate.ts` - Database migration script using Postgrator
- `seed.ts` - Database seeding script to populate with sample data

## Usage

### Running Migrations

```bash
# Run database migrations
npm run migrate

# For development
npm run migrate:dev
```

### Running Seeds

```bash
# Seed the database with sample data
npm run seed

# For development
npm run seed:dev
```

## Seeded Data

The seed script populates the database with sample data including:

### Core Entities
- **Admins** (2 records) - System administrators
- **Categories** (5 records) - Course categories like Programming, Design, etc.
- **Tags** (20+ records) - Technology and skill tags
- **Creators** (4 records) - Course creators/instructors
- **Users** (3 records) - Platform users with different plan types

### Course Content
- **Courses** (4 records) - Sample courses with ratings and pricing
- **Modules** (8-12 records) - Course modules
- **Contents** (12-28 records) - Video, quiz, and notes content
- **Qualifications** (4 records) - Creator qualifications
- **Achievements** (4 records) - Creator achievements

### User Activity
- **User Enrollments** - Users enrolled in courses with progress
- **User Badges** - Achievement badges for users
- **User Certificates** - Course completion certificates
- **User Quiz Attempts** - Quiz attempt records

### Admin Data
- **Admin Configurations** - System configuration settings
- **Admin Activities** - Admin activity logs

### Relationships
The script automatically creates proper relationships between:
- Courses ↔ Categories (many-to-many)
- Courses ↔ Tags (many-to-many)
- Courses ↔ Creators (many-to-many)
- Creators ↔ Qualifications (many-to-many)
- Creators ↔ Achievements (many-to-many)
- Users ↔ Courses (enrollments)
- Contents ↔ Modules ↔ Courses

## Important Notes

1. **Data Clearing**: The seed script will clear all existing data before seeding
2. **Order Dependency**: Data is seeded in dependency order to maintain referential integrity
3. **Random Elements**: Some data like course-tag associations and user enrollments are randomized
4. **Environment**: Uses the same database configuration as the migration script

## Environment Variables

Make sure these environment variables are set (same as migration script):
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: kadam_db)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (default: password)

## Development Workflow

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
