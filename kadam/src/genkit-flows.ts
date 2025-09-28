// This file exports all AI flows for Genkit dev tools
// Import all flows from the AI repository
export {
  courseRecommendationFlow,
  contentDiscoveryFlow,
  similarContentFlow,
  vectorReindexFlow,
  chatFlow,
  flows,
  dbTools,
  userProfileManager
} from './repository/ai.repository';

// Re-export the AI instance for dev tools
export { ai } from './repository/ai.repository';
