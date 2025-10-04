import { Job } from 'bullmq';
import { CoursesService } from '../service/courses.service';
import { VectorEmbeddingJobData, ContentEmbeddingJobData, QUEUE_NAMES, bullMQManager } from '../infra/bullmq';
import { Vector } from '../schemas/course';

export class VectorEmbeddingWorker {
    private coursesService: CoursesService;

    constructor() {
        this.coursesService = new CoursesService();
    }

    /**
     * Generate embeddings for course content names
     * This worker processes course content and generates vector embeddings for semantic search
     */
    async processCourseEmbeddings(job: Job<VectorEmbeddingJobData>): Promise<void> {
        const { courseId, source, sourceId } = job.data;

        console.log(`🔄 Starting vector embedding generation for course ${courseId}, source: ${source}`);

        try {
            if (source === 'courses') {
                await this.processCourseNameEmbedding(courseId);
            } else if (source === 'contents') {
                if (sourceId) {
                    // Process specific content
                    await this.processSpecificContentEmbedding(courseId, sourceId);
                } else {
                    // Process all content for the course
                    await this.processAllContentEmbeddings(courseId);
                }
            }

            console.log(`✅ Completed vector embedding generation for course ${courseId}`);
        } catch (error) {
            console.error(`❌ Error processing vector embeddings for course ${courseId}:`, error);
            throw error;
        }
    }

    /**
     * Generate embedding for course name and description
     */
    private async processCourseNameEmbedding(courseId: number): Promise<void> {
        try {
            const course = await this.coursesService.getCourseById(courseId);
            if (!course) {
                throw new Error(`Course ${courseId} not found`);
            }

            // Check if vector already exists
            const existingVector = await this.coursesService.getVectorBySourceId('courses', courseId);
            if (existingVector) {
                console.log(`📝 Vector already exists for course ${courseId}, updating...`);
                await this.updateCourseVector(existingVector.id, course);
            } else {
                console.log(`🆕 Creating new vector for course ${courseId}`);
                await this.createCourseVector(course);
            }
        } catch (error) {
            console.error(`Error processing course name embedding for course ${courseId}:`, error);
            throw error;
        }
    }

    /**
     * Generate embedding for specific content
     */
    private async processSpecificContentEmbedding(courseId: number, contentId: number): Promise<void> {
        try {
            // Get content details from the course
            const contents = await this.coursesService.getContentsByCourseId(courseId);
            const content = contents.find(c => c.id === contentId);

            if (!content) {
                throw new Error(`Content ${contentId} not found in course ${courseId}`);
            }

            // Check if vector already exists
            const existingVector = await this.coursesService.getVectorBySourceId('contents', contentId);
            if (existingVector) {
                console.log(`📝 Vector already exists for content ${contentId}, updating...`);
                await this.updateContentVector(existingVector.id, content);
            } else {
                console.log(`🆕 Creating new vector for content ${contentId}`);
                await this.createContentVector(content);
            }
        } catch (error) {
            console.error(`Error processing content embedding for content ${contentId}:`, error);
            throw error;
        }
    }

    /**
     * Generate embeddings for all content in a course
     */
    private async processAllContentEmbeddings(courseId: number): Promise<void> {
        try {
            const contents = await this.coursesService.getContentsByCourseId(courseId);

            console.log(`📚 Processing ${contents.length} content items for course ${courseId}`);

            for (const content of contents) {
                try {
                    // Check if vector already exists
                    const existingVector = await this.coursesService.getVectorBySourceId('contents', content.id);
                    if (existingVector) {
                        console.log(`📝 Updating vector for content ${content.id}: ${content.name}`);
                        await this.updateContentVector(existingVector.id, content);
                    } else {
                        console.log(`🆕 Creating vector for content ${content.id}: ${content.name}`);
                        await this.createContentVector(content);
                    }
                } catch (error) {
                    console.error(`Error processing content ${content.id}:`, error);
                    // Continue with other content items
                }
            }
        } catch (error) {
            console.error(`Error processing all content embeddings for course ${courseId}:`, error);
            throw error;
        }
    }

    /**
     * Create vector embedding for course
     */
    private async createCourseVector(course: any): Promise<void> {
        try {
            // Combine course name and description for embedding
            const textToEmbed = `${course.name} ${course.description || ''}`.trim();

            // Generate embedding using OpenAI API or similar service
            const embedding = await this.generateEmbedding(textToEmbed);

            // Store in database
            await this.coursesService.createVector(
                textToEmbed,
                embedding,
                'courses',
                course.id
            );

            console.log(`✅ Created vector for course ${course.id}: ${course.name}`);
        } catch (error) {
            console.error(`Error creating course vector for course ${course.id}:`, error);
            throw error;
        }
    }

    /**
     * Update vector embedding for course
     */
    private async updateCourseVector(vectorId: number, course: any): Promise<void> {
        try {
            // Combine course name and description for embedding
            const textToEmbed = `${course.name} ${course.description || ''}`.trim();

            // Generate embedding using OpenAI API or similar service
            const embedding = await this.generateEmbedding(textToEmbed);

            // Update in database
            await this.coursesService.updateVector(vectorId, textToEmbed, embedding);

            console.log(`✅ Updated vector for course ${course.id}: ${course.name}`);
        } catch (error) {
            console.error(`Error updating course vector for course ${course.id}:`, error);
            throw error;
        }
    }

    /**
     * Create vector embedding for content
     */
    private async createContentVector(content: any): Promise<void> {
        try {
            // Use content name for embedding
            const textToEmbed = content.name.trim();

            // Generate embedding using OpenAI API or similar service
            const embedding = await this.generateEmbedding(textToEmbed);

            // Store in database
            await this.coursesService.createVector(
                textToEmbed,
                embedding,
                'contents',
                content.id
            );

            console.log(`✅ Created vector for content ${content.id}: ${content.name}`);
        } catch (error) {
            console.error(`Error creating content vector for content ${content.id}:`, error);
            throw error;
        }
    }

    /**
     * Update vector embedding for content
     */
    private async updateContentVector(vectorId: number, content: any): Promise<void> {
        try {
            // Use content name for embedding
            const textToEmbed = content.name.trim();

            // Generate embedding using OpenAI API or similar service
            const embedding = await this.generateEmbedding(textToEmbed);

            // Update in database
            await this.coursesService.updateVector(vectorId, textToEmbed, embedding);

            console.log(`✅ Updated vector for content ${content.id}: ${content.name}`);
        } catch (error) {
            console.error(`Error updating content vector for content ${content.id}:`, error);
            throw error;
        }
    }

    /**
     * Generate embedding using OpenAI API or similar service
     * This is a placeholder implementation - you'll need to integrate with an actual embedding service
     */
    private async generateEmbedding(text: string): Promise<number[]> {
        try {
            // TODO: Replace with actual embedding service (OpenAI, Cohere, etc.)
            // For now, return a mock embedding vector of 1536 dimensions
            console.log(`🔤 Generating embedding for text: "${text.substring(0, 50)}..."`);

            // Mock embedding generation - replace with actual API call
            const mockEmbedding = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);

            // Normalize the vector
            const magnitude = Math.sqrt(mockEmbedding.reduce((sum, val) => sum + val * val, 0));
            const normalizedEmbedding = mockEmbedding.map(val => val / magnitude);

            return normalizedEmbedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    /**
     * Process individual content embedding job
     */
    async processContentEmbedding(job: Job<ContentEmbeddingJobData>): Promise<void> {
        const { contentId, courseId, contentName, contentType } = job.data;

        console.log(`🔄 Processing content embedding for content ${contentId}: ${contentName}`);

        try {
            // Check if vector already exists
            const existingVector = await this.coursesService.getVectorBySourceId('contents', contentId);

            if (existingVector) {
                console.log(`📝 Updating existing vector for content ${contentId}`);
                await this.updateContentVector(existingVector.id, { id: contentId, name: contentName });
            } else {
                console.log(`🆕 Creating new vector for content ${contentId}`);
                await this.createContentVector({ id: contentId, name: contentName });
            }

            console.log(`✅ Completed content embedding for content ${contentId}`);
        } catch (error) {
            console.error(`❌ Error processing content embedding for content ${contentId}:`, error);
            throw error;
        }
    }
}

// Export worker instance
export const vectorEmbeddingWorker = new VectorEmbeddingWorker();

// Initialize vector embedding worker
export function initializeVectorEmbeddingWorker(): void {
    console.log('🔤 Initializing Vector Embedding Worker...');

    // Create worker for course embeddings
    // bullMQManager.createWorker(
    //     QUEUE_NAMES.VECTOR_EMBEDDING,
    //     async (job: Job<VectorEmbeddingJobData>) => {
    //         return await vectorEmbeddingWorker.processCourseEmbeddings(job);
    //     },
    //     { concurrency: 3 }
    // );

    // // Create worker for content embeddings
    // bullMQManager.createWorker(
    //     QUEUE_NAMES.VECTOR_EMBEDDING,
    //     async (job: Job<ContentEmbeddingJobData>) => {
    //         return await vectorEmbeddingWorker.processContentEmbedding(job);
    //     },
    //     { concurrency: 5 }
    // );

    console.log('✅ Vector Embedding Worker initialized');
}
