import { createClient } from 'redis';
import type { RoomState, Player, Id } from '@mafia/contracts';
import { generateId, generateRoomCode } from '@mafia/engine';
import { getDefaultRoleDistribution } from '@mafia/engine';

export class RoomService {
  constructor(private redis: ReturnType<typeof createClient>) {}

  /**
   * Create a new room with the given host
   */
  async createRoom(hostId: Id, hostName: string): Promise<{ roomId: Id; code: string }> {
    const roomId = generateId();
    const code = generateRoomCode();
    
    // Reserve the room code
    const codeReserved = await this.redis.setNX(`room_code:${code}`, roomId);
    if (!codeReserved) {
      // Code collision, try again (very rare)
      return this.createRoom(hostId, hostName);
    }
    
    // Set expiration on room code (60 seconds for reservation)
    await this.redis.expire(`room_code:${code}`, 60);
    
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
    await this.redis.hSet(`room:${roomId}`, {
      state: JSON.stringify(initialState),
      code,
      hostId,
      createdAt: Date.now().toString(),
    });
    
    // Set expiration on room (24 hours)
    await this.redis.expire(`room:${roomId}`, 86400);
    
    return { roomId, code };
  }

  /**
   * Find room by code
   */
  async findRoomByCode(code: string): Promise<Id | null> {
    const roomId = await this.redis.get(`room_code:${code}`);
    return roomId;
  }

  /**
   * Get room state
   */
  async getRoomState(roomId: Id): Promise<RoomState | null> {
    const roomData = await this.redis.hGet(`room:${roomId}`, 'state');
    if (!roomData) return null;
    
    try {
      return JSON.parse(roomData) as RoomState;
    } catch (error) {
      console.error('Failed to parse room state:', error);
      return null;
    }
  }

  /**
   * Update room state
   */
  async updateRoomState(roomId: Id, state: RoomState): Promise<void> {
    const updatedState = {
      ...state,
      lastSnapshot: Date.now(),
    };
    
    await this.redis.hSet(`room:${roomId}`, 'state', JSON.stringify(updatedState));
    
    // Extend expiration
    await this.redis.expire(`room:${roomId}`, 86400);
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
    
    const updatedState: RoomState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: newPlayer,
      },
    };
    
    await this.updateRoomState(roomId, updatedState);
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
    if (state) {
      await this.redis.del(`room_code:${state.code}`);
    }
    await this.redis.del(`room:${roomId}`);
  }
}