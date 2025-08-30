import type { ActionType, Alignment, Phase, Id, RoleId } from './base.js';
import type { RoomState, ClientView } from './room.js';
import type { NightAction } from './actions.js';

export interface TargetRule {
  readonly allowSelf?: boolean;
  readonly allowAlive?: boolean;
  readonly allowDead?: boolean;
  readonly filter?: 'nonMafia' | 'anyAlive';
  readonly predicate?: (ctx: Readonly<RoomState>, actorId: Id, targetId: Id) => boolean;
}

export interface ActionConfig {
  readonly type: ActionType;
  readonly priority?: 10 | 20 | 30; // KILL=10, PROTECT=20, INVESTIGATE=30
  readonly maxTargets?: number;
  readonly targetRequired?: boolean;
}

export interface VisibilityConfig {
  readonly knowsTeammates?: boolean;
  readonly seesVoteTallies?: 'live' | 'final' | 'none';
}

export interface ChatConfig {
  readonly canSpeak: (ctx: { 
    phase: Phase; 
    channel: 'day' | 'nightMafia' | 'dead' | 'lobby'; 
    isAlive: boolean; 
    alignment: Alignment;
  }) => boolean;
}

export interface VotingConfig {
  readonly canVote: boolean;
  readonly weight?: number;
}

export interface WinCondition {
  readonly type: 'elimination' | 'survival';
  readonly target?: Alignment[];
  readonly description: string;
}

export interface AiAgentConfig {
  readonly decideNightAction?: (view: ClientView) => Promise<Omit<NightAction, 'priority' | 'submittedAt'>>;
  readonly decideDayVote?: (view: ClientView) => Promise<{ targetId: Id | null }>;
}

export interface RoleConfig {
  readonly id: RoleId;
  readonly alignment: Alignment;
  readonly night?: ActionConfig;
  readonly day?: { actions?: ActionConfig[] };
  readonly targets?: TargetRule;
  readonly visibility: VisibilityConfig;
  readonly chat: ChatConfig;
  readonly voting: VotingConfig;
  readonly onApplyMeta?: (state: RoomState, action: NightAction) => void;
  readonly ai?: AiAgentConfig;
  
  // New fields for better player experience
  readonly startingKnowledge?: string[];
  readonly winCondition?: WinCondition;
}

// Forward declarations for circular dependency resolution
// These are resolved by actual imports in consuming modules