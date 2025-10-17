import { createClient } from 'redis';
import { redisConfig } from '../config';
import {
    REDIS_CONFIG,
    REDIS_MESSAGES,
    CACHE_LOG_MESSAGES,
    PUBSUB_LOG_MESSAGES,
    CACHE_TTL
} from '../shared/constants/cache-keys';

// Build Redis URL based on available credentials
const buildRedisUrl = () => {
    const host = redisConfig.host;
    const port = redisConfig.port;
    const username = redisConfig.username;
    const password = redisConfig.password;

    if (username && password) {
        return `redis://${username}:${password}@${host}:${port}`;
    } else if (password) {
        return `redis://:${password}@${host}:${port}`;
    } else {
        return `redis://${host}:${port}`;
    }
};

const redisClientConfig: any = {
    url: buildRedisUrl(),
    retryDelayOnFailover: REDIS_CONFIG.RETRY_DELAY_ON_FAILOVER,
    enableReadyCheck: REDIS_CONFIG.ENABLE_READY_CHECK,
    maxRetriesPerRequest: REDIS_CONFIG.MAX_RETRIES_PER_REQUEST,
    lazyConnect: REDIS_CONFIG.LAZY_CONNECT,
    connectTimeout: REDIS_CONFIG.CONNECT_TIMEOUT,
    commandTimeout: REDIS_CONFIG.COMMAND_TIMEOUT,
    appendOnly: REDIS_CONFIG.APPEND_ONLY,
};

const redis = createClient(redisClientConfig);

redis.on('connect', () => {
    console.log(REDIS_MESSAGES.CONNECT);
});

redis.on('ready', () => {
    console.log(REDIS_MESSAGES.READY);
});

redis.on('error', (err: any) => {
    console.error(REDIS_MESSAGES.ERROR, err);
});

redis.on('close', () => {
    console.log(REDIS_MESSAGES.CLOSE);
});

redis.on('reconnecting', () => {
    console.log(REDIS_MESSAGES.RECONNECTING);
});

// Connect to Redis
redis.connect().catch(console.error);

class CacheManager {
    private static instance: CacheManager;
    private redisClient: typeof redis;
    private subscribers: Map<string, Set<(message: string, channel: string) => void>> = new Map();

    private constructor() {
        this.redisClient = redis;
    }

    static getInstance(): CacheManager {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }

    // Basic cache operations
    async get(key: string) {
        const start = Date.now();
        try {
            const value = await this.redisClient.get(key);
            const result = value ? JSON.parse(value) : null;
            console.log(CACHE_LOG_MESSAGES.GET, {
                key,
                hit: result !== null,
                duration: Date.now() - start
            });
            return result;
        } catch (err) {
            console.error(CACHE_LOG_MESSAGES.GET_ERROR, { key, error: err });
            return null;
        }
    }

    async set(key: string, value: any, ttlSeconds: number = CACHE_TTL.DEFAULT) {
        const start = Date.now();
        try {
            await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
            console.log(CACHE_LOG_MESSAGES.SET, {
                key,
                ttl: ttlSeconds,
                duration: Date.now() - start
            });
        } catch (err) {
            console.error(CACHE_LOG_MESSAGES.SET_ERROR, { key, error: err });
            throw err;
        }
    }

    async delete(key: string) {
        try {
            await this.redisClient.del(key);
            console.log(CACHE_LOG_MESSAGES.DELETE, { key });
        } catch (err) {
            console.error(CACHE_LOG_MESSAGES.DELETE_ERROR, { key, error: err });
        }
    }

    /**
     * Delete multiple keys matching a pattern
     */
    async deletePattern(pattern: string): Promise<number> {
        try {
            const keys = await this.redisClient.keys(pattern);
            if (keys.length === 0) {
                console.log(CACHE_LOG_MESSAGES.DELETE, { pattern, deletedCount: 0 });
                return 0;
            }

            const deletedCount = await this.redisClient.del(keys);
            console.log(CACHE_LOG_MESSAGES.DELETE, { pattern, deletedCount });
            return deletedCount;
        } catch (err) {
            console.error(CACHE_LOG_MESSAGES.DELETE_ERROR, { pattern, error: err });
            return 0;
        }
    }

    async ping() {
        try {
            return await this.redisClient.ping();
        } catch (err) {
            throw err;
        }
    }

    // Pub/Sub operations
    async publish(channel: string, message: any): Promise<number> {
        try {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
            const result = await this.redisClient.publish(channel, messageStr);
            console.log(PUBSUB_LOG_MESSAGES.PUBLISH, {
                channel,
                message: messageStr,
                subscribers: result
            });
            return result;
        } catch (err) {
            console.error(PUBSUB_LOG_MESSAGES.PUBLISH_ERROR, { channel, error: err });
            throw err;
        }
    }

    async subscribe(channel: string, callback: (message: string, channel: string) => void): Promise<void> {
        try {
            // Add callback to subscribers map
            if (!this.subscribers.has(channel)) {
                this.subscribers.set(channel, new Set());
            }
            this.subscribers.get(channel)!.add(callback);

            // Subscribe to Redis channel
            await this.redisClient.subscribe(channel, (message, channel) => {
                console.log(`${REDIS_MESSAGES.MESSAGE_RECEIVED} ${channel}:`, message);

                const channelSubscribers = this.subscribers.get(channel);
                if (channelSubscribers) {
                    channelSubscribers.forEach(callback => {
                        try {
                            callback(message, channel);
                        } catch (error) {
                            console.error(`${REDIS_MESSAGES.SUBSCRIBER_ERROR} ${channel}:`, error);
                        }
                    });
                }
            });
            console.log(PUBSUB_LOG_MESSAGES.SUBSCRIBE, { channel, totalSubscribers: this.subscribers.get(channel)!.size });
        } catch (err) {
            console.error(PUBSUB_LOG_MESSAGES.SUBSCRIBE_ERROR, { channel, error: err });
            throw err;
        }
    }

    async unsubscribe(channel: string, callback?: (message: string, channel: string) => void): Promise<void> {
        try {
            if (callback) {
                // Remove specific callback
                const channelSubscribers = this.subscribers.get(channel);
                if (channelSubscribers) {
                    channelSubscribers.delete(callback);

                    // If no more subscribers, unsubscribe from Redis
                    if (channelSubscribers.size === 0) {
                        await this.redisClient.unsubscribe(channel);
                        this.subscribers.delete(channel);
                        console.log(PUBSUB_LOG_MESSAGES.UNSUBSCRIBE, { channel, reason: "no_subscribers" });
                    } else {
                        console.log(PUBSUB_LOG_MESSAGES.UNSUBSCRIBE, {
                            channel,
                            remainingSubscribers: channelSubscribers.size
                        });
                    }
                }
            } else {
                // Remove all subscribers for this channel
                await this.redisClient.unsubscribe(channel);
                this.subscribers.delete(channel);
                console.log(PUBSUB_LOG_MESSAGES.UNSUBSCRIBE_ALL, { channel });
            }
        } catch (err) {
            console.error(PUBSUB_LOG_MESSAGES.UNSUBSCRIBE_ERROR, { channel, error: err });
            throw err;
        }
    }

    async unsubscribeAll(): Promise<void> {
        try {
            const channels = Array.from(this.subscribers.keys());
            for (const channel of channels) {
                await this.unsubscribe(channel);
            }
            console.log(PUBSUB_LOG_MESSAGES.UNSUBSCRIBE_ALL_CHANNELS, { channels: channels.length });
        } catch (err) {
            console.error(PUBSUB_LOG_MESSAGES.UNSUBSCRIBE_ALL_ERROR, { error: err });
            throw err;
        }
    }

    // Pattern-based pub/sub
    async psubscribe(pattern: string, callback: (message: string, channel: string) => void): Promise<void> {
        try {
            // Add callback to subscribers map with pattern as key
            if (!this.subscribers.has(pattern)) {
                this.subscribers.set(pattern, new Set());
            }
            this.subscribers.get(pattern)!.add(callback);

            // Subscribe to Redis pattern
            await this.redisClient.pSubscribe(pattern, (message, channel) => {
                console.log(`${REDIS_MESSAGES.PATTERN_MESSAGE_RECEIVED} ${pattern} channel ${channel}:`, message);

                const patternSubscribers = this.subscribers.get(pattern);
                if (patternSubscribers) {
                    patternSubscribers.forEach(callback => {
                        try {
                            callback(message, channel);
                        } catch (error) {
                            console.error(`${REDIS_MESSAGES.PATTERN_SUBSCRIBER_ERROR} ${pattern}:`, error);
                        }
                    });
                }
            });
            console.log(PUBSUB_LOG_MESSAGES.PSUBSCRIBE, { pattern, totalSubscribers: this.subscribers.get(pattern)!.size });
        } catch (err) {
            console.error(PUBSUB_LOG_MESSAGES.PSUBSCRIBE_ERROR, { pattern, error: err });
            throw err;
        }
    }

    async punsubscribe(pattern: string, callback?: (message: string, channel: string) => void): Promise<void> {
        try {
            if (callback) {
                // Remove specific callback
                const patternSubscribers = this.subscribers.get(pattern);
                if (patternSubscribers) {
                    patternSubscribers.delete(callback);

                    // If no more subscribers, unsubscribe from Redis
                    if (patternSubscribers.size === 0) {
                        await this.redisClient.pUnsubscribe(pattern);
                        this.subscribers.delete(pattern);
                        console.log(PUBSUB_LOG_MESSAGES.PUNSUBSCRIBE, { pattern, reason: "no_subscribers" });
                    } else {
                        console.log(PUBSUB_LOG_MESSAGES.PUNSUBSCRIBE, {
                            pattern,
                            remainingSubscribers: patternSubscribers.size
                        });
                    }
                }
            } else {
                // Remove all subscribers for this pattern
                await this.redisClient.pUnsubscribe(pattern);
                this.subscribers.delete(pattern);
                console.log(PUBSUB_LOG_MESSAGES.PUNSUBSCRIBE_ALL, { pattern });
            }
        } catch (err) {
            console.error(PUBSUB_LOG_MESSAGES.PUNSUBSCRIBE_ERROR, { pattern, error: err });
            throw err;
        }
    }

    // Utility methods
    async getSubscriberCount(channel: string): Promise<number> {
        const subscribers = this.subscribers.get(channel);
        return subscribers ? subscribers.size : 0;
    }

    async getActiveChannels(): Promise<string[]> {
        return Array.from(this.subscribers.keys());
    }

    // Batch operations
    async mget(keys: string[]): Promise<(string | null)[]> {
        try {
            const values = await this.redisClient.mGet(keys);
            console.log(CACHE_LOG_MESSAGES.MGET, { keys: keys.length, hits: values.filter(v => v !== null).length });
            return values;
        } catch (err) {
            console.error(CACHE_LOG_MESSAGES.MGET_ERROR, { keys, error: err });
            throw err;
        }
    }

    async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<void> {
        try {
            const serializedPairs: Record<string, string> = {};
            for (const [key, value] of Object.entries(keyValuePairs)) {
                serializedPairs[key] = JSON.stringify(value);
            }

            await this.redisClient.mSet(serializedPairs);

            // Set TTL for all keys if specified
            if (ttlSeconds) {
                const pipeline = this.redisClient.multi();
                for (const key of Object.keys(keyValuePairs)) {
                    pipeline.expire(key, ttlSeconds);
                }
                await pipeline.exec();
            }

            console.log(CACHE_LOG_MESSAGES.MSET, {
                keys: Object.keys(keyValuePairs).length,
                ttl: ttlSeconds
            });
        } catch (err) {
            console.error(CACHE_LOG_MESSAGES.MSET_ERROR, { keys: Object.keys(keyValuePairs).length, error: err });
            throw err;
        }
    }

    // Cleanup method
    async cleanup(): Promise<void> {
        try {
            await this.unsubscribeAll();
            await this.redisClient.quit();
            console.log(CACHE_LOG_MESSAGES.CLEANUP_COMPLETE);
        } catch (err) {
            console.error(CACHE_LOG_MESSAGES.CLEANUP_ERROR, { error: err });
            throw err;
        }
    }
}

export const cache = CacheManager.getInstance();
export { redis };
