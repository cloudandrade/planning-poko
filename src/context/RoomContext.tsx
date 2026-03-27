'use client';

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { socketService } from '../services/socketService';
import { createRoom as apiCreateRoom, joinRoom as apiJoinRoom } from '../services/apiService';
import {
  errorMessageFromUnknown,
  socketErrorMessage,
  toastError,
} from '../lib/toast';
import type { Room, User, RoomContextType, CardValue, Round } from '../types';

// Criando o contexto
const RoomContext = createContext<RoomContextType | undefined>(undefined);

// Provedor do contexto
interface RoomProviderProps {
  children: ReactNode;
}

// Função para salvar os dados no localStorage
const saveToLocalStorage = (user: User | null, room: Room | null) => {
  if (user && room) {
    localStorage.setItem('planningPoko_user', JSON.stringify(user));
    localStorage.setItem('planningPoko_room', JSON.stringify(room));
  } else {
    localStorage.removeItem('planningPoko_user');
    localStorage.removeItem('planningPoko_room');
  }
};

// Função para carregar os dados do localStorage
const loadFromLocalStorage = () => {
  if (typeof window === 'undefined') {
    return { user: null, room: null };
  }

  try {
    const userStr = localStorage.getItem('planningPoko_user');
    const roomStr = localStorage.getItem('planningPoko_room');
    
    if (userStr && roomStr) {
      return {
        user: JSON.parse(userStr) as User,
        room: JSON.parse(roomStr) as Room
      };
    }
  } catch {
    queueMicrotask(() => {
      toastError('Não foi possível restaurar a sessão salva.');
    });
    localStorage.removeItem('planningPoko_user');
    localStorage.removeItem('planningPoko_room');
  }
  
  return { user: null, room: null };
};

export const RoomProvider: React.FC<RoomProviderProps> = ({ children }) => {
  // Carregar dados do localStorage
  const { user: cachedUser, room: cachedRoom } = loadFromLocalStorage();
  
  const [currentUser, setCurrentUser] = useState<User | null>(cachedUser);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(cachedRoom ? {
    ...cachedRoom,
    activeVoting: cachedRoom.activeVoting || false
  } : null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Usar refs para acessar o estado mais recente nos listeners de eventos
  const currentRoomRef = useRef(currentRoom);
  const currentUserRef = useRef(currentUser);
  
  // Atualizar as refs quando o estado mudar
  useEffect(() => {
    currentRoomRef.current = currentRoom;
    currentUserRef.current = currentUser;
  }, [currentRoom, currentUser]);

  // Efeito para salvar dados no localStorage quando mudam
  useEffect(() => {
    saveToLocalStorage(currentUser, currentRoom);
  }, [currentUser, currentRoom]);
  
  // Reconectar ao socket e à sala se tiver dados em cache
  useEffect(() => {
    if (currentUser && currentRoom) {
      // Conectar ao socket
      socketService.connect();
      setIsConnected(true);
      
      // Reconectar à sala
      socketService.emit('join-room', { 
        roomId: currentRoom.id, 
        userId: currentUser.id,
        roomCode: currentRoom.code
      });
    }
    // Este efeito deve ser executado apenas uma vez na montagem do componente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Inicializar socket e configurar listeners (apenas uma vez)
  useEffect(() => {
    // Conectar ao serviço de socket
    socketService.connect();
    setIsConnected(true);
    
    // Configurar listeners usando as refs para acessar o estado mais recente
    socketService.on('room-updated', (data: unknown) => {
      // Type assertion porque sabemos que o evento 'room-updated' sempre envia um objeto Room
      const room = data as Room;
      const currentRoom = currentRoomRef.current;
      
      if (currentRoom && room.id === currentRoom.id) {
        console.log('Sala atualizada:', room);
        // O servidor é a fonte de verdade para activeVoting e currentRound.
        // Não reutilizar prevRoom.activeVoting aqui: participantes ficariam com false
        // quando o host inicia a votação (eles só recebem esta atualização).
        setCurrentRoom(room);
      }
    });
    
    socketService.on('user-joined', (data: unknown) => {
      const { roomId, user } = data as { roomId: string; user: User };
      const currentRoom = currentRoomRef.current;
      
      console.log(`Usuário entrou na sala: ${user.name}`);
      
      // Atualizar a sala se for a sala atual
      if (currentRoom && roomId === currentRoom.id) {
        // Verificar se o usuário já está na lista
        const userExists = currentRoom.users.some((u: User) => u.id === user.id);
        
        if (!userExists) {
          console.log(`Adicionando usuário ${user.name} à sala`);
          setCurrentRoom(prevRoom => {
            if (!prevRoom) return null;
            return {
              ...prevRoom,
              users: [...prevRoom.users, user],
              // Preservar o estado de votação ativa quando um novo usuário entra
              activeVoting: prevRoom.activeVoting
            };
          });
        }
      }
    });
    
    socketService.on('user-left', (data: unknown) => {
      const { roomId, userId } = data as { roomId: string; userId: string };
      const currentRoom = currentRoomRef.current;
      
      console.log(`Usuário saiu da sala: ${userId}`);
      
      // Atualizar a sala se for a sala atual
      if (currentRoom && roomId === currentRoom.id) {
        console.log(`Removendo usuário ${userId} da sala`);
        setCurrentRoom(prevRoom => {
          if (!prevRoom) return null;
          return {
            ...prevRoom,
            users: prevRoom.users.filter(u => u.id !== userId),
            // Preservar o estado de votação ativa quando um usuário sai
            activeVoting: prevRoom.activeVoting
          };
        });
      }
    });

    socketService.on('server-error', (data: unknown) => {
      toastError(socketErrorMessage(data));
    });
    
    return () => {
      // Limpeza ao desmontar
      socketService.disconnect();
    };
  }, []); // Executar apenas uma vez na montagem do componente

  // Funções para interagir com a sala
  const createRoom = useCallback(async (roomName: string, userName: string): Promise<boolean> => {
    try {
      const room = await apiCreateRoom(roomName, userName);
      const hostUser = room.users.find((user: User) => user.isHost);

      if (!hostUser) {
        toastError('Erro ao criar sala: usuário host não encontrado.');
        return false;
      }

      setCurrentUser(hostUser);
      setCurrentRoom(room);

      socketService.emit('join-room', {
        roomId: room.id,
        userId: hostUser.id,
        roomCode: room.code,
      });
      return true;
    } catch (err) {
      toastError(
        errorMessageFromUnknown(err, 'Erro ao criar sala. Tente novamente.')
      );
      return false;
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, userName: string): Promise<boolean> => {
    try {
      const response = await apiJoinRoom(roomCode, userName);

      setCurrentUser(response.user);
      setCurrentRoom(response.room);

      socketService.emit('join-room', {
        roomId: response.room.id,
        userId: response.user.id,
        roomCode: response.room.code,
      });
      return true;
    } catch (err) {
      toastError(
        errorMessageFromUnknown(
          err,
          'Sala não encontrada ou erro ao entrar. Verifique o código e tente novamente.'
        )
      );
      return false;
    }
  }, []);
  
  const leaveRoom = useCallback(() => {
    if (!currentUser || !currentRoom) return;
    
    // Emitir evento para o serviço de socket
    socketService.emit('leave-room', { 
      roomId: currentRoom.id, 
      userId: currentUser.id,
      roomCode: currentRoom.code
    });
    
    // Limpar dados do localStorage
    localStorage.removeItem('planningPoko_user');
    localStorage.removeItem('planningPoko_room');
    
    setCurrentRoom(null);
    setCurrentUser(null);
  }, [currentUser, currentRoom]);
  
  const submitVote = useCallback((value: CardValue) => {
    if (!currentUser || !currentRoom || !currentRoom.currentRound) return;
    
    // Emitir evento para o serviço de socket
    socketService.emit('submit-vote', { 
      roomId: currentRoom.id, 
      roundId: currentRoom.currentRound.id,
      userId: currentUser.id,
      value,
      roomCode: currentRoom.code
    });
  }, [currentUser, currentRoom]);
  
  const revealCards = useCallback(() => {
    if (!currentUser?.isHost || !currentRoom || !currentRoom.currentRound) return;
    
    // Emitir evento para o serviço de socket
    socketService.emit('reveal-cards', { 
      roomId: currentRoom.id,
      roundId: currentRoom.currentRound.id,
      roomCode: currentRoom.code
    });
  }, [currentUser, currentRoom]);
  
  const hideCards = useCallback(() => {
    if (!currentUser?.isHost || !currentRoom || !currentRoom.currentRound) return;
    
    // Emitir evento para o serviço de socket
    socketService.emit('hide-cards', { 
      roomId: currentRoom.id,
      roundId: currentRoom.currentRound.id,
      roomCode: currentRoom.code
    });
  }, [currentUser, currentRoom]);

  const resetRoundVotes = useCallback(() => {
    if (!currentUser?.isHost || !currentRoom || !currentRoom.currentRound) return;

    const roundId = currentRoom.currentRound.id;
    socketService.emit('reset-round-votes', {
      roomId: currentRoom.id,
      roundId,
      roomCode: currentRoom.code,
    });

    setCurrentRoom((prev) => {
      if (!prev?.currentRound || prev.currentRound.id !== roundId) return prev;
      const emptyRound = {
        ...prev.currentRound,
        votes: [],
        revealed: false,
        finalEstimate: undefined,
      };
      return {
        ...prev,
        rounds: prev.rounds.map((r) => (r.id === roundId ? { ...r, ...emptyRound } : r)),
        currentRound: emptyRound,
      };
    });
  }, [currentUser, currentRoom]);
  
  const startNewRound = useCallback((title: string, subtitle?: string) => {
    if (!currentUser?.isHost || !currentRoom) return;
    
    // Emitir evento para o serviço de socket
    socketService.emit('start-new-round', { 
      roomId: currentRoom.id, 
      title,
      subtitle: subtitle || '',
      roomCode: currentRoom.code
    });
  }, [currentUser, currentRoom]);
  
  const setFinalEstimate = useCallback((value: string) => {
    if (!currentUser?.isHost || !currentRoom || !currentRoom.currentRound) return;
    
    // Emitir evento para o serviço de socket
    socketService.emit('set-final-estimate', { 
      roomId: currentRoom.id, 
      roundId: currentRoom.currentRound.id, 
      value,
      roomCode: currentRoom.code
    });
  }, [currentUser, currentRoom]);
  
  // Excluir uma rodada
  const deleteRound = useCallback((roundId: string) => {
    if (!currentUser?.isHost || !currentRoom) return;
    
    // Emitir evento para o serviço de socket
    socketService.emit('delete-round', { 
      roomId: currentRoom.id, 
      roundId,
      roomCode: currentRoom.code
    });
    
    // Atualizar o estado localmente para feedback imediato
    setCurrentRoom(prevRoom => {
      if (!prevRoom) return null;
      return {
        ...prevRoom,
        rounds: prevRoom.rounds.filter(round => round.id !== roundId)
      };
    });
  }, [currentUser, currentRoom]);

  const updateRound = useCallback(
    (roundId: string, title: string, subtitle?: string) => {
      if (!currentUser?.isHost || !currentRoom) return;

      socketService.emit('update-round', {
        roomId: currentRoom.id,
        roundId,
        title,
        subtitle: subtitle ?? '',
        roomCode: currentRoom.code,
      });

      setCurrentRoom((prevRoom) => {
        if (!prevRoom) return null;
        const sub = subtitle ?? '';
        const patch = (r: Round) =>
          r.id === roundId ? { ...r, title: title.trim(), subtitle: sub } : r;
        return {
          ...prevRoom,
          rounds: prevRoom.rounds.map(patch),
          currentRound:
            prevRoom.currentRound?.id === roundId
              ? { ...prevRoom.currentRound, title: title.trim(), subtitle: sub }
              : prevRoom.currentRound,
        };
      });
    },
    [currentUser, currentRoom]
  );
  
  // Iniciar uma votação (ativar uma rodada específica)
  const startVoting = useCallback((roundId: string) => {
    if (!currentUser?.isHost || !currentRoom) return;
    
    // Emitir evento para o serviço de socket
    socketService.emit('start-voting', { 
      roomId: currentRoom.id, 
      roundId,
      roomCode: currentRoom.code
    });
    
    // Atualizar o estado localmente para feedback imediato
    setCurrentRoom(prevRoom => {
      if (!prevRoom) return null;
      
      const selectedRound = prevRoom.rounds.find(round => round.id === roundId);
      if (!selectedRound) return prevRoom;
      
      return {
        ...prevRoom,
        currentRound: selectedRound,
        activeVoting: true
      };
    });
  }, [currentUser, currentRoom]);
  
  // Encerrar a votação atual
  const endVoting = useCallback(() => {
    if (!currentUser?.isHost || !currentRoom) return;
    
    // Emitir evento para o serviço de socket
    socketService.emit('end-voting', { 
      roomId: currentRoom.id,
      roomCode: currentRoom.code
    });
    
    // Atualizar o estado localmente para feedback imediato
    setCurrentRoom(prevRoom => {
      if (!prevRoom) return null;
      return {
        ...prevRoom,
        activeVoting: false,
        currentRound: null,
      };
    });
  }, [currentUser, currentRoom]);
  
  const value = React.useMemo(() => ({
    currentUser,
    currentRoom,
    isConnected,
    createRoom,
    joinRoom,
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
  }), [
    currentUser, 
    currentRoom, 
    isConnected,
    createRoom,
    joinRoom,
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
  ]);
  
  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};

// Exportando o contexto para ser usado pelo hook
export { RoomContext };
