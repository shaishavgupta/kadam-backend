# Genkit Dev Tools Setup for Kadam AI Flows

This guide explains how to run your current AI flows using Genkit development tools.

## Setup Complete ✅

The following files have been created/updated:

1. **`genkit.config.ts`** - Genkit configuration file
2. **`src/genkit-flows.ts`** - Exports all AI flows for dev tools
3. **`package.json`** - Added Genkit CLI and dev scripts
4. **`GENKIT_SETUP.md`** - This documentation

## Available AI Flows

Your project has the following AI flows available for testing:

- `courseRecommendationFlow` - Course recommendations based on user queries
- `contentDiscoveryFlow` - Content discovery within courses
- `similarContentFlow` - Find similar content using vector search
- `vectorReindexFlow` - Reindex vector embeddings
- `chatFlow` - Interactive chat with persona detection

## Running Genkit Dev Tools

### 1. Start Genkit Developer UI (Recommended)

```bash
npm run genkit:dev
```

This will:
- Start the Genkit Developer UI at `http://localhost:4000`
- Run your TypeScript code in watch mode
- Allow you to test flows interactively

### 2. Alternative: Run with Built Code

```bash
npm run build
npm run genkit:build
```

### 3. Command Line Flow Testing

You can also run flows directly from the command line:

```bash
# Test course recommendation flow
npm run genkit:flow courseRecommendationFlow '{"userQuery": "machine learning fundamentals"}'

# Test chat flow
npm run genkit:flow chatFlow '{"message": "Hello, I want to learn web development", "userId": "test-user"}'

# Test content discovery
npm run genkit:flow contentDiscoveryFlow '{"courseId": "1", "contentType": "video"}'

# Test similar content search
npm run genkit:flow similarContentFlow '{"query": "artificial intelligence", "source": "courses"}'

# Test vector reindexing
npm run genkit:flow vectorReindexFlow '{"source": "courses", "batchSize": 5}'
```

## Environment Variables Required

Make sure these environment variables are set in your `.env` file:

```env
# AI Provider Keys
XAI_API_KEY=your_xai_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Database (for flows that need DB access)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kadam_db
DB_USER=postgres
DB_PASSWORD=password

# Other required vars...
```

## Using the Genkit Developer UI

1. **Start the dev server**: `npm run genkit:dev`
2. **Open browser**: Go to `http://localhost:4000`
3. **Navigate to "Run" tab**: Select and test your flows
4. **Interactive testing**: Input test data and see results
5. **Debugging**: View logs, traces, and performance metrics

## Flow Examples

### Course Recommendation Flow
```json
{
  "userQuery": "I want to learn Python programming",
  "categoryId": "1"
}
```

### Chat Flow
```json
{
  "message": "Hi, I'm a student and want to learn web development",
  "userId": "user123",
  "type": "text"
}
```

### Content Discovery Flow
```json
{
  "courseId": "1",
  "contentType": "video"
}
```

### Similar Content Flow
```json
{
  "query": "machine learning algorithms",
  "source": "courses"
}
```

### Vector Reindex Flow
```json
{
  "source": "all",
  "batchSize": 10
}
```

## Troubleshooting

### Common Issues

1. **"Flow not found"**: Make sure `src/genkit-flows.ts` is properly exporting your flows
2. **Database connection errors**: Ensure PostgreSQL is running and environment variables are set
3. **API key errors**: Verify your XAI and Google AI API keys are valid
4. **Port conflicts**: Genkit dev UI uses port 4000, make sure it's available

### Debug Mode

For more detailed logging, you can modify `genkit.config.ts`:

```typescript
export default configureGenkit({
  // ... existing config
  logLevel: 'debug', // Change to 'info' or 'warn' for less verbose output
});
```

## Next Steps

1. **Test all flows**: Use the Genkit Developer UI to test each flow
2. **Add new flows**: Export them in `src/genkit-flows.ts`
3. **Customize prompts**: Modify flow logic in `src/repository/ai.repository.ts`
4. **Monitor performance**: Use Genkit's built-in tracing and metrics

## Integration with Existing API

Your existing Fastify API endpoints in `src/controller/ai.controller.ts` will continue to work as before. The Genkit dev tools are for development and testing purposes only.

The flows are the same ones used by your API endpoints:
- `/ai/course-recommendation` → `courseRecommendationFlow`
- `/ai/content-discovery` → `contentDiscoveryFlow`
- `/ai/similar-content` → `similarContentFlow`
- `/ai/vector-reindex` → `vectorReindexFlow`
- `/ai/chat` → `chatFlow`
