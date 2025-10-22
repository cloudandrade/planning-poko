const { db } = require('../database');
const { v4: uuidv4 } = require('uuid');

// Gerar código de sala de 4 letras maiúsculas
function generateRoomCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

// Verificar se o código já existe
function isCodeUnique(code) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM rooms WHERE code = ?', [code], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(!row);
    });
  });
}

// Gerar um código único
async function generateUniqueCode() {
  let code = generateRoomCode();
  let isUnique = await isCodeUnique(code);
  
  // Se o código já existir, gerar outro até encontrar um único
  while (!isUnique) {
    code = generateRoomCode();
    isUnique = await isCodeUnique(code);
  }
  
  return code;
}

// Criar uma nova sala
async function createRoom(name, hostId, hostName) {
  const roomId = uuidv4();
  const code = await generateUniqueCode();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Inserir a sala
      db.run(
        'INSERT INTO rooms (id, code, name, host_id) VALUES (?, ?, ?, ?)',
        [roomId, code, name, hostId],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // Inserir o host como usuário
          db.run(
            'INSERT INTO users (id, name, room_id, is_host, role) VALUES (?, ?, ?, 1, ?)',
            [hostId, hostName, roomId, 'host'],
            function(err) {
              if (err) {
                reject(err);
                return;
              }
              
              // Criar a primeira rodada
              const roundId = uuidv4();
              db.run(
                'INSERT INTO rounds (id, room_id, title) VALUES (?, ?, ?)',
                [roundId, roomId, 'Nova história'],
                function(err) {
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  // Retornar a sala criada
                  getRoomById(roomId)
                    .then(room => resolve(room))
                    .catch(err => reject(err));
                }
              );
            }
          );
        }
      );
    });
  });
}

// Buscar sala pelo ID
function getRoomById(roomId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!room) {
        resolve(null);
        return;
      }
      
      // Buscar usuários da sala
      db.all('SELECT * FROM users WHERE room_id = ?', [roomId], (err, users) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Buscar rodadas da sala
        db.all('SELECT * FROM rounds WHERE room_id = ? ORDER BY created_at DESC', [roomId], (err, rounds) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Buscar votos para cada rodada
          const roundPromises = rounds.map(round => {
            return new Promise((resolve, reject) => {
              db.all('SELECT v.*, u.name as user_name FROM votes v JOIN users u ON v.user_id = u.id WHERE v.round_id = ?', [round.id], (err, votes) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                resolve({
                  ...round,
                  votes: votes.map(vote => ({
                    userId: vote.user_id,
                    userName: vote.user_name,
                    value: vote.value
                  }))
                });
              });
            });
          });
          
          Promise.all(roundPromises)
            .then(roundsWithVotes => {
              // Formatar a resposta
              const formattedRoom = {
                id: room.id,
                code: room.code,
                name: room.name,
                hostId: room.host_id,
                users: users.map(user => ({
                  id: user.id,
                  name: user.name,
                  role: user.role,
                  isHost: user.is_host === 1
                })),
                rounds: roundsWithVotes.map(round => ({
                  id: round.id,
                  title: round.title,
                  subtitle: round.subtitle || '',
                  revealed: round.revealed === 1,
                  finalEstimate: round.final_estimate || null,
                  votes: round.votes,
                  active: false
                })),
                currentRound: roundsWithVotes[0] ? {
                  id: roundsWithVotes[0].id,
                  title: roundsWithVotes[0].title,
                  subtitle: roundsWithVotes[0].subtitle || '',
                  revealed: roundsWithVotes[0].revealed === 1,
                  finalEstimate: roundsWithVotes[0].final_estimate || null,
                  votes: roundsWithVotes[0].votes,
                  active: false
                } : null,
                activeVoting: false
              };
              
              resolve(formattedRoom);
            })
            .catch(err => reject(err));
        });
      });
    });
  });
}

// Buscar sala pelo código
function getRoomByCode(code) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM rooms WHERE code = ?', [code.toUpperCase()], (err, room) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!room) {
        resolve(null);
        return;
      }
      
      getRoomById(room.id)
        .then(room => resolve(room))
        .catch(err => reject(err));
    });
  });
}

// Adicionar usuário a uma sala
function addUserToRoom(roomId, userId, userName, isHost = false) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (id, name, room_id, is_host, role) VALUES (?, ?, ?, ?, ?)',
      [userId, userName, roomId, isHost ? 1 : 0, isHost ? 'host' : 'player'],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        // Verificar se a sala está em estado de votação ativa
        db.get('SELECT active_voting FROM rooms WHERE id = ?', [roomId], (err, result) => {
          if (err) {
            console.error('Erro ao verificar estado de votação:', err);
            // Continuar mesmo com erro
          }
          
          // Buscar a sala atualizada
          getRoomById(roomId)
            .then(room => {
              // Se a sala estiver em votação ativa, manter esse estado
              if (result && result.active_voting === 1) {
                const updatedRoom = {
                  ...room,
                  activeVoting: true
                };
                resolve(updatedRoom);
              } else {
                resolve(room);
              }
            })
            .catch(err => reject(err));
        });
      }
    );
  });
}

// Remover usuário de uma sala
function removeUserFromRoom(roomId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM users WHERE id = ? AND room_id = ?',
      [userId, roomId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        getRoomById(roomId)
          .then(room => resolve(room))
          .catch(err => reject(err));
      }
    );
  });
}

// Criar uma nova rodada
function createRound(roomId, title, subtitle = '') {
  const roundId = uuidv4();
  
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO rounds (id, room_id, title, subtitle) VALUES (?, ?, ?, ?)',
      [roundId, roomId, title, subtitle],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        getRoomById(roomId)
          .then(room => resolve(room))
          .catch(err => reject(err));
      }
    );
  });
}

// Revelar ou esconder os cards de uma rodada
function toggleCardsVisibility(roundId, revealed) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE rounds SET revealed = ? WHERE id = ?',
      [revealed ? 1 : 0, roundId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        // Buscar o ID da sala para poder retornar a sala atualizada
        db.get('SELECT room_id FROM rounds WHERE id = ?', [roundId], (err, round) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!round) {
            reject(new Error('Rodada não encontrada'));
            return;
          }
          
          // Retornar a sala atualizada
          getRoomById(round.room_id)
            .then(room => {
              // Garantir que a sala retornada mantenha o estado de votação ativa
              const updatedRoom = {
                ...room,
                activeVoting: true // Manter a votação ativa ao revelar/esconder cards
              };
              resolve(updatedRoom);
            })
            .catch(err => reject(err));
        });
      }
    );
  });
}

// Definir estimativa final de uma rodada
function setFinalEstimate(roundId, value) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE rounds SET final_estimate = ? WHERE id = ?',
      [value, roundId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        db.get('SELECT room_id FROM rounds WHERE id = ?', [roundId], (err, round) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!round) {
            reject(new Error('Rodada não encontrada'));
            return;
          }
          
          getRoomById(round.room_id)
            .then(room => {
              // Garantir que a sala retornada mantenha o estado de votação ativa
              const updatedRoom = {
                ...room,
                activeVoting: true // Manter a votação ativa ao definir estimativa final
              };
              resolve(updatedRoom);
            })
            .catch(err => reject(err));
        });
      }
    );
  });
}

// Registrar voto
function submitVote(roundId, userId, value) {
  return new Promise((resolve, reject) => {
    // Verificar se já existe um voto deste usuário nesta rodada
    db.get('SELECT id FROM votes WHERE round_id = ? AND user_id = ?', [roundId, userId], (err, vote) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (vote) {
        // Atualizar voto existente
        db.run(
          'UPDATE votes SET value = ? WHERE id = ?',
          [value, vote.id],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            db.get('SELECT room_id FROM rounds WHERE id = ?', [roundId], (err, round) => {
              if (err) {
                reject(err);
                return;
              }
              
              if (!round) {
                reject(new Error('Rodada não encontrada'));
                return;
              }
              
              getRoomById(round.room_id)
                .then(room => {
                  // Garantir que a sala retornada mantenha o estado de votação ativa
                  const updatedRoom = {
                    ...room,
                    activeVoting: true // Manter a votação ativa ao atualizar voto
                  };
                  resolve(updatedRoom);
                })
                .catch(err => reject(err));
            });
          }
        );
      } else {
        // Criar novo voto
        const voteId = uuidv4();
        db.run(
          'INSERT INTO votes (id, round_id, user_id, value) VALUES (?, ?, ?, ?)',
          [voteId, roundId, userId, value],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            db.get('SELECT room_id FROM rounds WHERE id = ?', [roundId], (err, round) => {
              if (err) {
                reject(err);
                return;
              }
              
              if (!round) {
                reject(new Error('Rodada não encontrada'));
                return;
              }
              
              getRoomById(round.room_id)
                .then(room => {
                  // Garantir que a sala retornada mantenha o estado de votação ativa
                  const updatedRoom = {
                    ...room,
                    activeVoting: true // Manter a votação ativa ao criar novo voto
                  };
                  resolve(updatedRoom);
                })
                .catch(err => reject(err));
            });
          }
        );
      }
    });
  });
}

// Buscar todas as salas
function getAllRooms() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id FROM rooms', [], (err, rooms) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!rooms || rooms.length === 0) {
        resolve([]);
        return;
      }
      
      // Buscar detalhes de cada sala
      Promise.all(rooms.map(room => getRoomById(room.id)))
        .then(roomsWithDetails => resolve(roomsWithDetails))
        .catch(err => reject(err));
    });
  });
}

// Excluir uma rodada
function deleteRound(roundId) {
  return new Promise((resolve, reject) => {
    // Primeiro, obter o ID da sala para poder retornar a sala atualizada depois
    db.get('SELECT room_id FROM rounds WHERE id = ?', [roundId], (err, round) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!round) {
        reject(new Error('Rodada não encontrada'));
        return;
      }
      
      const roomId = round.room_id;
      
      // Excluir a rodada
      db.run('DELETE FROM rounds WHERE id = ?', [roundId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        // Retornar a sala atualizada
        getRoomById(roomId)
          .then(room => resolve(room))
          .catch(err => reject(err));
      });
    });
  });
}

// Iniciar uma votação (ativar uma rodada específica)
function startVoting(roomId, roundId) {
  return new Promise((resolve, reject) => {
    // Verificar se a rodada existe e pertence à sala
    db.get('SELECT * FROM rounds WHERE id = ? AND room_id = ?', [roundId, roomId], (err, round) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!round) {
        reject(new Error('Rodada não encontrada ou não pertence à sala'));
        return;
      }
      
      // Atualizar a coluna active_voting na tabela rooms
      db.run('UPDATE rooms SET active_voting = 1 WHERE id = ?', [roomId], function(err) {
        if (err) {
          console.error('Erro ao atualizar estado de votação ativa:', err);
          // Continuar mesmo com erro
        }
        
        // Retornar a sala com a rodada ativa
        getRoomById(roomId)
          .then(room => {
            // Encontrar a rodada específica
            const activeRound = room.rounds.find(r => r.id === roundId);
            
            if (!activeRound) {
              reject(new Error('Rodada não encontrada na sala'));
              return;
            }
            
            // Atualizar a sala com a rodada ativa
            const updatedRoom = {
              ...room,
              currentRound: activeRound,
              activeVoting: true
            };
            
            resolve(updatedRoom);
          })
          .catch(err => reject(err));
      });
    });
  });
}

// Encerrar a votação atual
function endVoting(roomId) {
  return new Promise((resolve, reject) => {
    // Atualizar a coluna active_voting na tabela rooms
    db.run('UPDATE rooms SET active_voting = 0 WHERE id = ?', [roomId], function(err) {
      if (err) {
        console.error('Erro ao atualizar estado de votação ativa:', err);
        // Continuar mesmo com erro
      }
      
      // Retornar a sala com a votação encerrada
      getRoomById(roomId)
        .then(room => {
          // Atualizar a sala para encerrar a votação
          const updatedRoom = {
            ...room,
            activeVoting: false
          };
          
          resolve(updatedRoom);
        })
        .catch(err => reject(err));
    });
  });
}

module.exports = {
  createRoom,
  getRoomById,
  getRoomByCode,
  getAllRooms,
  addUserToRoom,
  removeUserFromRoom,
  createRound,
  toggleCardsVisibility,
  setFinalEstimate,
  submitVote,
  deleteRound,
  startVoting,
  endVoting
};
