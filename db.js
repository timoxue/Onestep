const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'openclaw.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // 如果数据库文件已存在，读取它
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 建表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deployments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id TEXT UNIQUE NOT NULL,
      bot_name TEXT NOT NULL,
      container_name TEXT,
      container_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// 用户操作

async function createUser(username, password, email) {
  const database = await getDb();
  const existing = database.exec('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    throw new Error('用户名已存在');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  database.run('INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)', [username, passwordHash, email || null]);
  saveDb();

  const result = database.exec('SELECT id, username, email, created_at FROM users WHERE username = ?', [username]);
  const row = result[0].values[0];
  return { id: row[0], username: row[1], email: row[2], created_at: row[3] };
}

async function validateUser(username, password) {
  const database = await getDb();
  const result = database.exec('SELECT id, username, password_hash, email FROM users WHERE username = ?', [username]);

  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('用户名或密码错误');
  }

  const row = result[0].values[0];
  const valid = await bcrypt.compare(password, row[2]);
  if (!valid) {
    throw new Error('用户名或密码错误');
  }

  return { id: row[0], username: row[1], email: row[3] };
}

function findUserById(id) {
  if (!db) return null;
  const result = db.exec('SELECT id, username, email, created_at FROM users WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const row = result[0].values[0];
  return { id: row[0], username: row[1], email: row[2], created_at: row[3] };
}

// 部署记录操作

function createDeployment(userId, sessionId, botName, containerName) {
  if (!db) return;
  db.run(
    'INSERT INTO deployments (user_id, session_id, bot_name, container_name, status) VALUES (?, ?, ?, ?, ?)',
    [userId, sessionId, botName, containerName, 'running']
  );
  saveDb();
}

function updateDeploymentStatus(sessionId, status, containerId) {
  if (!db) return;
  if (containerId) {
    db.run('UPDATE deployments SET status = ?, container_id = ? WHERE session_id = ?', [status, containerId, sessionId]);
  } else {
    db.run('UPDATE deployments SET status = ? WHERE session_id = ?', [status, sessionId]);
  }
  saveDb();
}

function getUserDeployments(userId) {
  if (!db) return [];
  const result = db.exec(
    'SELECT id, session_id, bot_name, container_name, container_id, status, created_at FROM deployments WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  if (result.length === 0) return [];
  return result[0].values.map(row => ({
    id: row[0],
    sessionId: row[1],
    botName: row[2],
    containerName: row[3],
    containerId: row[4],
    status: row[5],
    createdAt: row[6],
  }));
}

function deleteDeploymentBySessionId(sessionId) {
  if (!db) return;
  db.run('DELETE FROM deployments WHERE session_id = ?', [sessionId]);
  saveDb();
}

module.exports = {
  getDb,
  createUser,
  validateUser,
  findUserById,
  createDeployment,
  updateDeploymentStatus,
  getUserDeployments,
  deleteDeploymentBySessionId,
};
