import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config, initConfig } from './config.js';
import { initDatabase } from './db/index.js';
import { authRoutes } from './routes/auth.js';
import { sourcesRoutes } from './routes/sources.js';
import { subRoutes } from './routes/sub.js';
import { logsRoutes } from './routes/logs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: true,
});

// 初始化数据库
initDatabase();

// 初始化配置（从数据库读取或生成）
import { configDb, getOrCreateConfig } from './db/index.js';
initConfig(configDb, getOrCreateConfig);

// 注册插件
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true,
});

await fastify.register(cookie);

// 注册路由
await fastify.register(authRoutes);
await fastify.register(sourcesRoutes);
await fastify.register(subRoutes);
await fastify.register(logsRoutes);

// 健康检查
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// 生产环境静态文件服务
if (process.env.NODE_ENV === 'production') {
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '../../web/dist'),
    prefix: '/',
  });

  // SPA 路由回退
  fastify.setNotFoundHandler(async (request, reply) => {
    if (!request.url.startsWith('/api') && !request.url.startsWith('/sub')) {
      return reply.sendFile('index.html');
    }
    return reply.status(404).send({ error: 'Not Found' });
  });
}

// 启动服务
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server listening on port ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
