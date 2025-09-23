import { Job } from 'bullmq';
import { bullMQManager, QUEUE_NAMES, EmailJobData } from '../infra';

// Email Worker Processor
const emailProcessor = async (job: Job<EmailJobData>) => {
    const { to, subject, template, data } = job.data;
    console.log(`📧 Processing email for ${to}: ${subject}`);

    // Simulate email processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In real implementation: send email via service (SendGrid, SES, etc.)
    console.log(`✅ Email sent to ${to}`);
};

// Initialize Email Worker
export function initializeEmailWorker(): void {
    console.log('📧 Initializing Email worker...');
    bullMQManager.createWorker(QUEUE_NAMES.EMAIL, emailProcessor, { concurrency: 3 });
    console.log('✅ Email worker initialized');
}
