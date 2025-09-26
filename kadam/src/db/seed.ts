import { Client } from 'pg';
import { dbConfig } from '../config';
import { ContentType } from '../shared/enums';
// Create PostgreSQL client
const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    ssl: dbConfig.ssl,
});

async function seedDatabase() {
    try {
        // Connect to database
        await client.connect();
        console.log('📊 Connected to PostgreSQL database for seeding');

        // Clear existing data in reverse dependency order
        console.log('🧹 Clearing existing data...');
        await clearExistingData();

        // Seed data in dependency order
        console.log('🌱 Seeding database with sample data...');

        // Core entities first
        const adminIds = await seedAdmins();
        const categoryIds = await seedCategories();
        const creatorIds = await seedCreators();
        const userIds = await seedUsers();

        // Course-related entities
        const certificateIds = await seedCertificates();
        const qualificationIds = await seedQualifications();
        const achievementIds = await seedAchievements();
        await seedCreatorQualifications(creatorIds, qualificationIds);
        await seedCreatorAchievements(creatorIds, achievementIds);

        const courseIds = await seedCourses(categoryIds, certificateIds);
        await seedCourseCategories(courseIds, categoryIds);
        await seedCourseCreators(courseIds, creatorIds);

        const moduleIds = await seedModules(courseIds);
        const contentIds = await seedContents(courseIds, moduleIds, categoryIds);

        // User-related entities
        await seedUserEnrollments(userIds, courseIds);
        await seedUserBadges(userIds);
        await seedUserCertificates(userIds, courseIds);
        await seedUserQuizAttempts(userIds, contentIds);

        // Admin-related entities
        await seedAdminConfigurations(adminIds);
        await seedAdminActivities(adminIds);

        // Interactions
        await seedInteractions(userIds, courseIds, contentIds);

        // Vector embeddings
        await seedVectors(courseIds, contentIds);

        console.log('✅ Database seeded successfully!');

        // Print summary
        await printSeedingSummary();

    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function clearExistingData() {
    const tables = [
        'views',
        'saves',
        'shares',
        'comments',
        'likes',
        'admin_activities',
        'admin_configurations',
        'user_quiz_attempts',
        'user_certificates',
        'user_badges',
        'user_enrollments',
        'vectors',
        'contents',
        'modules',
        'course_creators',
        'course_categories',
        'courses',
        'creator_achievements',
        'creator_qualifications',
        'achievements',
        'qualifications',
        'users',
        'creators',
        'categories',
        'admins'
    ];

    for (const table of tables) {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }
}

async function seedAdmins(): Promise<number[]> {
    console.log('👤 Seeding admins...');
    const bcrypt = require('bcrypt');

    const admins = [
        {
            name: 'Super Admin',
            email: 'admin@kadam.com',
            phone: '+919876543210',
            password: await bcrypt.hash('admin123', 10),
            is_active: true,
            profile_pic: 'https://example.com/admin1.jpg'
        },
        {
            name: 'Content Manager',
            email: 'content@kadam.com',
            phone: '+918765432109',
            password: await bcrypt.hash('content123', 10),
            is_active: true,
            profile_pic: 'https://example.com/admin2.jpg'
        }
    ];

    const adminIds: number[] = [];
    for (const admin of admins) {
        const result = await client.query(
            `INSERT INTO admins (name, email, phone, password, is_active, profile_pic, last_active_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
            [admin.name, admin.email, admin.phone, admin.password, admin.is_active, admin.profile_pic]
        );
        adminIds.push(result.rows[0].id);
    }

    console.log(`✅ Seeded ${adminIds.length} admins`);
    return adminIds;
}

async function seedCategories(): Promise<number[]> {
    console.log('📚 Seeding categories...');
    const categories = [
        { name: 'Programming', image_url: 'https://example.com/programming.jpg', priority: 1.0 },
        { name: 'Design', image_url: 'https://example.com/design.jpg', priority: 0.9 },
        { name: 'Marketing', image_url: 'https://example.com/marketing.jpg', priority: 0.8 },
        { name: 'Business', image_url: 'https://example.com/business.jpg', priority: 0.7 },
        { name: 'Data Science', image_url: 'https://example.com/datascience.jpg', priority: 0.6 }
    ];

    const categoryIds: number[] = [];
    for (const category of categories) {
        const result = await client.query(
            `INSERT INTO categories (name, image_url, priority) VALUES ($1, $2, $3) RETURNING id`,
            [category.name, category.image_url, category.priority]
        );
        categoryIds.push(result.rows[0].id);
    }

    console.log(`✅ Seeded ${categoryIds.length} categories`);
    return categoryIds;
}

async function seedCreators(): Promise<number[]> {
    console.log('👨‍🏫 Seeding creators...');
    const creators = [
        {
            name: 'John Doe',
            bio: 'Full-stack developer with 10+ years of experience in web development and teaching.',
            profile_pic: 'https://example.com/creator1.jpg',
            rating: 5,
            email: 'john.doe@example.com',
            phone_number: '+919876543211'
        },
        {
            name: 'Jane Smith',
            bio: 'UX/UI Designer passionate about creating beautiful and user-friendly interfaces.',
            profile_pic: 'https://example.com/creator2.jpg',
            rating: 4,
            email: 'jane.smith@example.com',
            phone_number: '+919876543212'
        },
        {
            name: 'Mike Johnson',
            bio: 'Digital marketing expert helping businesses grow their online presence.',
            profile_pic: 'https://example.com/creator3.jpg',
            rating: 5,
            email: 'mike.johnson@example.com',
            phone_number: '+919876543213'
        },
        {
            name: 'Sarah Wilson',
            bio: 'Data scientist and machine learning engineer with expertise in Python and R.',
            profile_pic: 'https://example.com/creator4.jpg',
            rating: 4,
            email: 'sarah.wilson@example.com',
            phone_number: '+919876543214'
        }
    ];

    const creatorIds: number[] = [];
    for (const creator of creators) {
        const result = await client.query(
            `INSERT INTO creators (name, bio, profile_pic, rating, email, phone_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [creator.name, creator.bio, creator.profile_pic, creator.rating, creator.email, creator.phone_number]
        );
        creatorIds.push(result.rows[0].id);
    }

    console.log(`✅ Seeded ${creatorIds.length} creators`);
    return creatorIds;
}

async function seedUsers(): Promise<number[]> {
    console.log('👥 Seeding users...');
    const users = [
        {
            email: 'user1@example.com',
            name: 'Alice Brown',
            phone: '+919876543201',
            avatar_url: 'https://example.com/user1.jpg',
            preferred_language: 'en',
            plan_type: 'premium',
            onboarding_completed: true,
            whatsapp_allowed: true,
            paid_at: new Date()
        },
        {
            email: 'user2@example.com',
            name: 'Bob Wilson',
            phone: '+919876543202',
            avatar_url: 'https://example.com/user2.jpg',
            preferred_language: 'en',
            plan_type: 'free',
            onboarding_completed: true,
            whatsapp_allowed: false
        },
        {
            email: 'user3@example.com',
            name: 'Charlie Davis',
            phone: '+919876543203',
            avatar_url: 'https://example.com/user3.jpg',
            preferred_language: 'hi',
            plan_type: 'premium',
            onboarding_completed: false,
            whatsapp_allowed: true,
            paid_at: new Date()
        }
    ];

    const userIds: number[] = [];
    for (const user of users) {
        const result = await client.query(
            `INSERT INTO users (email, name, phone, avatar_url, preferred_language, plan_type, onboarding_completed, whatsapp_allowed, paid_at, last_active_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id`,
            [user.email, user.name, user.phone, user.avatar_url, user.preferred_language, user.plan_type, user.onboarding_completed, user.whatsapp_allowed, user.paid_at]
        );
        userIds.push(result.rows[0].id);
    }

    console.log(`✅ Seeded ${userIds.length} users`);
    return userIds;
}

async function seedQualifications(): Promise<number[]> {
    console.log('🎓 Seeding qualifications...');
    const qualifications = [
        {
            name: 'Bachelor of Computer Science',
            institution: 'MIT',
            qualification_type: 'degree',
            start_date: '2010-09-01',
            end_date: '2014-06-01',
            grade: 'A'
        },
        {
            name: 'Master of Design',
            institution: 'Stanford University',
            qualification_type: 'degree',
            start_date: '2015-09-01',
            end_date: '2017-06-01',
            grade: 'A+'
        },
        {
            name: 'Digital Marketing Certification',
            institution: 'Google',
            qualification_type: 'certification',
            start_date: '2020-01-01',
            end_date: '2020-03-01',
            grade: 'Certified'
        },
        {
            name: 'PhD in Data Science',
            institution: 'Harvard University',
            qualification_type: 'degree',
            start_date: '2016-09-01',
            end_date: '2020-06-01',
            grade: 'Summa Cum Laude'
        }
    ];

    const qualificationIds: number[] = [];
    for (const qualification of qualifications) {
        const result = await client.query(
            `INSERT INTO qualifications (name, institution, qualification_type, start_date, end_date, grade)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [qualification.name, qualification.institution, qualification.qualification_type, qualification.start_date, qualification.end_date, qualification.grade]
        );
        qualificationIds.push(result.rows[0].id);
    }

    console.log(`✅ Seeded ${qualificationIds.length} qualifications`);
    return qualificationIds;
}

async function seedAchievements(): Promise<number[]> {
    console.log('🏆 Seeding achievements...');
    const achievements = [
        {
            title: 'Best Developer Award',
            description: 'Awarded for outstanding contribution to open source projects',
            types: 'professional',
            date_achieved: '2022-12-01'
        },
        {
            title: 'Design Excellence Award',
            description: 'Recognition for innovative UI/UX design solutions',
            types: 'professional',
            date_achieved: '2023-06-15'
        },
        {
            title: 'Digital Marketing Champion',
            description: 'Top performer in digital marketing campaigns',
            types: 'professional',
            date_achieved: '2023-03-20'
        },
        {
            title: 'Research Publication',
            description: 'Published paper on machine learning in top-tier journal',
            types: 'academic',
            date_achieved: '2023-09-10'
        }
    ];

    const achievementIds: number[] = [];
    for (const achievement of achievements) {
        const result = await client.query(
            `INSERT INTO achievements (title, description, types, date_achieved)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [achievement.title, achievement.description, achievement.types, achievement.date_achieved]
        );
        achievementIds.push(result.rows[0].id);
    }

    console.log(`✅ Seeded ${achievementIds.length} achievements`);
    return achievementIds;
}

async function seedCreatorQualifications(creatorIds: number[], qualificationIds: number[]): Promise<void> {
    console.log('🔗 Linking creators with qualifications...');

    // Link each creator with one qualification
    for (let i = 0; i < creatorIds.length && i < qualificationIds.length; i++) {
        await client.query(
            `INSERT INTO creator_qualifications (creator_id, qualification_id) VALUES ($1, $2)`,
            [creatorIds[i], qualificationIds[i]]
        );
    }

    console.log(`✅ Linked ${Math.min(creatorIds.length, qualificationIds.length)} creator-qualification relationships`);
}

async function seedCreatorAchievements(creatorIds: number[], achievementIds: number[]): Promise<void> {
    console.log('🔗 Linking creators with achievements...');

    // Link each creator with one achievement
    for (let i = 0; i < creatorIds.length && i < achievementIds.length; i++) {
        await client.query(
            `INSERT INTO creator_achievements (creator_id, achievement_id) VALUES ($1, $2)`,
            [creatorIds[i], achievementIds[i]]
        );
    }

    console.log(`✅ Linked ${Math.min(creatorIds.length, achievementIds.length)} creator-achievement relationships`);
}

async function seedCertificates(): Promise<number[]> {
    console.log('🏆 Seeding certificates...');
    const certificates = [
        {
            name: 'JavaScript Mastery Certificate',
            html_content: '<div class="certificate"><h1>JavaScript Mastery Certificate</h1><p>This certifies that the student has completed the JavaScript Bootcamp course.</p></div>',
            is_active: true
        },
        {
            name: 'UI/UX Design Certificate',
            html_content: '<div class="certificate"><h1>UI/UX Design Certificate</h1><p>This certifies that the student has completed the UI/UX Design Masterclass.</p></div>',
            is_active: true
        },
        {
            name: 'Digital Marketing Certificate',
            html_content: '<div class="certificate"><h1>Digital Marketing Certificate</h1><p>This certifies that the student has completed the Digital Marketing Strategy course.</p></div>',
            is_active: true
        },
        {
            name: 'Python Data Science Certificate',
            html_content: '<div class="certificate"><h1>Python Data Science Certificate</h1><p>This certifies that the student has completed the Python for Data Science course.</p></div>',
            is_active: true
        }
    ];

    const certificateIds: number[] = [];
    for (const certificate of certificates) {
        const result = await client.query(
            `INSERT INTO certificates (name, html_content, is_active, updated_at)
             VALUES ($1, $2, $3, NOW()) RETURNING id`,
            [certificate.name, certificate.html_content, certificate.is_active]
        );
        certificateIds.push(result.rows[0].id);
    }

    console.log(`✅ Seeded ${certificateIds.length} certificates`);
    return certificateIds;
}

async function seedCourses(categoryIds: number[], certificateIds: number[]): Promise<number[]> {
    console.log('📖 Seeding courses...');
    const courses = [
        {
            name: 'Complete JavaScript Bootcamp',
            description: 'Learn JavaScript from basics to advanced concepts with hands-on projects.',
            is_paid: true,
            price: 99.99,
            thumbnail_url: 'https://example.com/js-course.jpg',
            certificate_id: 1,
            priority: 1.0,
            creator_published_at: new Date(),
            next_course_ids: [2, 3]
        },
        {
            name: 'UI/UX Design Masterclass',
            description: 'Master the art of user interface and user experience design.',
            is_paid: true,
            price: 79.99,
            thumbnail_url: 'https://example.com/design-course.jpg',
            certificate_id: 2,
            priority: 0.9,
            creator_published_at: new Date(),
            next_course_ids: [3, 4]
        },
        {
            name: 'Digital Marketing Strategy',
            description: 'Comprehensive guide to digital marketing and growth hacking.',
            is_paid: true,
            price: 69.99,
            thumbnail_url: 'https://example.com/marketing-course.jpg',
            certificate_id: 3,
            priority: 0.8,
            creator_published_at: new Date(),
            next_course_ids: [4]
        },
        {
            name: 'Python for Data Science',
            description: 'Learn Python programming for data analysis and machine learning.',
            is_paid: false,
            price: 0,
            thumbnail_url: 'https://example.com/python-course.jpg',
            certificate_id: 4,
            priority: 0.7,
            creator_published_at: new Date(),
            next_course_ids: []
        }
    ];

    const courseIds: number[] = [];
    for (const course of courses) {
        const result = await client.query(
            `INSERT INTO courses (name, description, is_paid, price, thumbnail_url, certificate_id, priority, creator_published_at, next_course_ids, updated_at, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), true) RETURNING id`,
            [course.name, course.description, course.is_paid, course.price, course.thumbnail_url, course.certificate_id, course.priority, course.creator_published_at, course.next_course_ids]
        );
        courseIds.push(result.rows[0].id);
    }

    console.log(`✅ Seeded ${courseIds.length} courses`);
    return courseIds;
}

async function seedCourseCategories(courseIds: number[], categoryIds: number[]): Promise<void> {
    console.log('🔗 Linking courses with categories...');

    // Link each course with a category (cyclically)
    for (let i = 0; i < courseIds.length; i++) {
        const categoryId = categoryIds[i % categoryIds.length];
        await client.query(
            `INSERT INTO course_categories (course_id, category_id) VALUES ($1, $2)`,
            [courseIds[i], categoryId]
        );
    }

    console.log(`✅ Linked ${courseIds.length} course-category relationships`);
}

async function seedCourseCreators(courseIds: number[], creatorIds: number[]): Promise<void> {
    console.log('🔗 Linking courses with creators...');

    // Link each course with a creator (cyclically)
    for (let i = 0; i < courseIds.length; i++) {
        const creatorId = creatorIds[i % creatorIds.length];
        await client.query(
            `INSERT INTO course_creators (course_id, creator_id, updated_at, is_active) VALUES ($1, $2, NOW(), true)`,
            [courseIds[i], creatorId]
        );
    }

    console.log(`✅ Linked ${courseIds.length} course-creator relationships`);
}

async function seedModules(courseIds: number[]): Promise<number[]> {
    console.log('📚 Seeding modules...');

    const moduleIds: number[] = [];

    for (let i = 0; i < courseIds.length; i++) {
        const courseId = courseIds[i];
        const numModules = Math.floor(Math.random() * 3) + 2; // 2-4 modules per course

        for (let j = 0; j < numModules; j++) {
            const result = await client.query(
                `INSERT INTO modules (name, description, course_id, position, is_paid, is_active, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
                [`Module ${j + 1}`, `Description for module ${j + 1} of course ${i + 1}`, courseId, j, true, true]
            );
            moduleIds.push(result.rows[0].id);
        }
    }

    console.log(`✅ Seeded ${moduleIds.length} modules`);
    return moduleIds;
}

async function seedContents(courseIds: number[], moduleIds: number[], categoryIds: number[]): Promise<number[]> {
    console.log('🎥 Seeding contents...');

    const contentTypes = [ContentType.VIDEO, ContentType.QUIZ, ContentType.NOTES];
    const contentIds: number[] = [];
    let moduleIndex = 0;

    for (let i = 0; i < courseIds.length; i++) {
        const courseId = courseIds[i];
        const numContents = Math.floor(Math.random() * 5) + 3; // 3-7 contents per course

        for (let j = 0; j < numContents; j++) {
            const contentType = contentTypes[j % contentTypes.length];
            const categoryId = categoryIds[Math.floor(Math.random() * categoryIds.length)];

            const result = await client.query(
                `INSERT INTO contents (name, module_id, content_type, position, is_paid, is_active, url, abs_url, duration, thumbnail_url, category_id, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) RETURNING id`,
                [
                    `Content ${j + 1} - ${contentType}`,
                    moduleIds[moduleIndex % moduleIds.length],
                    contentType,
                    j,
                    true,
                    true,
                    `https://example.com/content/${i}-${j}.mp4`,
                    `https://s3.amazonaws.com/bucket/rawVideos/course-${courseId}/content-${j}.mp4`,
                    Math.floor(Math.random() * 1800) + 300, // 5-35 minutes
                    `https://example.com/thumbnails/content-${i}-${j}.jpg`,
                    categoryId
                ]
            );
            contentIds.push(result.rows[0].id);
        }
        moduleIndex += Math.floor(Math.random() * 3) + 2; // Move to next set of modules
    }

    console.log(`✅ Seeded ${contentIds.length} contents`);
    return contentIds;
}

async function seedUserEnrollments(userIds: number[], courseIds: number[]): Promise<void> {
    console.log('📝 Seeding user enrollments...');

    // Each user enrolls in 1-3 random courses
    for (const userId of userIds) {
        const numEnrollments = Math.floor(Math.random() * 3) + 1;
        const shuffledCourses = [...courseIds].sort(() => 0.5 - Math.random());

        for (let i = 0; i < numEnrollments && i < shuffledCourses.length; i++) {
            const progress = Math.random() * 100; // Random progress
            const completed = progress > 95;

            await client.query(
                `INSERT INTO user_enrollments (user_id, course_id, content_id, progress, completed_at) VALUES ($1, $2, $3, $4, $5)`,
                [userId, shuffledCourses[i], 1, progress, completed ? new Date() : null]
            );
        }
    }

    console.log(`✅ Seeded user enrollments`);
}

async function seedUserBadges(userIds: number[]): Promise<void> {
    console.log('🏅 Seeding user badges...');

    const badgeTypes = ['first_course', 'course_completed', 'streak_7_days', 'quiz_master', 'early_bird'];

    for (const userId of userIds) {
        const numBadges = Math.floor(Math.random() * 3) + 1; // 1-3 badges per user
        const shuffledBadges = [...badgeTypes].sort(() => 0.5 - Math.random());

        for (let i = 0; i < numBadges && i < shuffledBadges.length; i++) {
            await client.query(
                `INSERT INTO user_badges (user_id, badge_type) VALUES ($1, $2)`,
                [userId, shuffledBadges[i]]
            );
        }
    }

    console.log(`✅ Seeded user badges`);
}

async function seedUserCertificates(userIds: number[], courseIds: number[]): Promise<void> {
    console.log('📜 Seeding user certificates...');

    // Some users get certificates for completed courses
    for (let i = 0; i < Math.min(userIds.length, courseIds.length); i++) {
        await client.query(
            `INSERT INTO user_certificates (user_id, course_id, url) VALUES ($1, $2, $3)`,
            [userIds[i], courseIds[i], `https://example.com/certificates/user-${userIds[i]}-course-${courseIds[i]}.pdf`]
        );
    }

    console.log(`✅ Seeded user certificates`);
}

async function seedUserQuizAttempts(userIds: number[], contentIds: number[]): Promise<void> {
    console.log('❓ Seeding user quiz attempts...');

    // Users attempt quizzes randomly
    for (const userId of userIds) {
        const numAttempts = Math.floor(Math.random() * 5) + 1; // 1-5 attempts per user
        const shuffledContents = [...contentIds].sort(() => 0.5 - Math.random());

        for (let i = 0; i < numAttempts && i < shuffledContents.length; i++) {
            await client.query(
                `INSERT INTO user_quiz_attempts (user_id, content_id, updated_at) VALUES ($1, $2, NOW())`,
                [userId, shuffledContents[i]]
            );
        }
    }

    console.log(`✅ Seeded user quiz attempts`);
}

async function seedAdminConfigurations(adminIds: number[]): Promise<void> {
    console.log('⚙️ Seeding admin configurations...');

    const configurations = [
        { key: 'site_title', value: { title: 'Kadam Learning Platform' } },
        { key: 'max_enrollments', value: { limit: 10 } },
        { key: 'payment_gateway', value: { provider: 'stripe', enabled: true } },
        { key: 'email_notifications', value: { enabled: true, frequency: 'daily' } }
    ];

    for (let i = 0; i < configurations.length; i++) {
        const config = configurations[i];
        const adminId = adminIds[i % adminIds.length];

        await client.query(
            `INSERT INTO admin_configurations (key, value, created_by, updated_by) VALUES ($1, $2, $3, $4)`,
            [config.key, JSON.stringify(config.value), adminId, adminId]
        );
    }

    console.log(`✅ Seeded ${configurations.length} admin configurations`);
}

async function seedAdminActivities(adminIds: number[]): Promise<void> {
    console.log('📊 Seeding admin activities...');

    const activities = [
        {
            admin_id: adminIds[0],
            resource_type: 'user',
            resource_id: 1,
            details: { user_id: 1, action: 'created new user' },
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
            admin_id: adminIds[0],
            resource_type: 'course',
            resource_id: 1,
            details: { course_id: 1, action: 'approved course' },
            ip_address: '192.168.1.2',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
            admin_id: adminIds[1],
            resource_type: 'configuration',
            resource_id: 1,
            details: { key: 'site_title', action: 'updated configuration' },
            ip_address: '192.168.1.3',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
            admin_id: adminIds[1],
            resource_type: 'content',
            resource_id: 1,
            details: { content_id: 1, action: 'moderated content' },
            ip_address: '192.168.1.4',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    ];

    for (const activity of activities) {
        await client.query(
            `INSERT INTO admin_activities (admin_id, resource_type, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)`,
            [activity.admin_id, activity.resource_type, activity.resource_id, JSON.stringify(activity.details), activity.ip_address, activity.user_agent]
        );
    }

    console.log(`✅ Seeded ${activities.length} admin activities`);
}

async function seedVectors(courseIds: number[], contentIds: number[]): Promise<void> {
    console.log('🔍 Seeding vector embeddings...');

    // Generate random vector embeddings for courses
    for (const courseId of courseIds) {
        const randomVector = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
        await client.query(
            `INSERT INTO vectors (string, vector, source, source_id, updated_at)
             VALUES ($1, $2, 'courses', $3, NOW())`,
            [`Course ${courseId} content`, `[${randomVector.join(',')}]`, courseId]
        );
    }

    // Generate random vector embeddings for contents
    for (const contentId of contentIds) {
        const randomVector = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
        await client.query(
            `INSERT INTO vectors (string, vector, source, source_id, updated_at)
             VALUES ($1, $2, 'contents', $3, NOW())`,
            [`Content ${contentId} description`, `[${randomVector.join(',')}]`, contentId]
        );
    }

    console.log(`✅ Seeded ${courseIds.length + contentIds.length} vector embeddings`);
}

async function seedInteractions(userIds: number[], courseIds: number[], contentIds: number[]): Promise<void> {
    console.log('💬 Seeding interactions...');

    // Seed likes
    console.log('❤️ Seeding likes...');
    for (let i = 0; i < 20; i++) {
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
        const parentId = Math.random() > 0.5 ?
            courseIds[Math.floor(Math.random() * courseIds.length)] :
            contentIds[Math.floor(Math.random() * contentIds.length)];
        const parentType = Math.random() > 0.5 ? 'course' : 'content';

        await client.query(
            `INSERT INTO likes (user_id, parent_id, parent_type, is_active) VALUES ($1, $2, $3, true)`,
            [userId, parentId, parentType]
        );
    }

    // Seed comments
    console.log('💭 Seeding comments...');
    const comments = [
        'Great course! Learned a lot.',
        'Very helpful content.',
        'Excellent explanation.',
        'Could be better structured.',
        'Amazing quality!',
        'Perfect for beginners.',
        'Highly recommended!',
        'Very informative.',
        'Great examples provided.',
        'Easy to follow along.'
    ];

    for (let i = 0; i < 15; i++) {
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
        const parentId = Math.random() > 0.5 ?
            courseIds[Math.floor(Math.random() * courseIds.length)] :
            contentIds[Math.floor(Math.random() * contentIds.length)];
        const parentType = Math.random() > 0.5 ? 'course' : 'content';
        const commentText = comments[Math.floor(Math.random() * comments.length)];

        await client.query(
            `INSERT INTO comments (user_id, parent_id, parent_type, is_active, comment_text) VALUES ($1, $2, $3, true, $4)`,
            [userId, parentId, parentType, commentText]
        );
    }

    // Seed shares
    console.log('📤 Seeding shares...');
    for (let i = 0; i < 10; i++) {
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
        const parentId = Math.random() > 0.5 ?
            courseIds[Math.floor(Math.random() * courseIds.length)] :
            contentIds[Math.floor(Math.random() * contentIds.length)];
        const parentType = Math.random() > 0.5 ? 'course' : 'content';
        const sharedUrl = `https://kadam.com/share/${parentType}/${parentId}`;

        await client.query(
            `INSERT INTO shares (user_id, parent_id, parent_type, shared_url) VALUES ($1, $2, $3, $4)`,
            [userId, parentId, parentType, sharedUrl]
        );
    }

    // Seed saves
    console.log('💾 Seeding saves...');
    for (let i = 0; i < 12; i++) {
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
        const parentId = Math.random() > 0.5 ?
            courseIds[Math.floor(Math.random() * courseIds.length)] :
            contentIds[Math.floor(Math.random() * contentIds.length)];
        const parentType = Math.random() > 0.5 ? 'course' : 'content';

        await client.query(
            `INSERT INTO saves (user_id, parent_id, parent_type) VALUES ($1, $2, $3)`,
            [userId, parentId, parentType]
        );
    }

    // Seed views
    console.log('👀 Seeding views...');
    for (let i = 0; i < 25; i++) {
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
        const parentId = Math.random() > 0.5 ?
            courseIds[Math.floor(Math.random() * courseIds.length)] :
            contentIds[Math.floor(Math.random() * contentIds.length)];
        const parentType = Math.random() > 0.5 ? 'course' : 'content';
        const duration = Math.floor(Math.random() * 1800) + 60; // 1-30 minutes

        await client.query(
            `INSERT INTO views (user_id, parent_id, parent_type, duration) VALUES ($1, $2, $3, $4)`,
            [userId, parentId, parentType, duration]
        );
    }

    console.log('✅ Seeded interactions (likes, comments, shares, saves, views)');
}

async function printSeedingSummary(): Promise<void> {
    console.log('\n📊 === SEEDING SUMMARY ===');

    const tables = [
        'admins', 'categories', 'creators', 'users',
        'qualifications', 'achievements', 'courses', 'modules', 'contents',
        'user_enrollments', 'user_badges', 'user_certificates', 'user_quiz_attempts',
        'admin_configurations', 'admin_activities', 'vectors',
        'likes', 'comments', 'shares', 'saves', 'views'
    ];

    for (const table of tables) {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${result.rows[0].count} records`);
    }

    console.log('=========================\n');
}

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}

export { seedDatabase };
