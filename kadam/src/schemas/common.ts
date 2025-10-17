import { Type, Static } from '@sinclair/typebox';

// Common response wrapper schema
export const ApiResponseSchema = <T extends any>(dataSchema: T) => Type.Object({
    success: Type.Boolean(),
    data: Type.Optional(dataSchema as any),
    message: Type.String(),
    error: Type.Optional(Type.String())
});

// Common query parameter schemas
export const PaginationQuerySchema = Type.Object({
    page: Type.Optional(Type.String({
        pattern: '^[0-9]+$',
        description: 'Page number'
    })),
    limit: Type.Optional(Type.String({
        pattern: '^[0-9]+$',
        description: 'Items per page'
    }))
});

// Common ID parameter schema
export const IdParamSchema = Type.Object({
    id: Type.String({
        pattern: '^[0-9]+$',
        description: 'Numeric ID'
    })
});

// Common success response
export const SuccessResponseSchema = Type.Object({
    success: Type.Boolean(),
    message: Type.String()
});

// Common error response
export const ErrorResponseSchema = Type.Object({
    success: Type.Boolean(),
    message: Type.String(),
    statusCode: Type.Number()
});

// Export inferred TypeScript types using Static
export type PaginationQuery = Static<typeof PaginationQuerySchema>;
export type IdParam = Static<typeof IdParamSchema>;
export type SuccessResponse = Static<typeof SuccessResponseSchema>;
export type ErrorResponse = Static<typeof ErrorResponseSchema>;
