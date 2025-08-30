import type { RoomState, Vote, Id } from '@mafia/contracts';

/**
 * Voting Resolution Results
 */
export interface VotingResult {
  readonly lynchTargetId: Id | null;
  readonly tallies: Record<Id, number>;
  readonly narrative: string;
  readonly updatedState: RoomState;
}

/**
 * Resolves voting with majority rule (default) or plurality
 * Ties result in no lynch under majority rule
 */
export function resolveVoting(state: RoomState): VotingResult {
  const votes = Object.values(state.votes);
  const alivePlayers = Object.values(state.players).filter(p => p.status === 'alive');
  
  // Calculate vote tallies
  const tallies = calculateVoteTallies(votes, alivePlayers.map(p => p.id));
  
  // Determine lynch target based on voting mode
  const lynchTargetId = state.settings.votingMode === 'majority' 
    ? resolveMajorityVote(tallies, alivePlayers.length)
    : resolvePluralityVote(tallies);
    
  // Generate narrative
  const narrative = generateVoteNarrative(lynchTargetId, tallies, state);
  
  // Update state with lynch result
  const updatedPlayers = { ...state.players };
  if (lynchTargetId) {
    const lynchTarget = updatedPlayers[lynchTargetId];
    if (lynchTarget) {
      updatedPlayers[lynchTargetId] = {
        ...lynchTarget,
        status: 'dead',
      };
    }
  }
  
  const updatedState: RoomState = {
    ...state,
    players: updatedPlayers,
    publicNarrative: [...state.publicNarrative, narrative],
    votes: {}, // Clear votes after resolution
  };
  
  return {
    lynchTargetId,
    tallies,
    narrative,
    updatedState,
  };
}

/**
 * Calculate vote tallies, including abstentions
 */
function calculateVoteTallies(votes: Vote[], alivePlayerIds: Id[]): Record<Id, number> {
  const tallies: Record<Id, number> = {};
  
  // Initialize tallies for all alive players
  for (const playerId of alivePlayerIds) {
    tallies[playerId] = 0;
  }
  
  // Count votes (null targetId = abstain)
  for (const vote of votes) {
    if (vote.targetId && tallies[vote.targetId] !== undefined) {
      tallies[vote.targetId] = tallies[vote.targetId]! + 1;
    }
  }
  
  return tallies;
}

/**
 * Resolve majority vote - requires >50% of alive players
 * Returns null on ties or insufficient votes
 */
function resolveMajorityVote(tallies: Record<Id, number>, aliveCount: number): Id | null {
  const majorityThreshold = Math.floor(aliveCount / 2) + 1;
  
  let highestVotes = 0;
  let winnersCount = 0;
  let winner: Id | null = null;
  
  for (const [playerId, voteCount] of Object.entries(tallies)) {
    if (voteCount > highestVotes) {
      highestVotes = voteCount;
      winner = playerId;
      winnersCount = 1;
    } else if (voteCount === highestVotes && voteCount > 0) {
      winnersCount++;
    }
  }
  
  // Must have majority AND no ties
  if (highestVotes >= majorityThreshold && winnersCount === 1) {
    return winner;
  }
  
  return null; // No lynch due to tie or insufficient votes
}

/**
 * Resolve plurality vote - highest vote count wins
 * Returns null only if everyone has 0 votes
 */
function resolvePluralityVote(tallies: Record<Id, number>): Id | null {
  let highestVotes = 0;
  let winner: Id | null = null;
  
  for (const [playerId, voteCount] of Object.entries(tallies)) {
    if (voteCount > highestVotes) {
      highestVotes = voteCount;
      winner = playerId;
    }
  }
  
  return highestVotes > 0 ? winner : null;
}

/**
 * Generate narrative for vote results
 */
function generateVoteNarrative(
  lynchTargetId: Id | null, 
  tallies: Record<Id, number>, 
  state: RoomState
): string {
  if (!lynchTargetId) {
    return 'No one was lynched. The town could not reach a decision.';
  }
  
  const lynchTarget = state.players[lynchTargetId];
  if (!lynchTarget) {
    return 'Lynch target not found.'; // Should never happen
  }
  
  const voteCount = tallies[lynchTargetId] || 0;
  const roleReveal = state.settings.revealRolesOnDeath 
    ? ` They were a ${lynchTarget.roleId}.`
    : '';
  
  return `${lynchTarget.name} was lynched with ${voteCount} votes.${roleReveal}`;
}

/**
 * Validates that a vote is legal
 */
export function validateVote(
  state: RoomState, 
  vote: Vote
): { valid: boolean; error?: string } {
  const voter = state.players[vote.playerId];
  
  if (!voter) {
    return { valid: false, error: 'Voter not found' };
  }
  
  if (voter.status !== 'alive') {
    return { valid: false, error: 'Dead players cannot vote' };
  }
  
  // Null targetId = abstain (always valid)
  if (vote.targetId === null) {
    return { valid: true };
  }
  
  const target = state.players[vote.targetId];
  if (!target) {
    return { valid: false, error: 'Vote target not found' };
  }
  
  if (target.status !== 'alive') {
    return { valid: false, error: 'Cannot vote for dead players' };
  }
  
  return { valid: true };
}

/**
 * Check if all alive players have voted
 */
export function allPlayersVoted(state: RoomState): boolean {
  const alivePlayerIds = Object.values(state.players)
    .filter(p => p.status === 'alive')
    .map(p => p.id);
  
  const votedPlayerIds = new Set(Object.values(state.votes).map(v => v.playerId));
  
  return alivePlayerIds.every(id => votedPlayerIds.has(id));
}

/**
 * Get current vote tallies for live display
 */
export function getCurrentTallies(state: RoomState): Record<Id, number> {
  const votes = Object.values(state.votes);
  const alivePlayerIds = Object.values(state.players)
    .filter(p => p.status === 'alive')
    .map(p => p.id);
    
  return calculateVoteTallies(votes, alivePlayerIds);
}