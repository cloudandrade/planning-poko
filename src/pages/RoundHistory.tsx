import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';

const RoundHistory: React.FC = () => {
  const navigate = useNavigate();
  const { currentRoom } = useRoom();
  
  if (!currentRoom) {
    navigate('/');
    return null;
  }
  
  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--dark)' }}>
      <header className="p-3 d-flex align-items-center border-bottom" style={{ borderColor: 'var(--dark-lighter) !important' }}>
        <button 
          className="btn btn-link text-secondary me-3 p-0"
          onClick={() => navigate('/room')}
        >
          ← Voltar
        </button>
        <h1 className="fs-4 fw-bold mb-0">Histórico de Rodadas</h1>
      </header>
      
      <main className="flex-grow-1 p-4">
        <div className="container-fluid" style={{ maxWidth: '900px' }}>
          <div className="mb-4">
            <label htmlFor="search-input" className="visually-hidden">Buscar por história</label>
            <input
              id="search-input"
              className="form-control"
              placeholder="Buscar por história"
              style={{ backgroundColor: 'var(--dark-light)', borderColor: 'var(--dark-lighter)', color: 'white' }}
            />
          </div>
          
          <div className="d-flex flex-column gap-3">
            {currentRoom.rounds.map((round) => (
              <button 
                key={round.id} 
                className="btn text-start p-3 w-100 rounded"
                style={{ backgroundColor: 'var(--dark-light)', border: 'none' }}
                onClick={() => {
                  // Abrir detalhes da rodada
                }}
              >
                <h3 className="fs-5 fw-medium">{round.title}</h3>
                {round.subtitle && (
                  <p className="text-secondary small mt-1 mb-2">{round.subtitle}</p>
                )}
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary small">
                    {round.votes.length} votos
                  </span>
                  {round.finalEstimate && (
                    <span className="badge rounded-pill" style={{ backgroundColor: 'var(--primary)' }}>
                      Estimativa: {round.finalEstimate}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoundHistory;
