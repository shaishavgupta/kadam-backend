/**
 * BullMQ Standalone Server
 *
 * This module provides a completely standalone BullMQ server that can run independently
 * without requiring the main HTTP server. It handles queues, workers, scheduled jobs,
 * and provides its own HTTP interface for Bull Board dashboard.
 *
 * Usage:
 * - Run standalone: npm run bullmq:standalone
 * - Or directly: tsx src/bullmq-init.ts
 */

import Fastify, { FastifyInstance } from 'fastify';
import { bullMQManager, setupBullBoardDashboard } from './infra/bullmq';
import { initializeWorkers } from './workers/workers';
import { initializeScheduledJobs } from './workers/cron';
import { appConfig } from './config';

/**
 * BullMQ Standalone Server Class
 *
 * Handles the complete lifecycle of BullMQ infrastructure as a standalone service
 */
export class BullMQStandaloneServer {
    private static instance: BullMQStandaloneServer;
    private isInitialized: boolean = false;
    private fastifyInstance: FastifyInstance | null = null;
    private isRunning: boolean = false;

    private constructor() { }

    static getInstance(): BullMQStandaloneServer {
        if (!BullMQStandaloneServer.instance) {
            BullMQStandaloneServer.instance = new BullMQStandaloneServer();
        }
        return BullMQStandaloneServer.instance;
    }

    /**
     * Initialize BullMQ infrastructure (without starting HTTP server)
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('⚠️  BullMQ infrastructure already initialized');
            return;
        }

        try {
            console.log('🔄 Initializing BullMQ infrastructure...');

            // Step 1: Initialize workers
            console.log('👷 Setting up BullMQ workers...');
            initializeWorkers();

            // Step 2: Initialize scheduled jobs
            console.log('⏰ Setting up scheduled jobs...');
            await initializeScheduledJobs();

            this.isInitialized = true;
            console.log('✅ BullMQ infrastructure initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing BullMQ infrastructure:', error);
            throw error;
        }
    }

    /**
     * Start standalone BullMQ server with HTTP interface
     */
    async startServer(port?: number): Promise<void> {
        if (this.isRunning) {
            console.log('⚠️  BullMQ server already running');
            return;
        }

        try {
            // Initialize if not already done
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log('🚀 Starting BullMQ standalone server...');

            // Create Fastify instance for Bull Board
            this.fastifyInstance = Fastify({
                logger: {
                    level: appConfig.LOG_LEVEL
                }
            });

            // Setup Bull Board dashboard
            console.log('📊 Setting up Bull Board dashboard...');
            await setupBullBoardDashboard(this.fastifyInstance);

            // Add health check endpoint
            this.fastifyInstance.get('/health', async (request, reply) => {
                return {
                    status: 'OK',
                    service: 'BullMQ Standalone Server',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    queues: ['email-queue', 'notifications-queue', 'analytics-queue'],
                    workers: ['email-worker', 'notifications-worker', 'analytics-worker'],
                    infrastructure: {
                        initialized: this.isInitialized,
                        serverRunning: this.isRunning
                    }
                };
            });

            // Add root endpoint with information
            this.fastifyInstance.get('/', async (request, reply) => {
                return {
                    service: 'BullMQ Standalone Server',
                    version: '1.0.0',
                    status: 'running',
                    endpoints: {
                        health: '/health',
                        bullBoard: '/admin/queues'
                    },
                    timestamp: new Date().toISOString()
                };
            });

            // Start the server
            const serverPort = port || appConfig.PORT + 1; // Use different port than main server
            await this.fastifyInstance.listen({ port: serverPort, host: '0.0.0.0' });

            this.isRunning = true;
            console.log(`✅ BullMQ standalone server running on port ${serverPort}`);
            console.log(`🌐 Server Info: http://localhost:${serverPort}/`);
            console.log(`🌐 Bull Board Dashboard: http://localhost:${serverPort}/admin/queues`);
            console.log(`📊 Health Check: http://localhost:${serverPort}/health`);
        } catch (error) {
            console.error('❌ Error starting BullMQ server:', error);
            throw error;
        }
    }

    /**
     * Stop the standalone server
     */
    async stopServer(): Promise<void> {
        if (!this.isRunning) {
            console.log('⚠️  BullMQ server not running');
            return;
        }

        try {
            console.log('🔄 Stopping BullMQ standalone server...');
            if (this.fastifyInstance) {
                await this.fastifyInstance.close();
            }
            this.isRunning = false;
            this.fastifyInstance = null;
            console.log('✅ BullMQ standalone server stopped');
        } catch (error) {
            console.error('❌ Error stopping BullMQ server:', error);
            throw error;
        }
    }

    /**
     * Gracefully shutdown BullMQ infrastructure
     */
    async shutdown(): Promise<void> {
        if (!this.isInitialized) {
            console.log('⚠️  BullMQ infrastructure not initialized');
            return;
        }

        try {
            console.log('🔄 Shutting down BullMQ infrastructure...');

            // Stop server if running
            if (this.isRunning) {
                await this.stopServer();
            }

            // Close all queues and workers
            await bullMQManager.closeAll();

            this.isInitialized = false;
            console.log('✅ BullMQ infrastructure shutdown complete');
        } catch (error) {
            console.error('❌ Error shutting down BullMQ infrastructure:', error);
            throw error;
        }
    }

    /**
     * Check if BullMQ infrastructure is initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Check if standalone server is running
     */
    isServerRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Get BullMQ manager instance
     */
    getManager(): typeof bullMQManager {
        return bullMQManager;
    }

    /**
     * Get server status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            serverRunning: this.isRunning,
            fastifyInstance: this.fastifyInstance ? 'connected' : 'disconnected',
            bullBoardUrl: this.isRunning ? `http://localhost:${appConfig.PORT + 1}/admin/queues` : null
        };
    }
}

// Export singleton instance
export const bullMQStandaloneServer = BullMQStandaloneServer.getInstance();

// Export convenience functions for standalone usage
export async function startBullMQStandaloneServer(port?: number): Promise<void> {
    return bullMQStandaloneServer.startServer(port);
}

export async function initializeBullMQInfrastructure(): Promise<void> {
    return bullMQStandaloneServer.initialize();
}

export async function stopBullMQServer(): Promise<void> {
    return bullMQStandaloneServer.stopServer();
}

export async function shutdownBullMQInfrastructure(): Promise<void> {
    return bullMQStandaloneServer.shutdown();
}

// Export status check functions
export function getBullMQStatus() {
    return bullMQStandaloneServer.getStatus();
}

export function isBullMQReady(): boolean {
    return bullMQStandaloneServer.isReady();
}

export function isBullMQServerRunning(): boolean {
    return bullMQStandaloneServer.isServerRunning();
}

// Export manager access
export function getBullMQManager(): typeof bullMQManager {
    return bullMQStandaloneServer.getManager();
}

// CLI support for running as standalone server
if (require.main === module) {
    console.log('🚀 Starting BullMQ Standalone Server...');
    console.log('💡 This server runs independently of the main application');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🔄 Received SIGINT, shutting down gracefully...');
        try {
            await bullMQStandaloneServer.shutdown();
            console.log('✅ BullMQ Standalone Server shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    });

    process.on('SIGTERM', async () => {
        console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
        try {
            await bullMQStandaloneServer.shutdown();
            console.log('✅ BullMQ Standalone Server shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    });

    // Start the server
    startBullMQStandaloneServer()
        .then(() => {
            console.log('✅ BullMQ Standalone Server started successfully');
        })
        .catch((error) => {
            console.error('❌ Failed to start BullMQ Standalone Server:', error);
            process.exit(1);
        });
}
