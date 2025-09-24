/**
 * Utility functions for mathematical operations
 */

/**
 * Calculate the cosine similarity between two vectors
 *
 * Cosine similarity measures the cosine of the angle between two vectors,
 * which indicates how similar they are in direction (not magnitude).
 *
 * Formula: cos(θ) = (A · B) / (||A|| × ||B||)
 * Where:
 * - A · B is the dot product of vectors A and B
 * - ||A|| and ||B|| are the magnitudes (norms) of vectors A and B
 *
 * @param vectorA - First vector as an array of numbers
 * @param vectorB - Second vector as an array of numbers
 * @returns Cosine similarity value between -1 and 1
 * @throws Error if vectors have different lengths or are empty
 *
 * @example
 * ```typescript
 * const vectorA = [1, 2, 3];
 * const vectorB = [2, 4, 6];
 * const similarity = cosineSimilarity(vectorA, vectorB);
 * console.log(similarity); // 1.0 (perfectly similar)
 * ```
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    // Validate inputs
    if (!vectorA || !vectorB) {
        throw new Error('Vectors cannot be null or undefined');
    }

    if (vectorA.length === 0 || vectorB.length === 0) {
        throw new Error('Vectors cannot be empty');
    }

    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same length');
    }

    // Calculate dot product
    let dotProduct = 0;
    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
    }

    // Calculate magnitudes
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
        magnitudeA += vectorA[i] * vectorA[i];
        magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    // Handle edge case where one or both vectors are zero vectors
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    // Calculate cosine similarity
    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate cosine similarity for multiple vectors against a target vector
 *
 * @param targetVector - The vector to compare against
 * @param vectors - Array of vectors to compare with the target
 * @returns Array of cosine similarity scores in the same order as input vectors
 *
 * @example
 * ```typescript
 * const target = [1, 2, 3];
 * const vectors = [
 *   [2, 4, 6],    // Similar to target
 *   [0, 0, 0],    // Zero vector
 *   [-1, -2, -3]  // Opposite direction
 * ];
 * const similarities = cosineSimilarityMultiple(target, vectors);
 * console.log(similarities); // [1, 0, -1]
 * ```
 */
export function cosineSimilarityMultiple(
    targetVector: number[],
    vectors: number[][]
): number[] {
    return vectors.map(vector => cosineSimilarity(targetVector, vector));
}

/**
 * Find the most similar vector to a target vector
 *
 * @param targetVector - The vector to compare against
 * @param vectors - Array of vectors to compare with the target
 * @returns Object containing the index and similarity score of the most similar vector
 *
 * @example
 * ```typescript
 * const target = [1, 2, 3];
 * const vectors = [
 *   [2, 4, 6],    // Most similar
 *   [0, 1, 0],    // Less similar
 *   [-1, -2, -3]  // Opposite
 * ];
 * const result = findMostSimilar(target, vectors);
 * console.log(result); // { index: 0, similarity: 1, vector: [2, 4, 6] }
 * ```
 */
export function findMostSimilar(
    targetVector: number[],
    vectors: number[][]
): { index: number; similarity: number; vector: number[] } | null {
    if (vectors.length === 0) {
        return null;
    }

    let maxSimilarity = -Infinity;
    let bestIndex = 0;

    for (let i = 0; i < vectors.length; i++) {
        const similarity = cosineSimilarity(targetVector, vectors[i]);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestIndex = i;
        }
    }

    return {
        index: bestIndex,
        similarity: maxSimilarity,
        vector: vectors[bestIndex]
    };
}

/**
 * Calculate the magnitude (norm) of a vector
 *
 * @param vector - The vector to calculate magnitude for
 * @returns The magnitude of the vector
 *
 * @example
 * ```typescript
 * const vector = [3, 4];
 * const magnitude = vectorMagnitude(vector);
 * console.log(magnitude); // 5
 * ```
 */
export function vectorMagnitude(vector: number[]): number {
    if (!vector || vector.length === 0) {
        return 0;
    }

    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
        sum += vector[i] * vector[i];
    }

    return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 *
 * @param vector - The vector to normalize
 * @returns A new normalized vector (unit vector)
 * @throws Error if vector is zero vector
 *
 * @example
 * ```typescript
 * const vector = [3, 4];
 * const normalized = normalizeVector(vector);
 * console.log(normalized); // [0.6, 0.8]
 * ```
 */
export function normalizeVector(vector: number[]): number[] {
    const magnitude = vectorMagnitude(vector);

    if (magnitude === 0) {
        throw new Error('Cannot normalize zero vector');
    }

    return vector.map(component => component / magnitude);
}

/**
 * Calculate the dot product of two vectors
 *
 * @param vectorA - First vector
 * @param vectorB - Second vector
 * @returns The dot product
 * @throws Error if vectors have different lengths
 *
 * @example
 * ```typescript
 * const vectorA = [1, 2, 3];
 * const vectorB = [4, 5, 6];
 * const dotProduct = dotProduct(vectorA, vectorB);
 * console.log(dotProduct); // 32
 * ```
 */
export function dotProduct(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same length');
    }

    let result = 0;
    for (let i = 0; i < vectorA.length; i++) {
        result += vectorA[i] * vectorB[i];
    }

    return result;
}
