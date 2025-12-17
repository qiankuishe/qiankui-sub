import type { FastifyInstance } from 'fastify';
import { sourceDb, logDb } from '../db/index.js';
import { authMiddleware } from './auth.js';
import { parseMixedInput, fetchSubscription, fixUrl, deduplicateNodes } from '../services/aggregator/index.js';
import { parse, detectFormat } from '../services/parser/index.js';
import type { ProxyNode } from '../types/proxy.js';

/**
 * 获取内容的实际节点数（包括从订阅链接获取的节点）
 * 返回总数和去重后的数量
 */
async function getRealNodeStats(content: string): Promise<{ total: number; unique: number; duplicates: number }> {
  const { urls, nodes } = parseMixedInput(content);
  const allNodes: ProxyNode[] = [...nodes];

  // 获取每个订阅链接的实际节点
  for (const rawUrl of urls) {
    const url = fixUrl(rawUrl);
    try {
      const subContent = await fetchSubscription(url, 5000); // 5秒超时
      const format = detectFormat(subContent);
      const parsedNodes = parse(subContent, format);
      allNodes.push(...parsedNodes);
    } catch {
      // 获取失败，跳过
    }
  }

  const uniqueNodes = deduplicateNodes(allNodes);
  const total = allNodes.length;
  const unique = uniqueNodes.length;
  const duplicates = total - unique;

  return { total, unique, duplicates };
}

/**
 * 注册订阅源管理路由
 */
export async function sourcesRoutes(fastify: FastifyInstance) {
  // 所有路由需要认证
  fastify.addHook('preHandler', authMiddleware);

  // 获取所有订阅源
  fastify.get('/api/sources', async () => {
    const sources = sourceDb.getAll();
    return {
      sources,
      lastSaveTime: sourceDb.getLastSaveTime(),
    };
  });

  // 更新排序 - 必须在 :id 路由之前
  fastify.put<{
    Body: { ids: number[] };
  }>('/api/sources/reorder', async (request) => {
    const { ids } = request.body;
    sourceDb.reorder(ids);
    logDb.create('source_reorder', '更新订阅源排序');
    
    return {
      success: true,
      lastSaveTime: sourceDb.getLastSaveTime(),
    };
  });

  // 验证输入内容 - 必须在 :id 路由之前
  fastify.post<{
    Body: { content: string };
  }>('/api/sources/validate', async (request) => {
    const { content } = request.body;
    const { urls, nodes } = parseMixedInput(content);
    
    // 获取实际节点统计
    const stats = await getRealNodeStats(content);
    
    return {
      valid: urls.length > 0 || nodes.length > 0,
      urlCount: urls.length,
      nodeCount: stats.unique,
      totalCount: stats.total,
      duplicateCount: stats.duplicates,
    };
  });

  // 获取单个订阅源
  fastify.get<{ Params: { id: string } }>('/api/sources/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    const source = sourceDb.getById(id);
    
    if (!source) {
      return reply.status(404).send({ error: '订阅源不存在' });
    }
    
    return source;
  });

  // 创建订阅源
  fastify.post<{
    Body: { name: string; content: string };
  }>('/api/sources', async (request) => {
    const { name, content } = request.body;
    const stats = await getRealNodeStats(content);
    
    const source = sourceDb.create({ name, content, nodeCount: stats.unique });
    logDb.create('source_create', `创建订阅源: ${name}`);
    
    return {
      source,
      lastSaveTime: sourceDb.getLastSaveTime(),
    };
  });

  // 更新订阅源
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; content?: string };
  }>('/api/sources/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    const { name, content } = request.body;
    
    const updateData: { name?: string; content?: string; nodeCount?: number } = {};
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) {
      updateData.content = content;
      const stats = await getRealNodeStats(content);
      updateData.nodeCount = stats.unique;
    }
    
    const source = sourceDb.update(id, updateData);
    
    if (!source) {
      return reply.status(404).send({ error: '订阅源不存在' });
    }
    
    logDb.create('source_update', `更新订阅源: ${source.name}`);
    
    return {
      source,
      lastSaveTime: sourceDb.getLastSaveTime(),
    };
  });

  // 删除订阅源
  fastify.delete<{ Params: { id: string } }>('/api/sources/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    const source = sourceDb.getById(id);
    
    if (!source) {
      return reply.status(404).send({ error: '订阅源不存在' });
    }
    
    sourceDb.delete(id);
    logDb.create('source_delete', `删除订阅源: ${source.name}`);
    
    return {
      success: true,
      lastSaveTime: sourceDb.getLastSaveTime(),
    };
  });

  // 刷新所有订阅源的节点数
  fastify.post('/api/sources/refresh', async () => {
    const sources = sourceDb.getAll();
    
    // 并行获取所有订阅源的节点数
    await Promise.all(
      sources.map(async (source) => {
        try {
          const stats = await getRealNodeStats(source.content);
          sourceDb.update(source.id, { nodeCount: stats.unique });
        } catch {
          // 忽略错误
        }
      })
    );
    
    return {
      sources: sourceDb.getAll(),
      lastSaveTime: sourceDb.getLastSaveTime(),
    };
  });

}
