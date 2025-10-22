const { v4: uuidv4 } = require('uuid');
const roomModel = require('../models/roomModel');

// Criar uma nova sala
async function createRoom(req, res) {
  try {
    const { name, userName, code } = req.body;
    
    if (!name || !userName) {
      return res.status(400).json({ error: 'Nome da sala e nome do usuário são obrigatórios' });
    }
    
    // Se um código foi fornecido, verificar se já existe uma sala com esse código
    if (code) {
      const existingRoom = await roomModel.getRoomByCode(code);
      
      if (existingRoom) {
        // Se a sala já existe, adicionar o usuário à sala existente
        const userId = uuidv4();
        const updatedRoom = await roomModel.addUserToRoom(existingRoom.id, userId, userName, true);
        
        return res.status(200).json({
          room: updatedRoom,
          user: {
            id: userId,
            name: userName,
            role: 'host',
            isHost: true
          }
        });
      }
    }
    
    // Criar uma nova sala
    const userId = uuidv4();
    const room = await roomModel.createRoom(name, userId, userName);
    
    res.status(201).json(room);
  } catch (error) {
    console.error('Erro ao criar sala:', error);
    res.status(500).json({ error: 'Erro ao criar sala' });
  }
}

// Buscar sala pelo código
async function getRoomByCode(req, res) {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({ error: 'Código da sala é obrigatório' });
    }
    
    const room = await roomModel.getRoomByCode(code);
    
    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('Erro ao buscar sala:', error);
    res.status(500).json({ error: 'Erro ao buscar sala' });
  }
}

// Entrar em uma sala
async function joinRoom(req, res) {
  try {
    const { code } = req.params;
    const { userName } = req.body;
    
    if (!code || !userName) {
      return res.status(400).json({ error: 'Código da sala e nome do usuário são obrigatórios' });
    }
    
    // Buscar a sala pelo código
    const room = await roomModel.getRoomByCode(code);
    
    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }
    
    // Adicionar o usuário à sala
    const userId = uuidv4();
    const updatedRoom = await roomModel.addUserToRoom(room.id, userId, userName);
    
    // Retornar a sala atualizada e as informações do usuário
    res.json({
      room: updatedRoom,
      user: {
        id: userId,
        name: userName,
        role: 'voter',
        isHost: false
      }
    });
  } catch (error) {
    console.error('Erro ao entrar na sala:', error);
    res.status(500).json({ error: 'Erro ao entrar na sala' });
  }
}

module.exports = {
  createRoom,
  getRoomByCode,
  joinRoom
};
