import type { 
  Id, 
  Phase, 
  VictoryCondition, 
  Identifiable, 
  Timestamp,
  Versioned 
} from './base.js';
import type { Player, PublicPlayer } from './player.js';
import type { NightAction, Vote, InvestigationResult } from './actions.js';

export interface RoomSettings {
  readonly nightDurationMs: number;
  readonly dayDurationMs: number;
  readonly voteDurationMs: number;
  readonly revealRolesOnDeath: boolean;
  readonly anonymousVoting: boolean;
  readonly votingMode: 'majority' | 'plurality';
  readonly minPlayers: number;
  readonly maxPlayers: number;
}

export interface PhaseTimer extends Timestamp {
  readonly phase: Phase;
  readonly endsAt: number;
}

export interface RoomState extends Identifiable, Versioned {
  readonly id: Id;
  readonly code: string;
  readonly hostId: Id;
  readonly phase: Phase;
  readonly timer: PhaseTimer | null;
  readonly settings: RoomSettings;
  readonly players: Record<Id, Player>;
  readonly nightActions: Record<Id, NightAction>;
  readonly votes: Record<Id, Vote>;
  readonly investigationResults: InvestigationResult[];
  readonly publicNarrative: string[];
  readonly victoryCondition: VictoryCondition;
  readonly protocolVersion: number;
  readonly lastSnapshot: number;
}

export interface ClientView extends Versioned {
  readonly roomId: Id;
  readonly code: string;
  readonly phase: Phase;
  readonly timer: PhaseTimer | null;
  readonly settings: RoomSettings;
  readonly players: Record<Id, PublicPlayer>;
  readonly votes?: Record<Id, Vote>; // Only during vote phase or if settings allow
  readonly hostId: Id; // ID of the host player so all players can identify host
  readonly isHost: boolean;
  readonly selfRole: {
    readonly roleId: string;
    readonly alignment: string;
    readonly teammates?: Id[]; // Only for mafia
  };
  readonly investigationResults?: InvestigationResult[]; // Only for detective
  readonly publicNarrative: string[];
  readonly victoryCondition: VictoryCondition;
  readonly protocolVersion: number;
  readonly lockedAction?: {
    readonly type: string;
    readonly targetId: Id;
  };
}