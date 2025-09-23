// Import individual cron job initializers
import { initializeDailyCourseRankingCron } from './daily-course-ranking.cron';

// Initialize scheduled jobs
export async function initializeScheduledJobs(): Promise<void> {
    console.log('⏰ Initializing scheduled jobs...');

    try {
        // Initialize individual cron jobs
        await initializeDailyCourseRankingCron();

        console.log('✅ All scheduled jobs initialized');
    } catch (error) {
        console.error('❌ Error initializing scheduled jobs:', error);
        throw error;
    }
}
