import type { RoomState, Phase, PhaseTimer } from '@mafia/contracts';
import { checkVictoryCondition, shouldGameEnd } from './victory.js';

/**
 * Phase Management - handles transitions between game phases
 */

/**
 * Advance to the next phase based on current phase and victory conditions
 */
export function advancePhase(state: RoomState): RoomState {
  const currentPhase = state.phase;
  const victoryCondition = checkVictoryCondition(state);
  
  // If game should end, transition to ended phase
  if (shouldGameEnd(victoryCondition)) {
    return {
      ...state,
      phase: 'ended',
      timer: null,
      victoryCondition,
    };
  }
  
  // Normal phase progression
  let nextPhase: Phase;
  let timer: PhaseTimer | null = null;
  
  switch (currentPhase) {
    case 'lobby':
      nextPhase = 'night';
      timer = createPhaseTimer(nextPhase, state.settings.nightDurationMs);
      break;
      
    case 'night':
      nextPhase = 'day';
      timer = createPhaseTimer(nextPhase, state.settings.dayDurationMs);
      break;
      
    case 'day':
      nextPhase = 'vote';
      timer = createPhaseTimer(nextPhase, state.settings.voteDurationMs);
      break;
      
    case 'vote':
      // After voting, check victory again before going to night
      const postVoteVictory = checkVictoryCondition(state);
      if (shouldGameEnd(postVoteVictory)) {
        nextPhase = 'ended';
        timer = null;
      } else {
        nextPhase = 'night';
        timer = createPhaseTimer(nextPhase, state.settings.nightDurationMs);
      }
      break;
      
    case 'ended':
      // Game is over, no further transitions
      return state;
      
    default:
      throw new Error(`Invalid phase transition from: ${currentPhase}`);
  }
  
  return {
    ...state,
    phase: nextPhase,
    timer,
    victoryCondition,
    lastSnapshot: Date.now(),
  };
}

/**
 * Create a phase timer with the specified duration
 */
function createPhaseTimer(phase: Phase, durationMs: number): PhaseTimer {
  const now = Date.now();
  return {
    phase,
    submittedAt: now,
    endsAt: now + durationMs,
  };
}

/**
 * Check if a phase timer has expired
 */
export function isPhaseExpired(state: RoomState): boolean {
  if (!state.timer) {
    return false;
  }
  
  return Date.now() >= state.timer.endsAt;
}

/**
 * Get remaining time in milliseconds for current phase
 */
export function getRemainingPhaseTime(state: RoomState): number {
  if (!state.timer) {
    return 0;
  }
  
  const remaining = state.timer.endsAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Check if all required actions are complete for the current phase
 */
export function arePhaseActionsComplete(state: RoomState): boolean {
  switch (state.phase) {
    case 'lobby':
      // Game starts when host initiates
      return false;
      
    case 'night': {
      // Check if all roles with night actions have submitted
      const alivePlayers = Object.values(state.players).filter(p => p.status === 'alive');
      const playersWithNightActions = alivePlayers.filter(p => {
        // Only mafia and detective have required night actions
        return p.roleId === 'mafia' || p.roleId === 'detective' || p.roleId === 'doctor';
      });
      
      const submittedActionPlayerIds = new Set(
        Object.values(state.nightActions).map(action => action.playerId)
      );
      
      // All players with night actions must submit (or it's optional for doctor)
      return playersWithNightActions.every(p => {
        if (p.roleId === 'doctor') {
          return true; // Doctor action is optional
        }
        return submittedActionPlayerIds.has(p.id);
      });
    }
    
    case 'day':
      // Day phase is for discussion, no required actions
      return false;
      
    case 'vote': {
      // Check if all alive players have voted
      const alivePlayerIds = Object.values(state.players)
        .filter(p => p.status === 'alive')
        .map(p => p.id);
      
      const votedPlayerIds = new Set(Object.values(state.votes).map(v => v.playerId));
      
      return alivePlayerIds.every(id => votedPlayerIds.has(id));
    }
    
    case 'ended':
      return true;
      
    default:
      return false;
  }
}

/**
 * Force phase transition if timer expired or actions complete
 */
export function shouldAdvancePhase(state: RoomState): boolean {
  return isPhaseExpired(state) || arePhaseActionsComplete(state);
}

/**
 * Get phase display information
 */
export interface PhaseInfo {
  readonly phase: Phase;
  readonly displayName: string;
  readonly description: string;
  readonly isNightPhase: boolean;
  readonly allowsChat: boolean;
  readonly allowsVoting: boolean;
  readonly remainingMs: number;
}

export function getPhaseInfo(state: RoomState): PhaseInfo {
  const remainingMs = getRemainingPhaseTime(state);
  
  switch (state.phase) {
    case 'lobby':
      return {
        phase: 'lobby',
        displayName: 'Waiting Room',
        description: 'Waiting for players to join and host to start the game',
        isNightPhase: false,
        allowsChat: true,
        allowsVoting: false,
        remainingMs,
      };
      
    case 'night':
      return {
        phase: 'night',
        displayName: 'Night Phase',
        description: 'Special roles take their actions in secret',
        isNightPhase: true,
        allowsChat: false, // Only mafia chat allowed
        allowsVoting: false,
        remainingMs,
      };
      
    case 'day':
      return {
        phase: 'day',
        displayName: 'Day Phase',
        description: 'Discuss and figure out who the mafia might be',
        isNightPhase: false,
        allowsChat: true,
        allowsVoting: false,
        remainingMs,
      };
      
    case 'vote':
      return {
        phase: 'vote',
        displayName: 'Voting Phase',
        description: 'Vote to eliminate a suspected mafia member',
        isNightPhase: false,
        allowsChat: false,
        allowsVoting: true,
        remainingMs,
      };
      
    case 'ended':
      return {
        phase: 'ended',
        displayName: 'Game Over',
        description: 'The game has ended',
        isNightPhase: false,
        allowsChat: true,
        allowsVoting: false,
        remainingMs: 0,
      };
      
    default:
      throw new Error(`Unknown phase: ${state.phase}`);
  }
}