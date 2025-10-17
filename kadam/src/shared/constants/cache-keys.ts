/**
 * Cache key constants for Redis caching
 * Centralized cache key management to avoid hardcoded strings
 */

// Redis client configuration constants
export const REDIS_CONFIG = {
    RETRY_DELAY_ON_FAILOVER: 100,
    ENABLE_READY_CHECK: false,
    MAX_RETRIES_PER_REQUEST: null,
    LAZY_CONNECT: true,
    CONNECT_TIMEOUT: 10000,
    COMMAND_TIMEOUT: 5000,
    APPEND_ONLY: true,
} as const;

// Redis connection event messages
export const REDIS_MESSAGES = {
    CONNECT: '🔗 Redis client connected',
    READY: '✅ Redis client ready',
    ERROR: '❌ Redis client error:',
    CLOSE: '🔌 Redis client connection closed',
    RECONNECTING: '🔄 Redis client reconnecting',
    MESSAGE_RECEIVED: '📨 Received message on channel',
    PATTERN_MESSAGE_RECEIVED: '📨 Received message on pattern',
    SUBSCRIBER_ERROR: '❌ Error in subscriber callback for channel',
    PATTERN_SUBSCRIBER_ERROR: '❌ Error in pattern subscriber callback for pattern',
} as const;

// Cache operation log messages
export const CACHE_LOG_MESSAGES = {
    GET: 'cache_get',
    SET: 'cache_set',
    DELETE: 'cache_delete',
    MGET: 'cache_mget',
    MSET: 'cache_mset',
    GET_ERROR: 'cache_get_error',
    SET_ERROR: 'cache_set_error',
    DELETE_ERROR: 'cache_delete_error',
    MGET_ERROR: 'cache_mget_error',
    MSET_ERROR: 'cache_mset_error',
    CLEANUP_COMPLETE: 'cache_cleanup_complete',
    CLEANUP_ERROR: 'cache_cleanup_error',
} as const;

// Pub/Sub log messages
export const PUBSUB_LOG_MESSAGES = {
    PUBLISH: 'pub_publish',
    SUBSCRIBE: 'pub_subscribe',
    UNSUBSCRIBE: 'pub_unsubscribe',
    UNSUBSCRIBE_ALL: 'pub_unsubscribe_all',
    PSUBSCRIBE: 'pub_psubscribe',
    PUNSUBSCRIBE: 'pub_punsubscribe',
    PUNSUBSCRIBE_ALL: 'pub_punsubscribe_all',
    UNSUBSCRIBE_ALL_CHANNELS: 'pub_unsubscribe_all_channels',
    PUBLISH_ERROR: 'pub_publish_error',
    SUBSCRIBE_ERROR: 'pub_subscribe_error',
    UNSUBSCRIBE_ERROR: 'pub_unsubscribe_error',
    PSUBSCRIBE_ERROR: 'pub_psubscribe_error',
    PUNSUBSCRIBE_ERROR: 'pub_punsubscribe_error',
    UNSUBSCRIBE_ALL_ERROR: 'pub_unsubscribe_all_error',
} as const;

export const CACHE_KEYS = {
    // Admin related cache keys
    ADMIN: {
        BY_ID: (adminId: number) => `admin:${adminId}`,
        DASHBOARD_DATA: 'admin_dashboard_data',
        ACTIVITIES: (page: number, limit: number) => `admin_activities:${page}:${limit}`,
        ACTIVITIES_ALL: 'admin_activities:*',
    },

    // Configuration cache keys
    CONFIG: {
        BY_KEY: (key: string) => `admin_config:${key}`,
    },

    // User related cache keys
    USERS: {
        PAGINATED: (page: number, limit: number) => `admin_users:${page}:${limit}`,
        ALL: 'admin_users:*',
    },

    // Creator related cache keys
    CREATORS: {
        PAGINATED: (page: number, limit: number) => `admin_creators:${page}:${limit}`,
        ALL: 'admin_creators:*',
        BY_ID: (id: number) => `creator:${id}`,
        BY_NAME: (name: string) => `creator:name:${name.toLowerCase()}`,
        ALL_PAGINATED: (page: number, limit: number) => `creators:all:${page}:${limit}`,
        SEARCH: (name: string, page: number, limit: number) => `creators:search:${name.toLowerCase()}:${page}:${limit}`,
        QUALIFICATIONS: (creatorId: number) => `creator:${creatorId}:qualifications`,
        ACHIEVEMENTS: (creatorId: number) => `creator:${creatorId}:achievements`,
        STATS: (creatorId: number) => `creator:${creatorId}:stats`,
    },

    // Course related cache keys
    COURSES: {
        PAGINATED: (page: number, limit: number, rejected?: boolean, published?: boolean) =>
            `admin_courses:${page}:${limit}:${rejected || 'null'}:${published || 'null'}`,
        ALL: 'admin_courses:*',
        UNAPPROVED: (page: number, limit: number) => `admin_unapproved_courses:${page}:${limit}`,
        UNAPPROVED_ALL: 'admin_unapproved_courses:*',
        AVAILABLE: 'admin_available_courses',
        STATUS: (courseId: number) => `admin_course_status:${courseId}`,
        DETAILS: (courseId: number) => `admin_course_details:${courseId}`,
        MODULES_CONTENT: (courseId: number) => `admin_course_modules_content:${courseId}`,
        MODULES_CONTENT_ALL: 'admin_course_modules_content:*',
        APPROVAL_STATS: 'admin_course_approval_stats',
    },

    // Module related cache keys
    MODULES: {
        BY_ID: (moduleId: number) => `module:${moduleId}`,
        BY_COURSE: (courseId: number) => `course:${courseId}:modules`,
        CONTENTS: (moduleId: number) => `module:${moduleId}:contents`,
        CONTENTS_ALL: 'module:*:contents',
        ORDER: (courseId: number) => `course:${courseId}:modules:order`,
        ORDER_ALL: 'course:*:modules:order',
        DETAILS: (moduleId: number) => `module:${moduleId}:details`,
        DETAILS_ALL: 'module:*:details',
        STATS: (moduleId: number) => `module:${moduleId}:stats`,
        STATS_ALL: 'module:*:stats',
    },
} as const;

/**
 * Cache TTL (Time To Live) constants in seconds
 */
export const CACHE_TTL = {
    // Long-term cache (1 hour)
    LONG: 3600,

    // Medium-term cache (30 minutes)
    MEDIUM: 1800,

    // Short-term cache (15 minutes)
    SHORT: 900,

    // Very short-term cache (10 minutes)
    VERY_SHORT: 600,

    // Quick cache (5 minutes)
    QUICK: 300,

    // Fast cache (3 minutes)
    FAST: 180,

    // Immediate cache (2 minutes)
    IMMEDIATE: 120,

    // Instant cache (1 minute)
    INSTANT: 60,

    // Default TTL
    DEFAULT: 3600,

    // Creator-specific TTL values
    CREATOR: 3600,        // 1 hour - individual creator data
    CREATOR_NAME_SEARCH: 1800,  // 30 minutes - name-based searches
    CREATOR_LISTS: 900,    // 15 minutes - paginated lists
    CREATOR_QUALIFICATIONS: 1800,  // 30 minutes - qualifications
    CREATOR_ACHIEVEMENTS: 1800,    // 30 minutes - achievements
    CREATOR_SEARCH: 600,   // 10 minutes - search results
    CREATOR_STATS: 300,    // 5 minutes - stats (change frequently)

    // Module-specific TTL values
    MODULE: 3600,          // 1 hour - individual module data
    MODULE_CONTENTS: 1800, // 30 minutes - module contents
    MODULE_ORDER: 900,     // 15 minutes - module ordering
    MODULE_DETAILS: 1800, // 30 minutes - module details
    MODULE_STATS: 300,    // 5 minutes - module stats
} as const;

/**
 * Cache invalidation patterns for different operations
 */
export const CACHE_INVALIDATION_PATTERNS = {
    // Module invalidation patterns
    MODULE: {
        // Invalidate all module-related cache when a module is updated
        ALL_MODULE_CACHE: (moduleId: number) => [
            CACHE_KEYS.MODULES.BY_ID(moduleId),
            CACHE_KEYS.MODULES.CONTENTS(moduleId),
            CACHE_KEYS.MODULES.DETAILS(moduleId),
            CACHE_KEYS.MODULES.STATS(moduleId),
        ],

        // Invalidate course-related cache when module order changes
        COURSE_MODULE_CACHE: (courseId: number) => [
            CACHE_KEYS.MODULES.BY_COURSE(courseId),
            CACHE_KEYS.MODULES.ORDER(courseId),
            CACHE_KEYS.COURSES.MODULES_CONTENT(courseId),
            CACHE_KEYS.COURSES.DETAILS(courseId),
        ],

        // Invalidate all module cache patterns
        ALL_MODULE_PATTERNS: [
            CACHE_KEYS.MODULES.CONTENTS_ALL,
            CACHE_KEYS.MODULES.ORDER_ALL,
            CACHE_KEYS.MODULES.DETAILS_ALL,
            CACHE_KEYS.MODULES.STATS_ALL,
        ],

        // Invalidate all course module patterns
        ALL_COURSE_MODULE_PATTERNS: [
            CACHE_KEYS.COURSES.MODULES_CONTENT_ALL,
        ],
    },
} as const;
