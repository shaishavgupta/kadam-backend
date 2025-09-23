import {
    bullMQManager,
    QUEUE_NAMES,
    JOB_TYPES,
    EmailJobData,
    NotificationJobData,
} from '../infra';

// Simple Queue Service
export class QueueService {
    // Email operations
    static async sendWelcomeEmail(userEmail: string, userId: number, userName: string): Promise<void> {
        await bullMQManager.addJob<EmailJobData>(
            QUEUE_NAMES.EMAIL,
            JOB_TYPES.EMAIL.SEND_WELCOME,
            {
                to: userEmail,
                subject: 'Welcome to Kadam!',
                template: 'welcome',
                data: { userId, userName }
            },
            { priority: 10, attempts: 3 }
        );
    }

    static async sendCourseCompletionEmail(userEmail: string, userId: number, courseId: number, courseName: string): Promise<void> {
        await bullMQManager.addJob<EmailJobData>(
            QUEUE_NAMES.EMAIL,
            JOB_TYPES.EMAIL.SEND_COURSE_COMPLETION,
            {
                to: userEmail,
                subject: `Congratulations! You completed ${courseName}`,
                template: 'course_completion',
                data: { userId, courseId, courseName }
            },
            { priority: 5, attempts: 3 }
        );
    }

    // Notification operations
    static async sendSmsNotification(userId: number, title: string, message: string, phone: string, data?: any): Promise<void> {
        // Template the message
        message = message.replace("{otp}", data.otp);

        if (!message) {
            throw new Error("Message is required");
        }
        await bullMQManager.addJob<NotificationJobData>(
            QUEUE_NAMES.NOTIFICATIONS,
            JOB_TYPES.NOTIFICATIONS.SMS_NOTIFICATION,
            {
                userId,
                title,
                message,
                phone
            },
            { priority: 8, attempts: 3 }
        );
    }

    static async sendOtpNotification(title: string, message: string, phone: string, data?: any): Promise<void> {
        if (!data.otp) {
            throw new Error("OTP is required");
        }

        // Template the message
        message = message.replace("{otp}", data.otp);

        await bullMQManager.addJob<NotificationJobData>(
            QUEUE_NAMES.NOTIFICATIONS,
            JOB_TYPES.NOTIFICATIONS.OTP_NOTIFICATION,
            {
                title,
                message,
                phone
            },
            { priority: 8, attempts: 3 }
        );
    }

    // Delayed job operations
    static async scheduleWelcomeEmail(userId: number, userEmail: string, delayMs: number = 5000): Promise<void> {
        await bullMQManager.scheduleDelayedJob(
            QUEUE_NAMES.EMAIL,
            JOB_TYPES.EMAIL.SEND_WELCOME,
            {
                to: userEmail,
                subject: 'Welcome to Kadam!',
                template: 'welcome',
                data: { userId, userName: `User ${userId}` }
            },
            delayMs
        );
    }

    // Batch operations
    static async batchSendWelcomeEmails(users: Array<{ id: number; email: string; name: string }>): Promise<void> {
        const jobs = users.map(user =>
            bullMQManager.addJob<EmailJobData>(
                QUEUE_NAMES.EMAIL,
                JOB_TYPES.EMAIL.SEND_WELCOME,
                {
                    to: user.email,
                    subject: 'Welcome to Kadam!',
                    template: 'welcome',
                    data: { userId: user.id, userName: user.name }
                },
                { priority: 10, attempts: 3 }
            )
        );

        await Promise.all(jobs);
        console.log(`📧 Queued ${users.length} welcome emails`);
    }
}
