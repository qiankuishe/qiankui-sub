import type { ProxyNode, SubscriptionFormat } from '../../types/proxy.js';
import { parseUri, isValidNodeUri } from './uri.js';
import { parseClash } from './clash.js';
import { parseSingBox } from './singbox.js';

/**
 * 检测订阅内容格式
 */
export function detectFormat(content: string): SubscriptionFormat {
  const trimmed = content.trim();

  // Clash/Stash YAML 格式
  if (trimmed.includes('proxies:') || trimmed.startsWith('port:') || trimmed.startsWith('mixed-port:')) {
    return 'clash';
  }

  // SingBox JSON 格式
  if (trimmed.startsWith('{') && (trimmed.includes('"outbounds"') || trimmed.includes('"inbounds"'))) {
    return 'singbox';
  }

  // Base64 格式 - 尝试解码
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    if (decoded.includes('://')) {
      return 'base64';
    }
  } catch {
    // 不是有效的 Base64
  }

  // 直接是节点 URI 列表
  const lines = trimmed.split('\n').filter((l) => l.trim());
  if (lines.some((l) => isValidNodeUri(l))) {
    return 'base64'; // 当作 Base64 格式处理
  }

  return 'unknown';
}

/**
 * 解析 Base64 订阅内容
 */
export function parseBase64(content: string): ProxyNode[] {
  let decoded: string;
  
  try {
    decoded = Buffer.from(content.trim(), 'base64').toString('utf-8');
  } catch {
    // 如果不是 Base64，直接使用原内容
    decoded = content;
  }

  const lines = decoded.split('\n').filter((l) => l.trim());
  const nodes: ProxyNode[] = [];

  for (const line of lines) {
    const node = parseUri(line.trim());
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

/**
 * 解析订阅内容
 */
export function parse(content: string, format?: SubscriptionFormat): ProxyNode[] {
  const detectedFormat = format || detectFormat(content);

  switch (detectedFormat) {
    case 'base64':
      return parseBase64(content);
    case 'clash':
      return parseClash(content);
    case 'singbox':
      return parseSingBox(content);
    default:
      return [];
  }
}

export { parseUri, isValidNodeUri } from './uri.js';
