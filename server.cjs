const path = require('node:path');
const http = require('node:http');

const express = require('express');
const cors = require('cors');
const next = require('next');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

// Variáveis na RAIZ do repositório (monólito: Next + API + Socket.io).
// Depois, backend/.env só preenche chaves que ainda não existirem (migração legada).
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

const { initializeDatabase } = require('./backend/src/databaseMongo');
const roomRoutes = require('./backend/src/routes/roomRoutes');
const socketHandlers = require('./backend/src/socket/socketHandlers');

const port = Number(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== 'production';

const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

async function main() {
  // Conectar no MongoDB antes de inicializar salas e aceitar eventos
  await initializeDatabase();
  await nextApp.prepare();

  const app = express();

  app.use(cors());
  app.use(express.json());

  // API do Planning Poko
  app.use('/api/rooms', roomRoutes);

  // Renderizar páginas do Next (fallback para qualquer rota)
  app.use((req, res) => handle(req, res));

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  socketHandlers(io);

  server.listen(port, () => {
    console.log(`Servidor unificado rodando em http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('Falha ao iniciar server unificado:', err);
  process.exit(1);
});

