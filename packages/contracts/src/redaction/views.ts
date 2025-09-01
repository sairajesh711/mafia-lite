import type { RoomState, ClientView } from '../types/room.js';
import type { Player, PublicPlayer } from '../types/player.js';
import type { Id, RoleId } from '../types/base.js';
import { PROTOCOL_VERSION } from '../schemas/base.js';

/**
 * Redacts server state to create a client-safe view for a specific player.
 * This is the single source of truth for what information each player can see.
 */
export function createClientView(
  state: RoomState, 
  playerId: Id
): ClientView {
  const player = state.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} not found in room ${state.id}`);
  }

  // Create redacted player views
  const publicPlayers: Record<Id, PublicPlayer> = {};
  for (const [id, p] of Object.entries(state.players)) {
    publicPlayers[id] = {
      id: p.id,
      name: p.name,
      status: p.status,
      connected: p.connected,
      // Only reveal role if settings allow OR if it's the viewing player
      ...(((state.settings.revealRolesOnDeath && p.status === 'dead') || id === playerId) 
        ? { roleId: p.roleId } 
        : {}),
    };
  }

  // Determine what votes the player can see
  let visibleVotes: Record<Id, typeof state.votes[Id]> | undefined;
  if (state.phase === 'day_voting') {
    // During vote phase, show live votes unless anonymous voting is enabled
    visibleVotes = state.settings.anonymousVoting ? undefined : state.votes;
  } else if (state.phase === 'ended' || ((state.phase === 'day_announcement' || state.phase === 'day_discussion') && Object.keys(state.votes).length > 0)) {
    // After voting ends, show final results
    visibleVotes = state.votes;
  }

  // Determine teammate awareness for mafia
  let teammates: Id[] | undefined;
  if (player.alignment === 'mafia') {
    teammates = Object.values(state.players)
      .filter(p => p.alignment === 'mafia' && p.id !== playerId)
      .map(p => p.id);
  }

  // Detective sees their own investigation results
  let investigationResults = undefined;
  if (player.roleId === 'detective') {
    investigationResults = state.investigationResults.filter(
      result => result.investigatorId === playerId
    );
  }

  // Determine if player has a locked action
  let lockedAction = undefined;
  const playerAction = state.nightActions[playerId];
  if (playerAction && state.phase === 'night') {
    lockedAction = {
      type: playerAction.type,
      targetId: playerAction.targetId,
    };
  }

  const baseView = {
    roomId: state.id,
    code: state.code,
    phase: state.phase,
    timer: state.timer,
    settings: state.settings,
    players: publicPlayers,
    hostId: state.hostId, // Include hostId so all players can see who the host is
    isHost: playerId === state.hostId,
    selfRole: {
      roleId: player.roleId,
      alignment: player.alignment,
      ...(teammates !== undefined ? { teammates } : {}),
    },
    publicNarrative: [...state.publicNarrative], // Copy array for safety
    victoryCondition: state.victoryCondition,
    protocolVersion: PROTOCOL_VERSION,
  };

  console.log('🔍 ClientView DEBUG:', { 
    forPlayer: playerId, 
    roomId: state.id,
    stateHostId: state.hostId, 
    resultHostId: baseView.hostId, 
    resultIsHost: baseView.isHost,
    hasHostId: !!state.hostId,
    hostIdType: typeof state.hostId
  });

  return {
    ...baseView,
    ...(visibleVotes !== undefined ? { votes: visibleVotes } : {}),
    ...(investigationResults !== undefined ? { investigationResults } : {}),
    ...(lockedAction !== undefined ? { lockedAction } : {}),
  } as ClientView;
}

/**
 * Validates that a client view doesn't leak sensitive information.
 * Used in development to ensure redaction is working correctly.
 */
export function validateClientViewSafety(view: ClientView, playerId: Id): void {
  // Verify no other player's role is exposed (unless settings allow)
  for (const [id, player] of Object.entries(view.players)) {
    if (id !== playerId && player.roleId && player.status === 'alive') {
      throw new Error(`Client view leaked role for alive player ${id}`);
    }
  }

  // Verify no investigation results from other detectives
  if (view.investigationResults) {
    const invalidResults = view.investigationResults.filter(
      result => result.investigatorId !== playerId
    );
    if (invalidResults.length > 0) {
      throw new Error('Client view leaked investigation results from other detectives');
    }
  }

  // Verify teammates are only visible to mafia
  if (view.selfRole.teammates && view.selfRole.alignment !== 'mafia') {
    throw new Error('Client view leaked teammates to non-mafia player');
  }
}