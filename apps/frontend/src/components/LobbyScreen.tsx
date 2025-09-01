import type { ClientView } from '@mafia/contracts';
import ScreenHeader from './layout/ScreenHeader';

interface LobbyScreenProps {
  socket: {
    roomView: ClientView | null;
    playerId: string | null;
    startGame: () => void;
    disconnect: () => void;
  };
}

export default function LobbyScreen({ socket }: LobbyScreenProps) {
  const { roomView, playerId } = socket;
  
  if (!roomView || roomView.phase !== 'lobby') {
    return <div>Loading lobby...</div>;
  }

  const isHost = roomView.isHost;
  const playerCount = Object.keys(roomView.players).length;
  const canStart = playerCount >= 5; // Minimum for a good mafia game
  
  // Get hostId from room view - now all players can see who the host is
  const hostId = roomView.hostId;
  
  // Clear localStorage if hostId is undefined (fallback safety)
  if (hostId === undefined) {
    localStorage.removeItem('mafia_jwt');
    localStorage.removeItem('mafia_room_id'); 
    localStorage.removeItem('mafia_session_id');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ScreenHeader 
        title="🏠 Game Lobby"
        subtitle={isHost ? "Share the room code to invite players" : "Waiting for more players to join"}
        className="flex-shrink-0"
      />
      
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Room Code Display */}
          <div className="card-dark p-8 text-center mb-8">
            <h2 className="text-display text-sm text-gray-400 mb-2">Room Code</h2>
            <div className="text-6xl font-mono font-bold text-ui-500 tracking-wider mb-4">
              {roomView.code}
            </div>
            <p className="text-gray-400 text-sm">
              {isHost 
                ? "Share this code with friends so they can join your game"
                : "Save this code to rejoin if you get disconnected"
              }
            </p>
          </div>
          
          {/* Players List */}
          <div className="card-dark p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-display text-lg text-gray-200">Players</h3>
              <span className="text-sm text-gray-400">
                {playerCount} player{playerCount !== 1 ? 's' : ''} joined
              </span>
            </div>
            
            <div className="space-y-3">
              {Object.values(roomView.players).map((player: any) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-ui-900/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-ui-700 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm">👤</span>
                    </div>
                    <div>
                      <div className="text-gray-200 font-medium flex items-center">
                        {player.name}
                        {player.id === playerId && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-blue-600 text-blue-200 rounded">You</span>
                        )}
                        {player.id === hostId && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-ui-600 text-ui-200 rounded">Host</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-xs px-2 py-1 rounded ${
                      player.connected 
                        ? 'text-green-400 bg-green-900/30' 
                        : 'text-red-400 bg-red-900/30'
                    }`}>
                      {player.connected ? '🟢 Online' : '🔴 Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {playerCount < 5 && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                <p className="text-yellow-400 text-sm text-center">
                  Need at least 5 players to start the game
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {isHost ? (
              <button 
                onClick={socket.startGame} 
                disabled={!canStart}
                className={`flex-1 ${canStart ? 'btn-primary' : 'btn-secondary'}`}
              >
                {canStart ? 'Start Game' : `Need ${5 - playerCount} more player${5 - playerCount !== 1 ? 's' : ''}`}
              </button>
            ) : (
              <div className="flex-1 p-3 text-center text-gray-400 border border-ui-700 rounded-lg">
                Waiting for host to start the game...
              </div>
            )}
            
            <button onClick={socket.disconnect} className="btn-secondary px-6">
              Leave Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}