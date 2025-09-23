import { createClient } from 'redis';
import { redisConfig } from '../config';

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
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    appendOnly: true,
};

const redis = createClient(redisClientConfig);

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

    // Pub/Sub operations
    async publish(channel: string, message: any): Promise<number> {
        try {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
            const result = await this.redisClient.publish(channel, messageStr);
            console.log("pub_publish", {
                channel,
                message: messageStr,
                subscribers: result
            });
            return result;
        } catch (err) {
            console.error("pub_publish_error", { channel, error: err });
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
                console.log(`📨 Received message on channel ${channel}:`, message);

                const channelSubscribers = this.subscribers.get(channel);
                if (channelSubscribers) {
                    channelSubscribers.forEach(callback => {
                        try {
                            callback(message, channel);
                        } catch (error) {
                            console.error(`❌ Error in subscriber callback for channel ${channel}:`, error);
                        }
                    });
                }
            });
            console.log("pub_subscribe", { channel, totalSubscribers: this.subscribers.get(channel)!.size });
        } catch (err) {
            console.error("pub_subscribe_error", { channel, error: err });
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
                        console.log("pub_unsubscribe", { channel, reason: "no_subscribers" });
                    } else {
                        console.log("pub_unsubscribe", {
                            channel,
                            remainingSubscribers: channelSubscribers.size
                        });
                    }
                }
            } else {
                // Remove all subscribers for this channel
                await this.redisClient.unsubscribe(channel);
                this.subscribers.delete(channel);
                console.log("pub_unsubscribe_all", { channel });
            }
        } catch (err) {
            console.error("pub_unsubscribe_error", { channel, error: err });
            throw err;
        }
    }

    async unsubscribeAll(): Promise<void> {
        try {
            const channels = Array.from(this.subscribers.keys());
            for (const channel of channels) {
                await this.unsubscribe(channel);
            }
            console.log("pub_unsubscribe_all_channels", { channels: channels.length });
        } catch (err) {
            console.error("pub_unsubscribe_all_error", { error: err });
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
                console.log(`📨 Received message on pattern ${pattern} channel ${channel}:`, message);

                const patternSubscribers = this.subscribers.get(pattern);
                if (patternSubscribers) {
                    patternSubscribers.forEach(callback => {
                        try {
                            callback(message, channel);
                        } catch (error) {
                            console.error(`❌ Error in pattern subscriber callback for pattern ${pattern}:`, error);
                        }
                    });
                }
            });
            console.log("pub_psubscribe", { pattern, totalSubscribers: this.subscribers.get(pattern)!.size });
        } catch (err) {
            console.error("pub_psubscribe_error", { pattern, error: err });
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
                        console.log("pub_punsubscribe", { pattern, reason: "no_subscribers" });
                    } else {
                        console.log("pub_punsubscribe", {
                            pattern,
                            remainingSubscribers: patternSubscribers.size
                        });
                    }
                }
            } else {
                // Remove all subscribers for this pattern
                await this.redisClient.pUnsubscribe(pattern);
                this.subscribers.delete(pattern);
                console.log("pub_punsubscribe_all", { pattern });
            }
        } catch (err) {
            console.error("pub_punsubscribe_error", { pattern, error: err });
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
            console.log("cache_mget", { keys: keys.length, hits: values.filter(v => v !== null).length });
            return values;
        } catch (err) {
            console.error("cache_mget_error", { keys, error: err });
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

            console.log("cache_mset", {
                keys: Object.keys(keyValuePairs).length,
                ttl: ttlSeconds
            });
        } catch (err) {
            console.error("cache_mset_error", { keys: Object.keys(keyValuePairs).length, error: err });
            throw err;
        }
    }

    // Cleanup method
    async cleanup(): Promise<void> {
        try {
            await this.unsubscribeAll();
            await this.redisClient.quit();
            console.log("cache_cleanup_complete");
        } catch (err) {
            console.error("cache_cleanup_error", { error: err });
            throw err;
        }
    }
}

export const cache = CacheManager.getInstance();
export { redis };
