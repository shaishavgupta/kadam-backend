# Redis Pub/Sub Usage Examples

This document demonstrates how to use the enhanced Redis cache with pub/sub functionality.

## Basic Cache Operations

```typescript
import { cache } from '../infra/cache';

// Set a value with TTL
await cache.set('user:123', { name: 'John', email: 'john@example.com' }, 3600);

// Get a value
const user = await cache.get('user:123');

// Delete a value
await cache.delete('user:123');

// Batch operations
await cache.mset({
    'user:1': { name: 'Alice' },
    'user:2': { name: 'Bob' },
    'user:3': { name: 'Charlie' }
}, 1800);

const users = await cache.mget(['user:1', 'user:2', 'user:3']);
```

## Pub/Sub Operations

### Publishing Messages

```typescript
import { cache } from '../infra/cache';

// Publish a simple string message
await cache.publish('notifications', 'New user registered');

// Publish a complex object
await cache.publish('user-events', {
    type: 'user_created',
    userId: 123,
    timestamp: new Date().toISOString(),
    data: { name: 'John', email: 'john@example.com' }
});

// Publish to multiple channels
await Promise.all([
    cache.publish('admin-notifications', 'User created'),
    cache.publish('user-notifications', 'Welcome!'),
    cache.publish('analytics', { event: 'user_signup', userId: 123 })
]);
```

### Subscribing to Channels

```typescript
import { cache } from '../infra/cache';

// Subscribe to a specific channel
const notificationHandler = (message: string, channel: string) => {
    console.log(`Received notification: ${message} on channel: ${channel}`);

    try {
        const data = JSON.parse(message);
        // Process the notification
        processNotification(data);
    } catch (error) {
        console.error('Error parsing notification:', error);
    }
};

await cache.subscribe('notifications', notificationHandler);

// Subscribe to user events
const userEventHandler = (message: string, channel: string) => {
    const event = JSON.parse(message);

    switch (event.type) {
        case 'user_created':
            handleUserCreated(event);
            break;
        case 'user_updated':
            handleUserUpdated(event);
            break;
        default:
            console.log('Unknown event type:', event.type);
    }
};

await cache.subscribe('user-events', userEventHandler);
```

### Pattern-based Subscriptions

```typescript
import { cache } from '../infra/cache';

// Subscribe to all user-related channels
const userPatternHandler = (message: string, channel: string) => {
    console.log(`User event on ${channel}:`, message);

    // Extract user ID from channel name
    const userId = channel.split(':')[1];
    updateUserCache(userId, JSON.parse(message));
};

await cache.psubscribe('user:*', userPatternHandler);

// Subscribe to all notification channels
await cache.psubscribe('notifications:*', (message, channel) => {
    console.log(`Notification on ${channel}:`, message);
    sendNotification(channel, message);
});
```

### Unsubscribing

```typescript
import { cache } from '../infra/cache';

// Unsubscribe specific callback from a channel
await cache.unsubscribe('notifications', notificationHandler);

// Unsubscribe from all callbacks on a channel
await cache.unsubscribe('user-events');

// Unsubscribe from pattern
await cache.punsubscribe('user:*', userPatternHandler);

// Unsubscribe from all channels
await cache.unsubscribeAll();
```

## Real-world Use Cases

### 1. Real-time Notifications

```typescript
// Service that publishes notifications
class NotificationService {
    async sendNotification(userId: number, message: string) {
        await cache.publish(`notifications:user:${userId}`, {
            type: 'notification',
            message,
            timestamp: new Date().toISOString(),
            userId
        });
    }

    async broadcastToAdmins(message: string) {
        await cache.publish('notifications:admin', {
            type: 'admin_notification',
            message,
            timestamp: new Date().toISOString()
        });
    }
}

// Service that handles notifications
class NotificationHandler {
    constructor() {
        this.setupSubscriptions();
    }

    private async setupSubscriptions() {
        // Subscribe to user notifications
        await cache.psubscribe('notifications:user:*', (message, channel) => {
            const userId = channel.split(':')[2];
            this.sendToUser(userId, JSON.parse(message));
        });

        // Subscribe to admin notifications
        await cache.subscribe('notifications:admin', (message) => {
            this.sendToAdmins(JSON.parse(message));
        });
    }

    private sendToUser(userId: string, notification: any) {
        // Send via WebSocket, push notification, etc.
        console.log(`Sending to user ${userId}:`, notification);
    }

    private sendToAdmins(notification: any) {
        // Send to all admin users
        console.log('Sending to admins:', notification);
    }
}
```

### 2. Cache Invalidation

```typescript
class CacheInvalidationService {
    async invalidateUserCache(userId: number) {
        // Publish cache invalidation event
        await cache.publish('cache:invalidate', {
            type: 'user',
            userId,
            timestamp: new Date().toISOString()
        });
    }

    async invalidateCourseCache(courseId: number) {
        await cache.publish('cache:invalidate', {
            type: 'course',
            courseId,
            timestamp: new Date().toISOString()
        });
    }
}

class CacheInvalidationHandler {
    constructor() {
        this.setupSubscriptions();
    }

    private async setupSubscriptions() {
        await cache.subscribe('cache:invalidate', (message) => {
            const invalidation = JSON.parse(message);

            switch (invalidation.type) {
                case 'user':
                    this.invalidateUserData(invalidation.userId);
                    break;
                case 'course':
                    this.invalidateCourseData(invalidation.courseId);
                    break;
            }
        });
    }

    private invalidateUserData(userId: number) {
        // Remove user-related cache entries
        cache.delete(`user:${userId}`);
        cache.delete(`user:${userId}:profile`);
        cache.delete(`user:${userId}:enrollments`);
    }

    private invalidateCourseData(courseId: number) {
        // Remove course-related cache entries
        cache.delete(`course:${courseId}`);
        cache.delete(`course:${courseId}:modules`);
        cache.delete(`course:${courseId}:contents`);
    }
}
```

### 3. Analytics Events

```typescript
class AnalyticsService {
    async trackEvent(eventType: string, data: any) {
        await cache.publish('analytics:events', {
            type: eventType,
            data,
            timestamp: new Date().toISOString(),
            sessionId: data.sessionId
        });
    }

    async trackUserAction(userId: number, action: string, metadata: any) {
        await cache.publish(`analytics:user:${userId}`, {
            action,
            metadata,
            timestamp: new Date().toISOISOString(),
            userId
        });
    }
}

class AnalyticsProcessor {
    constructor() {
        this.setupSubscriptions();
    }

    private async setupSubscriptions() {
        // Process all analytics events
        await cache.subscribe('analytics:events', (message) => {
            const event = JSON.parse(message);
            this.processEvent(event);
        });

        // Process user-specific analytics
        await cache.psubscribe('analytics:user:*', (message, channel) => {
            const userId = channel.split(':')[2];
            const userEvent = JSON.parse(message);
            this.processUserEvent(userId, userEvent);
        });
    }

    private processEvent(event: any) {
        // Send to analytics service, update metrics, etc.
        console.log('Processing event:', event);
    }

    private processUserEvent(userId: string, event: any) {
        // Update user-specific metrics
        console.log(`Processing user ${userId} event:`, event);
    }
}
```

## Utility Methods

```typescript
import { cache } from '../infra/cache';

// Get subscriber count for a channel
const subscriberCount = await cache.getSubscriberCount('notifications');

// Get all active channels
const activeChannels = await cache.getActiveChannels();
console.log('Active channels:', activeChannels);

// Health check
const isHealthy = await cache.ping();
console.log('Cache health:', isHealthy);

// Cleanup (useful for graceful shutdown)
await cache.cleanup();
```

## Error Handling

```typescript
import { cache } from '../infra/cache';

try {
    await cache.publish('test-channel', 'test message');
} catch (error) {
    console.error('Failed to publish message:', error);
    // Handle error appropriately
}

try {
    await cache.subscribe('test-channel', (message, channel) => {
        console.log('Received:', message);
    });
} catch (error) {
    console.error('Failed to subscribe:', error);
    // Handle subscription error
}
```

## Best Practices

1. **Always handle errors** when publishing or subscribing
2. **Use meaningful channel names** with consistent patterns
3. **Parse JSON messages** safely with try-catch blocks
4. **Unsubscribe when done** to prevent memory leaks
5. **Use patterns** for subscribing to multiple related channels
6. **Implement graceful shutdown** by calling `cleanup()`
7. **Monitor subscriber counts** to understand usage patterns
8. **Use TTL** for cache entries to prevent stale data
9. **Batch operations** when possible for better performance
10. **Log pub/sub activities** for debugging and monitoring
