const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const fs = require('node:fs');

// Caminho para o arquivo do banco de dados
const dbPath = path.resolve(__dirname, '../database.sqlite');

// Verificar se é necessário reiniciar o banco de dados
const shouldReset = process.env.RESET_DB === 'true';
// Verificar se é necessário limpar as tabelas
const shouldClearTables = process.env.CLEAR_DB_TABLES === 'true';

// Se for necessário reiniciar, excluir o arquivo do banco de dados
if (shouldReset && fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
    console.log('Banco de dados excluído com sucesso.');
  } catch (error) {
    console.error('Erro ao excluir o banco de dados:', error);
  }
}

// Criar conexão com o banco de dados
const db = new sqlite3.Database(dbPath);

// Função para desativar chaves estrangeiras
function disableForeignKeys() {
  return new Promise((resolve, reject) => {
    db.run('PRAGMA foreign_keys = OFF', (err) => {
      if (err) {
        console.error('Erro ao desativar chaves estrangeiras:', err);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// Função para obter todas as tabelas
function getAllTables() {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('Erro ao obter tabelas:', err);
        reject(err);
        return;
      }
      resolve(tables);
    });
  });
}

// Função para limpar uma tabela
function clearTable(tableName) {
  return new Promise((resolve, reject) => {
    if (tableName === 'sqlite_sequence') {
      resolve();
      return;
    }
    
    db.run(`DELETE FROM ${tableName}`, (err) => {
      if (err) {
        console.error(`Erro ao limpar tabela ${tableName}:`, err);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// Função para reativar chaves estrangeiras
function enableForeignKeys() {
  return new Promise((resolve, reject) => {
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('Erro ao reativar chaves estrangeiras:', err);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// Função principal para limpar todas as tabelas do banco de dados
async function clearAllTables() {
  try {
    await disableForeignKeys();
    const tables = await getAllTables();
    
    // Usar for...of em vez de forEach
    for (const table of tables) {
      await clearTable(table.name);
    }
    
    await enableForeignKeys();
    console.log('Todas as tabelas foram limpas com sucesso.');
    return;
  } catch (error) {
    console.error('Erro ao limpar tabelas:', error);
    throw error;
  }
}

// Inicializar o banco de dados com as tabelas necessárias
async function initializeDatabase() {
  // Se for necessário limpar as tabelas, faça isso antes de inicializar
  if (shouldClearTables) {
    try {
      await clearAllTables();
    } catch (error) {
      console.error('Erro ao limpar tabelas:', error);
    }
  }

  db.serialize(() => {
    // Tabela de salas
    db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        host_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de usuários
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        room_id TEXT NOT NULL,
        is_host INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
      )
    `);
    
    // Verificar se a coluna role existe na tabela users
    db.all("PRAGMA table_info(users)", (err, rows) => {
      if (err) {
        console.error('Erro ao verificar estrutura da tabela:', err);
        return;
      }
      
      // Verificar se a coluna role existe
      const hasRoleColumn = rows.some(row => row.name === 'role');
      
      if (!hasRoleColumn) {
        // Adicionar a coluna role se não existir
        db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'player'`, (err) => {
          if (err) {
            console.error('Erro ao adicionar coluna role:', err);
          } else {
            console.log('Coluna role adicionada com sucesso à tabela users');
          }
        });
      }
    });
    
    // Verificar se a coluna active_voting existe na tabela rooms
    db.all("PRAGMA table_info(rooms)", (err, rows) => {
      if (err) {
        console.error('Erro ao verificar estrutura da tabela rooms:', err);
        return;
      }
      
      // Verificar se a coluna active_voting existe
      const hasActiveVotingColumn = rows.some(row => row.name === 'active_voting');
      
      if (!hasActiveVotingColumn) {
        // Adicionar a coluna active_voting se não existir
        db.run(`ALTER TABLE rooms ADD COLUMN active_voting INTEGER DEFAULT 0`, (err) => {
          if (err) {
            console.error('Erro ao adicionar coluna active_voting:', err);
          } else {
            console.log('Coluna active_voting adicionada com sucesso à tabela rooms');
          }
        });
      }
    });

    // Tabela de rodadas
    db.run(`
      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        revealed INTEGER DEFAULT 0,
        final_estimate TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
      )
    `);

    // Tabela de votos
    db.run(`
      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        round_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (round_id) REFERENCES rounds (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    console.log('Banco de dados inicializado com sucesso!');
  });
}

module.exports = {
  db,
  initializeDatabase
};
