# Planning Poko Backend

Backend para a aplicação de Planning Poko, desenvolvido com Node.js, Express, Socket.io e SQLite.

## Estrutura do Projeto

```
backend/
├── src/
│   ├── controllers/    # Controladores da API
│   ├── models/         # Modelos de dados
│   ├── routes/         # Rotas da API
│   ├── socket/         # Handlers do Socket.io
│   ├── database.js     # Configuração do banco de dados
│   └── index.js        # Ponto de entrada da aplicação
├── package.json
└── database.sqlite     # Banco de dados SQLite (criado automaticamente)
```

## Instalação

```bash
# Instalar dependências
npm install

# Iniciar o servidor em modo de desenvolvimento
npm run dev

# Iniciar o servidor em modo de desenvolvimento com reset do banco de dados (apaga o arquivo)
npm run dev:reset

# Iniciar o servidor em modo de desenvolvimento limpando todas as tabelas (mantém o arquivo)
npm run dev:clear

# Iniciar o servidor em modo de produção
npm start

# Iniciar o servidor em modo de produção com reset do banco de dados (apaga o arquivo)
npm run start:reset

# Iniciar o servidor em modo de produção limpando todas as tabelas (mantém o arquivo)
npm run start:clear
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
# Configurações do servidor
PORT=3000

# Configurações do banco de dados
# Defina como 'true' para resetar o banco de dados ao iniciar o servidor (apaga o arquivo)
RESET_DB=false
# Defina como 'true' para limpar as tabelas ao invés de excluir o arquivo do banco
CLEAR_DB_TABLES=false
```

## API Endpoints

### Salas

- `POST /api/rooms` - Criar uma nova sala
  - Body: `{ "name": "Nome da Sala", "userName": "Nome do Host" }`

- `GET /api/rooms/:code` - Buscar sala pelo código
  - Params: `code` - Código da sala (4 letras maiúsculas)

- `POST /api/rooms/:code/join` - Entrar em uma sala
  - Params: `code` - Código da sala
  - Body: `{ "userName": "Nome do Usuário" }`

## Socket.io Events

### Cliente -> Servidor

- `join-room` - Entrar em uma sala
  - Dados: `{ roomId, userId }`

- `leave-room` - Sair de uma sala
  - Dados: `{ roomId, userId }`

- `submit-vote` - Submeter voto
  - Dados: `{ roomId, roundId, userId, value }`

- `reveal-cards` - Revelar cards
  - Dados: `{ roomId, roundId }`

- `hide-cards` - Esconder cards
  - Dados: `{ roomId, roundId }`

- `start-new-round` - Iniciar nova rodada
  - Dados: `{ roomId, title, subtitle }`

- `set-final-estimate` - Definir estimativa final
  - Dados: `{ roomId, roundId, value }`

### Servidor -> Cliente

- `room-updated` - Sala atualizada
  - Dados: `Room` (objeto completo da sala)

- `user-joined` - Usuário entrou na sala
  - Dados: `{ roomId, user }`

- `user-left` - Usuário saiu da sala
  - Dados: `{ roomId, userId }`

- `vote-submitted` - Voto submetido
  - Dados: `{ roomId, vote }`

- `cards-revealed` - Cards revelados
  - Dados: `{ roomId }`

- `cards-hidden` - Cards escondidos
  - Dados: `{ roomId }`

- `new-round-started` - Nova rodada iniciada
  - Dados: `{ roomId, round }`

- `final-estimate-set` - Estimativa final definida
  - Dados: `{ roomId, roundId, value }`

- `error` - Erro
  - Dados: `{ message }`
