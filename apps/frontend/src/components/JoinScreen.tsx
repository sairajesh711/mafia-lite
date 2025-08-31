import { useState } from 'react';
import ScreenHeader from './layout/ScreenHeader';
import BackgroundStage from './ui/BackgroundStage';

interface JoinScreenProps {
  socket: {
    connected: boolean;
    createRoom: (hostName: string) => void;
    joinRoom: (roomCode: string, playerName: string) => void;
    connectSocket: () => void;
    error: string | null;
  };
}

export default function JoinScreen({ socket }: JoinScreenProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [hostName, setHostName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle host game flow
  const handleHostGame = () => {
    setShowHostModal(true);
    setHostName('');
  };

  // Handle join game flow  
  const handleJoinGame = () => {
    setShowJoinModal(true);
    setJoinCode('');
    setJoinName('');
  };

  // Submit host form - strict room creation
  const submitHostForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim() || hostName.length < 3) return;
    
    setIsLoading(true);
    
    try {
      if (!socket.connected) {
        socket.connectSocket();
      }
      // Use strict room.create - will auto-join host to created room
      socket.createRoom(hostName);
    } catch (error) {
      console.error('Room creation error:', error);
    } finally {
      setIsLoading(false);
      setShowHostModal(false);
    }
  };

  // Submit join form - strict validation, no auto-create
  const submitJoinForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim() || joinName.length < 3) return;
    
    setIsLoading(true);
    
    try {
      if (!socket.connected) {
        socket.connectSocket();
      }
      // Use strict room.join - will error if room doesn't exist
      socket.joinRoom(joinCode, joinName);
    } catch (error) {
      console.error('Join error:', error);
    } finally {
      setIsLoading(false);
      setShowJoinModal(false);
    }
  };

  // 4-digit code validation
  const handleCodeInput = (value: string) => {
    // Only allow alphanumeric, max 6 chars, uppercase
    const cleaned = value.replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setJoinCode(cleaned);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <ScreenHeader 
        title="🕵️ MAFIA NIGHT"
        subtitle="Enter the shadows of social deduction"
        className="flex-shrink-0"
      />
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          {/* Hero Background */}
          <div className="mb-12">
            <BackgroundStage 
              phase="night" 
              className="h-64 md:h-80 rounded-xl shadow-elevated"
            >
              <div className="text-center">
                <h2 className="text-display text-2xl md:text-3xl text-white mb-4 text-shadow">
                  Welcome to the Game
                </h2>
                <p className="text-lg text-gray-200 max-w-md mx-auto text-shadow-sm">
                  Deception, deduction, and drama await. Will you survive the night?
                </p>
              </div>
            </BackgroundStage>
          </div>
          
          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Host New Game */}
            <div className="card-dark p-6 text-center interactive" onClick={handleHostGame}>
              <div className="mb-4">
                <span className="text-4xl">👑</span>
              </div>
              <h3 className="text-display text-xl text-ui-500 mb-2">HOST NEW GAME</h3>
              <p className="text-sm text-gray-400 mb-4">
                Create a room and invite your friends to play
              </p>
              <button className="btn-primary w-full">
                Create Room
              </button>
            </div>

            {/* Join Game */}
            <div className="card-dark p-6 text-center interactive" onClick={handleJoinGame}>
              <div className="mb-4">
                <span className="text-4xl">🎯</span>
              </div>
              <h3 className="text-display text-xl text-detective-500 mb-2">JOIN GAME</h3>
              <p className="text-sm text-gray-400 mb-4">
                Enter a room code to join an existing game
              </p>
              <button className="btn-detective w-full">
                Enter Code
              </button>
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-center text-sm text-gray-500">
            <button className="hover:text-ui-500 transition-colors mr-6">
              How to Play
            </button>
            <button className="hover:text-ui-500 transition-colors">
              Game Rules
            </button>
          </div>
        </div>
      </div>

      {/* Host Modal */}
      {showHostModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-modal animate-fade-in">
          <div className="bg-ui-950 rounded-xl p-6 w-full max-w-md mx-4 shadow-elevated animate-scale-in">
            <h3 className="text-display text-xl text-ui-500 mb-4">Host New Game</h3>
            
            <form onSubmit={submitHostForm} className="space-y-4">
              <div>
                <label htmlFor="hostName" className="form-label-dark">
                  Your Name
                </label>
                <input
                  id="hostName"
                  type="text"
                  placeholder="Enter your name (3-15 characters)"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  maxLength={15}
                  minLength={3}
                  className="form-input-dark"
                  required
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowHostModal(false)}
                  className="btn-secondary flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!hostName.trim() || hostName.length < 3 || isLoading}
                  className="btn-primary flex-1"
                >
                  {isLoading ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-modal animate-fade-in">
          <div className="bg-ui-950 rounded-xl p-6 w-full max-w-md mx-4 shadow-elevated animate-scale-in">
            <h3 className="text-display text-xl text-detective-500 mb-4">Join Game</h3>
            
            <form onSubmit={submitJoinForm} className="space-y-4">
              <div>
                <label htmlFor="joinCode" className="form-label-dark">
                  Room Code
                </label>
                <input
                  id="joinCode"
                  type="text"
                  placeholder="Enter 4-6 character code"
                  value={joinCode}
                  onChange={(e) => handleCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="form-input-dark uppercase tracking-wider text-center text-xl font-mono"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ask your host for the room code
                </p>
              </div>

              <div>
                <label htmlFor="joinName" className="form-label-dark">
                  Your Name
                </label>
                <input
                  id="joinName"
                  type="text"
                  placeholder="Enter your name (3-15 characters)"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={15}
                  minLength={3}
                  className="form-input-dark"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="btn-secondary flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!joinCode.trim() || !joinName.trim() || joinName.length < 3 || isLoading}
                  className="btn-detective flex-1"
                >
                  {isLoading ? 'Joining...' : 'Join Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}