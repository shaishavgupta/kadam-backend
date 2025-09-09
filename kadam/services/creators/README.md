# Creators Service

A comprehensive creator management system built with Encore.ts, following the controller-service-repository architectural pattern. This service handles creator profiles, qualifications, achievements, and related operations.

## 🏗️ Architecture

### Three-Layer Pattern
- **Controller Layer** (`controller.ts`): Handles HTTP requests and responses
- **Service Layer** (`service.ts`): Contains business logic and orchestrates operations
- **Repository Layer** (`repository.ts`): Manages database operations and validations

## 📊 Database Schema

### Core Tables

#### `creators`
```sql
CREATE TABLE creators (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  bio TEXT,
  profile_pic TEXT,
  rating INTEGER CHECK (rating >= 0 AND rating <= 5)
);
```

#### `qualifications`
```sql
CREATE TABLE qualifications (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  qualification_type qualification_types NOT NULL,
  start_date DATE,
  end_date DATE,
  grade TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `achievements`
```sql
CREATE TABLE achievements (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  title TEXT NOT NULL,
  description TEXT,
  types achievement_types NOT NULL,
  date_achieved DATE NOT NULL
);
```

#### Junction Tables
- `creator_qualifications`: Links creators to their qualifications
- `creator_achievements`: Links creators to their achievements

## 🎯 API Endpoints

### Core Creator Operations

#### 1. Get Creator by ID
```http
GET /creators/:id
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "bio": "Experienced educator",
    "profile_pic": "https://example.com/avatar.jpg",
    "rating": 4.5,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Creator retrieved successfully"
}
```

#### 2. Get Creator with Details
```http
GET /creators/:id/details
```
**Response:**
```json
{
  "success": true,
  "data": {
    "creator": { /* creator object */ },
    "qualifications": [
      {
        "id": 1,
        "name": "Bachelor of Science",
        "institution": "MIT",
        "qualification_type": "degree",
        "start_date": "2018-09-01",
        "end_date": "2022-05-15",
        "grade": "A+"
      }
    ],
    "achievements": [
      {
        "id": 1,
        "title": "Best Teacher Award",
        "description": "Recognized for excellence in teaching",
        "types": "professional",
        "date_achieved": "2023-06-15"
      }
    ]
  },
  "message": "Creator details retrieved successfully"
}
```

#### 3. Update Creator Details
```http
PATCH /creators/:id
```
**Request Body:**
```json
{
  "name": "Updated Name",
  "bio": "Updated bio",
  "rating": 4.8
}
```

#### 4. Get All Creators
```http
GET /creators?page=1&limit=10
```
**Response:**
```json
{
  "success": true,
  "data": {
    "items": [ /* array of creators */ ],
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  },
  "message": "Creators retrieved successfully"
}
```

#### 5. Create New Creator
```http
POST /creators
```
**Request Body:**
```json
{
  "name": "New Creator",
  "bio": "Bio description",
  "profile_pic": "https://example.com/pic.jpg",
  "rating": 4.0
}
```

#### 6. Delete Creator
```http
DELETE /creators/:id
```

### Search and Filter Operations

#### 7. Search Creators by Name
```http
GET /creators/search?name=john&page=1&limit=10
```

#### 8. Get Top Rated Creators
```http
GET /creators/top-rated?limit=10
```

### Qualification Management

#### 9. Add Qualification to Creator
```http
POST /creators/:id/qualifications
```
**Request Body:**
```json
{
  "name": "Master of Computer Science",
  "institution": "Stanford University",
  "qualification_type": "degree",
  "start_date": "2020-09-01",
  "end_date": "2022-06-15",
  "grade": "A"
}
```

### Achievement Management

#### 10. Add Achievement to Creator
```http
POST /creators/:id/achievements
```
**Request Body:**
```json
{
  "title": "Published Research Paper",
  "description": "Published in top-tier journal",
  "types": "academic",
  "date_achieved": "2023-12-01"
}
```

### Utility Endpoints

#### 11. Health Check
```http
GET /creators/health
```

#### 12. Get Enums
```http
GET /creators/enums
```
**Response:**
```json
{
  "success": true,
  "data": {
    "qualificationTypes": {
      "DEGREE": "degree",
      "DIPLOMA": "diploma",
      "CERTIFICATION": "certification"
    },
    "achievementTypes": {
      "ACADEMIC": "academic",
      "SPORTS": "sports",
      "PROFESSIONAL": "professional"
    }
  },
  "message": "Enums retrieved successfully"
}
```

## 🎨 TypeScript Interfaces

### Core Types

```typescript
export enum QualificationType {
  DEGREE = 'degree',
  DIPLOMA = 'diploma',
  CERTIFICATION = 'certification'
}

export enum AchievementType {
  ACADEMIC = 'academic',
  SPORTS = 'sports',
  PROFESSIONAL = 'professional'
}

export interface Creator {
  id: number;
  created_at: Date;
  updated_at: Date;
  name: string;
  bio?: string;
  profile_pic?: string;
  rating?: number;
}

export interface CreatorWithDetails {
  creator: Creator;
  qualifications: Qualification[];
  achievements: Achievement[];
}
```

## 🛡️ Validation & Security

### Input Validation
- ✅ Name length validation (2-100 characters)
- ✅ Bio length validation (max 1000 characters)
- ✅ Rating range validation (0-5)
- ✅ Date validation (start_date ≤ end_date)
- ✅ Enum value validation
- ✅ Required field validation

### Data Integrity
- ✅ Foreign key constraints
- ✅ Unique constraints on junction tables
- ✅ Check constraints for rating range
- ✅ Automatic timestamp management

## 🚀 Getting Started

### Prerequisites
- Encore CLI installed
- PostgreSQL database
- Node.js and TypeScript

### Running the Service

1. **Start the Encore application:**
```bash
encore run
```

2. **Run migrations:**
```bash
encore db migrate
```

3. **Access the API:**
- Local: `http://localhost:4000`
- Developer Dashboard: `http://localhost:9400`

### Testing

```bash
# Test specific endpoint
curl -X GET http://localhost:4000/creators/1

# Create a new creator
curl -X POST http://localhost:4000/creators \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Creator", "bio": "Test bio"}'

# Get all creators
curl -X GET "http://localhost:4000/creators?page=1&limit=5"
```

## 📁 File Structure

```
services/creators/
├── 📄 controller.ts          # API endpoints (12 endpoints)
├── 🧠 service.ts             # Business logic
├── 🗄️ repository.ts          # Database operations & validation
├── 📋 types.ts               # TypeScript interfaces & enums
├── 🔧 db.ts                  # Database configuration
├── ⚙️ encore.service.ts      # Encore service setup
├── 📖 README.md              # This documentation
└── 📂 migrations/
    └── 1_create_tables.up.sql # Database schema
```

## 🔄 Business Logic Features

### Creator Lifecycle Management
1. **Creation**: Basic creator profile setup
2. **Profile Management**: Update bio, rating, profile picture
3. **Qualification Tracking**: Add educational background
4. **Achievement Recognition**: Track accomplishments
5. **Search & Discovery**: Find creators by name or rating

### Data Relationships
- ✅ Many-to-many relationships for qualifications and achievements
- ✅ Referential integrity with foreign keys
- ✅ Automatic cascade deletion
- ✅ Efficient query patterns with proper indexing

### Performance Optimizations
- ✅ Database indexes on frequently queried fields
- ✅ Pagination for large datasets
- ✅ Efficient JOIN queries for related data
- ✅ Connection pooling through Encore

## 🐛 Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Common Error Codes
- `INVALID_ID` - Invalid creator ID format
- `CREATOR_NOT_FOUND` - Creator doesn't exist
- `UPDATE_FAILED` - Failed to update creator
- `CREATION_FAILED` - Failed to create creator
- `INVALID_PARAMS` - Invalid pagination parameters
- `INVALID_SEARCH_TERM` - Search term too short
- `QUALIFICATION_ADD_FAILED` - Failed to add qualification
- `ACHIEVEMENT_ADD_FAILED` - Failed to add achievement

## 🔮 Future Enhancements

### Planned Features
- [ ] Creator verification system
- [ ] Social media integration
- [ ] Creator analytics dashboard
- [ ] Bulk operations for qualifications/achievements
- [ ] Creator collaboration features
- [ ] Advanced search filters
- [ ] Creator recommendations
- [ ] Export creator data (GDPR compliance)

### Scalability Considerations
- [ ] Database sharding strategy
- [ ] Caching layer implementation
- [ ] Full-text search integration
- [ ] Monitoring and alerting

## 📞 Support

For questions or issues:
1. Check the logs: `encore logs`
2. Review the database: Connect to your PostgreSQL instance
3. Test endpoints: Use the Encore developer dashboard
4. Validate data: Check enum values and constraints

## 🎯 Best Practices

1. **Always validate input data** before database operations
2. **Use proper error handling** with meaningful messages
3. **Follow the three-layer architecture** pattern
4. **Use TypeScript interfaces** for type safety
5. **Include proper logging** for debugging
6. **Test all endpoints** thoroughly before deployment
7. **Use pagination** for large datasets
8. **Implement proper indexing** for performance

---

**Built with ❤️ using Encore Framework**
