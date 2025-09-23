import { Job } from 'bullmq';
import { bullMQManager, QUEUE_NAMES, CourseRankingJobData } from '../infra';
import { CoursesService } from '../service/courses.service';

// Course Ranking Worker Processor
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

// Initialize Course Ranking Worker
export function initializeCourseRankingWorker(): void {
    console.log('🏆 Initializing Course Ranking worker...');
    bullMQManager.createWorker(QUEUE_NAMES.COURSE_RANKING, courseRankingProcessor, { concurrency: 2 });
    console.log('✅ Course Ranking worker initialized');
}
