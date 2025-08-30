import { Server as SocketIOServer, Socket } from 'socket.io';
import { createClient } from 'redis';
import { 
  ClientToServerEventSchema,
  ServerToClientEvent,
  PROTOCOL_VERSION,
  createClientView,
  ErrorCode,
} from '@mafia/contracts';
import { generateId } from '@mafia/engine';
import { RoomService } from '../services/room-service.js';
import { JWTService } from '../services/jwt-service.js';
import { SessionService } from '../services/session-service.js';
import { ActionDedupService } from '../services/action-dedup-service.js';

export function setupSocketHandlers(io: SocketIOServer, redisClient: ReturnType<typeof createClient>) {
  const roomService = new RoomService(redisClient);
  const sessionService = new SessionService(redisClient);
  const actionDedupService = new ActionDedupService(redisClient);

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Store client info
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    // Helper to send error events
    const sendError = (code: ErrorCode, message: string, retryable = false) => {
      const errorEvent: ServerToClientEvent = {
        event: 'error',
        code,
        message,
        retryable,
        protocolVersion: PROTOCOL_VERSION,
      };
      socket.emit('error', errorEvent);
    };

    // Helper to broadcast room updates
    const broadcastRoomUpdate = async (roomId: string) => {
      try {
        const state = await roomService.getRoomState(roomId);
        if (!state) return;

        // Send personalized views to each player
        for (const [playerId, player] of Object.entries(state.players)) {
          if (player.connected) {
            const clientView = createClientView(state, playerId);
            const snapshotEvent: ServerToClientEvent = {
              event: 'room.snapshot',
              view: clientView,
              protocolVersion: PROTOCOL_VERSION,
            };
            
            // Find socket for this player (simplified - in production, you'd maintain a player->socket mapping)
            io.to(`room:${roomId}`).emit('room.snapshot', snapshotEvent);
          }
        }
      } catch (error) {
        console.error('Error broadcasting room update:', error);
      }
    };

    // Room join handler
    socket.on('room.join', async (data) => {
      try {
        // Validate event payload
        const parseResult = ClientToServerEventSchema.safeParse({ event: 'room.join', payload: data });
        if (!parseResult.success) {
          sendError('UNAUTHORIZED', 'Invalid request format');
          return;
        }

        // TypeScript discriminated union handling
        const eventData = parseResult.data;
        if (eventData.event !== 'room.join') {
          sendError('UNAUTHORIZED', 'Invalid event type');
          return;
        }

        const { roomCode, playerName, sessionId } = eventData.payload;
        
        // Find room by code
        let roomId = await roomService.findRoomByCode(roomCode);
        
        if (!roomId) {
          sendError('ROOM_NOT_FOUND', `Room ${roomCode} not found`);
          return;
        }

        // Generate player ID if not resuming session
        const playerId = sessionId || generateId();
        
        try {
          // Add player to room
          const updatedState = await roomService.addPlayerToRoom(roomId, playerId, playerName);
          if (!updatedState) {
            sendError('ROOM_NOT_FOUND', 'Room no longer exists');
            return;
          }

          // Join socket room
          await socket.join(`room:${roomId}`);
          currentRoomId = roomId;
          currentPlayerId = playerId;

          // Issue JWT token
          const jwtSessionId = generateId();
          const jwt = JWTService.issueRoomToken(playerId, roomId, jwtSessionId);

          // Register session
          await sessionService.registerSession({
            playerId,
            roomId,
            sessionId: jwtSessionId,
            socketId: socket.id,
            connectedAt: Date.now(),
          });

          // Send client view with JWT
          const clientView = createClientView(updatedState, playerId);
          const snapshotEvent: ServerToClientEvent = {
            event: 'room.snapshot',
            view: clientView,
            jwt,
            protocolVersion: PROTOCOL_VERSION,
          };
          socket.emit('room.snapshot', snapshotEvent);

          // Broadcast player join to others
          await broadcastRoomUpdate(roomId);

          console.log(`Player ${playerId} (${playerName}) joined room ${roomCode}`);
          
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === 'Room is full') {
              sendError('ROOM_FULL', error.message);
            } else if (error.message === 'Game has already started') {
              sendError('WRONG_PHASE', error.message);
            } else {
              sendError('UNAUTHORIZED', error.message);
            }
          } else {
            sendError('UNAUTHORIZED', 'Failed to join room');
          }
        }
        
      } catch (error) {
        console.error('Room join error:', error);
        sendError('UNAUTHORIZED', 'Failed to process room join');
      }
    });

    // Session resume handler
    socket.on('session.resume', async (data) => {
      try {
        const parseResult = ClientToServerEventSchema.safeParse({ event: 'session.resume', payload: data });
        if (!parseResult.success) {
          sendError('UNAUTHORIZED', 'Invalid request format');
          return;
        }

        const eventData = parseResult.data;
        if (eventData.event !== 'session.resume') {
          sendError('UNAUTHORIZED', 'Invalid event type');
          return;
        }

        const { roomId, sessionId, jwt } = eventData.payload;

        // Verify JWT
        const jwtPayload = JWTService.verifyRoomToken(jwt);
        if (!jwtPayload || jwtPayload.roomId !== roomId || jwtPayload.sessionId !== sessionId) {
          sendError('UNAUTHORIZED', 'Invalid or expired session token');
          return;
        }

        // Check if session is valid
        const isValidSession = await sessionService.isValidSession(jwtPayload.sub, roomId, sessionId);
        if (!isValidSession) {
          sendError('UNAUTHORIZED', 'Session not found or expired');
          return;
        }

        // Evict old socket for this player (latest wins policy)
        const oldSession = await sessionService.getSession(jwtPayload.sub, roomId);
        if (oldSession && oldSession.socketId !== socket.id) {
          // Emit "signed out" message to old socket
          const oldSocket = io.sockets.sockets.get(oldSession.socketId);
          if (oldSocket) {
            oldSocket.emit('session.evicted', {
              reason: 'duplicate_session',
              message: 'Signed out: another session started for this player',
            });
            oldSocket.disconnect(true);
          }
        }

        // Update session with new socket
        await sessionService.updateSessionSocket(jwtPayload.sub, roomId, socket.id);

        // Get room state
        const roomState = await roomService.getRoomState(roomId);
        if (!roomState) {
          sendError('ROOM_NOT_FOUND', 'Room no longer exists');
          return;
        }

        // Join socket room
        await socket.join(`room:${roomId}`);
        currentRoomId = roomId;
        currentPlayerId = jwtPayload.sub;

        // Update player connection status
        await roomService.updatePlayerConnection(roomId, jwtPayload.sub, true, sessionId);

        // Send fresh client view
        const clientView = createClientView(roomState, jwtPayload.sub);
        const refreshedToken = JWTService.refreshTokenIfNeeded(jwt);
        
        const snapshotEvent: ServerToClientEvent = {
          event: 'room.snapshot',
          view: clientView,
          jwt: refreshedToken || jwt,
          protocolVersion: PROTOCOL_VERSION,
        };
        socket.emit('room.snapshot', snapshotEvent);

        // Send current phase info
        if (roomState.timer) {
          const phaseEvent: ServerToClientEvent = {
            event: 'phase.change',
            phase: roomState.phase,
            timer: roomState.timer,
            night: roomState.phase === 'night',
            protocolVersion: PROTOCOL_VERSION,
          };
          socket.emit('phase.change', phaseEvent);
        }

        // Broadcast player reconnection
        const statusEvent: ServerToClientEvent = {
          event: 'player.status',
          playerId: jwtPayload.sub,
          connected: true,
          alive: roomState.players[jwtPayload.sub]?.status === 'alive',
          protocolVersion: PROTOCOL_VERSION,
        };
        io.to(`room:${roomId}`).emit('player.status', statusEvent);

        console.log(`Player ${jwtPayload.sub} resumed session in room ${roomId}`);

      } catch (error) {
        console.error('Session resume error:', error);
        sendError('UNAUTHORIZED', 'Failed to resume session');
      }
    });

    // Host actions (start game, kick, etc.)
    socket.on('host.action', async (data) => {
      try {
        if (!currentRoomId || !currentPlayerId) {
          sendError('UNAUTHORIZED', 'Not in a room');
          return;
        }

        const parseResult = ClientToServerEventSchema.safeParse({ event: 'host.action', payload: data });
        if (!parseResult.success) {
          sendError('UNAUTHORIZED', 'Invalid request format');
          return;
        }

        // TypeScript discriminated union handling
        const eventData = parseResult.data;
        if (eventData.event !== 'host.action') {
          sendError('UNAUTHORIZED', 'Invalid event type');
          return;
        }

        const { action } = eventData.payload;

        if (action === 'start') {
          try {
            const updatedState = await roomService.startGame(currentRoomId, currentPlayerId);
            if (updatedState) {
              await broadcastRoomUpdate(currentRoomId);
              
              // Broadcast phase change
              const phaseEvent: ServerToClientEvent = {
                event: 'phase.change',
                phase: updatedState.phase,
                timer: updatedState.timer,
                night: true,
                protocolVersion: PROTOCOL_VERSION,
              };
              io.to(`room:${currentRoomId}`).emit('phase.change', phaseEvent);
              
              console.log(`Game started in room ${currentRoomId}`);
            }
          } catch (error) {
            if (error instanceof Error) {
              sendError('WRONG_PHASE', error.message);
            }
          }
        }
        
      } catch (error) {
        console.error('Host action error:', error);
        sendError('UNAUTHORIZED', 'Failed to process host action');
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      if (currentRoomId && currentPlayerId) {
        try {
          // Update player connection status
          await roomService.updatePlayerConnection(currentRoomId, currentPlayerId, false);
          
          // Broadcast update to room
          const playerStatusEvent: ServerToClientEvent = {
            event: 'player.status',
            playerId: currentPlayerId,
            connected: false,
            alive: true, // This would need to check actual player status
            protocolVersion: PROTOCOL_VERSION,
          };
          io.to(`room:${currentRoomId}`).emit('player.status', playerStatusEvent);
          
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      }
    });

    // Basic message acknowledgment
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });
}