import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';
import { nanoid } from 'nanoid';
import { logDb, sessionDb, loginAttemptsDb } from '../db/index.js';

// Session 过期时间 (24小时)
const SESSION_TTL = 24 * 60 * 60 * 1000;

// 登录限制配置 - 渐进式锁定
const LOCK_LEVELS = [
  { attempts: 10, duration: 5 * 60 * 1000 },
  { attempts: 8, duration: 15 * 60 * 1000 },
  { attempts: 5, duration: 30 * 60 * 1000 },
  { attempts: 2, duration: 60 * 60 * 1000 },
];
const RESET_AFTER = 24 * 60 * 60 * 1000;

function getMaxAttemptsForLevel(level: number): number {
  if (level >= LOCK_LEVELS.length) return 1;
  return LOCK_LEVELS[level].attempts;
}

function getLockDurationForLevel(level: number): number {
  if (level >= LOCK_LEVELS.length) return LOCK_LEVELS[LOCK_LEVELS.length - 1].duration;
  return LOCK_LEVELS[level].duration;
}

function isIpLocked(ip: string): { locked: boolean; remainingTime?: number } {
  const record = loginAttemptsDb.get(ip);
  if (!record) return { locked: false };

  const now = Date.now();

  if (now - record.lastAttempt > RESET_AFTER) {
    loginAttemptsDb.delete(ip);
    return { locked: false };
  }

  if (record.lockedUntil > now) {
    return { locked: true, remainingTime: Math.ceil((record.lockedUntil - now) / 1000 / 60) };
  }

  return { locked: false };
}

function recordFailedAttempt(ip: string): { locked: boolean; remainingAttempts: number; lockDuration?: number } {
  const now = Date.now();
  let record = loginAttemptsDb.get(ip);

  if (record && now - record.lastAttempt > RESET_AFTER) {
    loginAttemptsDb.delete(ip);
    record = undefined;
  }

  if (!record) {
    loginAttemptsDb.set(ip, { count: 1, lastAttempt: now, lockedUntil: 0, lockLevel: 0 });
    return { locked: false, remainingAttempts: getMaxAttemptsForLevel(0) - 1 };
  }

  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    record.lockLevel++;
    record.count = 1;
    record.lastAttempt = now;
    record.lockedUntil = 0;
    loginAttemptsDb.set(ip, record);
    return { locked: false, remainingAttempts: getMaxAttemptsForLevel(record.lockLevel) - 1 };
  }

  record.count++;
  record.lastAttempt = now;

  const maxAttempts = getMaxAttemptsForLevel(record.lockLevel);
  if (record.count >= maxAttempts) {
    const lockDuration = getLockDurationForLevel(record.lockLevel);
    record.lockedUntil = now + lockDuration;
    loginAttemptsDb.set(ip, record);
    return { locked: true, remainingAttempts: 0, lockDuration: lockDuration / 1000 / 60 };
  }

  loginAttemptsDb.set(ip, record);
  return { locked: false, remainingAttempts: maxAttempts - record.count };
}

function clearFailedAttempts(ip: string): void {
  loginAttemptsDb.delete(ip);
}


/**
 * 验证 session
 */
export function validateSession(token: string): boolean {
  const session = sessionDb.get(token);
  if (!session) return false;

  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessionDb.delete(token);
    return false;
  }

  return true;
}

/**
 * 认证中间件
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies.session;

  if (!token || !validateSession(token)) {
    return reply.status(401).send({ error: '未登录或登录已过期' });
  }
}

/**
 * 注册认证路由
 */
export async function authRoutes(fastify: FastifyInstance) {
  // 启动时清理过期数据
  sessionDb.cleanup(SESSION_TTL);
  loginAttemptsDb.cleanup();

  // 登录
  fastify.post<{
    Body: { username: string; password: string };
  }>('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body;
    const ip = request.ip;

    const lockStatus = isIpLocked(ip);
    if (lockStatus.locked) {
      logDb.create('login_blocked', `IP ${ip} 被锁定，剩余 ${lockStatus.remainingTime} 分钟`);
      return reply.status(429).send({
        error: `登录尝试次数过多，请 ${lockStatus.remainingTime} 分钟后再试`,
      });
    }

    if (username === config.adminUsername && password === config.adminPassword) {
      clearFailedAttempts(ip);

      const sessionToken = nanoid(32);
      sessionDb.set(sessionToken, username, Date.now());

      reply.setCookie('session', sessionToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_TTL / 1000,
      });

      logDb.create('login', `用户 ${username} 登录成功`);

      return { success: true };
    }

    const attemptResult = recordFailedAttempt(ip);
    logDb.create('login_failed', `用户 ${username} 登录失败，IP: ${ip}`);

    if (attemptResult.locked) {
      return reply.status(429).send({
        error: `登录尝试次数过多，请 ${attemptResult.lockDuration} 分钟后再试`,
      });
    }

    return reply.status(401).send({
      error: `用户名或密码错误，还剩 ${attemptResult.remainingAttempts} 次尝试机会`,
    });
  });

  // 登出
  fastify.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies.session;
    if (token) {
      sessionDb.delete(token);
    }

    reply.clearCookie('session', { path: '/' });
    logDb.create('logout', '用户登出');

    return { success: true };
  });

  // 检查登录状态
  fastify.get('/api/auth/check', async (request) => {
    const token = request.cookies.session;

    if (token && validateSession(token)) {
      return { authenticated: true };
    }

    return { authenticated: false };
  });
}
