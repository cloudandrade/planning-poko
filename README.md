# Planning Poker

Uma aplicação de Planning Poker para estimação ágil de histórias de usuário, desenvolvida com React, TypeScript, Bootstrap e Node.js.

## Estrutura do Projeto

```
plan-poker/
├── backend/           # Servidor Node.js com Express e Socket.IO
│   ├── src/
│   │   ├── controllers/  # Controladores da API
│   │   ├── models/       # Modelos de dados
│   │   ├── routes/       # Rotas da API
│   │   ├── socket/       # Handlers do Socket.IO
│   │   ├── database.js   # Configuração do banco de dados
│   │   └── index.js      # Ponto de entrada do backend
│   ├── package.json
│   └── README.md
├── src/               # Frontend React
│   ├── components/     # Componentes reutilizáveis
│   ├── context/        # Contextos React
│   ├── hooks/          # Hooks personalizados
│   ├── pages/          # Páginas da aplicação
│   ├── services/       # Serviços (API, Socket)
│   ├── types/          # Definições de tipos TypeScript
│   └── App.tsx         # Componente principal
├── package.json
└── README.md
```

## Funcionalidades

- Criação de salas com código de 4 letras
- Entrada em salas existentes usando o código
- Votação em histórias usando cards de Planning Poker
- Revelação simultânea de votos
- Histórico de rodadas
- Comunicação em tempo real entre usuários

## Tecnologias Utilizadas

### Frontend
- React
- TypeScript
- Bootstrap
- Socket.IO Client

### Backend
- Node.js
- Express
- Socket.IO
- SQLite

## Como Executar

### Backend

```bash
cd backend
npm install
npm run dev
```

O servidor estará disponível em http://localhost:3000

### Frontend

```bash
npm install
npm run dev
```

O frontend estará disponível em http://localhost:5173
