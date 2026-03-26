const { getDb } = require('../databaseMongo');
const { v4: uuidv4 } = require('uuid');

function generateRoomCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

async function isCodeUnique(code) {
  const db = getDb();
  const room = await db.collection('rooms').findOne({ code });
  return !room;
}

async function generateUniqueCode() {
  let code = generateRoomCode();
  let unique = await isCodeUnique(code);

  while (!unique) {
    code = generateRoomCode();
    unique = await isCodeUnique(code);
  }

  return code;
}

function formatRoom({ room, users, rounds, votesByRoundId }) {
  const formattedRounds = rounds.map((round) => {
    const votes = votesByRoundId.get(round._id) || [];

    return {
      id: round._id,
      title: round.title,
      subtitle: round.subtitle || '',
      revealed: round.revealed === 1,
      finalEstimate: round.final_estimate || null,
      votes,
      active: false
    };
  });

  return {
    id: room._id,
    code: room.code,
    name: room.name,
    hostId: room.host_id,
    users: users.map((user) => ({
      id: user._id,
      name: user.name,
      role: user.role,
      isHost: user.is_host === 1
    })),
    rounds: formattedRounds,
    currentRound: null,
    activeVoting: room.active_voting === 1
  };
}

function pickCurrentRound(room, formattedRounds) {
  if (!formattedRounds.length) return null;

  // Só há "rodada atual" na UI quando a votação está ativa; senão a lista de tarefas não deve usar currentRound.
  if (room.active_voting === 1 && room.active_round_id) {
    const active = formattedRounds.find((r) => r.id === room.active_round_id);
    if (active) return active;
  }

  return null;
}

async function getRoomUsersAndRounds(roomId) {
  const db = getDb();
  const users = await db.collection('users').find({ room_id: roomId }).toArray();
  const rounds = await db
    .collection('rounds')
    .find({ room_id: roomId })
    .sort({ created_at: 1 })
    .toArray();

  return { users, rounds };
}

async function getRoomVotesGrouped(roundIds) {
  const db = getDb();
  if (roundIds.length === 0) return new Map();

  const votes = await db
    .collection('votes')
    .find({ round_id: { $in: roundIds } })
    .sort({ created_at: 1 })
    .toArray();

  // Group votes by round_id
  const votesByRoundId = new Map();
  for (const vote of votes) {
    if (!votesByRoundId.has(vote.round_id)) votesByRoundId.set(vote.round_id, []);
    votesByRoundId.get(vote.round_id).push(vote);
  }

  return votesByRoundId;
}

// Buscar sala pelo ID
async function getRoomById(roomId) {
  const db = getDb();
  const room = await db.collection('rooms').findOne({ _id: roomId });

  if (!room) return null;

  const { users, rounds } = await getRoomUsersAndRounds(roomId);
  const roundIds = rounds.map((r) => r._id);
  const votesByRoundIdRaw = await getRoomVotesGrouped(roundIds);

  // User id -> user object
  const usersById = new Map(users.map((u) => [u._id, u]));

  // Map votes into the response shape the frontend expects.
  const votesByRoundId = new Map();
  for (const round of rounds) {
    const rawVotes = votesByRoundIdRaw.get(round._id) || [];
    const formattedVotes = rawVotes.map((vote) => {
      const user = usersById.get(vote.user_id);
      return {
        userId: vote.user_id,
        userName: user ? user.name : '',
        value: vote.value
      };
    });
    votesByRoundId.set(round._id, formattedVotes);
  }

  const formatted = formatRoom({ room, users, rounds, votesByRoundId });
  const currentRound = pickCurrentRound(room, formatted.rounds);
  return { ...formatted, currentRound };
}

// Buscar sala pelo código
async function getRoomByCode(code) {
  const db = getDb();
  const upper = code.toUpperCase();
  const room = await db.collection('rooms').findOne({ code: upper }, { projection: { _id: 1 } });
  if (!room) return null;
  return getRoomById(room._id);
}

// Criar uma nova sala
async function createRoom(name, hostId, hostName) {
  const db = getDb();

  const roomId = uuidv4();
  const code = await generateUniqueCode();

  const now = new Date();

  await db.collection('rooms').insertOne({
    _id: roomId,
    code,
    name,
    host_id: hostId,
    created_at: now,
    active_voting: 0,
    active_round_id: null
  });

  await db.collection('users').insertOne({
    _id: hostId,
    name: hostName,
    room_id: roomId,
    is_host: 1,
    role: 'host',
    created_at: now
  });

  // Criar a primeira rodada
  const roundId = uuidv4();
  await db.collection('rounds').insertOne({
    _id: roundId,
    room_id: roomId,
    title: 'Nova história',
    subtitle: '',
    revealed: 0,
    final_estimate: null,
    created_at: now
  });

  return getRoomById(roomId);
}

// Adicionar usuário a uma sala
async function addUserToRoom(roomId, userId, userName, isHost = false) {
  const db = getDb();

  const now = new Date();
  await db.collection('users').insertOne({
    _id: userId,
    name: userName,
    room_id: roomId,
    is_host: isHost ? 1 : 0,
    role: isHost ? 'host' : 'player',
    created_at: now
  });

  const room = await getRoomById(roomId);

  // Se a sala estiver em votação ativa, manter esse estado.
  const dbRoom = await db.collection('rooms').findOne({ _id: roomId }, { projection: { active_voting: 1 } });
  if (dbRoom && dbRoom.active_voting === 1) {
    return { ...room, activeVoting: true };
  }

  return room;
}

// Remover usuário de uma sala
async function removeUserFromRoom(roomId, userId) {
  const db = getDb();

  await db.collection('votes').deleteMany({ user_id: userId });
  await db.collection('users').deleteOne({ _id: userId, room_id: roomId });

  return getRoomById(roomId);
}

// Criar uma nova rodada
async function createRound(roomId, title, subtitle = '') {
  const db = getDb();

  const roundId = uuidv4();
  await db.collection('rounds').insertOne({
    _id: roundId,
    room_id: roomId,
    title,
    subtitle: subtitle || '',
    revealed: 0,
    final_estimate: null,
    created_at: new Date()
  });

  return getRoomById(roomId);
}

// Revelar ou esconder os cards de uma rodada
async function toggleCardsVisibility(roundId, revealed) {
  const db = getDb();

  const round = await db.collection('rounds').findOne({ _id: roundId }, { projection: { room_id: 1 } });
  if (!round) throw new Error('Rodada não encontrada');

  await db.collection('rounds').updateOne(
    { _id: roundId },
    { $set: { revealed: revealed ? 1 : 0 } }
  );

  const room = await getRoomById(round.room_id);
  return { ...room, activeVoting: true };
}

// Definir estimativa final de uma rodada
async function setFinalEstimate(roundId, value) {
  const db = getDb();

  const round = await db.collection('rounds').findOne({ _id: roundId }, { projection: { room_id: 1 } });
  if (!round) throw new Error('Rodada não encontrada');

  await db.collection('rounds').updateOne(
    { _id: roundId },
    { $set: { final_estimate: value } }
  );

  const room = await getRoomById(round.room_id);
  return { ...room, activeVoting: true };
}

// Registrar voto
async function submitVote(roundId, userId, value) {
  const db = getDb();

  const existingVote = await db.collection('votes').findOne({ round_id: roundId, user_id: userId });

  if (existingVote) {
    await db.collection('votes').updateOne(
      { _id: existingVote._id },
      { $set: { value } }
    );
  } else {
    const voteId = uuidv4();
    await db.collection('votes').insertOne({
      _id: voteId,
      round_id: roundId,
      user_id: userId,
      value,
      created_at: new Date()
    });
  }

  const round = await db.collection('rounds').findOne({ _id: roundId }, { projection: { room_id: 1 } });
  if (!round) throw new Error('Rodada não encontrada');

  const room = await getRoomById(round.room_id);
  return { ...room, activeVoting: true };
}

// Zerar votos da rodada (esconder cards, limpar estimativa final) — nova rodada de votação na mesma tarefa
async function resetRoundVotes(roomId, roundId) {
  const db = getDb();
  const round = await db.collection('rounds').findOne({ _id: roundId, room_id: roomId });
  if (!round) throw new Error('Rodada não encontrada ou não pertence à sala');

  await db.collection('votes').deleteMany({ round_id: roundId });
  await db.collection('rounds').updateOne(
    { _id: roundId },
    { $set: { revealed: 0, final_estimate: null } }
  );

  const room = await getRoomById(roomId);
  return { ...room, activeVoting: true };
}

// Buscar todas as salas
async function getAllRooms() {
  const db = getDb();
  const rooms = await db.collection('rooms').find({}, { projection: { _id: 1 } }).toArray();
  if (!rooms || rooms.length === 0) return [];
  return Promise.all(rooms.map((r) => getRoomById(r._id)));
}

// Atualizar título/descrição de uma rodada
async function updateRound(roomId, roundId, title, subtitle) {
  const db = getDb();
  const round = await db.collection('rounds').findOne({ _id: roundId, room_id: roomId });
  if (!round) throw new Error('Rodada não encontrada ou não pertence à sala');

  await db.collection('rounds').updateOne(
    { _id: roundId },
    { $set: { title: String(title).trim(), subtitle: subtitle != null ? String(subtitle) : '' } }
  );

  return getRoomById(roomId);
}

// Excluir uma rodada
async function deleteRound(roundId) {
  const db = getDb();

  const round = await db.collection('rounds').findOne({ _id: roundId }, { projection: { room_id: 1 } });
  if (!round) throw new Error('Rodada não encontrada');

  // Se a rodada deletada estiver ativa, limpar estado de votação.
  const room = await db.collection('rooms').findOne(
    { _id: round.room_id },
    { projection: { active_round_id: 1, active_voting: 1 } }
  );
  if (room && room.active_voting === 1 && room.active_round_id === roundId) {
    await db.collection('rooms').updateOne(
      { _id: round.room_id },
      { $set: { active_voting: 0, active_round_id: null } }
    );
  }

  await db.collection('votes').deleteMany({ round_id: roundId });
  await db.collection('rounds').deleteOne({ _id: roundId });

  return getRoomById(round.room_id);
}

// Iniciar uma votação (ativar uma rodada específica)
async function startVoting(roomId, roundId) {
  const db = getDb();

  const round = await db.collection('rounds').findOne({ _id: roundId, room_id: roomId });
  if (!round) throw new Error('Rodada não encontrada ou não pertence à sala');

  await db.collection('rooms').updateOne(
    { _id: roomId },
    { $set: { active_voting: 1, active_round_id: roundId } }
  );

  const room = await getRoomById(roomId);
  return { ...room, activeVoting: true };
}

// Encerrar a votação atual
async function endVoting(roomId) {
  await getDb().collection('rooms').updateOne(
    { _id: roomId },
    { $set: { active_voting: 0, active_round_id: null } }
  );

  const room = await getRoomById(roomId);
  return { ...room, activeVoting: false };
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
  resetRoundVotes,
  updateRound,
  deleteRound,
  startVoting,
  endVoting
};

