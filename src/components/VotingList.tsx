import React, { useMemo } from 'react';
import type { Round } from '../types';

function isUserVotingRound(round: Round) {
  return !round.title.includes('Nova história');
}

/** Soma estimativas finais numéricas (planning poker) para o total do ciclo. */
export function sumCycleStoryPoints(rounds: Round[]): {
  total: number;
  countedTasks: number;
} {
  let total = 0;
  let countedTasks = 0;
  for (const round of rounds) {
    if (!isUserVotingRound(round) || !round.finalEstimate) continue;
    const raw = String(round.finalEstimate).trim();
    if (raw === '?' || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) {
      total += n;
      countedTasks += 1;
    }
  }
  return { total, countedTasks };
}

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
  const votings = rounds.filter(isUserVotingRound);
  const cycle = useMemo(() => sumCycleStoryPoints(rounds), [rounds]);

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
    <div>
      <div
        className="mb-3 py-2 px-3 rounded border small"
        style={{
          backgroundColor: 'var(--dark-lighter)',
          borderColor: 'var(--dark-lighter) !important',
        }}
      >
        <div className="fw-semibold mb-1" style={{ color: 'var(--primary-light)' }}>
          Total estimado no ciclo
        </div>
        {cycle.countedTasks > 0 ? (
          <>
            <div className="fs-4 fw-bold" style={{ color: 'white' }}>
              {cycle.total}{' '}
              <span className="fs-6 fw-normal text-secondary">pts</span>
            </div>
            <div className="text-secondary mt-1" style={{ fontSize: '0.8rem' }}>
              Soma das estimativas finais em {cycle.countedTasks}{' '}
              {cycle.countedTasks === 1 ? 'tarefa' : 'tarefas'} com valor numérico.
            </div>
          </>
        ) : (
          <div className="text-secondary mb-0" style={{ fontSize: '0.85rem' }}>
            Ainda não há estimativas finais numéricas. O total aparece quando você encerra votações e
            define o valor de cada história.
          </div>
        )}
      </div>

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
    </div>
  );
};

export default VotingList;
