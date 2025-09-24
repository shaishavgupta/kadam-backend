export interface EmbeddingRequest {
    input: string | string[];
    model?: string;
    encoding_format?: 'float' | 'base64';
    dimensions?: number;
    user?: string;
}

export interface EmbeddingResponse {
    object: string;
    data: Array<{
        object: string;
        index: number;
        embedding: number[];
    }>;
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

export interface EmbeddingError {
    error: {
        message: string;
        type: string;
        param?: string;
        code?: string;
    };
}

export interface EmbeddingOptions {
    model?: string;
    dimensions?: number;
    encodingFormat?: 'float' | 'base64';
    batchSize?: number;
}

export interface SimilarityResult {
    index: number;
    similarity: number;
    content?: string;
    metadata?: Record<string, any>;
}

export interface BatchEmbeddingResult {
    embeddings: number[][];
    errors: Array<{
        index: number;
        error: string;
    }>;
    totalProcessed: number;
    totalErrors: number;
}

export interface EmbeddingModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
    permission: any[];
    root: string;
    parent?: string;
}

export interface EmbeddingUsage {
    prompt_tokens: number;
    total_tokens: number;
}

export interface EmbeddingData {
    object: string;
    index: number;
    embedding: number[];
}

export interface EmbeddingSearchRequest {
    query: string;
    source: 'contents' | 'courses';
    limit?: number;
    threshold?: number;
    model?: string;
}

export interface EmbeddingSearchResult {
    results: Array<{
        id: number;
        content: string;
        similarity: number;
        source: 'contents' | 'courses';
        source_id: number;
        metadata?: Record<string, any>;
    }>;
    query: string;
    model: string;
    totalResults: number;
}
