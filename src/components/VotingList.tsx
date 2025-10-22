import React from 'react';
import type { Round } from '../types';

interface VotingListProps {
  rounds: Round[];
  onPlay: (roundId: string) => void;
  onDelete: (roundId: string) => void;
  isHost: boolean;
}

const VotingList: React.FC<VotingListProps> = ({ rounds, onPlay, onDelete, isHost }) => {
  // Filtramos apenas as votações que não são a inicial "Nova história"
  const votings = rounds.filter(round => !round.title.includes('Nova história'));

  if (votings.length === 0) {
    return (
      <div className="text-center p-4 rounded" style={{ backgroundColor: 'var(--dark-light)' }}>
        <p className="mb-0">Nenhuma votação criada ainda.</p>
      </div>
    );
  }

  return (
    <div className="list-group">
      {votings.map((round) => (
        <div 
          key={round.id} 
          className="list-group-item d-flex justify-content-between align-items-center"
          style={{ backgroundColor: 'var(--dark-light)', borderColor: 'var(--dark-lighter)' }}
        >
          <div>
            <h5 className="mb-1">{round.title}</h5>
            {round.subtitle && <p className="mb-0 text-secondary small">{round.subtitle}</p>}
            {round.finalEstimate && (
              <span className="badge bg-success ms-2">Estimativa: {round.finalEstimate}</span>
            )}
          </div>
          
          {isHost && (
            <div className="d-flex gap-2">
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => onPlay(round.id)}
              >
                <i className="bi bi-play-fill"></i> Iniciar
              </button>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(round.id)}
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default VotingList;
