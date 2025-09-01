import { createClient } from 'redis';
import type { Id } from '@mafia/contracts';

export interface PlayerSession {
  playerId: Id;
  roomId: Id;
  sessionId: Id;
  socketId: string;
  connectedAt: number;
  lastAckedActionId?: Id;
}

export class SessionService {
  constructor(private redis: ReturnType<typeof createClient> | null) {}

  /**
   * Register a new player session
   */
  async registerSession(session: PlayerSession): Promise<void> {
    if (!this.redis) {
      console.warn('Redis unavailable - session will not persist across restarts');
      return;
    }
    const key = `session:${session.playerId}:${session.roomId}`;
    
    await this.redis.hSet(key, {
      sessionId: session.sessionId,
      socketId: session.socketId,
      connectedAt: session.connectedAt.toString(),
      lastAckedActionId: session.lastAckedActionId || '',
    });
    
    // Set expiration (25 hours to outlive JWT by 1 hour)
    await this.redis.expire(key, 90000);
  }

  /**
   * Get active session for a player in a room
   */
  async getSession(playerId: Id, roomId: Id): Promise<PlayerSession | null> {
    if (!this.redis) return null;
    
    const key = `session:${playerId}:${roomId}`;
    const sessionData = await this.redis.hGetAll(key);
    
    if (!sessionData.sessionId) return null;

    return {
      playerId,
      roomId,
      sessionId: sessionData.sessionId!,
      socketId: sessionData.socketId!,
      connectedAt: parseInt(sessionData.connectedAt!),
      ...(sessionData.lastAckedActionId && sessionData.lastAckedActionId !== '' 
        ? { lastAckedActionId: sessionData.lastAckedActionId } 
        : {}),
    };
  }

  /**
   * Update session socket ID (for reconnection)
   */
  async updateSessionSocket(playerId: Id, roomId: Id, socketId: string): Promise<void> {
    if (!this.redis) return;
    
    const key = `session:${playerId}:${roomId}`;
    await this.redis.hSet(key, 'socketId', socketId);
  }

  /**
   * Update last acknowledged action ID
   */
  async updateLastAckedAction(playerId: Id, roomId: Id, actionId: Id): Promise<void> {
    if (!this.redis) return;
    
    const key = `session:${playerId}:${roomId}`;
    await this.redis.hSet(key, 'lastAckedActionId', actionId);
  }

  /**
   * Evict old session (when latest wins policy kicks in)
   */
  async evictSession(playerId: Id, roomId: Id): Promise<PlayerSession | null> {
    const session = await this.getSession(playerId, roomId);
    if (session && this.redis) {
      const key = `session:${playerId}:${roomId}`;
      await this.redis.del(key);
    }
    return session;
  }

  /**
   * Check if session exists and is valid
   */
  async isValidSession(playerId: Id, roomId: Id, sessionId: Id): Promise<boolean> {
    const session = await this.getSession(playerId, roomId);
    return session?.sessionId === sessionId;
  }

  /**
   * Get all active sessions for a room (for broadcasting)
   */
  async getRoomSessions(roomId: Id): Promise<PlayerSession[]> {
    if (!this.redis) return [];
    
    const pattern = `session:*:${roomId}`;
    const keys = await this.redis.keys(pattern);
    
    const sessions: PlayerSession[] = [];
    for (const key of keys) {
      const parts = key.split(':');
      const playerId = parts[1];
      if (playerId) {
        const session = await this.getSession(playerId, roomId);
        if (session) {
          sessions.push(session);
        }
      }
    }
    
    return sessions;
  }
}