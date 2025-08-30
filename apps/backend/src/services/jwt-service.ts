import jwt from 'jsonwebtoken';
import type { Id } from '@mafia/contracts';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '24h'; // Tokens expire in 24 hours

export interface RoomJWTPayload {
  sub: Id; // playerId
  roomId: Id;
  region: string;
  sessionId: Id;
  exp: number;
  iat: number;
}

export class JWTService {
  /**
   * Issue a room-scoped JWT (no role inside for security)
   */
  static issueRoomToken(playerId: Id, roomId: Id, sessionId: Id): string {
    const payload: Omit<RoomJWTPayload, 'exp' | 'iat'> = {
      sub: playerId,
      roomId,
      region: process.env.REGION || 'dev',
      sessionId,
    };

    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRY,
      algorithm: 'HS256',
    });
  }

  /**
   * Verify and decode a room JWT
   */
  static verifyRoomToken(token: string): RoomJWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { 
        algorithms: ['HS256'] 
      }) as RoomJWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        console.warn('JWT verification failed:', error.message);
      }
      return null;
    }
  }

  /**
   * Check if token is expired (within 5 minutes for refresh grace)
   */
  static isTokenExpiringSoon(payload: RoomJWTPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    const gracePeriod = 5 * 60; // 5 minutes
    return (payload.exp - now) <= gracePeriod;
  }

  /**
   * Refresh token if expiring soon
   */
  static refreshTokenIfNeeded(token: string): string | null {
    const payload = this.verifyRoomToken(token);
    if (!payload) return null;

    if (this.isTokenExpiringSoon(payload)) {
      return this.issueRoomToken(payload.sub, payload.roomId, payload.sessionId);
    }

    return null; // No refresh needed
  }
}