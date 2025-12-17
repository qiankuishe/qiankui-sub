import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Source, Log } from './schema.js';

// 数据库路径
const DB_PATH = process.env.DB_PATH || './data/qiankui.db';

// 创建数据库连接
let db: Database.Database;

// 初始化数据库
export function initDatabase() {
  // 确保数据目录存在
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      nodeCount INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      detail TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      ip TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      lastAttempt INTEGER NOT NULL,
      lockedUntil INTEGER DEFAULT 0,
      lockLevel INTEGER DEFAULT 0
    );
  `);

  console.log('Database initialized (SQLite mode)');
}


// 订阅源操作
export const sourceDb = {
  getAll(): Source[] {
    const stmt = db.prepare('SELECT * FROM sources ORDER BY sortOrder ASC');
    return stmt.all() as Source[];
  },

  getById(id: number): Source | undefined {
    const stmt = db.prepare('SELECT * FROM sources WHERE id = ?');
    return stmt.get(id) as Source | undefined;
  },

  create(data: { name: string; content: string; nodeCount?: number }): Source {
    const now = new Date().toISOString();
    const maxOrder = db.prepare('SELECT MAX(sortOrder) as max FROM sources').get() as { max: number | null };
    const sortOrder = (maxOrder?.max ?? -1) + 1;

    const stmt = db.prepare(`
      INSERT INTO sources (name, content, nodeCount, sortOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.name, data.content, data.nodeCount ?? 0, sortOrder, now, now);

    return {
      id: result.lastInsertRowid as number,
      name: data.name,
      content: data.content,
      nodeCount: data.nodeCount ?? 0,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
  },

  update(id: number, data: Partial<{ name: string; content: string; nodeCount: number }>): Source | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = ['updatedAt = ?'];
    const values: unknown[] = [now];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.nodeCount !== undefined) {
      updates.push('nodeCount = ?');
      values.push(data.nodeCount);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE sources SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getById(id) ?? null;
  },

  delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM sources WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  reorder(ids: number[]): void {
    const stmt = db.prepare('UPDATE sources SET sortOrder = ? WHERE id = ?');
    const transaction = db.transaction(() => {
      ids.forEach((id, index) => {
        stmt.run(index, id);
      });
    });
    transaction();
  },

  getLastSaveTime(): string {
    const stmt = db.prepare('SELECT MAX(updatedAt) as time FROM sources');
    const result = stmt.get() as { time: string | null };
    return result?.time || new Date().toISOString();
  },

  getLastAggregateTime(): string {
    return configDb.get('lastAggregateTime') || '';
  },

  setLastAggregateTime(time: string): void {
    configDb.set('lastAggregateTime', time);
  },

  getLastAggregateNodeCount(): number {
    const val = configDb.get('lastAggregateNodeCount');
    return val ? parseInt(val, 10) : 0;
  },

  setLastAggregateNodeCount(count: number): void {
    configDb.set('lastAggregateNodeCount', count.toString());
  },
};


// 日志操作
let logInsertCount = 0;
export const logDb = {
  getRecent(limit = 50): Log[] {
    const stmt = db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT ?');
    return stmt.all(limit) as Log[];
  },

  create(action: string, detail?: string): Log {
    const now = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO logs (action, detail, createdAt) VALUES (?, ?, ?)');
    const result = stmt.run(action, detail ?? null, now);

    // 每 100 次插入清理一次旧日志
    logInsertCount++;
    if (logInsertCount >= 100) {
      logInsertCount = 0;
      db.prepare('DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT 1000)').run();
    }

    return {
      id: result.lastInsertRowid as number,
      action,
      detail: detail ?? null,
      createdAt: now,
    };
  },
};

// 配置操作
export const configDb = {
  get(key: string): string | undefined {
    const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value;
  },

  set(key: string, value: string): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
    stmt.run(key, value);
  },

  delete(key: string): void {
    const stmt = db.prepare('DELETE FROM config WHERE key = ?');
    stmt.run(key);
  },
};

// 获取或生成持久化配置
export function getOrCreateConfig(key: string, generator: () => string): string {
  // 优先使用环境变量
  const envKey = key.toUpperCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '');
  const envValue = process.env[envKey];
  if (envValue) {
    return envValue;
  }

  // 其次使用数据库存储的值
  const dbValue = configDb.get(key);
  if (dbValue) {
    return dbValue;
  }

  // 最后生成新值并存储
  const newValue = generator();
  configDb.set(key, newValue);
  return newValue;
}

// Session 操作
export const sessionDb = {
  get(token: string): { username: string; createdAt: number } | undefined {
    const stmt = db.prepare('SELECT username, createdAt FROM sessions WHERE token = ?');
    return stmt.get(token) as { username: string; createdAt: number } | undefined;
  },

  set(token: string, username: string, createdAt: number): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO sessions (token, username, createdAt) VALUES (?, ?, ?)');
    stmt.run(token, username, createdAt);
  },

  delete(token: string): void {
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  },

  // 清理过期 session
  cleanup(ttl: number): void {
    const expireTime = Date.now() - ttl;
    const stmt = db.prepare('DELETE FROM sessions WHERE createdAt < ?');
    stmt.run(expireTime);
  },
};

// 登录尝试记录操作
export const loginAttemptsDb = {
  get(ip: string): { count: number; lastAttempt: number; lockedUntil: number; lockLevel: number } | undefined {
    const stmt = db.prepare('SELECT count, lastAttempt, lockedUntil, lockLevel FROM login_attempts WHERE ip = ?');
    return stmt.get(ip) as { count: number; lastAttempt: number; lockedUntil: number; lockLevel: number } | undefined;
  },

  set(ip: string, data: { count: number; lastAttempt: number; lockedUntil: number; lockLevel: number }): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO login_attempts (ip, count, lastAttempt, lockedUntil, lockLevel) VALUES (?, ?, ?, ?, ?)');
    stmt.run(ip, data.count, data.lastAttempt, data.lockedUntil, data.lockLevel);
  },

  delete(ip: string): void {
    const stmt = db.prepare('DELETE FROM login_attempts WHERE ip = ?');
    stmt.run(ip);
  },

  // 清理过期记录（24小时）
  cleanup(): void {
    const expireTime = Date.now() - 24 * 60 * 60 * 1000;
    const stmt = db.prepare('DELETE FROM login_attempts WHERE lastAttempt < ?');
    stmt.run(expireTime);
  },
};
