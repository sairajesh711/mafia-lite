import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientView, ServerToClientEvent } from '@mafia/contracts';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  reconnecting: boolean;
  roomView: ClientView | null;
  playerId: string | null;
  jwt: string | null;
  error: string | null;
}

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'https://mafia-backend-prod-127088130004.europe-west1.run.app';

export function useSocket(): SocketState & {
  connectSocket: () => Socket;
  disconnect: () => void;
  createRoom: (hostName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  startGame: () => void;
  submitAction: (type: string, targetId: string) => void;
  castVote: (targetId: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
} {
  const [state, setState] = useState<SocketState>({
    socket: null,
    connected: false,
    reconnecting: false,
    roomView: null,
    playerId: null,
    jwt: null,
    error: null,
  });

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const connectSocket = useCallback(() => {
    if (state.socket?.connected) return state.socket;

    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to server');
      setState(prev => ({ ...prev, connected: true, reconnecting: false }));
      
      // Try to resume session if JWT exists
      const storedJWT = localStorage.getItem('mafia_jwt');
      const storedRoomId = localStorage.getItem('mafia_room_id');
      const storedSessionId = localStorage.getItem('mafia_session_id');

      if (storedJWT && storedRoomId && storedSessionId) {
        console.log('Attempting to resume session...');
        socket.emit('session.resume', {
          jwt: storedJWT,
          roomId: storedRoomId,
          sessionId: storedSessionId,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setState(prev => ({ ...prev, connected: false, reconnecting: true }));
    });

    socket.on('reconnect', () => {
      console.log('Reconnected to server');
      setState(prev => ({ ...prev, connected: true, reconnecting: false }));
    });

    socket.on('room.snapshot', (event: ServerToClientEvent) => {
      if (event.event === 'room.snapshot') {
        console.log('Received room snapshot');
        setState(prev => ({
          ...prev,
          roomView: event.view,
          playerId: event.playerId,
          jwt: event.jwt || prev.jwt,
          error: null,
        }));

        // Store session data
        if (event.jwt) {
          localStorage.setItem('mafia_jwt', event.jwt);
          localStorage.setItem('mafia_room_id', event.view.roomId);
          localStorage.setItem('mafia_session_id', event.sessionId || '');
        }
      }
    });

    socket.on('phase.change', (event: ServerToClientEvent) => {
      if (event.event === 'phase.change') {
        console.log(`Phase changed to ${event.phase}`);
        // Update room view with new phase info
        setState(prev => ({
          ...prev,
          roomView: prev.roomView ? {
            ...prev.roomView,
            phase: event.phase,
            timer: event.timer,
          } : null,
        }));
      }
    });

    socket.on('error', (event: ServerToClientEvent) => {
      if (event.event === 'error') {
        console.error('Server error:', event.message);
        setState(prev => ({ ...prev, error: `${event.code}: ${event.message}` }));
      }
    });

    socket.on('session.evicted', (data: any) => {
      console.warn('Session evicted:', data.message);
      localStorage.removeItem('mafia_jwt');
      localStorage.removeItem('mafia_room_id');
      localStorage.removeItem('mafia_session_id');
      setState(prev => ({
        ...prev,
        roomView: null,
        playerId: null,
        jwt: null,
        error: 'Signed out: another session started for this player',
      }));
    });

    setState(prev => ({ ...prev, socket }));
    return socket;
  }, [state.socket]);

  const disconnect = useCallback(() => {
    if (state.socket) {
      state.socket.disconnect();
      setState(prev => ({
        ...prev,
        socket: null,
        connected: false,
        reconnecting: false,
        roomView: null,
        playerId: null,
        jwt: null,
      }));
    }
  }, [state.socket]);

  const createRoom = useCallback((hostName: string) => {
    const socket = connectSocket();
    clearError();
    
    socket.emit('room.create', {
      hostName: hostName.trim(),
    });
  }, [connectSocket, clearError]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const socket = connectSocket();
    clearError();
    
    socket.emit('room.join', {
      roomCode: roomCode.toUpperCase(),
      playerName: playerName.trim(),
    });
  }, [connectSocket, clearError]);

  const startGame = useCallback(() => {
    if (state.socket && state.connected) {
      state.socket.emit('host.action', { action: 'start' });
    }
  }, [state.socket, state.connected]);

  const submitAction = useCallback((type: string, targetId: string) => {
    if (state.socket && state.connected) {
      const actionId = `action_${Date.now()}_${Math.random()}`;
      state.socket.emit('action.submit', { actionId, type, targetId });
    }
  }, [state.socket, state.connected]);

  const castVote = useCallback((targetId: string | null) => {
    if (state.socket && state.connected) {
      const actionId = `vote_${Date.now()}_${Math.random()}`;
      state.socket.emit('vote.cast', { actionId, targetId });
    }
  }, [state.socket, state.connected]);

  useEffect(() => {
    return () => {
      if (state.socket) {
        state.socket.disconnect();
      }
    };
  }, [state.socket]);

  return {
    ...state,
    connectSocket,
    disconnect,
    createRoom,
    joinRoom,
    startGame,
    submitAction,
    castVote,
    setError,
    clearError,
  };
}