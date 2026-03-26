'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../components/Card';
import Button from '../components/Button';
import CreateVotingModal from '../components/CreateVotingModal';
import EditVotingModal from '../components/EditVotingModal';
import VotingList from '../components/VotingList';
import { useRoom } from '../hooks/useRoom';
import { CARD_VALUES } from '../types';
import type { CardValue, Round } from '../types';

const Room: React.FC = () => {
  const router = useRouter();
  const { 
    currentUser, 
    currentRoom, 
    leaveRoom, 
    submitVote, 
    revealCards, 
    hideCards,
    resetRoundVotes,
    startNewRound,
    setFinalEstimate,
    deleteRound,
    updateRound,
    startVoting,
    endVoting
  } = useRoom();
  
  const [selectedCard, setSelectedCard] = useState<CardValue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const lastVotingRoundIdRef = useRef<string | undefined>(undefined);
  const inviteCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (inviteCopiedTimerRef.current) clearTimeout(inviteCopiedTimerRef.current);
    };
  }, []);
  
  // Redirecionar se não estiver em uma sala
  useEffect(() => {
    if (!currentRoom || !currentUser) {
      router.push('/');
    }
  }, [currentRoom, currentUser, router]);
  
  // Ao mudar a rodada da votação, zerar seleção; com o mesmo round, só refletir voto já confirmado no servidor
  useEffect(() => {
    if (!currentRoom?.currentRound || !currentUser) {
      setSelectedCard(null);
      lastVotingRoundIdRef.current = undefined;
      return;
    }
    const roundId = currentRoom.currentRound.id;
    if (lastVotingRoundIdRef.current !== roundId) {
      lastVotingRoundIdRef.current = roundId;
      setSelectedCard(null);
    }
    const userVote = currentRoom.currentRound.votes.find((vote) => vote.userId === currentUser.id);
    if (userVote?.value != null && userVote.value !== '') {
      setSelectedCard(userVote.value as CardValue);
    } else {
      setSelectedCard(null);
    }
  }, [currentRoom?.currentRound?.id, currentUser?.id, currentRoom?.currentRound?.votes]);
  
  if (!currentRoom || !currentUser) {
    return null;
  }
  
  const isHost = currentUser.isHost;
  const isPlayer = currentUser.role === 'player';
  const activeVoting = currentRoom.activeVoting;
  const currentRound = currentRoom.currentRound;

  /** Média (só valores numéricos; ? não entra) e valor unânime para pré-selecionar estimativa do host */
  const revealedStats = useMemo(() => {
    if (!currentRound?.revealed) return null;
    const vals = currentRound.votes
      .map((v) => v.value)
      .filter((v): v is string => v != null && v !== '');
    if (vals.length === 0) {
      return { averageLabel: null as string | null, unanimousValue: null as string | null };
    }
    const first = vals[0];
    const unanimous = vals.every((v) => v === first);
    const nums = vals
      .map((v) => (v === '?' ? NaN : Number(v)))
      .filter((n) => !Number.isNaN(n));
    let averageLabel: string | null = null;
    if (nums.length > 0) {
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      averageLabel = avg.toLocaleString('pt-BR', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      });
    } else {
      averageLabel = '—';
    }
    return {
      averageLabel,
      unanimousValue: unanimous ? first : null,
    };
  }, [currentRound?.revealed, currentRound?.votes]);
  
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

  const handleResetVotes = () => {
    if (
      !window.confirm(
        'Reiniciar esta votação? Todos os votos serão apagados, os cards voltam a ficar ocultos e a estimativa final (se houver) será removida.'
      )
    ) {
      return;
    }
    resetRoundVotes();
  };
  
  const handleDeleteRound = (roundId: string) => {
    deleteRound(roundId);
  };

  const handleUpdateRound = (roundId: string, title: string, description: string) => {
    updateRound(roundId, title, description);
  };
  
  const handleLeaveRoom = () => {
    leaveRoom();
    router.push('/');
  };

  const buildInviteLink = () => {
    if (typeof window === 'undefined') return '';
    const u = new URL(window.location.origin);
    u.pathname = '/';
    u.searchParams.set('code', currentRoom.code);
    return u.toString();
  };

  const handleCopyInviteLink = async () => {
    const url = buildInviteLink();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setInviteLinkCopied(true);
      if (inviteCopiedTimerRef.current) clearTimeout(inviteCopiedTimerRef.current);
      inviteCopiedTimerRef.current = setTimeout(() => {
        setInviteLinkCopied(false);
        inviteCopiedTimerRef.current = null;
      }, 2500);
    } catch {
      window.prompt('Copie o link:', url);
    }
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
            <div className="d-flex flex-wrap align-items-center gap-2">
              <small className="text-secondary me-1">Código da sala:</small>
              <span className="badge bg-secondary">{currentRoom.code}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleCopyInviteLink}
                title="Copia um link para a tela de entrar na sala com o código já preenchido"
              >
                <i className="bi bi-link-45deg me-1" aria-hidden />
                {inviteLinkCopied ? 'Link copiado!' : 'Copiar link de convite'}
              </button>
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
            {(currentRound.votes.length > 0 ||
              currentRound.revealed ||
              Boolean(currentRound.finalEstimate)) && (
              <Button variant="outline" onClick={handleResetVotes}>
                <i className="bi bi-arrow-counterclockwise me-1" aria-hidden />
                Reiniciar votação
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
              onEdit={isHost ? (r) => setEditingRound(r) : undefined}
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

                {revealedStats?.averageLabel != null && (
                  <div
                    className="mt-4 p-3 rounded text-center"
                    style={{ backgroundColor: 'var(--dark-light)' }}
                  >
                    <div className="text-secondary small mb-1">Média dos votos</div>
                    <div className="fs-4 fw-semibold" style={{ color: 'var(--primary)' }}>
                      {revealedStats.averageLabel === '—'
                        ? 'Indefinida (sem valores numéricos)'
                        : revealedStats.averageLabel}
                    </div>
                    <div className="text-secondary small mt-1">
                      Valores &quot;?&quot; não entram na média.
                    </div>
                  </div>
                )}
                
                {isHost && !currentRound.finalEstimate && (
                  <div className="mt-4">
                    {revealedStats?.unanimousValue != null ? (
                      <>
                        <h3 className="fs-5 fw-medium mb-2">Confirmar estimativa final</h3>
                        <p className="text-secondary small mb-3">
                          Todos votaram o mesmo valor. Clique para confirmar.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary btn-lg px-4 position-relative"
                          style={{ minWidth: '120px' }}
                          onClick={() => setFinalEstimate(revealedStats.unanimousValue!)}
                        >
                          <span className="me-2" aria-hidden>
                            ✓
                          </span>
                          {revealedStats.unanimousValue}
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="fs-5 fw-medium mb-2">Escolha a estimativa final:</h3>
                        <div className="d-flex flex-wrap gap-2">
                          {CARD_VALUES.map((value) => (
                            <button
                              key={value}
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => setFinalEstimate(value)}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
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
                    <div className="row row-cols-3 row-cols-md-4 g-4 gy-4">
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
      <EditVotingModal
        isOpen={editingRound != null}
        round={editingRound}
        onClose={() => setEditingRound(null)}
        onSubmit={handleUpdateRound}
      />
    </div>
  );
};

export default Room;
