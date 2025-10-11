import { Pool, PoolClient } from 'pg';
import { appConfig, dbConfig } from '../config';

export interface NotificationPayload {
  message_id: number;
  group_id: number;
  sender_id: number;
  message_type: 'text' | 'audio' | 'file' | 'image';
  content?: string;
  file_url?: string;
  file_name?: string;
  audio_duration?: number;
  created_at: string;
}

export interface Subscriber {
  client: PoolClient;
  groupId: number;
  userId: number;
  lastActivity: Date;
}

class PostgreSQLPubSub {
  private pool: Pool;
  private subscribers: Map<string, Subscriber[]> = new Map();
  private isListening = false;

  constructor() {
    this.pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      max: 20, // Max connections for pub/sub
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('PostgreSQL pub/sub pool error:', err);
    });
  }

  /**
   * Subscribe to a group's message channel
   */
  async subscribe(groupId: number, userId: number): Promise<PoolClient> {
    const channelName = `group_chat_${groupId}`;
    const client = await this.pool.connect();

    try {
      // Start listening to the channel
      await client.query(`LISTEN ${channelName}`);
      
      // Store subscriber info
      const subscriberKey = `${groupId}_${userId}`;
      if (!this.subscribers.has(channelName)) {
        this.subscribers.set(channelName, []);
      }
      
      this.subscribers.get(channelName)!.push({
        client,
        groupId,
        userId,
        lastActivity: new Date()
      });

      console.log(`Subscribed user ${userId} to group ${groupId} channel`);
      return client;
    } catch (error) {
      console.error(`Error subscribing to channel ${channelName}:`, error);
      client.release();
      throw error;
    }
  }

  /**
   * Unsubscribe from a group's message channel
   */
  async unsubscribe(groupId: number, userId: number): Promise<void> {
    const channelName = `group_chat_${groupId}`;
    const subscribers = this.subscribers.get(channelName);
    
    if (!subscribers) return;

    const subscriberIndex = subscribers.findIndex(sub => sub.userId === userId);
    if (subscriberIndex === -1) return;

    const subscriber = subscribers[subscriberIndex];
    
    try {
      await subscriber.client.query(`UNLISTEN ${channelName}`);
      subscriber.client.release();
      subscribers.splice(subscriberIndex, 1);

      // Clean up empty channel
      if (subscribers.length === 0) {
        this.subscribers.delete(channelName);
      }

      console.log(`Unsubscribed user ${userId} from group ${groupId} channel`);
    } catch (error) {
      console.error(`Error unsubscribing from channel ${channelName}:`, error);
    }
  }

  /**
   * Send notification to a group's channel
   * Note: This is typically handled by PostgreSQL triggers, but can be used manually
   */
  async notify(groupId: number, payload: NotificationPayload): Promise<void> {
    const channelName = `group_chat_${groupId}`;
    const client = await this.pool.connect();

    try {
      await client.query(
        `SELECT pg_notify($1, $2)`,
        [channelName, JSON.stringify(payload)]
      );
      console.log(`Notified channel ${channelName} with message ${payload.message_id}`);
    } catch (error) {
      console.error(`Error notifying channel ${channelName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get active subscribers for a group
   */
  getSubscribers(groupId: number): Subscriber[] {
    const channelName = `group_chat_${groupId}`;
    return this.subscribers.get(channelName) || [];
  }

  /**
   * Get subscriber count for a group
   */
  getSubscriberCount(groupId: number): number {
    return this.getSubscribers(groupId).length;
  }

  /**
   * Clean up inactive subscribers
   */
  async cleanupInactiveSubscribers(maxInactiveMinutes = 30): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    
    for (const [channelName, subscribers] of this.subscribers.entries()) {
      const activeSubscribers = [];
      
      for (const subscriber of subscribers) {
        if (subscriber.lastActivity > cutoffTime) {
          activeSubscribers.push(subscriber);
        } else {
          try {
            await subscriber.client.query(`UNLISTEN ${channelName}`);
            subscriber.client.release();
            console.log(`Cleaned up inactive subscriber for channel ${channelName}`);
          } catch (error) {
            console.error(`Error cleaning up subscriber:`, error);
          }
        }
      }
      
      if (activeSubscribers.length === 0) {
        this.subscribers.delete(channelName);
      } else {
        this.subscribers.set(channelName, activeSubscribers);
      }
    }
  }

  /**
   * Update subscriber activity timestamp
   */
  updateActivity(groupId: number, userId: number): void {
    const channelName = `group_chat_${groupId}`;
    const subscribers = this.subscribers.get(channelName);
    
    if (subscribers) {
      const subscriber = subscribers.find(sub => sub.userId === userId);
      if (subscriber) {
        subscriber.lastActivity = new Date();
      }
    }
  }

  /**
   * Health check for pub/sub system
   */
  async healthCheck(): Promise<{ status: string; activeChannels: number; totalSubscribers: number }> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      const totalSubscribers = Array.from(this.subscribers.values())
        .reduce((sum, subs) => sum + subs.length, 0);

      return {
        status: 'healthy',
        activeChannels: this.subscribers.size,
        totalSubscribers
      };
    } catch (error) {
      console.error('Pub/sub health check failed:', error);
      return {
        status: 'unhealthy',
        activeChannels: 0,
        totalSubscribers: 0
      };
    }
  }

  /**
   * Close all connections and cleanup
   */
  async close(): Promise<void> {
    // Unsubscribe all clients
    for (const [channelName, subscribers] of this.subscribers.entries()) {
      for (const subscriber of subscribers) {
        try {
          await subscriber.client.query(`UNLISTEN ${channelName}`);
          subscriber.client.release();
        } catch (error) {
          console.error(`Error closing subscriber:`, error);
        }
      }
    }
    
    this.subscribers.clear();
    await this.pool.end();
    console.log('PostgreSQL pub/sub closed');
  }
}

// Export singleton instance
export const postgresPubSub = new PostgreSQLPubSub();

// Cleanup inactive subscribers every 5 minutes
setInterval(() => {
  postgresPubSub.cleanupInactiveSubscribers(30);
}, 5 * 60 * 1000);
