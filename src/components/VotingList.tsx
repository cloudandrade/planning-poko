import React from 'react';
import type { Round } from '../types';

interface VotingListProps {
  rounds: Round[];
  onPlay: (roundId: string) => void;
  onDelete: (roundId: string) => void;
  onEdit?: (round: Round) => void;
  isHost: boolean;
}

const VotingList: React.FC<VotingListProps> = ({
  rounds,
  onPlay,
  onDelete,
  onEdit,
  isHost,
}) => {
  const votings = rounds.filter((round) => !round.title.includes('Nova história'));

  if (votings.length === 0) {
    return (
      <div className="text-center p-4 rounded" style={{ backgroundColor: 'var(--dark-light)' }}>
        <p className="mb-0" style={{ color: 'white' }}>
          Nenhuma votação criada ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="list-group d-flex flex-column gap-3">
      {votings.map((round) => (
        <div
          key={round.id}
          className="list-group-item d-flex justify-content-between align-items-center w-100 text-start border rounded"
          style={{
            backgroundColor: 'var(--dark-light)',
            borderColor: 'var(--dark-lighter)',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            className="flex-grow-1 min-w-0 pe-2"
            role={isHost ? 'button' : undefined}
            tabIndex={isHost ? 0 : undefined}
            onClick={() => isHost && onPlay(round.id)}
            onKeyDown={(e) => {
              if (!isHost) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPlay(round.id);
              }
            }}
            style={{ cursor: isHost ? 'pointer' : 'default' }}
          >
            <h5 className="mb-1" style={{ color: 'white', fontWeight: 'bold' }}>
              {round.title}
            </h5>
            {round.subtitle && (
              <p className="mb-0 small" style={{ color: '#d1d1d1' }}>
                {round.subtitle}
              </p>
            )}
            {round.finalEstimate && (
              <span className="badge bg-success mt-1">Estimativa: {round.finalEstimate}</span>
            )}
          </div>

          {isHost && (
            <div className="d-flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onPlay(round.id)}
              >
                <i className="bi bi-play-fill"></i> Iniciar
              </button>
              {onEdit && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => onEdit(round)}
                  title="Editar tarefa"
                >
                  <i className="bi bi-pencil"></i>
                </button>
              )}
              <button
                type="button"
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
