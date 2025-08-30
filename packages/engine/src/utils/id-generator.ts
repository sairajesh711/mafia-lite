import { randomBytes } from 'crypto';

/**
 * Generates cryptographically secure IDs for actions, rooms, players, etc.
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generates a room code using Base32 alphabet (no ambiguous chars)
 * Format: 6 chars, e.g. "A2B3C4"
 */
export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0,1,I,O
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    result += alphabet[randomIndex];
  }
  
  return result;
}

/**
 * Validates a room code format
 */
export function isValidRoomCode(code: string): boolean {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code);
}