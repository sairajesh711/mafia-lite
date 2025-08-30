import type { Id, Phase, ErrorCode, Versioned } from './base.js';
import type { ClientView, PhaseTimer } from './room.js';
import type { NightAction, Vote, InvestigationResult } from './actions.js';

// Socket.IO Event Payloads

export interface RoomJoinPayload {
  readonly roomCode: string;
  readonly playerName: string;
  readonly sessionId?: string;
}

export interface SessionResumePayload {
  readonly roomId: Id;
  readonly sessionId: string;
  readonly jwt: string;
}

export interface ActionSubmitPayload {
  readonly actionId: Id;
  readonly type: string;
  readonly targetId: Id;
}

export interface VoteCastPayload {
  readonly actionId: Id;
  readonly targetId: Id | null;
}

export interface ChatMessagePayload {
  readonly messageId: Id;
  readonly channel: 'day' | 'nightMafia' | 'dead' | 'lobby';
  readonly content: string;
}

export interface HostActionPayload {
  readonly action: 'kick' | 'mute' | 'nudge' | 'start';
  readonly targetId?: Id;
}

// Server Response Events

export interface RoomSnapshotEvent extends Versioned {
  readonly event: 'room.snapshot';
  readonly view: ClientView;
  readonly jwt?: string;
}

export interface PhaseChangeEvent extends Versioned {
  readonly event: 'phase.change';
  readonly phase: Phase;
  readonly timer: PhaseTimer | null;
  readonly night?: boolean;
}

export interface ActionAckEvent extends Versioned {
  readonly event: 'action.ack';
  readonly actionId: Id;
  readonly type: string;
  readonly targetId: Id;
}

export interface VoteUpdateEvent extends Versioned {
  readonly event: 'vote.update';
  readonly playerId: Id;
  readonly targetId: Id | null;
  readonly tallies?: Record<Id, number>;
}

export interface NightPublicResultEvent extends Versioned {
  readonly event: 'night.publicResult';
  readonly death?: Id;
  readonly narrative: string;
}

export interface DetectiveResultEvent extends Versioned {
  readonly event: 'detective.result';
  readonly result: InvestigationResult;
}

export interface LynchResultEvent extends Versioned {
  readonly event: 'lynch.result';
  readonly targetId: Id | null;
  readonly narrative: string;
}

export interface PlayerStatusEvent extends Versioned {
  readonly event: 'player.status';
  readonly playerId: Id;
  readonly connected: boolean;
  readonly alive: boolean;
}

export interface ChatMessageEvent extends Versioned {
  readonly event: 'chat.message';
  readonly messageId: Id;
  readonly playerId: Id;
  readonly playerName: string;
  readonly channel: string;
  readonly content: string;
  readonly timestamp: number;
}

export interface ErrorEvent extends Versioned {
  readonly event: 'error';
  readonly code: ErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly context?: Record<string, unknown>;
}

// Union types for type safety

export type ClientToServerEvent = 
  | { event: 'room.join'; payload: RoomJoinPayload }
  | { event: 'session.resume'; payload: SessionResumePayload }
  | { event: 'action.submit'; payload: ActionSubmitPayload }
  | { event: 'vote.cast'; payload: VoteCastPayload }
  | { event: 'chat.message'; payload: ChatMessagePayload }
  | { event: 'host.action'; payload: HostActionPayload };

export type ServerToClientEvent = 
  | RoomSnapshotEvent
  | PhaseChangeEvent
  | ActionAckEvent
  | VoteUpdateEvent
  | NightPublicResultEvent
  | DetectiveResultEvent
  | LynchResultEvent
  | PlayerStatusEvent
  | ChatMessageEvent
  | ErrorEvent;