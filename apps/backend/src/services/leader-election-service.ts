import { createClient } from 'redis';
import type { Id } from '@mafia/contracts';

export interface LeaderInfo {
  instanceId: string;
  roomId: string;
  electedAt: number;
  renewedAt: number;
}

export class LeaderElectionService {
  private instanceId: string;
  private renewalIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private redis: ReturnType<typeof createClient>,
    instanceId?: string
  ) {
    this.instanceId = instanceId || `instance_${process.pid}_${Date.now()}`;
  }

  /**
   * Try to become leader for a room
   */
  async tryBecomeLeader(roomId: Id): Promise<boolean> {
    const key = `room:${roomId}:leader`;
    const lockData = JSON.stringify({
      instanceId: this.instanceId,
      roomId,
      electedAt: Date.now(),
      renewedAt: Date.now(),
    });

    // Try to acquire lock with 10 second expiry
    const acquired = await this.redis.setNX(key, lockData);
    if (acquired) {
      await this.redis.expire(key, 10);
      
      // Start renewal process
      this.startRenewalProcess(roomId);
      
      console.log(`📋 Instance ${this.instanceId} became leader for room ${roomId}`);
      return true;
    }

    return false;
  }

  /**
   * Check if this instance is the leader for a room
   */
  async isLeader(roomId: Id): Promise<boolean> {
    const key = `room:${roomId}:leader`;
    const leaderData = await this.redis.get(key);
    
    if (!leaderData) return false;
    
    try {
      const leader: LeaderInfo = JSON.parse(leaderData);
      return leader.instanceId === this.instanceId;
    } catch {
      return false;
    }
  }

  /**
   * Get current leader info for a room
   */
  async getLeader(roomId: Id): Promise<LeaderInfo | null> {
    const key = `room:${roomId}:leader`;
    const leaderData = await this.redis.get(key);
    
    if (!leaderData) return null;
    
    try {
      return JSON.parse(leaderData);
    } catch {
      return null;
    }
  }

  /**
   * Resign leadership for a room
   */
  async resignLeadership(roomId: Id): Promise<void> {
    const key = `room:${roomId}:leader`;
    const leader = await this.getLeader(roomId);
    
    if (leader && leader.instanceId === this.instanceId) {
      await this.redis.del(key);
      this.stopRenewalProcess(roomId);
      console.log(`📋 Instance ${this.instanceId} resigned leadership for room ${roomId}`);
    }
  }

  /**
   * Start automatic renewal process for a room
   */
  private startRenewalProcess(roomId: Id): void {
    // Clear existing renewal if any
    this.stopRenewalProcess(roomId);

    const renewalInterval = setInterval(async () => {
      try {
        const renewed = await this.renewLeadership(roomId);
        if (!renewed) {
          console.log(`⚠️  Failed to renew leadership for room ${roomId}, stopping renewal`);
          this.stopRenewalProcess(roomId);
        }
      } catch (error) {
        console.error(`Error renewing leadership for room ${roomId}:`, error);
        this.stopRenewalProcess(roomId);
      }
    }, 3000); // Renew every 3 seconds

    this.renewalIntervals.set(roomId, renewalInterval);
  }

  /**
   * Stop renewal process for a room
   */
  private stopRenewalProcess(roomId: Id): void {
    const interval = this.renewalIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.renewalIntervals.delete(roomId);
    }
  }

  /**
   * Renew leadership for a room
   */
  private async renewLeadership(roomId: Id): Promise<boolean> {
    const key = `room:${roomId}:leader`;
    const leader = await this.getLeader(roomId);
    
    if (!leader || leader.instanceId !== this.instanceId) {
      return false;
    }

    // Update renewal timestamp
    const updatedData = JSON.stringify({
      ...leader,
      renewedAt: Date.now(),
    });

    const updated = await this.redis.set(key, updatedData, { XX: true }); // Only if key exists
    if (updated === 'OK') {
      await this.redis.expire(key, 10); // Extend expiry
      return true;
    }

    return false;
  }

  /**
   * Force leader election for a room (called on leader failure detection)
   */
  async forceLeaderElection(roomId: Id): Promise<boolean> {
    const key = `room:${roomId}:leader`;
    
    // Delete the current leader key to trigger new election
    await this.redis.del(key);
    
    // Try to become the new leader
    return this.tryBecomeLeader(roomId);
  }

  /**
   * Clean up all renewals (called on shutdown)
   */
  cleanup(): void {
    for (const [roomId, interval] of this.renewalIntervals) {
      clearInterval(interval);
      // Optionally resign leadership on shutdown
      this.resignLeadership(roomId).catch(console.error);
    }
    this.renewalIntervals.clear();
  }

  /**
   * Get instance ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }
}