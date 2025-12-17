import { config } from '../config.js';
import type { Source, Log } from './schema.js';

// 内存存储（临时方案，后续替换为 SQLite）
const store = {
  sources: [] as Source[],
  logs: [] as Log[],
  config: new Map<string, string>(),
  lastSaveTime: new Date().toISOString(),
  lastAggregateTime: '', // 上次聚合成功时间
  lastAggregateNodeCount: 0, // 上次聚合的节点总数
};

let nextSourceId = 1;
let nextLogId = 1;

// 订阅源操作
export const sourceDb = {
  getAll(): Source[] {
    return [...store.sources].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  getById(id: number): Source | undefined {
    return store.sources.find((s) => s.id === id);
  },

  create(data: { name: string; content: string; nodeCount?: number }): Source {
    const now = new Date().toISOString();
    const source: Source = {
      id: nextSourceId++,
      name: data.name,
      content: data.content,
      nodeCount: data.nodeCount ?? 0,
      sortOrder: store.sources.length,
      createdAt: now,
      updatedAt: now,
    };
    store.sources.push(source);
    store.lastSaveTime = now;
    return source;
  },

  update(id: number, data: Partial<{ name: string; content: string; nodeCount: number }>): Source | null {
    const index = store.sources.findIndex((s) => s.id === id);
    if (index === -1) return null;
    
    const now = new Date().toISOString();
    store.sources[index] = {
      ...store.sources[index],
      ...data,
      updatedAt: now,
    };
    store.lastSaveTime = now;
    return store.sources[index];
  },

  delete(id: number): boolean {
    const index = store.sources.findIndex((s) => s.id === id);
    if (index === -1) return false;
    
    store.sources.splice(index, 1);
    store.lastSaveTime = new Date().toISOString();
    return true;
  },

  reorder(ids: number[]): void {
    ids.forEach((id, index) => {
      const source = store.sources.find((s) => s.id === id);
      if (source) {
        source.sortOrder = index;
      }
    });
    store.lastSaveTime = new Date().toISOString();
  },

  getLastSaveTime(): string {
    return store.lastSaveTime;
  },

  getLastAggregateTime(): string {
    return store.lastAggregateTime;
  },

  setLastAggregateTime(time: string): void {
    store.lastAggregateTime = time;
  },

  getLastAggregateNodeCount(): number {
    return store.lastAggregateNodeCount;
  },

  setLastAggregateNodeCount(count: number): void {
    store.lastAggregateNodeCount = count;
  },
};

// 日志操作
export const logDb = {
  getRecent(limit = 50): Log[] {
    return store.logs.slice(-limit).reverse();
  },

  create(action: string, detail?: string): Log {
    const log: Log = {
      id: nextLogId++,
      action,
      detail: detail ?? null,
      createdAt: new Date().toISOString(),
    };
    store.logs.push(log);
    // 保留最近 1000 条日志
    if (store.logs.length > 1000) {
      store.logs = store.logs.slice(-1000);
    }
    return log;
  },
};

// 配置操作
export const configDb = {
  get(key: string): string | undefined {
    return store.config.get(key);
  },

  set(key: string, value: string): void {
    store.config.set(key, value);
  },
};

// 初始化
export function initDatabase() {
  console.log('Database initialized (in-memory mode)');
}

export { config };
