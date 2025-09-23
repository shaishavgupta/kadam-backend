import { Client } from 'pg';
import { dbConfig } from '../config';
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
        const tagIds = await seedTags();
        const creatorIds = await seedCreators();
        const userIds = await seedUsers();

        // Course-related entities
        const qualificationIds = await seedQualifications();
        const achievementIds = await seedAchievements();
        await seedCreatorQualifications(creatorIds, qualificationIds);
        await seedCreatorAchievements(creatorIds, achievementIds);

        const courseIds = await seedCourses(categoryIds);
        await seedCourseCategories(courseIds, categoryIds);
        await seedCourseTags(courseIds, tagIds);
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
        'admin_activities',
        'admin_configurations',
        'user_quiz_attempts',
        'user_certificates',
        'user_badges',
        'user_enrollments',
        'contents',
        'modules',
        'course_creators',
        'course_tags',
        'course_categories',
        'courses',
        'creator_achievements',
        'creator_qualifications',
        'achievements',
        'qualifications',
        'users',
        'creators',
        'tags',
        'categories',
        'admins'
    ];

    for (const table of tables) {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }
}

async function seedAdmins(): Promise<number[]> {
    console.log('👤 Seeding admins...');
    const admins = [
        {
            name: 'Super Admin',
            email: 'admin@kadam.com',
            phone: '+919876543210',
            is_active: true,
            profile_pic: 'https://example.com/admin1.jpg'
        },
        {
            name: 'Content Manager',
            email: 'content@kadam.com',
            phone: '+918765432109',
            is_active: true,
            profile_pic: 'https://example.com/admin2.jpg'
        }
    ];

    const adminIds: number[] = [];
    for (const admin of admins) {
        const result = await client.query(
            `INSERT INTO admins (name, email, phone, is_active, profile_pic, last_active_at)
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
            [admin.name, admin.email, admin.phone, admin.is_active, admin.profile_pic]
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

async function seedTags(): Promise<number[]> {
    console.log('🏷️ Seeding tags...');
    const tags = [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
        'UI/UX', 'Figma', 'Photoshop', 'HTML', 'CSS',
        'SEO', 'Social Media', 'Content Marketing', 'Analytics',
        'Entrepreneurship', 'Leadership', 'Strategy', 'Finance',
        'Machine Learning', 'Statistics', 'SQL', 'Excel'
    ];

    const tagIds: number[] = [];
    for (const tag of tags) {
        const result = await client.query(
            `INSERT INTO tags (name) VALUES ($1) RETURNING id`,
            [tag]
        );
        tagIds.push(result.rows[0].id);
    }

    console.log(`✅ Seeded ${tagIds.length} tags`);
    return tagIds;
}

async function seedCreators(): Promise<number[]> {
    console.log('👨‍🏫 Seeding creators...');
    const creators = [
        {
            name: 'John Doe',
            bio: 'Full-stack developer with 10+ years of experience in web development and teaching.',
            profile_pic: 'https://example.com/creator1.jpg',
            rating: 5
        },
        {
            name: 'Jane Smith',
            bio: 'UX/UI Designer passionate about creating beautiful and user-friendly interfaces.',
            profile_pic: 'https://example.com/creator2.jpg',
            rating: 4
        },
        {
            name: 'Mike Johnson',
            bio: 'Digital marketing expert helping businesses grow their online presence.',
            profile_pic: 'https://example.com/creator3.jpg',
            rating: 5
        },
        {
            name: 'Sarah Wilson',
            bio: 'Data scientist and machine learning engineer with expertise in Python and R.',
            profile_pic: 'https://example.com/creator4.jpg',
            rating: 4
        }
    ];

    const creatorIds: number[] = [];
    for (const creator of creators) {
        const result = await client.query(
            `INSERT INTO creators (name, bio, profile_pic, rating) VALUES ($1, $2, $3, $4) RETURNING id`,
            [creator.name, creator.bio, creator.profile_pic, creator.rating]
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

async function seedCourses(categoryIds: number[]): Promise<number[]> {
    console.log('📖 Seeding courses...');
    const courses = [
        {
            name: 'Complete JavaScript Bootcamp',
            description: 'Learn JavaScript from basics to advanced concepts with hands-on projects.',
            is_paid: true,
            price: 99.99,
            thumbnail_url: 'https://example.com/js-course.jpg',
            certificate_url: 'https://example.com/certificates/js-cert.pdf',
            rating: 4.8,
            num_ratings: 150,
            published_at: new Date(),
            priority: 1.0
        },
        {
            name: 'UI/UX Design Masterclass',
            description: 'Master the art of user interface and user experience design.',
            is_paid: true,
            price: 79.99,
            thumbnail_url: 'https://example.com/design-course.jpg',
            certificate_url: 'https://example.com/certificates/design-cert.pdf',
            rating: 4.9,
            num_ratings: 120,
            published_at: new Date(),
            priority: 0.9
        },
        {
            name: 'Digital Marketing Strategy',
            description: 'Comprehensive guide to digital marketing and growth hacking.',
            is_paid: true,
            price: 69.99,
            thumbnail_url: 'https://example.com/marketing-course.jpg',
            certificate_url: 'https://example.com/certificates/marketing-cert.pdf',
            rating: 4.7,
            num_ratings: 200,
            published_at: new Date(),
            priority: 0.8
        },
        {
            name: 'Python for Data Science',
            description: 'Learn Python programming for data analysis and machine learning.',
            is_paid: false,
            price: 0,
            thumbnail_url: 'https://example.com/python-course.jpg',
            certificate_url: 'https://example.com/certificates/python-cert.pdf',
            rating: 4.6,
            num_ratings: 300,
            published_at: new Date(),
            priority: 0.7
        }
    ];

    const courseIds: number[] = [];
    for (const course of courses) {
        const result = await client.query(
            `INSERT INTO courses (name, description, is_paid, price, thumbnail_url, certificate_url, rating, num_ratings, published_at, priority, updated_at, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), true) RETURNING id`,
            [course.name, course.description, course.is_paid, course.price, course.thumbnail_url, course.certificate_url, course.rating, course.num_ratings, course.published_at, course.priority]
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

async function seedCourseTags(courseIds: number[], tagIds: number[]): Promise<void> {
    console.log('🔗 Linking courses with tags...');

    // Link each course with 2-3 random tags
    for (const courseId of courseIds) {
        const numTags = Math.floor(Math.random() * 2) + 2; // 2-3 tags per course
        const shuffledTags = [...tagIds].sort(() => 0.5 - Math.random());

        for (let i = 0; i < numTags && i < shuffledTags.length; i++) {
            await client.query(
                `INSERT INTO course_tags (course_id, tag_id) VALUES ($1, $2)`,
                [courseId, shuffledTags[i]]
            );
        }
    }

    console.log(`✅ Linked courses with tags`);
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
                `INSERT INTO modules (name, description, position, is_paid, is_active, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
                [`Module ${j + 1}`, `Description for module ${j + 1} of course ${i + 1}`, j, true, true]
            );
            moduleIds.push(result.rows[0].id);
        }
    }

    console.log(`✅ Seeded ${moduleIds.length} modules`);
    return moduleIds;
}

async function seedContents(courseIds: number[], moduleIds: number[], categoryIds: number[]): Promise<number[]> {
    console.log('🎥 Seeding contents...');

    const contentTypes = ['video', 'quiz', 'notes'];
    const contentIds: number[] = [];
    let moduleIndex = 0;

    for (let i = 0; i < courseIds.length; i++) {
        const courseId = courseIds[i];
        const numContents = Math.floor(Math.random() * 5) + 3; // 3-7 contents per course

        for (let j = 0; j < numContents; j++) {
            const contentType = contentTypes[j % contentTypes.length];
            const categoryId = categoryIds[Math.floor(Math.random() * categoryIds.length)];

            const result = await client.query(
                `INSERT INTO contents (course_id, module_id, content_type, position, is_paid, is_active, url, duration, thumbnail_url, category_id, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id`,
                [
                    courseId,
                    moduleIds[moduleIndex % moduleIds.length],
                    contentType,
                    j,
                    true,
                    true,
                    `https://example.com/content/${i}-${j}.mp4`,
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
                `INSERT INTO user_enrollments (user_id, course_id, progress, completed_at) VALUES ($1, $2, $3, $4)`,
                [userId, shuffledCourses[i], progress, completed ? new Date() : null]
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
        { activity_type: 'user_created', value: { user_id: 1, action: 'created new user' } },
        { activity_type: 'course_approved', value: { course_id: 1, action: 'approved course' } },
        { activity_type: 'config_updated', value: { key: 'site_title', action: 'updated configuration' } },
        { activity_type: 'content_moderated', value: { content_id: 1, action: 'moderated content' } }
    ];

    for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        const adminId = adminIds[i % adminIds.length];

        await client.query(
            `INSERT INTO admin_activities (created_by, activity_type, value) VALUES ($1, $2, $3)`,
            [adminId, activity.activity_type, JSON.stringify(activity.value)]
        );
    }

    console.log(`✅ Seeded ${activities.length} admin activities`);
}

async function printSeedingSummary(): Promise<void> {
    console.log('\n📊 === SEEDING SUMMARY ===');

    const tables = [
        'admins', 'categories', 'tags', 'creators', 'users',
        'qualifications', 'achievements', 'courses', 'modules', 'contents',
        'user_enrollments', 'user_badges', 'user_certificates', 'user_quiz_attempts',
        'admin_configurations', 'admin_activities'
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
