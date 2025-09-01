import { createClient } from 'redis';
import type { Player, Id } from '@mafia/contracts';
import { RoomStateSchema, type RoomState } from '@mafia/contracts';
import { generateId, generateRoomCode } from '@mafia/engine';
import { getDefaultRoleDistribution } from '@mafia/engine';

export class RoomService {
  private inMemoryRooms = new Map<string, RoomState>();
  private inMemoryCodes = new Map<string, string>();

  constructor(private redis: ReturnType<typeof createClient> | null) {}

  /**
   * Create a new room with the given host
   */
  async createRoom(hostId: Id, hostName: string): Promise<{ roomId: Id; code: string }> {
    const roomId = generateId();
    const code = generateRoomCode();
    
    if (this.redis) {
      // Reserve the room code
      const codeReserved = await this.redis.setNX(`room_code:${code}`, roomId);
      if (!codeReserved) {
        // Code collision, try again (very rare)
        return this.createRoom(hostId, hostName);
      }
      
      // Set expiration on room code (same as room - 24 hours)
      await this.redis.expire(`room_code:${code}`, 86400);
    } else {
      // In-memory fallback
      if (this.inMemoryCodes.has(code)) {
        return this.createRoom(hostId, hostName);
      }
      this.inMemoryCodes.set(code, roomId);
    }
    
    // Create initial room state
    const hostPlayer: Player = {
      id: hostId,
      name: hostName,
      roleId: 'townsperson', // Will be reassigned when game starts
      alignment: 'town',
      status: 'alive',
      connected: true,
      afkStrikes: 0,
    };
    
    const initialState: RoomState = {
      id: roomId,
      code,
      hostId,
      phase: 'lobby',
      timer: null,
      settings: {
        nightDurationMs: 90000,  // 90 seconds
        dayDurationMs: 300000,   // 5 minutes
        voteDurationMs: 120000,  // 2 minutes
        revealRolesOnDeath: true,
        anonymousVoting: false,
        votingMode: 'majority',
        minPlayers: 5,
        maxPlayers: 15,
      },
      players: { [hostId]: hostPlayer },
      nightActions: {},
      votes: {},
      investigationResults: [],
      publicNarrative: [],
      victoryCondition: 'none',
      protocolVersion: 1,
      lastSnapshot: Date.now(),
    };
    
    // Store room state
    if (this.redis) {
      await this.redis.hSet(`room:${roomId}`, {
        state: JSON.stringify(initialState),
        code,
        hostId,
        createdAt: Date.now().toString(),
      });
      
      // Set expiration on room (24 hours)
      await this.redis.expire(`room:${roomId}`, 86400);
    } else {
      // In-memory fallback - VALIDATE with schema to ensure hostId is preserved
      const validatedState = RoomStateSchema.parse(initialState);
      console.log('DEBUG: Storing validated room state in memory:', { 
        roomId, 
        hostId: validatedState.hostId, 
        code,
        hasHostId: !!validatedState.hostId 
      });
      this.inMemoryRooms.set(roomId, validatedState);
    }
    
    return { roomId, code };
  }

  /**
   * Find room by code
   */
  async findRoomByCode(code: string): Promise<Id | null> {
    if (this.redis) {
      const roomId = await this.redis.get(`room_code:${code}`);
      return roomId;
    } else {
      return this.inMemoryCodes.get(code) || null;
    }
  }

  /**
   * Get room state
   */
  async getRoomState(roomId: Id): Promise<RoomState | null> {
    if (this.redis) {
      const roomData = await this.redis.hGet(`room:${roomId}`, 'state');
      if (!roomData) return null;
      return JSON.parse(roomData);
    } else {
      const state = this.inMemoryRooms.get(roomId) || null;
      if (state) {
        console.log('DEBUG: Retrieved room state from memory:', { 
          roomId, 
          hostId: state.hostId, 
          hasHostId: !!state.hostId 
        });
        // No re-parsing here - trust the stored state (already validated on write)
      }
      return state;
    }
  }

  /**
   * Update room state with invariant checks (bulletproof version)
   * This method makes it impossible to accidentally lose hostId
   */
  async updateRoomState(roomId: Id, state: RoomState): Promise<void> {
    const existingState = await this.getRoomState(roomId);
    
    // INVARIANT CHECKS - prevent regression
    if (!state.hostId) {
      throw new Error(`Invariant violation: hostId missing in update for room ${roomId}`);
    }
    if (existingState && state.hostId !== existingState.hostId) {
      throw new Error(`Invariant violation: hostId changed unexpectedly in room ${roomId}`);
    }
    
    const updatedState = {
      ...state,
      hostId: existingState?.hostId || state.hostId, // Double-ensure hostId preservation
      lastSnapshot: Date.now(),
    };
    
    // VALIDATE with schema before storing
    const validatedState = RoomStateSchema.parse(updatedState);
    
    console.log('DEBUG: Updating room state:', { 
      roomId, 
      oldHostId: existingState?.hostId, 
      newHostId: validatedState.hostId,
      preserved: existingState?.hostId === validatedState.hostId 
    });
    
    if (this.redis) {
      await this.redis.hSet(`room:${roomId}`, 'state', JSON.stringify(validatedState));
      await this.redis.expire(`room:${roomId}`, 86400);
    } else {
      this.inMemoryRooms.set(roomId, validatedState);
    }
  }

  /**
   * Safer update helper - prevents accidental hostId loss
   */
  async updateRoomStateSafe(roomId: Id, mutator: (prev: RoomState) => RoomState): Promise<RoomState> {
    const prev = await this.getRoomState(roomId);
    if (!prev) throw new Error(`Room ${roomId} not found`);
    
    const next = mutator(prev);
    await this.updateRoomState(roomId, next);
    
    const updated = await this.getRoomState(roomId);
    if (!updated) throw new Error(`Failed to update room ${roomId}`);
    return updated;
  }

  /**
   * Add player to room
   */
  async addPlayerToRoom(
    roomId: Id, 
    playerId: Id, 
    playerName: string,
    sessionId?: string
  ): Promise<RoomState | null> {
    const state = await this.getRoomState(roomId);
    if (!state) return null;
    
    // Check if room is full
    const playerCount = Object.keys(state.players).length;
    if (playerCount >= state.settings.maxPlayers) {
      throw new Error('Room is full');
    }
    
    // Check if game has already started
    if (state.phase !== 'lobby') {
      throw new Error('Game has already started');
    }
    
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      roleId: 'townsperson', // Will be reassigned when game starts
      alignment: 'town',
      status: 'alive',
      connected: true,
      afkStrikes: 0,
      ...(sessionId ? { sessionId } : {}),
    };
    
    // Use the safer update pattern that preserves hostId
    const updatedState = await this.updateRoomStateSafe(roomId, (prev) => ({
      ...prev,
      players: {
        ...prev.players,
        [playerId]: newPlayer,
      },
    }));
    
    return updatedState;
  }

  /**
   * Update player connection status
   */
  async updatePlayerConnection(
    roomId: Id, 
    playerId: Id, 
    connected: boolean,
    sessionId?: string
  ): Promise<RoomState | null> {
    const state = await this.getRoomState(roomId);
    if (!state || !state.players[playerId]) return null;
    
    const updatedPlayer: Player = {
      ...state.players[playerId]!,
      connected,
      ...(sessionId ? { sessionId } : {}),
    };
    
    const updatedState: RoomState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: updatedPlayer,
      },
    };
    
    await this.updateRoomState(roomId, updatedState);
    return updatedState;
  }

  /**
   * Start game by assigning roles
   */
  async startGame(roomId: Id, hostId: Id): Promise<RoomState | null> {
    const state = await this.getRoomState(roomId);
    if (!state) return null;
    
    // Validate host
    if (state.hostId !== hostId) {
      throw new Error('Only host can start the game');
    }
    
    // Validate player count
    const playerCount = Object.keys(state.players).length;
    if (playerCount < state.settings.minPlayers) {
      throw new Error(`Need at least ${state.settings.minPlayers} players to start`);
    }
    
    // Assign roles
    const playerIds = Object.keys(state.players);
    const roleDistribution = getDefaultRoleDistribution(playerCount);
    
    // Shuffle players and assign roles
    const shuffledPlayerIds = [...playerIds].sort(() => Math.random() - 0.5);
    const updatedPlayers: Record<Id, Player> = {};
    
    for (let i = 0; i < shuffledPlayerIds.length; i++) {
      const playerId = shuffledPlayerIds[i]!;
      const roleId = roleDistribution[i]!;
      const alignment = roleId === 'mafia' ? 'mafia' : 'town';
      
      updatedPlayers[playerId] = {
        ...state.players[playerId]!,
        roleId: roleId as Player['roleId'],
        alignment,
      };
    }
    
    const updatedState: RoomState = {
      ...state,
      phase: 'night',
      timer: {
        phase: 'night',
        submittedAt: Date.now(),
        endsAt: Date.now() + state.settings.nightDurationMs,
      },
      players: updatedPlayers,
      publicNarrative: ['The game has begun. It is now night time...'],
    };
    
    await this.updateRoomState(roomId, updatedState);
    return updatedState;
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: Id): Promise<void> {
    const state = await this.getRoomState(roomId);
    if (this.redis && state) {
      await this.redis.del(`room_code:${state.code}`);
      await this.redis.del(`room:${roomId}`);
    } else if (!this.redis) {
      this.inMemoryRooms.delete(roomId);
      if (state) {
        this.inMemoryCodes.delete(state.code);
      }
    }
  }
}