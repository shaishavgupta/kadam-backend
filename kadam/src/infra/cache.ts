import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisConfig: any = {
    url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
};

const redis = createClient(redisConfig);

redis.on('connect', () => {
    console.log('🔗 Redis client connected');
});

redis.on('ready', () => {
    console.log('✅ Redis client ready');
});

redis.on('error', (err: any) => {
    console.error('❌ Redis client error:', err);
});

redis.on('close', () => {
    console.log('🔌 Redis client connection closed');
});

redis.on('reconnecting', () => {
    console.log('🔄 Redis client reconnecting');
});

// Connect to Redis
redis.connect().catch(console.error);

class CacheManager {
    private static instance: CacheManager;
    private redisClient: typeof redis;

    private constructor() {
        this.redisClient = redis;
    }

    static getInstance(): CacheManager {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }

    async get(key: string) {
        const start = Date.now();
        try {
            const value = await this.redisClient.get(key);
            const result = value ? JSON.parse(value) : null;
            console.log("cache_get", {
                key,
                hit: result !== null,
                duration: Date.now() - start
            });
            return result;
        } catch (err) {
            console.error("cache_get_error", { key, error: err });
            return null;
        }
    }

    async set(key: string, value: any, ttlSeconds: number = 3600) {
        const start = Date.now();
        try {
            await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
            console.log("cache_set", {
                key,
                ttl: ttlSeconds,
                duration: Date.now() - start
            });
        } catch (err) {
            console.error("cache_set_error", { key, error: err });
            throw err;
        }
    }

    async delete(key: string) {
        try {
            await this.redisClient.del(key);
            console.log("cache_delete", { key });
        } catch (err) {
            console.error("cache_delete_error", { key, error: err });
        }
    }

    async ping() {
        try {
            return await this.redisClient.ping();
        } catch (err) {
            throw err;
        }
    }
}

export const cache = CacheManager.getInstance();
export { redis };
