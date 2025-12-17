// 订阅源类型
export interface Source {
  id: number;
  name: string;
  content: string;
  nodeCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 日志类型
export interface Log {
  id: number;
  action: string;
  detail: string | null;
  createdAt: string;
}

// 配置类型
export interface Config {
  key: string;
  value: string;
}
