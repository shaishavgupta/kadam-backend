import express from 'express';
import {
  chatFlow 
} from './repository/ai';

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
  console.log(`   POST /chatFlow - Chat with AI mentor`);
  console.log(`   GET /health - Health check`);
});
