import { describe, it, expect } from 'vitest';
import { resolveVoting, validateVote, allPlayersVoted } from './voting.js';
import { makeRoomState, makeVote, makePlayer, pid } from '../test/factories.js';

describe('Voting Resolution', () => {
  it('should lynch player with majority votes', () => {
    const state = makeRoomState({
      phase: 'day_voting',
      players: [
        makePlayer({ id: 'p1', name: 'Player1' }),
        makePlayer({ id: 'p2', name: 'Player2' }),
        makePlayer({ id: 'p3', name: 'Player3' }),
        makePlayer({ id: 'p4', name: 'Player4' }),
        makePlayer({ id: 'p5', name: 'Player5' }),
      ],
      votes: {
        vote1: makeVote({ playerId: 'p1', targetId: 'p2' }),
        vote2: makeVote({ playerId: 'p3', targetId: 'p2' }),
        vote3: makeVote({ playerId: 'p4', targetId: 'p2' }),
        vote4: makeVote({ playerId: 'p5', targetId: 'p1' }),
        // p2 abstains
      },
    });

    const result = resolveVoting(state);

    expect(result.lynchTargetId).toBe('p2');
    expect(result.tallies.p2).toBe(3);
    expect(result.updatedState.players.p2?.status).toBe('dead');
    expect(result.narrative).toContain('Player2 was lynched with 3 votes');
  });

  it('should result in no lynch on tie with majority voting', () => {
    const state = makeRoomState({
      phase: 'day_voting',
      players: [
        makePlayer({ id: 'p1', name: 'Player1' }),
        makePlayer({ id: 'p2', name: 'Player2' }),
        makePlayer({ id: 'p3', name: 'Player3' }),
        makePlayer({ id: 'p4', name: 'Player4' }),
      ],
      votes: {
        vote1: makeVote({ playerId: 'p1', targetId: 'p2' }),
        vote2: makeVote({ playerId: 'p2', targetId: 'p1' }),
        vote3: makeVote({ playerId: 'p3', targetId: 'p2' }),
        vote4: makeVote({ playerId: 'p4', targetId: 'p1' }),
      },
    });

    const result = resolveVoting(state);

    expect(result.lynchTargetId).toBeNull();
    expect(result.narrative).toContain('No one was lynched');
  });

  it('should work with plurality voting', () => {
    const players = [
      makePlayer({ id: 'p1', name: 'Player1' }),
      makePlayer({ id: 'p2', name: 'Player2' }),
      makePlayer({ id: 'p3', name: 'Player3' }),
      makePlayer({ id: 'p4', name: 'Player4' }),
    ];

    const state = makeRoomState({
      phase: 'day_voting',
      players,
    });

    // Override settings for plurality voting
    const stateWithPluralityVoting = {
      ...state,
      settings: { ...state.settings, votingMode: 'plurality' as const },
      votes: {
        vote1: makeVote({ playerId: 'p1', targetId: 'p2' }),
        vote2: makeVote({ playerId: 'p2', targetId: 'p1' }),
        vote3: makeVote({ playerId: 'p3', targetId: 'p2' }),
        vote4: makeVote({ playerId: 'p4', targetId: 'p3' }),
      },
    };

    const result = resolveVoting(stateWithPluralityVoting);

    // Player2 should win with 2 votes (plurality)
    expect(result.lynchTargetId).toBe('p2');
    expect(result.tallies.p2).toBe(2);
  });

  it('should validate votes correctly', () => {
    const state = makeRoomState({
      players: [
        makePlayer({ id: 'p1', name: 'Player1', status: 'alive' }),
        makePlayer({ id: 'p2', name: 'Player2', status: 'dead' }),
      ],
    });

    // Invalid vote - voting for dead player
    const invalidVote = makeVote({ playerId: 'p1', targetId: 'p2' });
    const invalidResult = validateVote(state, invalidVote);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('Cannot vote for dead players');

    // Valid abstention
    const abstainVote = makeVote({ playerId: 'p1', targetId: null });
    expect(validateVote(state, abstainVote).valid).toBe(true);
  });

  it('should detect when all players have voted', () => {
    const state = makeRoomState({
      players: [
        makePlayer({ id: 'p1', name: 'Player1' }),
        makePlayer({ id: 'p2', name: 'Player2' }),
        makePlayer({ id: 'p3', name: 'Player3', status: 'dead' }),
      ],
    });

    // Only p1 and p2 are alive, p3 is dead
    expect(allPlayersVoted(state)).toBe(false);

    const stateWithOneVote = {
      ...state,
      votes: {
        vote1: makeVote({ playerId: 'p1', targetId: 'p2' }),
      },
    };
    expect(allPlayersVoted(stateWithOneVote)).toBe(false);

    const stateWithAllVotes = {
      ...state,
      votes: {
        vote1: makeVote({ playerId: 'p1', targetId: 'p2' }),
        vote2: makeVote({ playerId: 'p2', targetId: null }), // abstain
      },
    };
    expect(allPlayersVoted(stateWithAllVotes)).toBe(true);
  });
});