// Import individual worker initializers
import { initializeEmailWorker } from './email.worker';
import { initializeNotificationWorker } from './notification.worker';
import { initializeCourseRankingWorker } from './course-ranking.worker';
import { initializeVideoProcessingWorker } from './video-processing.worker';

// Initialize all workers
export function initializeWorkers(): void {
    console.log('👷 Initializing BullMQ workers...');

    // Initialize individual workers
    initializeEmailWorker();
    initializeNotificationWorker();
    initializeCourseRankingWorker();
    initializeVideoProcessingWorker();

    console.log('✅ All BullMQ workers initialized');
}
