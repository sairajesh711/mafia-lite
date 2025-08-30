import { createClient } from 'redis';
import type { Id } from '@mafia/contracts';

export interface DeduplicationResult {
  isDuplicate: boolean;
  wasProcessed: boolean;
  originalResponse?: any;
}

export class ActionDedupService {
  constructor(private redis: ReturnType<typeof createClient>) {}

  /**
   * Check if action is duplicate and mark as processing
   */
  async checkAndMarkAction(actionId: Id, playerId: Id, roomId: Id): Promise<DeduplicationResult> {
    const key = `action:${actionId}:${playerId}:${roomId}`;
    
    // Try to set the action with NX (only if not exists)
    const wasSet = await this.redis.setNX(key, JSON.stringify({
      status: 'processing',
      playerId,
      roomId,
      timestamp: Date.now(),
    }));

    if (!wasSet) {
      // Action already exists, check if it was processed
      const existingData = await this.redis.get(key);
      if (existingData) {
        const parsed = JSON.parse(existingData);
        return {
          isDuplicate: true,
          wasProcessed: parsed.status === 'completed',
          originalResponse: parsed.response,
        };
      }
    }

    // Set expiration (10 minutes for action dedup window)
    await this.redis.expire(key, 600);

    return {
      isDuplicate: false,
      wasProcessed: false,
    };
  }

  /**
   * Mark action as successfully completed
   */
  async markActionCompleted(actionId: Id, playerId: Id, roomId: Id, response?: any): Promise<void> {
    const key = `action:${actionId}:${playerId}:${roomId}`;
    
    await this.redis.set(key, JSON.stringify({
      status: 'completed',
      playerId,
      roomId,
      timestamp: Date.now(),
      response,
    }));

    // Extend expiration for completed actions (1 hour)
    await this.redis.expire(key, 3600);
  }

  /**
   * Mark action as failed (allows retry)
   */
  async markActionFailed(actionId: Id, playerId: Id, roomId: Id, error: string): Promise<void> {
    const key = `action:${actionId}:${playerId}:${roomId}`;
    
    await this.redis.set(key, JSON.stringify({
      status: 'failed',
      playerId,
      roomId,
      timestamp: Date.now(),
      error,
    }));

    // Failed actions expire quickly to allow retry
    await this.redis.expire(key, 60);
  }

  /**
   * Clean up old action dedup entries (called periodically)
   */
  async cleanup(): Promise<number> {
    const pattern = 'action:*';
    const keys = await this.redis.keys(pattern);
    
    let deletedCount = 0;
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) {
        // Key exists but has no expiration, clean it up
        await this.redis.del(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Get action status for debugging
   */
  async getActionStatus(actionId: Id, playerId: Id, roomId: Id): Promise<any> {
    const key = `action:${actionId}:${playerId}:${roomId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
}