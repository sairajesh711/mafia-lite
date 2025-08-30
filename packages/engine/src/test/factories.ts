import type { 
  RoomState, 
  NightAction, 
  Vote, 
  Player, 
  ActionType, 
  RoleId, 
  Alignment, 
  PlayerStatus, 
  Id 
} from '@mafia/contracts';
import { generateId } from '../utils/id-generator.js';

export const pid = (i: number): Id => `player${i}`;

export const makeAction = <T extends ActionType>(
  type: T, 
  opts: {
    actionId?: Id;
    playerId?: Id;
    targetId?: Id;
    submittedAt?: number;
  } = {}
): NightAction => {
  const priority = type === 'KILL' ? 10 : type === 'PROTECT' ? 20 : 30;
  
  return {
    id: opts.actionId ?? generateId(),
    actionId: opts.actionId ?? generateId(),
    type,
    playerId: opts.playerId ?? pid(1),
    targetId: opts.targetId ?? pid(2),
    priority: priority as 10 | 20 | 30,
    submittedAt: opts.submittedAt ?? Date.now(),
  };
};

export const makeVote = (opts: {
  actionId?: Id;
  playerId?: Id;
  targetId?: Id | null;
  submittedAt?: number;
} = {}): Vote => ({
  id: opts.actionId ?? generateId(),
  actionId: opts.actionId ?? generateId(),
  playerId: opts.playerId ?? pid(1),
  targetId: opts.targetId !== undefined ? opts.targetId : pid(2),
  submittedAt: opts.submittedAt ?? Date.now(),
});

export const makePlayer = (opts: {
  id?: Id;
  name?: string;
  roleId?: RoleId;
  alignment?: Alignment;
  status?: PlayerStatus;
  connected?: boolean;
  afkStrikes?: number;
  sessionId?: string;
} = {}): Player => ({
  id: opts.id ?? pid(1),
  name: opts.name ?? 'Test Player',
  roleId: opts.roleId ?? 'townsperson',
  alignment: opts.alignment ?? 'town',
  status: opts.status ?? 'alive',
  connected: opts.connected ?? true,
  afkStrikes: opts.afkStrikes ?? 0,
  ...(opts.sessionId !== undefined ? { sessionId: opts.sessionId } : {}),
});

export const makeRoomState = (opts: {
  id?: Id;
  players?: Player[];
  nightActions?: Record<Id, NightAction>;
  votes?: Record<Id, Vote>;
  phase?: RoomState['phase'];
} = {}): RoomState => {
  const players: Record<Id, Player> = {};
  
  if (opts.players) {
    for (const player of opts.players) {
      players[player.id] = player;
    }
  } else {
    // Default players
    const defaultPlayers = [
      makePlayer({ id: pid(1), name: 'Player 1', roleId: 'mafia', alignment: 'mafia' }),
      makePlayer({ id: pid(2), name: 'Player 2', roleId: 'detective', alignment: 'town' }),
      makePlayer({ id: pid(3), name: 'Player 3', roleId: 'doctor', alignment: 'town' }),
      makePlayer({ id: pid(4), name: 'Player 4', roleId: 'townsperson', alignment: 'town' }),
    ];
    
    for (const player of defaultPlayers) {
      players[player.id] = player;
    }
  }
  
  return {
    id: opts.id ?? 'test-room',
    code: 'TEST01',
    hostId: pid(1),
    phase: opts.phase ?? 'night',
    timer: {
      phase: opts.phase ?? 'night',
      submittedAt: Date.now(),
      endsAt: Date.now() + 60000,
    },
    settings: {
      nightDurationMs: 60000,
      dayDurationMs: 180000,
      voteDurationMs: 120000,
      revealRolesOnDeath: true,
      anonymousVoting: false,
      votingMode: 'majority',
      minPlayers: 5,
      maxPlayers: 15,
    },
    players,
    nightActions: opts.nightActions ?? {},
    votes: opts.votes ?? {},
    investigationResults: [],
    publicNarrative: [],
    victoryCondition: 'none',
    protocolVersion: 1,
    lastSnapshot: Date.now(),
  };
};