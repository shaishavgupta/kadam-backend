// Export all schemas from a central location
export * from './common';
export * from './user';
export * from './course';
export * from './creator';
export * from './admin';
export * from './interaction';

// Re-export commonly used TypeBox utilities
export { Type } from '@sinclair/typebox';
export type { Static } from '@sinclair/typebox';
