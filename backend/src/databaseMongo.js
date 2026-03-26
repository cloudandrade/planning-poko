const { MongoClient } = require('mongodb');

let client = null;
let db = null;

function getDb() {
  if (!db) {
    throw new Error('MongoDB não inicializado. Aguarde initializeDatabase().');
  }
  return db;
}

async function clearCollections() {
  const database = getDb();
  const names = ['rooms', 'users', 'rounds', 'votes'];
  await Promise.all(names.map((name) => database.collection(name).deleteMany({})));
}

async function ensureIndexes() {
  const database = getDb();
  const rooms = database.collection('rooms');
  const users = database.collection('users');
  const rounds = database.collection('rounds');
  const votes = database.collection('votes');

  await Promise.all([
    rooms.createIndex({ code: 1 }, { unique: true }),
    users.createIndex({ room_id: 1 }),
    rounds.createIndex({ room_id: 1, created_at: -1 }),
    votes.createIndex({ round_id: 1 }),
    votes.createIndex({ round_id: 1, user_id: 1 }, { unique: true })
  ]);
}

async function initializeDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const mongoDbName = process.env.MONGODB_DB || 'planning-poko';

  const shouldReset = process.env.RESET_DB === 'true';
  const shouldClearTables = process.env.CLEAR_DB_TABLES === 'true';

  client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 5000
  });

  await client.connect();
  db = client.db(mongoDbName);

  // RESET: drop total do banco.
  if (shouldReset) {
    await db.dropDatabase();
  }

  // CLEAR: mantém o banco/collections e apenas apaga os documentos.
  if (shouldClearTables) {
    await clearCollections();
  }

  await ensureIndexes();
}

module.exports = {
  initializeDatabase,
  getDb
};

