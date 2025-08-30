import type { Id, ActionType, Timestamp, Identifiable } from './base.js';

export interface NightAction extends Identifiable, Timestamp {
  readonly actionId: Id;
  readonly playerId: Id;
  readonly type: ActionType;
  readonly targetId: Id;
  readonly submittedAt: number;
  readonly priority: 10 | 20 | 30;
}

export interface Vote extends Identifiable, Timestamp {
  readonly actionId: Id;
  readonly playerId: Id;
  readonly targetId: Id | null; // null = abstain
  readonly submittedAt: number;
}

export interface InvestigationResult {
  readonly targetId: Id;
  readonly isMafia: boolean;
  readonly investigatorId: Id;
}