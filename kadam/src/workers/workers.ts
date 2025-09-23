import { Job } from 'bullmq';
import {
    bullMQManager,
    QUEUE_NAMES,
    EmailJobData,
    NotificationJobData,
    CourseRankingJobData,
    cache
} from '../infra';
import { CoursesService } from '../service/courses.service';

// ==================== WORKER PROCESSORS ====================

// Email Worker Processors
const emailProcessor = async (job: Job<EmailJobData>) => {
    const { to, subject, template, data } = job.data;
    console.log(`📧 Processing email for ${to}: ${subject}`);

    // Simulate email processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In real implementation: send email via service (SendGrid, SES, etc.)
    console.log(`✅ Email sent to ${to}`);
};

// Notification Worker Processors
const notificationProcessor = async (job: Job<NotificationJobData>) => {
    const { userId, title, message, phone } = job.data;
    console.log(`📱 Processing notification for user ${userId}: ${title}`);

    // Simulate notification processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // In real implementation: send via FCM/APNS/SMS service
    console.log(`✅ SMS notification sent to user ${userId}: ${phone}`);
};

// Course Ranking Worker Processors
const courseRankingProcessor = async (job: Job<CourseRankingJobData>) => {
    const { eventType, courseId, data, timestamp } = job.data;
    console.log(`🏆 Processing course ranking job: ${eventType}`);

    try {
        const coursesService = new CoursesService();

        // Handle course ranking calculation
        if (eventType === 'course_ranking_calculation') {
            console.log('🔄 Starting course ranking calculation job...');
            await coursesService.calculateAndUpdateCourseRankings();
            console.log('✅ Course ranking calculation completed');
            return;
        }

        // Handle single course ranking update
        if (eventType === 'single_course_ranking_update' && courseId) {
            console.log(`🔄 Updating ranking for course ${courseId}...`);
            // For now, we'll recalculate all rankings, but this could be optimized
            // to only recalculate the specific course and its affected courses
            await coursesService.calculateAndUpdateCourseRankings();
            console.log(`✅ Course ${courseId} ranking updated`);
            return;
        }

        console.log(`✅ Course ranking job processed: ${eventType}`);
    } catch (error) {
        console.error(`❌ Error processing course ranking job ${eventType}:`, error);
        throw error;
    }
};

// Initialize all workers
export function initializeWorkers(): void {
    console.log('👷 Initializing BullMQ workers...');

    // Email Worker
    bullMQManager.createWorker(QUEUE_NAMES.EMAIL, emailProcessor, { concurrency: 3 });

    // Notification Worker
    bullMQManager.createWorker(QUEUE_NAMES.NOTIFICATIONS, notificationProcessor, { concurrency: 5 });

    // Course Ranking Worker
    bullMQManager.createWorker(QUEUE_NAMES.COURSE_RANKING, courseRankingProcessor, { concurrency: 2 });

    console.log('✅ All BullMQ workers initialized');
}
