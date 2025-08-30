export type Id = string;

export type Alignment = 'mafia' | 'town' | 'neutral';

export type Phase = 'lobby' | 'night' | 'day' | 'vote' | 'ended';

export type RoleId = 'mafia' | 'detective' | 'doctor' | 'townsperson';

export type ActionType = 'KILL' | 'PROTECT' | 'INVESTIGATE' | 'NONE';

export type PlayerStatus = 'alive' | 'dead' | 'disconnected';

export type VictoryCondition = 'mafia-victory' | 'town-victory' | 'none';

export type ErrorCode = 
  | 'WRONG_PHASE' 
  | 'DEAD_PLAYER' 
  | 'INVALID_TARGET'
  | 'ALREADY_SUBMITTED' 
  | 'IDEMPOTENT_DUPLICATE'
  | 'ROOM_FULL' 
  | 'ROOM_NOT_FOUND' 
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED';

export interface Timestamp {
  readonly submittedAt: number;
  readonly endsAt?: number;
}

export interface Identifiable {
  readonly id: Id;
}

export interface Versioned {
  readonly protocolVersion: number;
}