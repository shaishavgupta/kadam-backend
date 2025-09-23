import { bullMQManager, JOB_TYPES, QUEUE_NAMES } from "../infra";

// Cron patterns
export const CRON_PATTERNS = {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_HOUR: '0 * * * *',
    DAILY: '0 0 * * *',
    WEEKLY: '0 0 * * 0',
    MONTHLY: '0 0 1 * *',
} as const;

// Initialize scheduled jobs
export async function initializeScheduledJobs(): Promise<void> {
    console.log('⏰ Initializing scheduled jobs...');

    try {
        // Daily course ranking calculation
        await bullMQManager.scheduleRecurringJob(
            QUEUE_NAMES.COURSE_RANKING,
            JOB_TYPES.COURSE_RANKING.CALCULATE_RANKINGS,
            {
                eventType: 'course_ranking_calculation',
                data: {
                    calculationType: 'daily_ranking_update',
                    formula: 'score = (views * 1) + (likes * 3) + (comments * 5) + (shares * 8)'
                },
                timestamp: new Date().toISOString()
            },
            CRON_PATTERNS.DAILY,
            'daily-course-ranking-calculation',
            { timezone: 'UTC', removeOnComplete: 7, removeOnFail: 3 }
        );

        console.log('✅ All scheduled jobs initialized');
    } catch (error) {
        console.error('❌ Error initializing scheduled jobs:', error);
        throw error;
    }
}
