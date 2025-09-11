# TypeBox Schemas

This directory contains TypeBox schemas for API validation and documentation. TypeBox provides native JSON Schema generation and seamless integration with Fastify + Swagger.

## Structure

- `common.ts` - Shared utilities (ApiResponseSchema, PaginationQuerySchema, etc.)
- `user.ts` - User-related schemas (authentication, profile, etc.)
- `course.ts` - Course-related schemas (courses, content, modules, etc.)
- `creator.ts` - Creator-related schemas (creators, qualifications, achievements)
- `admin.ts` - Admin-related schemas (configurations, dashboard data)
- `interaction.ts` - Interaction schemas (likes, comments, shares, ratings, etc.)
- `index.ts` - Central export file for all schemas

## Alignment with Existing Types

These schemas are designed to match your existing TypeScript interfaces in `src/shared/types/`:
- `users.types.ts` → `user.ts` schemas
- `courses.types.ts` → `course.ts` schemas
- `creators.types.ts` → `creator.ts` schemas
- `admin.types.ts` → `admin.ts` schemas
- `interactions.types.ts` → `interaction.ts` schemas
- `common.types.ts` → `common.ts` schemas

## Usage

### In Controllers

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

### Schema Definition Pattern

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

## Benefits

1. **Native JSON Schema**: TypeBox generates JSON Schema natively
2. **Type Safety**: TypeScript types are automatically inferred using `.static`
3. **Swagger Integration**: Schemas automatically appear in Swagger UI
4. **Validation**: Fastify validates requests/responses against schemas
5. **Documentation**: Self-documenting API with proper types

## Validation Features

- **Pattern Matching**: Phone numbers, emails, etc.
- **Format Validation**: Dates, URIs, emails
- **Required Fields**: Automatic validation of required properties
- **Nested Objects**: Complex nested structures
- **Arrays**: Typed arrays with item validation
- **Enums**: Union types for predefined values

## Error Handling

When validation fails, Fastify automatically returns a 400 status with detailed error messages:

```json
{
  "success": false,
  "message": "body/phone must match pattern \"^[0-9]{10}$\""
}
```
