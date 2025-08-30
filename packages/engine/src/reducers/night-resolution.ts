import type { 
  RoomState, 
  NightAction, 
  InvestigationResult,
  Id,
  Player
} from '@mafia/contracts';
import { getRoleConfig } from '../roles/registry.js';

/**
 * Night Resolution Results
 */
export interface NightResolutionResult {
  readonly killedPlayerId: Id | undefined;
  readonly investigationResults: InvestigationResult[];
  readonly narrative: string;
  readonly updatedState: RoomState;
}

/**
 * Resolves all night actions in deterministic priority order:
 * KILL (10) → PROTECT (20) → INVESTIGATE (30)
 * 
 * This is the core of the game engine - pure, deterministic, and testable.
 */
export function resolveNightActions(state: RoomState): NightResolutionResult {
  const actions = Object.values(state.nightActions);
  
  // Sort by priority (ascending: KILL=10, PROTECT=20, INVESTIGATE=30)
  const sortedActions = [...actions].sort((a, b) => a.priority - b.priority);
  
  let killedPlayerId: Id | undefined;
  const investigationResults: InvestigationResult[] = [];
  const narrativeParts: string[] = [];
  
  // Process each action type in priority order
  for (const action of sortedActions) {
    switch (action.type) {
      case 'KILL':
        killedPlayerId = processKillAction(state, action);
        break;
        
      case 'PROTECT':
        killedPlayerId = processProtectAction(state, action, killedPlayerId);
        break;
        
      case 'INVESTIGATE':
        const result = processInvestigateAction(state, action);
        if (result) {
          investigationResults.push(result);
        }
        break;
    }
  }
  
  // Generate public narrative
  if (killedPlayerId) {
    const killedPlayer = state.players[killedPlayerId];
    if (killedPlayer) {
      narrativeParts.push(`${killedPlayer.name} was eliminated during the night.`);
    }
  } else {
    narrativeParts.push('No one died during the night.');
  }
  
  // Create updated state
  const updatedPlayers = { ...state.players };
  if (killedPlayerId) {
    updatedPlayers[killedPlayerId] = {
      ...updatedPlayers[killedPlayerId]!,
      status: 'dead',
    };
  }
  
  const updatedState: RoomState = {
    ...state,
    players: updatedPlayers,
    investigationResults: [...state.investigationResults, ...investigationResults],
    publicNarrative: [...state.publicNarrative, ...narrativeParts],
    nightActions: {}, // Clear actions after resolution
  };
  
  return {
    killedPlayerId,
    investigationResults,
    narrative: narrativeParts.join(' '),
    updatedState,
  };
}

/**
 * Process KILL action (priority 10)
 */
function processKillAction(state: RoomState, action: NightAction): Id | undefined {
  const target = state.players[action.targetId];
  
  // Validate target exists and is alive
  if (!target || target.status !== 'alive') {
    return undefined;
  }
  
  // Validate actor is mafia and alive
  const actor = state.players[action.playerId];
  if (!actor || actor.status !== 'alive' || actor.alignment !== 'mafia') {
    return undefined;
  }
  
  // Queue the kill (can be cancelled by protect)
  return action.targetId;
}

/**
 * Process PROTECT action (priority 20) - can cancel a queued kill
 */
function processProtectAction(
  state: RoomState, 
  action: NightAction, 
  queuedKillTarget?: Id
): Id | undefined {
  const target = state.players[action.targetId];
  const actor = state.players[action.playerId];
  
  // Validate target exists and is alive
  if (!target || target.status !== 'alive') {
    return queuedKillTarget;
  }
  
  // Validate actor is doctor and alive
  if (!actor || actor.status !== 'alive' || actor.roleId !== 'doctor') {
    return queuedKillTarget;
  }
  
  // If protecting the same target as queued kill, cancel the kill
  if (queuedKillTarget === action.targetId) {
    return undefined; // Kill is cancelled
  }
  
  // No change to queued kill
  return queuedKillTarget;
}

/**
 * Process INVESTIGATE action (priority 30)
 */
function processInvestigateAction(
  state: RoomState, 
  action: NightAction
): InvestigationResult | undefined {
  const target = state.players[action.targetId];
  const actor = state.players[action.playerId];
  
  // Validate target exists and is alive
  if (!target || target.status !== 'alive') {
    return undefined;
  }
  
  // Validate actor is detective and alive
  if (!actor || actor.status !== 'alive' || actor.roleId !== 'detective') {
    return undefined;
  }
  
  // Generate investigation result
  return {
    targetId: action.targetId,
    isMafia: target.alignment === 'mafia',
    investigatorId: action.playerId,
  };
}

/**
 * Validates that a night action is legal according to role rules
 */
export function validateNightAction(
  state: RoomState, 
  action: NightAction
): { valid: boolean; error?: string } {
  const actor = state.players[action.playerId];
  const target = state.players[action.targetId];
  
  if (!actor) {
    return { valid: false, error: 'Actor not found' };
  }
  
  if (!target) {
    return { valid: false, error: 'Target not found' };
  }
  
  if (actor.status !== 'alive') {
    return { valid: false, error: 'Dead players cannot act' };
  }
  
  const roleConfig = getRoleConfig(actor.roleId);
  
  // Check if role has night action
  if (!roleConfig.night || roleConfig.night.type !== action.type) {
    return { valid: false, error: 'Invalid action for role' };
  }
  
  // Check targeting rules
  if (roleConfig.targets) {
    const rules = roleConfig.targets;
    
    if (!rules.allowSelf && action.playerId === action.targetId) {
      return { valid: false, error: 'Cannot target self' };
    }
    
    if (!rules.allowAlive && target.status === 'alive') {
      return { valid: false, error: 'Cannot target alive players' };
    }
    
    if (!rules.allowDead && target.status === 'dead') {
      return { valid: false, error: 'Cannot target dead players' };
    }
    
    if (rules.filter === 'nonMafia' && target.alignment === 'mafia') {
      return { valid: false, error: 'Cannot target mafia members' };
    }
  }
  
  return { valid: true };
}