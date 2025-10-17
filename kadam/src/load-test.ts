import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const authCounter = new Counter('auth_attempts');
const interactionCounter = new Counter('interactions');

// Advanced configuration options
export const options = {
    scenarios: {
        // Main user flow scenario
        user_flow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 10 },
                { duration: '5m', target: 10 },
                { duration: '2m', target: 20 },
                { duration: '5m', target: 20 },
                { duration: '2m', target: 0 },
            ],
            gracefulRampDown: '30s',
        },
        // Spike test scenario (optional)
        spike_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 10 },
                { duration: '30s', target: 100 }, // Spike
                { duration: '1m', target: 10 },
                { duration: '30s', target: 0 },
            ],
            gracefulRampDown: '30s',
            startTime: '10m', // Start after main scenario
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<2000', 'p(99)<5000'],
        http_req_failed: ['rate<0.05'],
        errors: ['rate<0.05'],
        response_time: ['p(95)<1500'],
    },
};

// Configuration constants
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TEST_PHONE = __ENV.TEST_PHONE || '1234567890';
const TEST_OTP = __ENV.TEST_OTP || '1234';
const TEST_LANGUAGE = __ENV.TEST_LANGUAGE || 'en';
const TEST_USER_TYPE = __ENV.TEST_USER_TYPE || 'user';
const ENABLE_SPIKE_TEST = __ENV.ENABLE_SPIKE_TEST === 'true';

// Generate unique phone numbers for each VU to avoid rate limiting
function getUniquePhoneNumber(): string {
    const basePhone = TEST_PHONE.replace(/\D/g, ''); // Remove non-digits
    const vuId = __VU || 1;
    // Use iteration if available (main test), otherwise use timestamp (setup)
    let uniqueSuffix;
    if (typeof __ITER !== 'undefined') {
        uniqueSuffix = (vuId * 1000 + __ITER) % 10000;
    } else {
        // For setup function, use timestamp-based uniqueness
        uniqueSuffix = (vuId * 1000 + Math.floor(Date.now() / 1000) % 1000) % 10000;
    }
    return `${basePhone.slice(0, -4)}${uniqueSuffix.toString().padStart(4, '0')}`;
}

// Global variables
let authToken: string = '';
let userId: number = 0;
let courseId: number = 0;
let moduleId: number = 0;
let contentId: number = 0;

// Helper function to make authenticated requests with retry logic
function makeRequest(method: string, url: string, body: any = null, headers: Record<string, string> = {}, retries: number = 3) {
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    if (authToken) {
        defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const requestHeaders = { ...defaultHeaders, ...headers };

    const params = {
        headers: requestHeaders,
        timeout: '30s',
    };

    let response: any;
    let attempt = 0;

    while (attempt < retries) {
        try {
            if (method === 'GET') {
                response = http.get(url, params);
            } else if (method === 'POST') {
                response = http.post(url, JSON.stringify(body), params);
            } else if (method === 'PATCH') {
                response = http.patch(url, JSON.stringify(body), params);
            }

            // If successful or non-retryable error, break
            if (response.status < 500 || attempt === retries - 1) {
                break;
            }

            attempt++;
            sleep(Math.pow(2, attempt)); // Exponential backoff
        } catch (error) {
            attempt++;
            if (attempt >= retries) {
                throw error;
            }
            sleep(Math.pow(2, attempt));
        }
    }

    return response;
}

// Enhanced authentication flow with better error handling
function authenticateUser(): boolean {
    console.log('🔐 Starting authentication flow...');
    authCounter.add(1);

    // Use unique phone number to avoid rate limiting
    const uniquePhone = getUniquePhoneNumber();
    console.log('📱 Using phone:', uniquePhone);

    // Step 1: Send OTP
    const sendOtpResponse = makeRequest('POST', `${BASE_URL}/api/auth/send-otp`, {
        phone: uniquePhone,
        userType: TEST_USER_TYPE
    });

    const sendOtpSuccess = check(sendOtpResponse, {
        'Send OTP status is 200': (r: any) => r.status === 200,
        'Send OTP response has success field': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.hasOwnProperty('success');
            } catch (e) {
                return false;
            }
        },
        'Send OTP response time < 3s': (r: any) => r.timings.duration < 3000,
    });

    if (!sendOtpSuccess) {
        console.error('❌ Send OTP failed:', sendOtpResponse.body);
        errorRate.add(1);

        // If rate limited, wait longer before retrying
        if (sendOtpResponse.body.includes('OTP already sent recently')) {
            console.log('⏳ Rate limited, waiting 30 seconds...');
            sleep(30);
            return false;
        }
        return false;
    }

    console.log('✅ OTP sent successfully');
    sleep(2); // Increased wait time

    // Step 2: Verify OTP
    const verifyOtpResponse = makeRequest('POST', `${BASE_URL}/api/auth/verify-otp`, {
        phone: uniquePhone,
        otp: TEST_OTP,
        language: TEST_LANGUAGE,
        userType: TEST_USER_TYPE
    });

    const verifyOtpSuccess = check(verifyOtpResponse, {
        'Verify OTP status is 200': (r: any) => r.status === 200,
        'Verify OTP response has access token': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.accessToken && body.accessToken.length > 0;
            } catch (e) {
                return false;
            }
        },
        'Verify OTP response time < 2s': (r: any) => r.timings.duration < 2000,
    });

    if (!verifyOtpSuccess) {
        console.error('❌ Verify OTP failed:', verifyOtpResponse.body);
        errorRate.add(1);
        return false;
    }

    const authData = JSON.parse(verifyOtpResponse.body);
    authToken = authData.accessToken;
    userId = authData.userId;

    console.log('✅ Authentication successful, userId:', userId);
    return true;
}

// Enhanced home page courses flow
function getHomePageCourses(): any {
    console.log('🏠 Fetching home page courses...');

    const response = makeRequest('GET', `${BASE_URL}/api/courses/home-page-courses`);

    const success = check(response, {
        'Home page courses status is 200': (r: any) => r.status === 200,
        'Home page courses response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data && body.data.for_you;
            } catch (e) {
                return false;
            }
        },
        'Home page courses response time < 2s': (r: any) => r.timings.duration < 2000,
    });

    if (!success) {
        console.error('❌ Home page courses failed:', response.body);
        errorRate.add(1);
        return null;
    }

    const data = JSON.parse(response.body);
    console.log('✅ Home page courses fetched successfully');

    // Extract course ID from the response for further testing
    if (data.data.for_you && data.data.for_you.length > 0) {
        courseId = data.data.for_you[0].id;
        console.log('📚 Selected course ID:', courseId);
    }

    return data;
}

// Enhanced course details flow
function getCourseDetails(): any {
    if (!courseId) {
        console.log('⚠️ No course ID available, skipping course details');
        return null;
    }

    console.log('📖 Fetching course details for course:', courseId);

    const response = makeRequest('GET', `${BASE_URL}/api/courses/approved/${courseId}`);

    const success = check(response, {
        'Course details status is 200': (r: any) => r.status === 200,
        'Course details response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data;
            } catch (e) {
                return false;
            }
        },
        'Course details response time < 2s': (r: any) => r.timings.duration < 2000,
    });

    if (!success) {
        console.error('❌ Course details failed:', response.body);
        errorRate.add(1);

        // If it's a 500 error, it might be a server issue - don't fail the entire test
        if (response.status === 500) {
            console.log('⚠️ Server error in course details, continuing with test...');
            return null;
        }
        return null;
    }

    const data = JSON.parse(response.body);
    console.log('✅ Course details fetched successfully');

    // Extract module ID from the response
    if (data.data.modules && data.data.modules.length > 0) {
        moduleId = data.data.modules[0].id;
        console.log('📦 Selected module ID:', moduleId);
    }

    return data;
}

// Enhanced modules flow
function getModules(): any {
    if (!courseId) {
        console.log('⚠️ No course ID available, skipping modules');
        return null;
    }

    console.log('📦 Fetching modules for course:', courseId);

    const response = makeRequest('GET', `${BASE_URL}/api/courses/${courseId}/modules`);

    const success = check(response, {
        'Modules status is 200': (r: any) => r.status === 200,
        'Modules response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data && body.data.modules;
            } catch (e) {
                return false;
            }
        },
        'Modules response time < 2s': (r: any) => r.timings.duration < 2000,
    });

    if (!success) {
        console.error('❌ Modules failed:', response.body);
        errorRate.add(1);
        return null;
    }

    const data = JSON.parse(response.body);
    console.log('✅ Modules fetched successfully');

    // Extract content ID from the first module
    if (data.data.modules && data.data.modules.length > 0) {
        moduleId = data.data.modules[0].id;
        console.log('📦 Selected module ID:', moduleId);
    }

    return data;
}

// Enhanced content flow
function getContent(): any {
    if (!moduleId) {
        console.log('⚠️ No module ID available, skipping content');
        return null;
    }

    console.log('🎥 Fetching content for module:', moduleId);

    const response = makeRequest('GET', `${BASE_URL}/api/courses/modules/${moduleId}/content`);

    const success = check(response, {
        'Content status is 200': (r: any) => r.status === 200,
        'Content response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data && body.data.content;
            } catch (e) {
                return false;
            }
        },
        'Content response time < 2s': (r: any) => r.timings.duration < 2000,
    });

    if (!success) {
        console.error('❌ Content failed:', response.body);
        errorRate.add(1);
        return null;
    }

    const data = JSON.parse(response.body);
    console.log('✅ Content fetched successfully');

    // Extract content ID from the response
    if (data.data.content && data.data.content.length > 0) {
        contentId = data.data.content[0].id;
        console.log('🎬 Selected content ID:', contentId);
    }

    return data;
}

// Enhanced like content with interaction tracking
function likeContent(): any {
    if (!contentId) {
        console.log('⚠️ No content ID available, skipping like');
        return null;
    }

    console.log('❤️ Liking content:', contentId);
    interactionCounter.add(1);

    const response = makeRequest('POST', `${BASE_URL}/api/interactions/likes`, {
        parent_type: 'content',
        parent_id: contentId,
        is_active: true
    });

    const success = check(response, {
        'Like status is 200': (r: any) => r.status === 200,
        'Like response has success': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success;
            } catch (e) {
                return false;
            }
        },
        'Like response time < 1s': (r: any) => r.timings.duration < 1000,
    });

    if (!success) {
        console.error('❌ Like failed:', response.body);
        errorRate.add(1);
        return null;
    }

    console.log('✅ Content liked successfully');
    return JSON.parse(response.body);
}

// Enhanced save content with interaction tracking
function saveContent(): any {
    if (!contentId) {
        console.log('⚠️ No content ID available, skipping save');
        return null;
    }

    console.log('💾 Saving content:', contentId);
    interactionCounter.add(1);

    const response = makeRequest('POST', `${BASE_URL}/api/interactions/saves`, {
        parent_type: 'content',
        parent_id: contentId
    });

    const success = check(response, {
        'Save status is 200': (r: any) => r.status === 200,
        'Save response has success': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success;
            } catch (e) {
                return false;
            }
        },
        'Save response time < 1s': (r: any) => r.timings.duration < 1000,
    });

    if (!success) {
        console.error('❌ Save failed:', response.body);
        errorRate.add(1);
        return null;
    }

    console.log('✅ Content saved successfully');
    return JSON.parse(response.body);
}

// Enhanced status checks
function checkIfLiked(): any {
    if (!contentId) {
        console.log('⚠️ No content ID available, skipping like check');
        return null;
    }

    console.log('🔍 Checking if content is liked:', contentId);

    const response = makeRequest('GET', `${BASE_URL}/api/interactions/likes/is-liked/content/${contentId}`);

    const success = check(response, {
        'Like check status is 200': (r: any) => r.status === 200,
        'Like check response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data && typeof body.data.isLiked === 'boolean';
            } catch (e) {
                return false;
            }
        },
        'Like check response time < 1s': (r: any) => r.timings.duration < 1000,
    });

    if (!success) {
        console.error('❌ Like check failed:', response.body);
        errorRate.add(1);
        return null;
    }

    const data = JSON.parse(response.body);
    console.log('✅ Like check completed, isLiked:', data.data.isLiked);
    return data;
}

function checkIfSaved(): any {
    if (!contentId) {
        console.log('⚠️ No content ID available, skipping save check');
        return null;
    }

    console.log('🔍 Checking if content is saved:', contentId);

    const response = makeRequest('GET', `${BASE_URL}/api/interactions/saves/is-saved/content/${contentId}`);

    const success = check(response, {
        'Save check status is 200': (r: any) => r.status === 200,
        'Save check response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data && typeof body.data.value === 'boolean';
            } catch (e) {
                return false;
            }
        },
        'Save check response time < 1s': (r: any) => r.timings.duration < 1000,
    });

    if (!success) {
        console.error('❌ Save check failed:', response.body);
        errorRate.add(1);
        return null;
    }

    const data = JSON.parse(response.body);
    console.log('✅ Save check completed, isSaved:', data.data.value);
    return data;
}

// Enhanced user data fetching
function getSavedContent(): any {
    console.log('📚 Fetching user\'s saved content...');

    const response = makeRequest('GET', `${BASE_URL}/api/interactions/saves/user`);

    const success = check(response, {
        'Saved content status is 200': (r: any) => r.status === 200,
        'Saved content response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data;
            } catch (e) {
                return false;
            }
        },
        'Saved content response time < 2s': (r: any) => r.timings.duration < 2000,
    });

    if (!success) {
        console.error('❌ Saved content failed:', response.body);
        errorRate.add(1);
        return null;
    }

    console.log('✅ Saved content fetched successfully');
    return JSON.parse(response.body);
}

function getLikedContent(): any {
    console.log('❤️ Fetching user\'s liked content...');

    const response = makeRequest('GET', `${BASE_URL}/api/interactions/likes/user`);

    const success = check(response, {
        'Liked content status is 200': (r: any) => r.status === 200,
        'Liked content response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data;
            } catch (e) {
                return false;
            }
        },
        'Liked content response time < 2s': (r: any) => r.timings.duration < 2000,
    });

    if (!success) {
        console.error('❌ Liked content failed:', response.body);
        errorRate.add(1);
        return null;
    }

    console.log('✅ Liked content fetched successfully');
    return JSON.parse(response.body);
}

// Enhanced search functionality
function searchCourses(): any {
    console.log('🔍 Searching courses...');

    const searchQueries = ['javascript', 'python', 'react', 'nodejs', 'typescript'];
    const searchQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];

    const response = makeRequest('GET', `${BASE_URL}/api/courses/search?q=${searchQuery}&limit=5`);

    const success = check(response, {
        'Search status is 200': (r: any) => r.status === 200,
        'Search response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data && body.data.courses;
            } catch (e) {
                return false;
            }
        },
        'Search response time < 2s': (r: any) => r.timings.duration < 2000,
    });

    if (!success) {
        console.error('❌ Search failed:', response.body);
        errorRate.add(1);
        return null;
    }

    console.log('✅ Search completed successfully for:', searchQuery);
    return JSON.parse(response.body);
}

// Enhanced categories fetching
function getCategories(): any {
    console.log('📂 Fetching categories...');

    const response = makeRequest('GET', `${BASE_URL}/api/courses/categories`);

    const success = check(response, {
        'Categories status is 200': (r: any) => r.status === 200,
        'Categories response has data': (r: any) => {
            try {
                const body = JSON.parse(r.body);
                return body.success && body.data;
            } catch (e) {
                return false;
            }
        },
        'Categories response time < 2s': (r: any) => r.timings.duration < 2000,
    });

    if (!success) {
        console.error('❌ Categories failed:', response.body);
        errorRate.add(1);
        return null;
    }

    console.log('✅ Categories fetched successfully');
    return JSON.parse(response.body);
}

// Main test scenario
export default function () {
    console.log(`🚀 Starting load test for user ${__VU} (iteration ${__ITER})`);

    // Step 1: Authenticate user
    if (!authenticateUser()) {
        console.error('❌ Authentication failed, stopping test');
        return;
    }

    sleep(1);

    // Step 2: Get home page courses
    getHomePageCourses();
    sleep(1);

    // Step 3: Get course details
    const courseDetails = getCourseDetails();
    if (!courseDetails) {
        console.log('⚠️ Course details failed, skipping dependent steps');
        // Try to get modules directly if course details failed
        getModules();
        sleep(1);
        getContent();
        sleep(1);
        // Skip interaction steps if we don't have content
        console.log('✅ Load test completed for user (with fallbacks)');
        return;
    }
    sleep(1);

    // Step 4: Get modules
    getModules();
    sleep(1);

    // Step 5: Get content
    getContent();
    sleep(1);

    // Step 6: Like content
    likeContent();
    sleep(0.5);

    // Step 7: Save content
    saveContent();
    sleep(0.5);

    // Step 8: Check if liked
    checkIfLiked();
    sleep(0.5);

    // Step 9: Check if saved
    checkIfSaved();
    sleep(0.5);

    // Step 10: Get saved content
    getSavedContent();
    sleep(1);

    // Step 11: Get liked content
    getLikedContent();
    sleep(1);

    // Step 12: Search courses
    searchCourses();
    sleep(1);

    // Step 13: Get categories
    getCategories();
    sleep(1);

    console.log(`✅ Load test completed for user ${__VU} (iteration ${__ITER})`);
}

// Enhanced setup function
export function setup() {
    console.log('🔧 Setting up load test...');
    console.log('Base URL:', BASE_URL);
    console.log('Test Phone:', TEST_PHONE);
    console.log('Test Language:', TEST_LANGUAGE);
    console.log('Test User Type:', TEST_USER_TYPE);
    console.log('Enable Spike Test:', ENABLE_SPIKE_TEST);

    // Test if the server is reachable
    const healthResponse = http.get(`${BASE_URL}/health`);
    if (healthResponse.status !== 200) {
        console.error('❌ Server health check failed:', healthResponse.body);
        throw new Error('Server is not healthy');
    }

    console.log('✅ Server health check passed');

    // Test authentication endpoint with unique phone
    const testPhone = getUniquePhoneNumber();
    const authTestResponse = http.post(`${BASE_URL}/api/auth/send-otp`, JSON.stringify({
        phone: testPhone,
        userType: TEST_USER_TYPE
    }), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s'
    });

    if (authTestResponse.status !== 200) {
        console.error('❌ Authentication endpoint test failed:', authTestResponse.body);
        throw new Error('Authentication endpoint is not working');
    }

    console.log('✅ Authentication endpoint test passed');

    return {
        startTime: new Date().toISOString(),
        testConfig: {
            baseUrl: BASE_URL,
            testPhone: TEST_PHONE,
            testLanguage: TEST_LANGUAGE,
            testUserType: TEST_USER_TYPE
        }
    };
}

// Enhanced teardown function
export function teardown(data: any) {
    console.log('🧹 Tearing down load test...');
    console.log('Test started at:', data.startTime);
    console.log('Test ended at:', new Date().toISOString());
    console.log('Test configuration:', data.testConfig);
    console.log('Load test completed successfully');
}
