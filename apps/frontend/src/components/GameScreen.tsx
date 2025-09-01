import { useState } from 'react';
import type { ClientView } from '@mafia/contracts';

interface GameScreenProps {
  socket: {
    roomView: ClientView | null;
    playerId: string | null;
    submitAction: (type: string, targetId: string) => void;
    castVote: (targetId: string | null) => void;
    disconnect: () => void;
  };
}

export default function GameScreen({ socket }: GameScreenProps) {
  const { roomView, playerId } = socket;
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  
  if (!roomView || roomView.phase === 'lobby' || !playerId) {
    return <div>Loading game...</div>;
  }

  const currentPlayer = roomView.players[playerId];
  if (!currentPlayer) {
    return <div>Player not found</div>;
  }

  const alivePlayers = Object.values(roomView.players).filter((p: any) => p.status === 'alive');
  const deadPlayers = Object.values(roomView.players).filter((p: any) => p.status === 'dead');
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseDescription = () => {
    switch (roomView.phase) {
      case 'night':
        if (roomView.selfRole.alignment === 'mafia') {
          return 'Choose someone to eliminate';
        } else if (roomView.selfRole.roleId === 'detective') {
          return 'Choose someone to investigate';
        } else if (roomView.selfRole.roleId === 'doctor') {
          return 'Choose someone to protect';
        }
        return 'The mafia is deciding...';
      case 'day_announcement':
        return 'See what happened during the night';
      case 'day_discussion':
        return 'Discuss what happened during the night';
      case 'day_voting':
        return 'Vote to eliminate a suspect';
      case 'ended':
        const winner = roomView.victoryCondition === 'mafia-victory' ? 'Mafia' : roomView.victoryCondition === 'town-victory' ? 'Town' : 'Unknown';
        return `Game Over - ${winner} wins!`;
      default:
        return '';
    }
  };

  const canTakeAction = () => {
    if (currentPlayer.status === 'dead') return false;
    if (roomView.phase === 'night') {
      return ['mafia', 'detective', 'doctor'].includes(roomView.selfRole.roleId);
    }
    return roomView.phase === 'day_voting';
  };

  const getActionButtonText = () => {
    if (currentPlayer.status === 'dead') return 'You are dead';
    
    switch (roomView.phase) {
      case 'night':
        if (roomView.selfRole.alignment === 'mafia') return 'Kill';
        if (roomView.selfRole.roleId === 'detective') return 'Investigate';
        if (roomView.selfRole.roleId === 'doctor') return 'Protect';
        return 'Wait';
      case 'day_voting':
        return 'Vote to Eliminate';
      default:
        return 'Wait';
    }
  };

  const handleAction = () => {
    if (!selectedTarget) return;
    
    if (roomView.phase === 'day_voting') {
      socket.castVote(selectedTarget);
    } else if (roomView.phase === 'night') {
      let actionType = '';
      if (roomView.selfRole.alignment === 'mafia') actionType = 'kill';
      else if (roomView.selfRole.roleId === 'detective') actionType = 'investigate';
      else if (roomView.selfRole.roleId === 'doctor') actionType = 'protect';
      
      if (actionType) {
        socket.submitAction(actionType, selectedTarget);
      }
    }
    setSelectedTarget(null);
  };

  return (
    <div>
      <div className="phase-banner">
        <h2>{roomView.phase.toUpperCase()} PHASE</h2>
        <div>{getPhaseDescription()}</div>
        {roomView.timer && (
          <div className="countdown">
            ⏰ {formatTime(Math.max(0, Math.floor((roomView.timer.endsAt - Date.now()) / 1000)))}
          </div>
        )}
      </div>

      <div>
        <h3>Your Role: {roomView.selfRole.roleId}</h3>
        <p>Status: {currentPlayer.status === 'alive' ? '❤️ Alive' : '💀 Dead'}</p>
        {roomView.lockedAction && (
          <p style={{ color: '#060' }}>✓ Action submitted: {roomView.lockedAction.type}</p>
        )}
      </div>

      <div className="players">
        <h3>Alive Players ({alivePlayers.length})</h3>
        <div className="players">
          {alivePlayers.map((player: any) => (
            <div
              key={player.id}
              className={`player ${selectedTarget === player.id ? 'selected' : ''}`}
              style={{
                cursor: canTakeAction() && player.id !== playerId ? 'pointer' : 'default',
                backgroundColor: selectedTarget === player.id ? '#e6f3ff' : undefined,
                border: selectedTarget === player.id ? '2px solid #007acc' : undefined
              }}
              onClick={() => {
                if (canTakeAction() && player.id !== playerId) {
                  setSelectedTarget(selectedTarget === player.id ? null : player.id);
                }
              }}
            >
              <div>{player.name}</div>
              <div style={{ fontSize: '0.8em', color: '#666' }}>
                {player.connected ? '🟢' : '🔴'}
                {roomView.votes && roomView.votes[player.id] && ` • ${Object.values(roomView.votes).filter((v: any) => v.targetId === player.id).length} votes`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {deadPlayers.length > 0 && (
        <div>
          <h3>Dead Players ({deadPlayers.length})</h3>
          <div className="players">
            {deadPlayers.map((player: any) => (
              <div key={player.id} className="player dead">
                <div>{player.name}</div>
                <div style={{ fontSize: '0.8em', color: '#666' }}>
                  💀 {player.roleId || 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="actions">
        {canTakeAction() && !roomView.lockedAction && (
          <button
            onClick={handleAction}
            disabled={!selectedTarget}
            style={{
              backgroundColor: selectedTarget ? '#007acc' : undefined,
              color: selectedTarget ? 'white' : undefined
            }}
          >
            {getActionButtonText()} {selectedTarget && `(${roomView.players[selectedTarget]?.name})`}
          </button>
        )}
        
        {roomView.phase === 'day_voting' && (
          <button 
            onClick={() => socket.castVote(null)}
            style={{ marginLeft: '10px' }}
          >
            Skip Vote
          </button>
        )}

        <button onClick={socket.disconnect} style={{ marginLeft: '10px' }}>
          Leave Game
        </button>
      </div>

      {roomView.investigationResults && roomView.investigationResults.length > 0 && (
        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#ffe', border: '1px solid #cc6' }}>
          <h4>🔍 Investigation Results</h4>
          {roomView.investigationResults.map((result: any, i: number) => (
            <div key={i}>
              {roomView.players[result.targetId]?.name || 'Unknown'} is {result.isMafia ? 'Mafia' : 'Town'}
            </div>
          ))}
        </div>
      )}

      <div className="chat" style={{ marginTop: '20px' }}>
        <div style={{ padding: '8px', textAlign: 'center', color: '#666' }}>
          💬 Chat coming soon...
        </div>
      </div>
    </div>
  );
}