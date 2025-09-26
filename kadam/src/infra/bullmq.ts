import { FastifyInstance } from 'fastify';
import { Queue, Worker } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { redisConfig } from '../config/index';

// Define the Redis connection options
const redisOptions = {
    host: redisConfig.host,
    port: redisConfig.port,
    username: redisConfig.username,
    password: redisConfig.password,
};

// Queue names
export const QUEUE_NAMES = {
    EMAIL: 'email-queue',
    NOTIFICATIONS: 'notifications-queue',
    COURSE_RANKING: 'course-ranking-queue',
    VIDEO_PROCESSING: 'video-processing-queue',
    VECTOR_EMBEDDING: 'vector-embedding-queue',
} as const;

// Job types
export const JOB_TYPES = {
    EMAIL: {
        SEND_WELCOME: 'send-welcome-email',
        SEND_COURSE_COMPLETION: 'send-course-completion-email',
        SEND_PASSWORD_RESET: 'send-password-reset-email',
    },
    NOTIFICATIONS: {
        SMS_NOTIFICATION: 'sms-notification',
        OTP_NOTIFICATION: 'otp-notification',
    },
    COURSE_RANKING: {
        CALCULATE_RANKINGS: 'calculate-rankings',
        UPDATE_SINGLE_COURSE_RANKING: 'update-single-course-ranking',
    },
    VIDEO_PROCESSING: {
        PROCESS_VIDEO: 'process-video',
        PROCESS_COURSE_VIDEOS: 'process-course-videos',
    },
    VECTOR_EMBEDDING: {
        GENERATE_COURSE_EMBEDDINGS: 'generate-course-embeddings',
        GENERATE_CONTENT_EMBEDDINGS: 'generate-content-embeddings',
    },
} as const;

// Cron patterns
export const CRON_PATTERNS = {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_HOUR: '0 * * * *',
    DAILY: '0 0 * * *',
    WEEKLY: '0 0 * * 0',
    MONTHLY: '0 0 1 * *',
} as const;

// Job data interfaces
export interface EmailJobData {
    to: string;
    subject: string;
    template: string;
    data: Record<string, any>;
}

export interface NotificationJobData {
    userId?: number;
    title: string;
    message: string;
    phone: string;
}

export interface CourseRankingJobData {
    eventType: string;
    courseId?: number;
    data: Record<string, any>;
    timestamp: string;
}

export interface VideoProcessingJobData {
    courseId: number;
    videoId: number;
    videoUrl: string;
    processingOptions?: {
        resolutions?: string[];
        format?: string;
    };
    metadata: {
        originalFileName: string;
        fileSize: number;
        duration?: number;
        uploadedBy: string;
        uploadedAt: string;
    };
}

export interface CourseVideoProcessingJobData {
    courseId: number;
    processingOptions?: {
        resolutions?: string[];
        format?: string;
    };
}

export interface VectorEmbeddingJobData {
    courseId: number;
    source: 'contents' | 'courses';
    sourceId?: number; // Optional, if not provided, will process all content for the course
}

export interface ContentEmbeddingJobData {
    contentId: number;
    courseId: number;
    contentName: string;
    contentType: 'VIDEO' | 'QUIZ' | 'NOTES';
}

// Queue Manager Class
class BullMQManager {
    private static instance: BullMQManager;
    private queues: Map<string, Queue> = new Map();
    private workers: Map<string, Worker> = new Map();
    private serverAdapter: FastifyAdapter;
    private isInitialized: boolean = false;

    private constructor() {
        this.serverAdapter = new FastifyAdapter();
        this.serverAdapter.setBasePath('/admin/queues');
        this.initializeQueues();
    }

    static getInstance(): BullMQManager {
        if (!BullMQManager.instance) {
            BullMQManager.instance = new BullMQManager();
        }
        return BullMQManager.instance;
    }

    private initializeQueues() {
        // Initialize all queues
        Object.values(QUEUE_NAMES).forEach(queueName => {
            const queue = new Queue(queueName, { connection: redisOptions });
            this.queues.set(queueName, queue);
            console.log(`📋 Initialized queue: ${queueName}`);
        });
    }

    async setupBullBoard(fastify: FastifyInstance): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        console.log('📊 Setting up Bull Board dashboard...');

        try {
            // Create Bull Board adapters for all queues
            const queueAdapters = Object.values(QUEUE_NAMES).map(queueName => {
                const queue = this.queues.get(queueName);
                if (!queue) {
                    throw new Error(`Queue ${queueName} not found`);
                }
                return new BullMQAdapter(queue);
            });

            // Create Bull Board
            createBullBoard({
                queues: queueAdapters,
                serverAdapter: this.serverAdapter,
            });

            // Register Bull Board with Fastify
            await fastify.register(this.serverAdapter.registerPlugin(), {
                prefix: '/admin/queues',
            });

            this.isInitialized = true;
            console.log('✅ Bull Board dashboard setup complete');
            console.log('🌐 Dashboard available at: http://localhost:3001/admin/queues');
        } catch (error) {
            console.error('❌ Error setting up Bull Board:', error);
            throw error;
        }
    }

    // Queue operations
    getQueue(queueName: string): Queue | undefined {
        return this.queues.get(queueName);
    }

    async addJob<T = any>(
        queueName: string,
        jobName: string,
        data: T,
        options?: {
            delay?: number;
            priority?: number;
            attempts?: number;
            removeOnComplete?: number;
            removeOnFail?: number;
            repeat?: {
                pattern: string;
                tz?: string;
            };
        }
    ): Promise<any> {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        const job = await queue.add(jobName, data, {
            delay: options?.delay || 0,
            priority: options?.priority || 0,
            attempts: options?.attempts || 3,
            removeOnComplete: options?.removeOnComplete || 10,
            removeOnFail: options?.removeOnFail || 5,
            repeat: options?.repeat,
        });

        console.log(`📤 Added job ${jobName} to ${queueName}:`, job.id);
        return job;
    }

    // Worker operations
    createWorker<T = any>(
        queueName: string,
        processor: (job: any) => Promise<any>,
        options?: { concurrency?: number }
    ): Worker {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        const worker = new Worker(queueName, processor, {
            connection: redisOptions,
            concurrency: options?.concurrency || 5,
        });

        worker.on('completed', (job) => {
            console.log(`✅ Worker completed job in ${queueName}:`, job.id);
        });

        worker.on('failed', (job, err) => {
            console.error(`❌ Worker failed job in ${queueName}:`, job?.id, err.message);
        });

        this.workers.set(queueName, worker);
        console.log(`👷 Created worker for ${queueName}`);
        return worker;
    }

    // Cron job operations
    async scheduleRecurringJob(
        queueName: string,
        jobName: string,
        data: any,
        cronPattern: string,
        jobId: string,
        options?: {
            timezone?: string;
            removeOnComplete?: number;
            removeOnFail?: number;
        }
    ): Promise<void> {
        await this.addJob(queueName, jobName, data, {
            repeat: {
                pattern: cronPattern,
                tz: options?.timezone || 'UTC',
            },
            removeOnComplete: options?.removeOnComplete || 5,
            removeOnFail: options?.removeOnFail || 3,
        });

        console.log(`⏰ Scheduled recurring job: ${jobId} (${cronPattern})`);
    }

    async scheduleDelayedJob(
        queueName: string,
        jobName: string,
        data: any,
        delayMs: number,
        options?: {
            priority?: number;
            attempts?: number;
        }
    ): Promise<void> {
        await this.addJob(queueName, jobName, data, {
            delay: delayMs,
            priority: options?.priority || 0,
            attempts: options?.attempts || 3,
        });

        console.log(`⏰ Scheduled delayed job: ${jobName} (delay: ${delayMs}ms)`);
    }

    // Get Fastify adapter for Bull Board
    getFastifyAdapter(): FastifyAdapter {
        return this.serverAdapter;
    }

    // Cleanup
    async closeAll(): Promise<void> {
        console.log('🔄 Closing all queues and workers...');

        // Close workers
        for (const [queueName, worker] of this.workers) {
            await worker.close();
            console.log(`👷 Closed worker for ${queueName}`);
        }

        // Close queues
        for (const [queueName, queue] of this.queues) {
            await queue.close();
            console.log(`📋 Closed queue ${queueName}`);
        }

        console.log('✅ All queues and workers closed');
    }
}

// Export singleton instance
export const bullMQManager = BullMQManager.getInstance();

// Export utility functions
export async function setupBullBoardDashboard(fastify: FastifyInstance): Promise<void> {
    return bullMQManager.setupBullBoard(fastify);
}

// Export types
export type { Queue, Worker };
