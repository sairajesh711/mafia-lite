import type { ClientView } from '@mafia/contracts';

interface LobbyScreenProps {
  socket: {
    roomView: ClientView | null;
    startGame: () => void;
    disconnect: () => void;
  };
}

export default function LobbyScreen({ socket }: LobbyScreenProps) {
  const { roomView } = socket;
  
  if (!roomView || roomView.phase !== 'lobby') {
    return <div>Loading lobby...</div>;
  }

  const isHost = roomView.isHost;
  const playerCount = Object.keys(roomView.players).length;
  const canStart = playerCount >= 3; // Minimum for a game

  return (
    <div>
      <h1>🏠 Room {roomView.roomId}</h1>
      <p>Waiting for players to join...</p>
      
      <div className="players">
        {Object.values(roomView.players).map(player => (
          <div key={player.id} className="player">
            <div>{player.name}</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              {player.connected ? '🟢 Online' : '🔴 Offline'}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p>{playerCount} player{playerCount !== 1 ? 's' : ''} joined</p>
        {playerCount < 3 && <p style={{ color: '#666' }}>Need at least 3 players to start</p>}
      </div>

      <div>
        {isHost ? (
          <button 
            onClick={socket.startGame} 
            disabled={!canStart}
            style={{ backgroundColor: canStart ? '#007acc' : undefined, color: canStart ? 'white' : undefined }}
          >
            {canStart ? 'Start Game' : `Need ${3 - playerCount} more player${3 - playerCount !== 1 ? 's' : ''}`}
          </button>
        ) : (
          <p style={{ color: '#666' }}>Waiting for host to start the game...</p>
        )}
        
        <button onClick={socket.disconnect} style={{ marginLeft: '10px' }}>
          Leave Room
        </button>
      </div>
    </div>
  );
}