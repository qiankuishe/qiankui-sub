import type { FastifyInstance, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { sourceDb, logDb } from '../db/index.js';
import { aggregateNodes } from '../services/aggregator/index.js';
import { convert } from '../services/converter/index.js';
import type { OutputFormat } from '../types/proxy.js';

// User-Agent 到格式的映射
const UA_FORMAT_MAP: Array<{ pattern: RegExp; format: OutputFormat }> = [
  { pattern: /clash/i, format: 'clash' },
  { pattern: /stash/i, format: 'stash' },
  { pattern: /surge/i, format: 'surge' },
  { pattern: /loon/i, format: 'loon' },
  { pattern: /quantumult/i, format: 'qx' },
  { pattern: /shadowrocket/i, format: 'base64' },
  { pattern: /sing-?box/i, format: 'singbox' },
];

/**
 * 根据 User-Agent 检测格式
 */
function detectFormatFromUA(ua: string): OutputFormat {
  for (const { pattern, format } of UA_FORMAT_MAP) {
    if (pattern.test(ua)) {
      return format;
    }
  }
  return 'base64'; // 默认 Base64
}

/**
 * 解析订阅请求参数
 * 格式: /sub?{token}&{format}
 */
function parseSubQuery(query: Record<string, unknown>): { token: string | null; format: OutputFormat | null } {
  const keys = Object.keys(query);
  let token: string | null = null;
  let format: OutputFormat | null = null;

  const formatMap: Record<string, OutputFormat> = {
    base64: 'base64',
    b64: 'base64',
    clash: 'clash',
    stash: 'stash',
    surge: 'surge',
    loon: 'loon',
    qx: 'qx',
    quantumult: 'qx',
    singbox: 'singbox',
    sb: 'singbox',
  };

  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    if (formatMap[lowerKey]) {
      format = formatMap[lowerKey];
    } else if (!token) {
      // 非格式参数的第一个 key 作为 token
      token = key;
    }
  }

  return { token, format };
}

/**
 * 注册订阅输出路由
 */
export async function subRoutes(fastify: FastifyInstance) {
  // 订阅端点
  fastify.get('/sub', async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>, reply) => {
    const { token, format: queryFormat } = parseSubQuery(request.query);
    const ua = request.headers['user-agent'] || '';

    // 验证 token
    if (token !== config.subToken) {
      return reply.status(401).send({ error: '无效的订阅 token' });
    }

    // 确定输出格式
    const format = queryFormat || detectFormatFromUA(ua);

    // 获取所有订阅源
    const sources = sourceDb.getAll();
    
    if (sources.length === 0) {
      return reply.status(404).send({ error: '没有配置订阅源' });
    }

    try {
      // 聚合节点
      const nodes = await aggregateNodes(sources);
      
      if (nodes.length === 0) {
        return reply.status(404).send({ error: '没有可用的节点' });
      }

      // 转换格式
      const output = convert(nodes, format);

      // 更新聚合成功时间和节点数
      sourceDb.setLastAggregateTime(new Date().toISOString());
      sourceDb.setLastAggregateNodeCount(nodes.length);

      // 设置响应头
      const contentType = format === 'singbox' ? 'application/json' : 'text/plain';
      reply.header('Content-Type', `${contentType}; charset=utf-8`);
      reply.header('Content-Disposition', `attachment; filename="qiankui-${format}.txt"`);
      
      logDb.create('subscription', `订阅请求: format=${format}, nodes=${nodes.length}`);

      return output;
    } catch (error) {
      console.error('Subscription error:', error);
      return reply.status(500).send({ error: '获取订阅失败' });
    }
  });

  // 获取订阅链接信息（需要登录）
  fastify.get('/api/sub/info', async (request, reply) => {
    const token = request.cookies.session;
    const { validateSession } = await import('./auth.js');
    if (!token || !validateSession(token)) {
      return reply.status(401).send({ error: '未登录' });
    }

    const baseUrl = `${request.protocol}://${request.hostname}`;
    const subToken = config.subToken;

    const formats: Array<{ name: string; key: string; url: string }> = [
      { name: '自适应', key: 'auto', url: `${baseUrl}/sub?${subToken}` },
      { name: 'Base64', key: 'base64', url: `${baseUrl}/sub?${subToken}&base64` },
      { name: 'Clash', key: 'clash', url: `${baseUrl}/sub?${subToken}&clash` },
      { name: 'Stash', key: 'stash', url: `${baseUrl}/sub?${subToken}&stash` },
      { name: 'Surge', key: 'surge', url: `${baseUrl}/sub?${subToken}&surge` },
      { name: 'Loon', key: 'loon', url: `${baseUrl}/sub?${subToken}&loon` },
      { name: 'SingBox', key: 'singbox', url: `${baseUrl}/sub?${subToken}&singbox` },
      { name: 'Quantumult X', key: 'qx', url: `${baseUrl}/sub?${subToken}&qx` },
    ];

    return {
      formats,
      totalNodes: sourceDb.getLastAggregateNodeCount(),
      lastAggregateTime: sourceDb.getLastAggregateTime(),
    };
  });
}
