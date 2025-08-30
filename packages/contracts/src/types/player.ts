import type { Id, RoleId, Alignment, PlayerStatus, Identifiable } from './base.js';

export interface Player extends Identifiable {
  readonly id: Id;
  readonly name: string;
  readonly roleId: RoleId;
  readonly alignment: Alignment;
  readonly status: PlayerStatus;
  readonly connected: boolean;
  readonly afkStrikes: number;
  readonly sessionId?: string;
}

export interface PublicPlayer extends Identifiable {
  readonly id: Id;
  readonly name: string;
  readonly status: PlayerStatus;
  readonly connected: boolean;
  readonly roleId?: RoleId; // Only revealed if room setting allows
}