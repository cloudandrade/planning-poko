import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import CreateVotingModal from '../components/CreateVotingModal';
import VotingList from '../components/VotingList';
import { useRoom } from '../hooks/useRoom';
import { CARD_VALUES } from '../types';
import type { CardValue } from '../types';

const Room: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    currentRoom, 
    leaveRoom, 
    submitVote, 
    revealCards, 
    hideCards,
    startNewRound,
    setFinalEstimate,
    deleteRound,
    startVoting,
    endVoting
  } = useRoom();
  
  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Redirecionar se não estiver em uma sala
  useEffect(() => {
    if (!currentRoom || !currentUser) {
      navigate('/');
    }
  }, [currentRoom, currentUser, navigate]);
  
  // Manter o selectedCard sincronizado com o voto do usuário
  useEffect(() => {
    if (currentRoom && currentUser && currentRoom.currentRound) {
      const userVote = currentRoom.currentRound.votes.find(vote => vote.userId === currentUser.id);
      if (userVote) {
        setSelectedCard(userVote.value as CardValue);
      }
      // Não resetamos o selectedCard se não houver voto para manter a seleção do usuário
    }
  }, [currentRoom, currentUser]);
  
  if (!currentRoom || !currentUser) {
    return null;
  }
  
  const isHost = currentUser.isHost;
  const isPlayer = currentUser.role === 'player';
  const activeVoting = currentRoom.activeVoting;
  const currentRound = currentRoom.currentRound;
  
  // Verificar se há uma votação ativa e se há uma rodada atual
  const userVote = currentRound?.votes.find(vote => vote.userId === currentUser.id);
  const hasVoted = Boolean(userVote);
  
  // Verificar se todos os jogadores (excluindo o host) votaram
  const playerCount = currentRoom.users.filter(user => user.role === 'player').length;
  const allVoted = currentRound ? playerCount > 0 && playerCount === currentRound.votes.length : false;
  
  const handleCardSelect = (value: CardValue) => {
    // Definir o card selecionado localmente
    setSelectedCard(value);
    
    // Enviar o voto para o servidor
    submitVote(value);
    
    // Não resetar o selectedCard após votar para manter o destaque
  };
  
  const handleCreateVoting = (title: string, description: string) => {
    startNewRound(title, description);
  };
  
  const handleStartVoting = (roundId: string) => {
    startVoting(roundId);
  };
  
  const handleEndVoting = () => {
    endVoting();
  };
  
  const handleDeleteRound = (roundId: string) => {
    deleteRound(roundId);
  };
  
  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/');
  };
  
  // Função para renderizar o status da votação
  const renderVotingStatus = () => {
    // Contar apenas jogadores (excluindo o host)
    const playerCount = currentRoom.users.filter(user => user.role === 'player').length;
    
    if (playerCount === 0) {
      return 'Aguardando players...';
    } else if (allVoted) {
      return 'Todos votaram! Aguardando o host revelar os cards.';
    } else {
      return `${currentRound?.votes.length || 0}/${playerCount} votaram`;
    }
  };
  
  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--dark)' }}>
      <header className="p-3 d-flex align-items-center justify-content-between border-bottom" style={{ borderColor: 'var(--dark-lighter) !important' }}>
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-link text-secondary me-3 p-0"
            onClick={handleLeaveRoom}
          >
            ← Voltar
          </button>
          <div>
            <h1 className="fs-4 fw-bold mb-0">{currentRoom.name}</h1>
            <div className="d-flex align-items-center">
              <small className="text-secondary me-2">Código da sala:</small>
              <span className="badge bg-secondary">{currentRoom.code}</span>
            </div>
          </div>
        </div>
        
        {isHost && activeVoting && currentRound && (
          <div className="d-flex gap-2">
            {/* Botões de controle apenas para o host */}
            {currentRound.revealed && (
              <Button 
                variant="secondary" 
                onClick={hideCards}
              >
                Esconder Cards
              </Button>
            )}
            {!currentRound.revealed && currentRound.votes.length > 0 && (
              <Button 
                variant="secondary" 
                onClick={revealCards}
              >
                Revelar Cards
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleEndVoting}
            >
              Encerrar Votação
            </Button>
          </div>
        )}
        
        {isHost && !activeVoting && (
          <div>
            <Button onClick={() => setIsModalOpen(true)}>
              <i className="bi bi-plus-circle me-2"></i> Nova Votação
            </Button>
          </div>
        )}
      </header>
      
      <main className="flex-grow-1 d-flex flex-column p-4">
        {/* Tela de listagem de votações quando não há votação ativa */}
        {!activeVoting && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="fs-3 fw-bold mb-0">Votações</h2>
            </div>
            
            <VotingList 
              rounds={currentRoom.rounds} 
              onPlay={handleStartVoting} 
              onDelete={handleDeleteRound}
              isHost={isHost}
            />
          </div>
        )}
        
        {/* Tela de votação quando há uma votação ativa */}
        {activeVoting && currentRound && (
          <>
            <div className="mb-4">
              <h2 className="fs-3 fw-bold">{currentRound.title}</h2>
              {currentRound.subtitle && (
                <p className="text-secondary">{currentRound.subtitle}</p>
              )}
            </div>
            
            {currentRound.revealed ? (
              <div className="mb-4">
                <h3 className="fs-5 fw-medium mb-3">Resultados da Votação</h3>
                <div className="row row-cols-2 row-cols-md-4 g-4">
                  {currentRound.votes.map((vote) => (
                    <div key={vote.userId} className="col d-flex flex-column align-items-center">
                      <Card value={vote.value as CardValue} revealed={true} />
                      <span className="mt-2">{vote.userName}</span>
                    </div>
                  ))}
                </div>
                
                {isHost && !currentRound.finalEstimate && (
                  <div className="mt-4">
                    <h3 className="fs-5 fw-medium mb-2">Escolha a estimativa final:</h3>
                    <div className="d-flex flex-wrap gap-2">
                      {CARD_VALUES.map((value) => (
                        <button
                          key={value}
                          className="btn btn-outline-secondary"
                          onClick={() => setFinalEstimate(value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {currentRound.finalEstimate && (
                  <div className="mt-4 p-4 rounded" style={{ backgroundColor: 'var(--dark-light)' }}>
                    <h3 className="fs-5 fw-medium mb-2">Estimativa Final:</h3>
                    <div className="fs-1 fw-bold" style={{ color: 'var(--primary)' }}>
                      {currentRound.finalEstimate}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4">
                {/* Seção de votação */}
                <div className="row">
                  {/* Coluna esquerda: Cards para votação (apenas se o usuário não votou ainda ou é o próprio usuário) */}
                  <div className="col-md-6">
                    <h3 className="fs-5 fw-medium mb-3">Escolha seu card</h3>
                    <div className="row row-cols-3 row-cols-md-4 g-3">
                      {CARD_VALUES.map((value) => (
                        <div key={value} className="col">
                          <Card 
                            value={value} 
                            selected={selectedCard === value}
                            disabled={isHost || hasVoted} // Host não pode votar e usuário só pode votar uma vez
                            onClick={() => handleCardSelect(value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Coluna direita: Votos já realizados (cards virados para baixo) */}
                  <div className="col-md-6">
                    <h3 className="fs-5 fw-medium mb-3">Votos realizados</h3>
                    <div className="row row-cols-2 row-cols-md-3 g-4">
                      {currentRound.votes.map((vote) => (
                        <div key={vote.userId} className="col d-flex flex-column align-items-center">
                          {/* Se for o voto do usuário atual, mostrar o card selecionado */}
                          {vote.userId === currentUser.id ? (
                            <Card value={vote.value as CardValue} selected={true} />
                          ) : (
                            <div className="card-back" style={{
                              width: '70px',
                              height: '100px',
                              backgroundColor: '#2c3e50',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                              border: '1px solid #34495e'
                            }}>
                              <span style={{ fontSize: '24px', color: '#95a5a6' }}>?</span>
                            </div>
                          )}
                          <span className="mt-2" style={{
                            color: vote.userId === currentUser.id ? 'var(--success)' : 'white'
                          }}>
                            {vote.userName} {vote.userId === currentUser.id && '(Você)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-center fs-5">
                    {renderVotingStatus()}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      
      <footer className="p-3 border-top" style={{ borderColor: 'var(--dark-lighter) !important' }}>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex flex-column">
            <span className="text-secondary small mb-1">
              {currentRoom.users.length} usuários na sala
            </span>
            <div className="d-flex flex-wrap gap-2">
              {currentRoom.users.map(user => (
                <div key={user.id} className="d-flex align-items-center">
                  <span className="badge rounded-pill" style={{ 
                    backgroundColor: user.role === 'host' ? 'var(--primary)' : 'var(--dark-light)',
                    marginRight: '5px'
                  }}>
                    {user.role === 'host' ? 'Host' : 'Player'}
                  </span>
                  <span className="small" style={{
                    color: user.id === currentUser.id ? 'var(--success)' : 'white' // Destacar o usuário atual
                  }}>
                    {user.name}
                    {currentRound?.votes.some(vote => vote.userId === user.id) && activeVoting && (
                      <i className="ms-1 bi bi-check-circle-fill text-success"></i>
                    )}
                    {user.id === currentUser.id && ' (Você)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {isPlayer && !isHost && activeVoting && (
            <div>
              <span className="small">
                {hasVoted ? 'Você votou!' : 'Aguardando seu voto...'}
              </span>
            </div>
          )}
        </div>
      </footer>
      
      {/* Modal para criar nova votação */}
      <CreateVotingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateVoting} 
      />
    </div>
  );
};

export default Room;
