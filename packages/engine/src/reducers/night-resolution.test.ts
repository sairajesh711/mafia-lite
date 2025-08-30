import { describe, it, expect } from 'vitest';
import { resolveNightActions, validateNightAction } from './night-resolution.js';
import { makeRoomState, makeAction, makePlayer, pid } from '../test/factories.js';

describe('Night Resolution', () => {
  it('should kill a player when mafia targets them and no doctor protects', () => {
    const state = makeRoomState({
      players: [
        makePlayer({ id: 'mafia1', name: 'Mafia', roleId: 'mafia', alignment: 'mafia' }),
        makePlayer({ id: 'town1', name: 'Town', roleId: 'townsperson', alignment: 'town' }),
      ],
      nightActions: {
        kill1: makeAction('KILL', { playerId: 'mafia1', targetId: 'town1' }),
      },
    });

    const result = resolveNightActions(state);

    expect(result.killedPlayerId).toBe('town1');
    expect(result.updatedState.players.town1?.status).toBe('dead');
    expect(result.narrative).toContain('Town was eliminated during the night');
  });

  it('should cancel kill when doctor protects the same target', () => {
    const state = makeRoomState({
      players: [
        makePlayer({ id: 'mafia1', name: 'Mafia', roleId: 'mafia', alignment: 'mafia' }),
        makePlayer({ id: 'doctor1', name: 'Doctor', roleId: 'doctor', alignment: 'town' }),
        makePlayer({ id: 'town1', name: 'Town', roleId: 'townsperson', alignment: 'town' }),
      ],
      nightActions: {
        kill1: makeAction('KILL', { playerId: 'mafia1', targetId: 'town1' }),
        protect1: makeAction('PROTECT', { playerId: 'doctor1', targetId: 'town1' }),
      },
    });

    const result = resolveNightActions(state);

    expect(result.killedPlayerId).toBeUndefined();
    expect(result.updatedState.players.town1?.status).toBe('alive');
    expect(result.narrative).toContain('No one died during the night');
  });

  it('should allow detective to investigate and get correct result', () => {
    const state = makeRoomState({
      players: [
        makePlayer({ id: 'detective1', name: 'Detective', roleId: 'detective', alignment: 'town' }),
        makePlayer({ id: 'mafia1', name: 'Mafia', roleId: 'mafia', alignment: 'mafia' }),
      ],
      nightActions: {
        investigate1: makeAction('INVESTIGATE', { playerId: 'detective1', targetId: 'mafia1' }),
      },
    });

    const result = resolveNightActions(state);

    expect(result.investigationResults).toHaveLength(1);
    expect(result.investigationResults[0]).toEqual({
      targetId: 'mafia1',
      isMafia: true,
      investigatorId: 'detective1',
    });
  });

  it('should validate night actions correctly', () => {
    const state = makeRoomState({
      players: [
        makePlayer({ id: 'mafia1', name: 'Mafia', roleId: 'mafia', alignment: 'mafia' }),
        makePlayer({ id: 'town1', name: 'Town', roleId: 'townsperson', alignment: 'town' }),
      ],
    });

    // Valid action
    const validAction = makeAction('KILL', { playerId: 'mafia1', targetId: 'town1' });
    expect(validateNightAction(state, validAction).valid).toBe(true);

    // Invalid action - townsperson trying to kill
    const invalidAction = makeAction('KILL', { playerId: 'town1', targetId: 'mafia1' });
    const result = validateNightAction(state, invalidAction);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid action for role');
  });
});