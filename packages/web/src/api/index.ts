const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...((options?.headers as Record<string, string>) || {}) };
  // 只在有 body 时才设置 Content-Type
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('未登录');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

// 认证 API
export const authApi = {
  login: (username: string, password: string) =>
    request<{ success: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST', body: JSON.stringify({}) }),

  check: () => request<{ authenticated: boolean }>('/auth/check'),
};

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

// 订阅源 API
export const sourcesApi = {
  getAll: () => request<{ sources: Source[]; lastSaveTime: string }>('/sources'),

  getById: (id: number) => request<Source>(`/sources/${id}`),

  create: (name: string, content: string) =>
    request<{ source: Source; lastSaveTime: string }>('/sources', {
      method: 'POST',
      body: JSON.stringify({ name, content }),
    }),

  update: (id: number, data: { name?: string; content?: string }) =>
    request<{ source: Source; lastSaveTime: string }>(`/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ success: boolean; lastSaveTime: string }>(`/sources/${id}`, {
      method: 'DELETE',
    }),

  reorder: (ids: number[]) =>
    request<{ success: boolean; lastSaveTime: string }>('/sources/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),

  refresh: () =>
    request<{ sources: Source[]; lastSaveTime: string }>('/sources/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  validate: (content: string) =>
    request<{ valid: boolean; urlCount: number; nodeCount: number; totalCount: number; duplicateCount: number }>(
      '/sources/validate',
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    ),
};

// 订阅链接格式
export interface SubFormat {
  name: string;
  key: string;
  url: string;
}

// 订阅 API
export const subApi = {
  getInfo: () => request<{ formats: SubFormat[]; totalNodes: number; lastAggregateTime: string }>('/sub/info'),
};

// 日志类型
export interface Log {
  id: number;
  action: string;
  detail: string | null;
  createdAt: string;
}

// 日志 API
export const logsApi = {
  getRecent: (limit = 50) => request<{ logs: Log[] }>(`/logs?limit=${limit}`),
};
