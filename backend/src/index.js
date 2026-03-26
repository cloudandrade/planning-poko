// Carregar variáveis: prioriza .env na RAIZ do repo (um nível acima de backend/)
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initializeDatabase } = require('./databaseMongo');
const roomRoutes = require('./routes/roomRoutes');
const socketHandlers = require('./socket/socketHandlers');

async function start() {
  // Inicializar o banco de dados (aguarda a conexão no MongoDB)
  await initializeDatabase();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173', // URL do frontend
      methods: ['GET', 'POST']
    }
  });

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Rotas
  app.use('/api/rooms', roomRoutes);

  // Socket.io
  socketHandlers(io);

  // Rota de teste
  app.get('/', (req, res) => {
    res.send('Planning Poko API está funcionando!');
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Falha ao iniciar o backend:', err);
  process.exit(1);
});
