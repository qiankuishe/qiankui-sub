import type { FastifyInstance } from 'fastify';
import { logDb } from '../db/index.js';
import { authMiddleware } from './auth.js';

/**
 * 注册日志路由
 */
export async function logsRoutes(fastify: FastifyInstance) {
  // 需要认证
  fastify.addHook('preHandler', authMiddleware);

  // 获取最近日志
  fastify.get<{
    Querystring: { limit?: string };
  }>('/api/logs', async (request) => {
    const limit = parseInt(request.query.limit || '50', 10);
    const logs = logDb.getRecent(limit);
    return { logs };
  });
}
