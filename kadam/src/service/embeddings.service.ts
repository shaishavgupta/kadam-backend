import { ApiClient, HttpError } from '../shared/api/client';
import { openaiConfig } from '../config';
import {
    EmbeddingRequest,
    EmbeddingResponse,
    EmbeddingError,
    EmbeddingOptions,
    SimilarityResult,
    BatchEmbeddingResult,
    EmbeddingModel
} from '../shared/types/embeddings.types';

export class EmbeddingsService {
    private apiClient: ApiClient;
    private defaultModel: string;

    constructor() {
        this.apiClient = new ApiClient({
            baseURL: openaiConfig.baseUrl,
            defaultHeaders: {
                'Authorization': `Bearer ${openaiConfig.apiKey}`,
                'Content-Type': 'application/json',
            },
            defaultTimeout: 60000, // 60 seconds for embeddings
        });

        // Default to text-embedding-3-small for cost efficiency
        this.defaultModel = 'text-embedding-3-small';
    }

    /**
     * Generate embeddings for a single text input
     */
    async generateEmbedding(
        text: string,
        options?: EmbeddingOptions
    ): Promise<number[]> {
        try {
            const request: EmbeddingRequest = {
                input: text,
                model: options?.model || this.defaultModel,
                encoding_format: options?.encodingFormat || 'float',
                ...(options?.dimensions && { dimensions: options.dimensions }),
            };

            const response = await this.apiClient.post<EmbeddingResponse>(
                '/embeddings',
                request
            );

            if (!response.data.data || response.data.data.length === 0) {
                throw new Error('No embedding data received from OpenAI');
            }

            return response.data.data[0].embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);

            if (error instanceof HttpError) {
                // Handle OpenAI API specific errors
                if (error.data && typeof error.data === 'object') {
                    const openaiError = error.data as EmbeddingError;
                    throw new Error(`OpenAI API Error: ${openaiError.error.message}`);
                }
                throw new Error(`HTTP Error ${error.status}: ${error.message}`);
            }

            throw error;
        }
    }

    /**
     * Generate embeddings for multiple text inputs in a single request
     */
    async generateEmbeddings(
        texts: string[],
        options?: EmbeddingOptions
    ): Promise<number[][]> {
        try {
            const request: EmbeddingRequest = {
                input: texts,
                model: options?.model || this.defaultModel,
                encoding_format: options?.encodingFormat || 'float',
                ...(options?.dimensions && { dimensions: options.dimensions }),
            };

            const response = await this.apiClient.post<EmbeddingResponse>(
                '/embeddings',
                request
            );

            if (!response.data.data || response.data.data.length === 0) {
                throw new Error('No embedding data received from OpenAI');
            }

            // Sort by index to maintain order
            const sortedData = response.data.data.sort((a, b) => a.index - b.index);
            return sortedData.map(item => item.embedding);
        } catch (error) {
            console.error('Error generating embeddings:', error);

            if (error instanceof HttpError) {
                // Handle OpenAI API specific errors
                if (error.data && typeof error.data === 'object') {
                    const openaiError = error.data as EmbeddingError;
                    throw new Error(`OpenAI API Error: ${openaiError.error.message}`);
                }
                throw new Error(`HTTP Error ${error.status}: ${error.message}`);
            }

            throw error;
        }
    }

    /**
     * Generate embeddings for course content with optimized settings
     */
    async generateCourseEmbedding(
        content: string,
        options?: EmbeddingOptions
    ): Promise<number[]> {
        try {
            // Use text-embedding-3-small for courses (good balance of quality and cost)
            const model = options?.model || 'text-embedding-3-small';
            const dimensions = options?.dimensions || 1536; // Default for text-embedding-3-small

            return await this.generateEmbedding(content, {
                model,
                dimensions,
                encodingFormat: 'float',
            });
        } catch (error) {
            console.error('Error generating course embedding:', error);
            throw error;
        }
    }

    /**
     * Generate embeddings for course content with optimized settings
     */
    async generateContentEmbedding(
        content: string,
        options?: EmbeddingOptions
    ): Promise<number[]> {
        try {
            // Use text-embedding-3-small for content (good balance of quality and cost)
            const model = options?.model || 'text-embedding-3-small';
            const dimensions = options?.dimensions || 1536; // Default for text-embedding-3-small

            return await this.generateEmbedding(content, {
                model,
                dimensions,
                encodingFormat: 'float',
            });
        } catch (error) {
            console.error('Error generating content embedding:', error);
            throw error;
        }
    }

    /**
     * Batch generate embeddings for multiple course contents
     */
    async generateBatchEmbeddings(
        contents: string[],
        options?: EmbeddingOptions
    ): Promise<number[][]> {
        try {
            const batchSize = options?.batchSize || 100; // OpenAI's recommended batch size
            const model = options?.model || 'text-embedding-3-small';
            const dimensions = options?.dimensions || 1536;

            const results: number[][] = [];

            // Process in batches to avoid rate limits
            for (let i = 0; i < contents.length; i += batchSize) {
                const batch = contents.slice(i, i + batchSize);
                const batchEmbeddings = await this.generateEmbeddings(batch, {
                    model,
                    dimensions,
                    encodingFormat: 'float',
                });
                results.push(...batchEmbeddings);

                // Small delay between batches to be respectful to the API
                if (i + batchSize < contents.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            return results;
        } catch (error) {
            console.error('Error generating batch embeddings:', error);
            throw error;
        }
    }

    /**
     * Get available embedding models
     */
    async getAvailableModels(): Promise<string[]> {
        try {
            const response = await this.apiClient.get<{ data: EmbeddingModel[] }>('/models');

            // Filter for embedding models
            const embeddingModels = response.data.data
                .filter((model: EmbeddingModel) => model.id.includes('embedding'))
                .map((model: EmbeddingModel) => model.id);

            return embeddingModels;
        } catch (error) {
            console.error('Error getting available models:', error);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
        if (embedding1.length !== embedding2.length) {
            throw new Error('Embeddings must have the same dimension');
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);

        if (norm1 === 0 || norm2 === 0) {
            return 0;
        }

        return dotProduct / (norm1 * norm2);
    }

    /**
     * Find the most similar embedding from a list of embeddings
     */
    findMostSimilar(
        queryEmbedding: number[],
        candidateEmbeddings: number[][],
        threshold: number = 0.7
    ): SimilarityResult | null {
        let bestMatch: SimilarityResult | null = null;

        for (let i = 0; i < candidateEmbeddings.length; i++) {
            const similarity = this.calculateCosineSimilarity(queryEmbedding, candidateEmbeddings[i]);

            if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
                bestMatch = { index: i, similarity };
            }
        }

        return bestMatch;
    }
}
