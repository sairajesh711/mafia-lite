import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import JoinScreen from './components/JoinScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import AppShell from './components/layout/AppShell';
import ErrorBanner from './components/ui/ErrorBanner';
import ReconnectOverlay from './components/ui/ReconnectOverlay';

type AppState = 'join' | 'lobby' | 'game';

export default function App() {
  const socket = useSocket();
  const [appState, setAppState] = useState<AppState>('join');

  // Handle state transitions based on socket state
  useEffect(() => {
    if (socket.roomView) {
      if (socket.roomView.phase === 'lobby') {
        setAppState('lobby');
      } else {
        setAppState('game');
      }
    } else if (!socket.connected && !socket.reconnecting) {
      setAppState('join');
    }
  }, [socket.roomView, socket.connected, socket.reconnecting]);

  return (
    <AppShell>
      {/* Error handling with casual messaging */}
      <ErrorBanner 
        error={socket.error} 
        onClose={socket.clearError}
        className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md"
      />
      
      {/* Reconnection overlay */}
      <ReconnectOverlay isReconnecting={socket.reconnecting} />

      {/* Main app screens */}
      <div className="container-game">
        {appState === 'join' && <JoinScreen socket={socket} />}
        {appState === 'lobby' && <LobbyScreen socket={socket} />}
        {appState === 'game' && <GameScreen socket={socket} />}
      </div>
    </AppShell>
  );
}