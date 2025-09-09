// services/interactions/cache.ts
import { secret } from "encore.dev/config";
import Redis from "ioredis";
import log from "encore.dev/log";

const redisUrl = secret("RedisURL");

class CacheManager {
    private static instance: CacheManager;
    private redis: Redis;

    private constructor() {
        this.redis = new Redis(redisUrl());
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
            const value = await this.redis.get(key);
            const result = value ? JSON.parse(value) : null;
            log.info("cache_get", {
                key,
                hit: result !== null,
                duration: Date.now() - start
            });
            return result;
        } catch (err) {
            log.error("cache_get_error", { key, error: err });
            return null;
        }
    }

    async set(key: string, value: any, ttlSeconds: number = 3600) {
        const start = Date.now();
        try {
            await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
            log.info("cache_set", {
                key,
                ttl: ttlSeconds,
                duration: Date.now() - start
            });
        } catch (err) {
            log.error("cache_set_error", { key, error: err });
            throw err;
        }
    }

    async delete(key: string) {
        try {
            await this.redis.del(key);
            log.info("cache_delete", { key });
        } catch (err) {
            log.error("cache_delete_error", { key, error: err });
        }
    }
}

export const cache = CacheManager.getInstance();
