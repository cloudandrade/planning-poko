import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { socketService } from '../services/socketService';
import { createRoom as apiCreateRoom, joinRoom as apiJoinRoom } from '../services/apiService';
import type { Room, User, RoomContextType, CardValue } from '../types';

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
  try {
    const userStr = localStorage.getItem('planningPoko_user');
    const roomStr = localStorage.getItem('planningPoko_room');
    
    if (userStr && roomStr) {
      return {
        user: JSON.parse(userStr) as User,
        room: JSON.parse(roomStr) as Room
      };
    }
  } catch (error) {
    console.error('Erro ao carregar dados do localStorage:', error);
    // Limpar localStorage em caso de erro
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
  const [error, setError] = useState<string | null>(null);
  
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
        
        // Preservar o estado activeVoting quando receber atualizações da sala
        // Isso evita que novos usuários afetem o estado da votação ativa
        setCurrentRoom(prevRoom => {
          if (!prevRoom) return room;
          
          return {
            ...room,
            activeVoting: prevRoom.activeVoting
          };
        });
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
    
    return () => {
      // Limpeza ao desmontar
      socketService.disconnect();
    };
  }, []); // Executar apenas uma vez na montagem do componente

  // Função para gerar um código de sala de 4 letras maiúsculas
  const generateRoomCode = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  };

  // Funções para interagir com a sala
  const createRoom = useCallback(async (roomName: string, userName: string) => {
    try {
      // Gerar um código para a sala
      const roomCode = generateRoomCode();
      
      // Verificar se já existe uma sala com esse código
      try {
        // Tentar buscar a sala pelo código
        const existingRoom = await apiJoinRoom(roomCode, userName);
        
        // Se não lançar erro, significa que a sala existe
        // Atualizar o estado
        setCurrentUser(existingRoom.user);
        setCurrentRoom(existingRoom.room);
        
        // Conectar ao socket para receber atualizações em tempo real
        socketService.emit('join-room', { 
          roomId: existingRoom.room.id, 
          userId: existingRoom.user.id,
          roomCode: existingRoom.room.code
        });
      } catch {  // Ignorar o erro, significa que a sala não existe
        // Se lançar erro, significa que a sala não existe
        // Criar uma nova sala
        const room = await apiCreateRoom(roomName, userName);
        
        // Encontrar o usuário atual (o host)
        const currentUser = room.users.find((user: User) => user.isHost);
        
        if (!currentUser) {
          setError('Erro ao criar sala: usuário host não encontrado');
          return;
        }
        
        // Atualizar o estado
        setCurrentUser(currentUser);
        setCurrentRoom(room);
        
        // Conectar ao socket para receber atualizações em tempo real
        socketService.emit('join-room', { 
          roomId: room.id, 
          userId: currentUser.id,
          roomCode: room.code
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Erro ao criar sala:', err);
      setError('Erro ao criar sala. Tente novamente.');
    }
  }, []);
  
  const joinRoom = useCallback(async (roomCode: string, userName: string) => {
    try {
      // Chamar a API para entrar em uma sala
      const response = await apiJoinRoom(roomCode, userName);
      
      // Atualizar o estado
      setCurrentUser(response.user);
      setCurrentRoom(response.room);
      
      // Conectar ao socket para receber atualizações em tempo real
      socketService.emit('join-room', { 
        roomId: response.room.id, 
        userId: response.user.id,
        roomCode: response.room.code
      });
      
      setError(null);
    } catch (err) {
      console.error('Erro ao entrar na sala:', err);
      setError('Sala não encontrada ou erro ao entrar. Verifique o código e tente novamente.');
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
        activeVoting: false
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
    startNewRound,
    setFinalEstimate,
    deleteRound,
    startVoting,
    endVoting,
    error
  }), [
    currentUser, 
    currentRoom, 
    isConnected, 
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    submitVote,
    revealCards,
    hideCards,
    startNewRound,
    setFinalEstimate,
    deleteRound,
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
