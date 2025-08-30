import type { RoomState, VictoryCondition } from '@mafia/contracts';

/**
 * Victory Condition Checker
 * 
 * Checks victory conditions immediately after:
 * - Night resolution
 * - Day lynch resolution
 */

/**
 * Check victory conditions and return the result
 */
export function checkVictoryCondition(state: RoomState): VictoryCondition {
  const alivePlayers = Object.values(state.players).filter(p => p.status === 'alive');
  
  const aliveMafia = alivePlayers.filter(p => p.alignment === 'mafia');
  const aliveTown = alivePlayers.filter(p => p.alignment === 'town');
  const aliveNeutral = alivePlayers.filter(p => p.alignment === 'neutral');
  
  // Mafia victory: Mafia count >= Town count
  if (aliveMafia.length >= aliveTown.length + aliveNeutral.length) {
    return 'mafia-victory';
  }
  
  // Town victory: All mafia eliminated
  if (aliveMafia.length === 0) {
    return 'town-victory';
  }
  
  // Game continues
  return 'none';
}

/**
 * Generate victory narrative for the end game
 */
export function generateVictoryNarrative(
  condition: VictoryCondition,
  state: RoomState
): string {
  const alivePlayers = Object.values(state.players).filter(p => p.status === 'alive');
  const aliveMafia = alivePlayers.filter(p => p.alignment === 'mafia');
  const aliveTown = alivePlayers.filter(p => p.alignment === 'town');
  
  switch (condition) {
    case 'mafia-victory':
      if (aliveMafia.length === 1) {
        return `The Mafia wins! ${aliveMafia[0]?.name || 'The last mafia member'} has taken control of the town.`;
      } else {
        const mafiaNames = aliveMafia.map(p => p.name).join(' and ');
        return `The Mafia wins! ${mafiaNames} have taken control of the town.`;
      }
      
    case 'town-victory':
      return `The Town wins! All mafia members have been eliminated. Justice prevails!`;
      
    case 'none':
      return 'The game continues...';
      
    default:
      return 'Game ended.';
  }
}

/**
 * Check if the game should end based on victory conditions
 */
export function shouldGameEnd(condition: VictoryCondition): boolean {
  return condition !== 'none';
}

/**
 * Get game statistics for end-game summary
 */
export interface GameStats {
  readonly totalPlayers: number;
  readonly mafiaPlayers: string[];
  readonly townPlayers: string[];
  readonly deadPlayers: string[];
  readonly winner: 'mafia' | 'town' | 'none';
  readonly gameLength: {
    readonly phases: number;
    readonly durationMs?: number;
  };
}

export function generateGameStats(
  state: RoomState,
  startTime?: number
): GameStats {
  const allPlayers = Object.values(state.players);
  const condition = checkVictoryCondition(state);
  
  return {
    totalPlayers: allPlayers.length,
    mafiaPlayers: allPlayers
      .filter(p => p.alignment === 'mafia')
      .map(p => p.name),
    townPlayers: allPlayers
      .filter(p => p.alignment === 'town')
      .map(p => p.name),
    deadPlayers: allPlayers
      .filter(p => p.status === 'dead')
      .map(p => p.name),
    winner: condition === 'mafia-victory' ? 'mafia' 
          : condition === 'town-victory' ? 'town' 
          : 'none',
    gameLength: {
      phases: state.publicNarrative.length,
      ...(startTime !== undefined ? { durationMs: Date.now() - startTime } : {}),
    },
  };
}