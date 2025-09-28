import express from 'express';
import { 
  courseRecommendationFlow, 
  contentDiscoveryFlow, 
  similarContentFlow, 
  vectorReindexFlow, 
  chatFlow 
} from './genkit-flows';

// Express Server Setup
const app = express();

// Configure JSON parsing with proper options
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));

// Debug middleware to log requests
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Request body:', req.body);
  console.log('Content-Type:', req.get('Content-Type'));
  next();
});

// Custom handlers for Genkit flows
app.post('/courseRecommendationFlow', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Course recommendation request body:', req.body);
    const result = await courseRecommendationFlow(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in courseRecommendationFlow:', error);
    res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/contentDiscoveryFlow', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Content discovery request body:', req.body);
    const result = await contentDiscoveryFlow(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in contentDiscoveryFlow:', error);
    res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/similarContentFlow', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Similar content request body:', req.body);
    const result = await similarContentFlow(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in similarContentFlow:', error);
    res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/vectorReindexFlow', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Vector reindex request body:', req.body);
    const result = await vectorReindexFlow(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in vectorReindexFlow:', error);
    res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/chatFlow', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Chat flow request body:', req.body);
    const result = await chatFlow(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in chatFlow:', error);
    res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Kadam Genkit Express server listening on port ${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   POST /courseRecommendationFlow - Get course recommendations`);
  console.log(`   POST /contentDiscoveryFlow - Discover course content`);
  console.log(`   POST /similarContentFlow - Find similar content`);
  console.log(`   POST /vectorReindexFlow - Reindex vector embeddings`);
  console.log(`   POST /chatFlow - Chat with AI mentor`);
  console.log(`   GET /health - Health check`);
});
