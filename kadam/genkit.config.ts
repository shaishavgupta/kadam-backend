import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { xAI } from '@genkit-ai/compat-oai/xai';

export default genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }),
    xAI({
      apiKey: process.env.XAI_API_KEY,
    }),
  ],
});
