import { bullMQManager, JOB_TYPES, QUEUE_NAMES, CRON_PATTERNS } from "../infra";

// Daily Course Ranking Cron Job
export async function initializeDailyCourseRankingCron(): Promise<void> {
    console.log('⏰ Initializing daily course ranking cron job...');

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

        console.log('✅ Daily course ranking cron job initialized');
    } catch (error) {
        console.error('❌ Error initializing daily course ranking cron job:', error);
        throw error;
    }
}
