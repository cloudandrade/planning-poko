const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Criar uma nova sala
router.post('/', roomController.createRoom);

// Buscar sala pelo código
router.get('/:code', roomController.getRoomByCode);

// Entrar em uma sala
router.post('/:code/join', roomController.joinRoom);

module.exports = router;
