const roomModel = require('../models/roomModel');

// Armazenamento global de salas e usuários
const activeRooms = new Map(); // roomId -> Room
const roomsByCode = new Map(); // code -> roomId
const userSockets = new Map(); // userId -> socketId

// Função para inicializar as salas do banco de dados
async function initializeRooms() {
  try {
    const allRooms = await roomModel.getAllRooms();
    
    for (const room of allRooms) {
      activeRooms.set(room.id, room);
      roomsByCode.set(room.code, room.id);
      console.log(`Sala carregada: ${room.name} (${room.code})`);
    }
    
    console.log(`${activeRooms.size} salas carregadas do banco de dados`);
  } catch (error) {
    console.error('Erro ao carregar salas do banco de dados:', error);
  }
}

function socketHandlers(io) {
  // Carregar todas as salas ativas do banco de dados ao iniciar o servidor
  initializeRooms();
  
  io.on('connection', (socket) => {
    console.log(`Usuário conectado: ${socket.id}`);
    
    // Entrar em uma sala
    socket.on('join-room', async ({ roomId, userId, roomCode }) => {
      try {
        console.log(`Tentando entrar na sala: ID=${roomId}, Código=${roomCode}, Usuário=${userId}`);
        
        // Verificar se já existe uma sala com este código
        let existingRoomId = roomsByCode.get(roomCode);
        let room;
        
        if (existingRoomId && existingRoomId !== roomId) {
          console.log(`Sala com código ${roomCode} já existe (ID: ${existingRoomId}). Redirecionando usuário.`);
          
          // Adicionar o usuário à sala existente
          room = await roomModel.addUserToRoom(existingRoomId, userId, 'Usuário Redirecionado');
          roomId = existingRoomId; // Usar o ID da sala existente
        } else {
          // Buscar sala atualizada do banco de dados
          room = await roomModel.getRoomById(roomId);
        }
        
        // Adicionar socket à sala usando o código como identificador principal
        socket.join(roomCode);
        socket.join(roomId); // Manter compatibilidade
        
        // Associar o socket ao usuário
        userSockets.set(userId, socket.id);
        
        // Atualizar a sala no armazenamento
        activeRooms.set(roomId, room);
        roomsByCode.set(room.code, roomId);
        
        // Notificar todos na sala (usando código e ID)
        io.to(roomCode).emit('room-updated', room);
        io.to(roomId).emit('room-updated', room);
        
        // Notificar sobre o novo usuário (para todos, incluindo o emissor)
        io.to(roomCode).emit('user-joined', { 
          roomId, 
          user: room.users.find(user => user.id === userId) 
        });
        
        // Garantir que o evento seja enviado também pelo ID da sala
        io.to(roomId).emit('user-joined', { 
          roomId, 
          user: room.users.find(user => user.id === userId) 
        });
        
        console.log(`Usuário ${userId} entrou na sala ${roomId} (${room.code})`);
        console.log(`Usuários na sala: ${room.users.map(u => u.name).join(', ')}`);
      } catch (error) {
        console.error('Erro ao entrar na sala:', error);
        socket.emit('error', { message: 'Erro ao entrar na sala' });
      }
    });
    
    // Sair de uma sala
    socket.on('leave-room', async ({ roomId, userId, roomCode }) => {
      try {
        console.log(`Tentando sair da sala: ID=${roomId}, Código=${roomCode}, Usuário=${userId}`);
        
        // Se o código da sala foi fornecido, verificar se existe uma sala com este código
        if (roomCode) {
          const existingRoomId = roomsByCode.get(roomCode);
          if (existingRoomId && existingRoomId !== roomId) {
            console.log(`Usando ID da sala existente: ${existingRoomId} em vez de ${roomId}`);
            roomId = existingRoomId;
          }
        }
        
        // Remover usuário da sala no banco de dados
        const room = await roomModel.removeUserFromRoom(roomId, userId);
        
        // Remover socket da sala (usando código e ID)
        if (roomCode) socket.leave(roomCode);
        socket.leave(roomId);
        
        // Remover associação do usuário com o socket
        userSockets.delete(userId);
        
        // Atualizar a sala no armazenamento
        if (room) {
          activeRooms.set(roomId, room);
          
          // Se a sala está vazia, removê-la do armazenamento
          if (room.users.length === 0) {
            activeRooms.delete(roomId);
            // Encontrar e remover o código da sala
            for (const [code, id] of roomsByCode.entries()) {
              if (id === roomId) {
                roomsByCode.delete(code);
                break;
              }
            }
            console.log(`Sala ${roomId} (${roomCode || 'sem código'}) removida por estar vazia`);
          } else {
            // Notificar todos na sala (usando código e ID)
            if (roomCode) {
              io.to(roomCode).emit('room-updated', room);
              io.to(roomCode).emit('user-left', { roomId, userId });
            }
            io.to(roomId).emit('room-updated', room);
            io.to(roomId).emit('user-left', { roomId, userId });
            
            console.log(`Usuário ${userId} saiu da sala ${roomId} (${roomCode || 'sem código'})`);
            console.log(`Usuários restantes: ${room.users.map(u => u.name).join(', ')}`);
          }
        }
      } catch (error) {
        console.error('Erro ao sair da sala:', error);
        socket.emit('error', { message: 'Erro ao sair da sala' });
      }
    });
    
    // Submeter voto
    socket.on('submit-vote', async ({ roomId, roundId, userId, value, roomCode }) => {
      try {
        console.log(`Tentando submeter voto: ID=${roomId}, Código=${roomCode}, Usuário=${userId}, Valor=${value}`);
        
        // Se o código da sala foi fornecido, verificar se existe uma sala com este código
        if (roomCode) {
          const existingRoomId = roomsByCode.get(roomCode);
          if (existingRoomId && existingRoomId !== roomId) {
            console.log(`Usando ID da sala existente: ${existingRoomId} em vez de ${roomId}`);
            roomId = existingRoomId;
          }
        }
        
        // Registrar voto no banco de dados
        const room = await roomModel.submitVote(roundId, userId, value);
        
        // Atualizar a sala no armazenamento
        activeRooms.set(roomId, room);
        
        // Notificar todos na sala (usando código e ID)
        if (roomCode) {
          io.to(roomCode).emit('room-updated', room);
          io.to(roomCode).emit('vote-submitted', { 
            roomId, 
            vote: {
              userId,
              value,
              userName: room.users.find(user => user.id === userId)?.name
            }
          });
        }
        io.to(roomId).emit('room-updated', room);
        io.to(roomId).emit('vote-submitted', { 
          roomId, 
          vote: {
            userId,
            value,
            userName: room.users.find(user => user.id === userId)?.name
          }
        });
        
        console.log(`Usuário ${userId} votou na sala ${roomId} (${roomCode || 'sem código'}): ${value}`);
        
        // Verificar se todos os players votaram (excluindo o host)
        const playersCount = room.users.filter(user => user.role === 'player').length;
        const votesCount = room.currentRound.votes.length;
        
        if (playersCount === votesCount) {
          console.log(`Todos os ${votesCount} players votaram na sala ${roomId}`);
        } else {
          console.log(`${votesCount}/${playersCount} votaram na sala ${roomId}`);
        }
      } catch (error) {
        console.error('Erro ao submeter voto:', error);
        socket.emit('error', { message: 'Erro ao submeter voto' });
      }
    });
    
    // Revelar cards
    socket.on('reveal-cards', async ({ roomId, roundId, roomCode }) => {
      try {
        console.log(`Tentando revelar cards: ID=${roomId}, Código=${roomCode}, Round=${roundId}`);
        
        // Se o código da sala foi fornecido, verificar se existe uma sala com este código
        if (roomCode) {
          const existingRoomId = roomsByCode.get(roomCode);
          if (existingRoomId && existingRoomId !== roomId) {
            console.log(`Usando ID da sala existente: ${existingRoomId} em vez de ${roomId}`);
            roomId = existingRoomId;
          }
        }
        
        // Atualizar visibilidade dos cards no banco de dados
        const room = await roomModel.toggleCardsVisibility(roundId, true);
        
        // Atualizar a sala no armazenamento
        activeRooms.set(roomId, room);
        
        // Notificar todos na sala (usando código e ID)
        if (roomCode) {
          io.to(roomCode).emit('room-updated', room);
          io.to(roomCode).emit('cards-revealed', { roomId });
        }
        io.to(roomId).emit('room-updated', room);
        io.to(roomId).emit('cards-revealed', { roomId });
        
        console.log(`Cards revelados na sala ${roomId} (${roomCode || 'sem código'})`);
      } catch (error) {
        console.error('Erro ao revelar cards:', error);
        socket.emit('error', { message: 'Erro ao revelar cards' });
      }
    });
    
    // Esconder cards
    socket.on('hide-cards', async ({ roomId, roundId, roomCode }) => {
      try {
        console.log(`Tentando esconder cards: ID=${roomId}, Código=${roomCode}, Round=${roundId}`);
        
        // Se o código da sala foi fornecido, verificar se existe uma sala com este código
        if (roomCode) {
          const existingRoomId = roomsByCode.get(roomCode);
          if (existingRoomId && existingRoomId !== roomId) {
            console.log(`Usando ID da sala existente: ${existingRoomId} em vez de ${roomId}`);
            roomId = existingRoomId;
          }
        }
        
        // Atualizar visibilidade dos cards no banco de dados
        const room = await roomModel.toggleCardsVisibility(roundId, false);
        
        // Atualizar a sala no armazenamento
        activeRooms.set(roomId, room);
        
        // Notificar todos na sala (usando código e ID)
        if (roomCode) {
          io.to(roomCode).emit('room-updated', room);
          io.to(roomCode).emit('cards-hidden', { roomId });
        }
        io.to(roomId).emit('room-updated', room);
        io.to(roomId).emit('cards-hidden', { roomId });
        
        console.log(`Cards escondidos na sala ${roomId} (${roomCode || 'sem código'})`);
      } catch (error) {
        console.error('Erro ao esconder cards:', error);
        socket.emit('error', { message: 'Erro ao esconder cards' });
      }
    });
    
    // Iniciar nova rodada
    socket.on('start-new-round', async ({ roomId, title, subtitle, roomCode }) => {
      try {
        console.log(`Tentando iniciar nova rodada: ID=${roomId}, Código=${roomCode}, Título=${title}`);
        
        // Se o código da sala foi fornecido, verificar se existe uma sala com este código
        if (roomCode) {
          const existingRoomId = roomsByCode.get(roomCode);
          if (existingRoomId && existingRoomId !== roomId) {
            console.log(`Usando ID da sala existente: ${existingRoomId} em vez de ${roomId}`);
            roomId = existingRoomId;
          }
        }
        
        // Criar nova rodada no banco de dados
        const room = await roomModel.createRound(roomId, title, subtitle);
        
        // Atualizar a sala no armazenamento
        activeRooms.set(roomId, room);
        
        // Notificar todos na sala (usando código e ID)
        if (roomCode) {
          io.to(roomCode).emit('room-updated', room);
          io.to(roomCode).emit('new-round-started', { 
            roomId, 
            round: room.currentRound 
          });
        }
        io.to(roomId).emit('room-updated', room);
        io.to(roomId).emit('new-round-started', { 
          roomId, 
          round: room.currentRound 
        });
        
        console.log(`Nova rodada iniciada na sala ${roomId} (${roomCode || 'sem código'}): ${title}`);
      } catch (error) {
        console.error('Erro ao iniciar nova rodada:', error);
        socket.emit('error', { message: 'Erro ao iniciar nova rodada' });
      }
    });
    
    // Definir estimativa final
    socket.on('set-final-estimate', async ({ roomId, roundId, value, roomCode }) => {
      try {
        console.log(`Tentando definir estimativa final: ID=${roomId}, Código=${roomCode}, Round=${roundId}, Valor=${value}`);
        
        // Se o código da sala foi fornecido, verificar se existe uma sala com este código
        if (roomCode) {
          const existingRoomId = roomsByCode.get(roomCode);
          if (existingRoomId && existingRoomId !== roomId) {
            console.log(`Usando ID da sala existente: ${existingRoomId} em vez de ${roomId}`);
            roomId = existingRoomId;
          }
        }
        
        // Atualizar estimativa final no banco de dados
        const room = await roomModel.setFinalEstimate(roundId, value);
        
        // Atualizar a sala no armazenamento
        activeRooms.set(roomId, room);
        
        // Notificar todos na sala (usando código e ID)
        if (roomCode) {
          io.to(roomCode).emit('room-updated', room);
          io.to(roomCode).emit('final-estimate-set', { 
            roomId, 
            roundId, 
            value 
          });
        }
        io.to(roomId).emit('room-updated', room);
        io.to(roomId).emit('final-estimate-set', { 
          roomId, 
          roundId, 
          value 
        });
        
        console.log(`Estimativa final definida na sala ${roomId} (${roomCode || 'sem código'}): ${value}`);
      } catch (error) {
        console.error('Erro ao definir estimativa final:', error);
        socket.emit('error', { message: 'Erro ao definir estimativa final' });
      }
    });
    
    // Excluir uma rodada
    socket.on('delete-round', async ({ roomId, roundId, roomCode }) => {
      try {
        console.log(`Tentando excluir rodada: ID=${roomId}, Código=${roomCode}, Round=${roundId}`);
        
        // Se o código da sala foi fornecido, verificar se existe uma sala com este código
        if (roomCode) {
          const existingRoomId = roomsByCode.get(roomCode);
          if (existingRoomId && existingRoomId !== roomId) {
            console.log(`Usando ID da sala existente: ${existingRoomId} em vez de ${roomId}`);
            roomId = existingRoomId;
          }
        }
        
        // Excluir a rodada no banco de dados
        const room = await roomModel.deleteRound(roundId);
        
        // Atualizar a sala no armazenamento
        activeRooms.set(roomId, room);
        
        // Notificar todos na sala (usando código e ID)
        if (roomCode) {
          io.to(roomCode).emit('room-updated', room);
          io.to(roomCode).emit('round-deleted', { 
            roomId, 
            roundId 
          });
        }
        io.to(roomId).emit('room-updated', room);
        io.to(roomId).emit('round-deleted', { 
          roomId, 
          roundId 
        });
        
        console.log(`Rodada ${roundId} excluída da sala ${roomId} (${roomCode || 'sem código'})`);
      } catch (error) {
        console.error('Erro ao excluir rodada:', error);
        socket.emit('error', { message: 'Erro ao excluir rodada' });
      }
    });
    
    // Iniciar uma votação (ativar uma rodada específica)
    socket.on('start-voting', async ({ roomId, roundId, roomCode }) => {
      try {
        console.log(`Tentando iniciar votação: ID=${roomId}, Código=${roomCode}, Round=${roundId}`);
        
        // Se o código da sala foi fornecido, verificar se existe uma sala com este código
        if (roomCode) {
          const existingRoomId = roomsByCode.get(roomCode);
          if (existingRoomId && existingRoomId !== roomId) {
            console.log(`Usando ID da sala existente: ${existingRoomId} em vez de ${roomId}`);
            roomId = existingRoomId;
          }
        }
        
        // Iniciar a votação no banco de dados
        const room = await roomModel.startVoting(roomId, roundId);
        
        // Atualizar a sala no armazenamento
        activeRooms.set(roomId, room);
        
        // Notificar todos na sala (usando código e ID)
        if (roomCode) {
          io.to(roomCode).emit('room-updated', room);
          io.to(roomCode).emit('voting-started', { 
            roomId, 
            roundId 
          });
        }
        io.to(roomId).emit('room-updated', room);
        io.to(roomId).emit('voting-started', { 
          roomId, 
          roundId 
        });
        
        console.log(`Votação iniciada na sala ${roomId} (${roomCode || 'sem código'}) para a rodada ${roundId}`);
      } catch (error) {
        console.error('Erro ao iniciar votação:', error);
        socket.emit('error', { message: 'Erro ao iniciar votação' });
      }
    });
    
    // Encerrar a votação atual
    socket.on('end-voting', async ({ roomId, roomCode }) => {
      try {
        console.log(`Tentando encerrar votação: ID=${roomId}, Código=${roomCode}`);
        
        // Se o código da sala foi fornecido, verificar se existe uma sala com este código
        if (roomCode) {
          const existingRoomId = roomsByCode.get(roomCode);
          if (existingRoomId && existingRoomId !== roomId) {
            console.log(`Usando ID da sala existente: ${existingRoomId} em vez de ${roomId}`);
            roomId = existingRoomId;
          }
        }
        
        // Encerrar a votação no banco de dados
        const room = await roomModel.endVoting(roomId);
        
        // Atualizar a sala no armazenamento
        activeRooms.set(roomId, room);
        
        // Notificar todos na sala (usando código e ID)
        if (roomCode) {
          io.to(roomCode).emit('room-updated', room);
          io.to(roomCode).emit('voting-ended', { 
            roomId 
          });
        }
        io.to(roomId).emit('room-updated', room);
        io.to(roomId).emit('voting-ended', { 
          roomId 
        });
        
        console.log(`Votação encerrada na sala ${roomId} (${roomCode || 'sem código'})`);
      } catch (error) {
        console.error('Erro ao encerrar votação:', error);
        socket.emit('error', { message: 'Erro ao encerrar votação' });
      }
    });
    
    // Desconexão
    socket.on('disconnect', () => {
      console.log(`Usuário desconectado: ${socket.id}`);
      
      // Encontrar o usuário pelo socket ID
      let disconnectedUserId = null;
      let disconnectedRoomId = null;
      
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }
      
      if (disconnectedUserId) {
        // Encontrar a sala do usuário
        for (const [roomId, room] of activeRooms.entries()) {
          const userInRoom = room.users.some(user => user.id === disconnectedUserId);
          if (userInRoom) {
            disconnectedRoomId = roomId;
            break;
          }
        }
        
        if (disconnectedRoomId) {
          // Remover usuário da sala no banco de dados
          roomModel.removeUserFromRoom(disconnectedRoomId, disconnectedUserId)
            .then(room => {
              if (room) {
                // Atualizar a sala no armazenamento
                activeRooms.set(disconnectedRoomId, room);
                
                // Se a sala está vazia, removê-la do armazenamento
                if (room.users.length === 0) {
                  activeRooms.delete(disconnectedRoomId);
                  // Encontrar e remover o código da sala
                  for (const [code, id] of roomsByCode.entries()) {
                    if (id === disconnectedRoomId) {
                      roomsByCode.delete(code);
                      break;
                    }
                  }
                  console.log(`Sala ${disconnectedRoomId} removida por estar vazia`);
                } else {
                  // Notificar todos na sala
                  io.to(disconnectedRoomId).emit('room-updated', room);
                  io.to(disconnectedRoomId).emit('user-left', { roomId: disconnectedRoomId, userId: disconnectedUserId });
                  console.log(`Usuário ${disconnectedUserId} saiu da sala ${disconnectedRoomId} (desconectado)`);
                  console.log(`Usuários restantes: ${room.users.map(u => u.name).join(', ')}`);
                }
              }
            })
            .catch(error => {
              console.error('Erro ao remover usuário da sala:', error);
            });
          
          // Remover associação do usuário com o socket
          userSockets.delete(disconnectedUserId);
        }
      }
    });
  });
}

module.exports = socketHandlers;
