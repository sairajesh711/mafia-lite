import type { RoomState, NightAction, Vote, Player, Id, ErrorCode } from '@mafia/contracts';
import { getRoleConfig } from '@mafia/engine';

export interface PolicyViolation {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export interface PolicyResult {
  valid: boolean;
  violation?: PolicyViolation;
}

export class PolicyService {
  /**
   * Validate night action against phase/target/role rules
   */
  static validateNightAction(state: RoomState, action: NightAction): PolicyResult {
    // Phase validation
    if (state.phase !== 'night') {
      return {
        valid: false,
        violation: {
          code: 'WRONG_PHASE',
          message: 'Night actions can only be submitted during night phase',
          retryable: false,
        },
      };
    }

    // Actor validation
    const actor = state.players[action.playerId];
    if (!actor) {
      return {
        valid: false,
        violation: {
          code: 'UNAUTHORIZED',
          message: 'Player not found in room',
          retryable: false,
        },
      };
    }

    if (actor.status !== 'alive') {
      return {
        valid: false,
        violation: {
          code: 'DEAD_PLAYER',
          message: 'Dead players cannot take night actions',
          retryable: false,
        },
      };
    }

    // Target validation
    const target = state.players[action.targetId];
    if (!target) {
      return {
        valid: false,
        violation: {
          code: 'INVALID_TARGET',
          message: 'Target player not found',
          retryable: false,
        },
      };
    }

    if (target.status !== 'alive') {
      return {
        valid: false,
        violation: {
          code: 'INVALID_TARGET',
          message: 'Cannot target dead players',
          retryable: false,
        },
      };
    }

    // Role-specific validation
    const roleConfig = getRoleConfig(actor.roleId);
    
    // Check if role has night action
    if (!roleConfig.night || roleConfig.night.type !== action.type) {
      return {
        valid: false,
        violation: {
          code: 'UNAUTHORIZED',
          message: `Role ${actor.roleId} cannot perform ${action.type} action`,
          retryable: false,
        },
      };
    }

    // Target rules validation
    if (roleConfig.targets) {
      const rules = roleConfig.targets;

      // Self-targeting check
      if (!rules.allowSelf && action.playerId === action.targetId) {
        return {
          valid: false,
          violation: {
            code: 'INVALID_TARGET',
            message: 'Cannot target yourself',
            retryable: true,
          },
        };
      }

      // Mafia targeting rules (cannot target mafia)
      if (rules.filter === 'nonMafia' && target.alignment === 'mafia') {
        return {
          valid: false,
          violation: {
            code: 'INVALID_TARGET',
            message: 'Cannot target mafia members',
            retryable: true,
          },
        };
      }
    }

    // Doctor-specific rule: can heal same target on consecutive nights (per spec)
    // No validation needed here since it's explicitly allowed

    return { valid: true };
  }

  /**
   * Validate vote against phase/target/player rules
   */
  static validateVote(state: RoomState, vote: Vote): PolicyResult {
    // Phase validation
    if (state.phase !== 'vote') {
      return {
        valid: false,
        violation: {
          code: 'WRONG_PHASE',
          message: 'Votes can only be cast during voting phase',
          retryable: false,
        },
      };
    }

    // Voter validation
    const voter = state.players[vote.playerId];
    if (!voter) {
      return {
        valid: false,
        violation: {
          code: 'UNAUTHORIZED',
          message: 'Player not found in room',
          retryable: false,
        },
      };
    }

    if (voter.status !== 'alive') {
      return {
        valid: false,
        violation: {
          code: 'DEAD_PLAYER',
          message: 'Dead players cannot vote',
          retryable: false,
        },
      };
    }

    // Abstain is always valid (targetId = null)
    if (vote.targetId === null) {
      return { valid: true };
    }

    // Target validation for non-abstain votes
    const target = state.players[vote.targetId];
    if (!target) {
      return {
        valid: false,
        violation: {
          code: 'INVALID_TARGET',
          message: 'Vote target not found',
          retryable: true,
        },
      };
    }

    if (target.status !== 'alive') {
      return {
        valid: false,
        violation: {
          code: 'INVALID_TARGET',
          message: 'Cannot vote for dead players',
          retryable: true,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Check if player can take host actions
   */
  static validateHostAction(state: RoomState, playerId: Id): PolicyResult {
    const player = state.players[playerId];
    if (!player) {
      return {
        valid: false,
        violation: {
          code: 'UNAUTHORIZED',
          message: 'Player not found in room',
          retryable: false,
        },
      };
    }

    if (playerId !== state.hostId) {
      return {
        valid: false,
        violation: {
          code: 'UNAUTHORIZED',
          message: 'Only the host can perform this action',
          retryable: false,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Check if game can be started
   */
  static validateGameStart(state: RoomState): PolicyResult {
    if (state.phase !== 'lobby') {
      return {
        valid: false,
        violation: {
          code: 'WRONG_PHASE',
          message: 'Game has already started',
          retryable: false,
        },
      };
    }

    const playerCount = Object.keys(state.players).length;
    if (playerCount < state.settings.minPlayers) {
      return {
        valid: false,
        violation: {
          code: 'WRONG_PHASE',
          message: `Need at least ${state.settings.minPlayers} players to start`,
          retryable: true,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Update AFK strikes for a player
   */
  static updateAFKStrikes(
    state: RoomState, 
    playerId: Id, 
    phase: 'night' | 'vote'
  ): RoomState {
    const player = state.players[playerId];
    if (!player || player.status !== 'alive') {
      return state;
    }

    const updatedPlayer: Player = {
      ...player,
      afkStrikes: Math.min(player.afkStrikes + 1, 3), // Cap at 3 strikes
    };

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: updatedPlayer,
      },
    };
  }

  /**
   * Get players who should receive AFK strikes for missing night actions
   */
  static getPlayersWithMissingNightActions(state: RoomState): Id[] {
    if (state.phase !== 'night') return [];

    const alivePlayers = Object.values(state.players).filter(p => p.status === 'alive');
    const submittedActionPlayerIds = new Set(
      Object.values(state.nightActions).map(action => action.playerId)
    );

    const missingActions: Id[] = [];

    for (const player of alivePlayers) {
      const roleConfig = getRoleConfig(player.roleId);
      
      // Only required actions count for AFK (mafia and detective must act)
      if (roleConfig.night && 
          (player.roleId === 'mafia' || player.roleId === 'detective') &&
          !submittedActionPlayerIds.has(player.id)) {
        missingActions.push(player.id);
      }
    }

    return missingActions;
  }

  /**
   * Get players who should receive AFK strikes for not voting
   */
  static getPlayersWithMissingVotes(state: RoomState): Id[] {
    if (state.phase !== 'vote') return [];

    const alivePlayerIds = Object.values(state.players)
      .filter(p => p.status === 'alive')
      .map(p => p.id);

    const votedPlayerIds = new Set(Object.values(state.votes).map(v => v.playerId));

    return alivePlayerIds.filter(id => !votedPlayerIds.has(id));
  }
}