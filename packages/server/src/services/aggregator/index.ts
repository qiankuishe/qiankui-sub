import type { ProxyNode } from '../../types/proxy.js';
import { getNodeId } from '../../types/proxy.js';
import { parse, detectFormat, parseUri, isValidNodeUri } from '../parser/index.js';

/**
 * 判断是否为订阅链接
 */
export function isSubscriptionUrl(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * 修复常见的 URL 格式问题
 */
export function fixUrl(url: string): string {
  let fixed = url.trim();
  // 修复重复的协议前缀
  fixed = fixed.replace(/^https?:\/\/https?:\/\//i, 'https://');
  return fixed;
}

/**
 * 判断是否为节点 URI
 */
export function isNodeUri(input: string): boolean {
  return isValidNodeUri(input.trim());
}

/**
 * 输入项类型
 */
export type InputItem = 
  | { type: 'url'; value: string }
  | { type: 'node'; value: ProxyNode };

/**
 * 解析混合输入（订阅链接和节点 URI 混合）
 * 返回 { urls: 订阅链接数组, nodes: 直接解析的节点数组, items: 按顺序的输入项 }
 */
export function parseMixedInput(content: string): { urls: string[]; nodes: ProxyNode[]; items: InputItem[] } {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  const urls: string[] = [];
  const nodes: ProxyNode[] = [];
  const items: InputItem[] = [];

  for (const line of lines) {
    if (isSubscriptionUrl(line)) {
      urls.push(line);
      items.push({ type: 'url', value: line });
    } else if (isNodeUri(line)) {
      const node = parseUri(line);
      if (node) {
        nodes.push(node);
        items.push({ type: 'node', value: node });
      }
    }
  }

  return { urls, nodes, items };
}

/**
 * 统计输入中的节点数量（不获取远程内容）
 */
export function countNodes(content: string): number {
  const { urls, nodes } = parseMixedInput(content);
  // 订阅链接算 1 条，节点 URI 算 1 条
  return urls.length + nodes.length;
}

/**
 * 私有/保留 IP 地址段（SSRF 防护）
 */
const PRIVATE_IP_PATTERNS = [
  /^127\./,                          // 127.0.0.0/8 (loopback)
  /^10\./,                           // 10.0.0.0/8 (private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12 (private)
  /^192\.168\./,                     // 192.168.0.0/16 (private)
  /^169\.254\./,                     // 169.254.0.0/16 (link-local)
  /^0\./,                            // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-9])\./,  // 100.64.0.0/10 (CGNAT)
  /^192\.0\.0\./,                    // 192.0.0.0/24 (IETF)
  /^192\.0\.2\./,                    // 192.0.2.0/24 (TEST-NET-1)
  /^198\.51\.100\./,                 // 198.51.100.0/24 (TEST-NET-2)
  /^203\.0\.113\./,                  // 203.0.113.0/24 (TEST-NET-3)
  /^224\./,                          // 224.0.0.0/4 (multicast)
  /^240\./,                          // 240.0.0.0/4 (reserved)
  /^255\./,                          // 255.0.0.0/8 (broadcast)
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::]',
  '[::1]',
];

/**
 * 检查 URL 是否安全（SSRF 防护）
 */
function isUrlSafe(urlString: string): { safe: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }

  // 只允许 http/https 协议
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { safe: false, reason: `Protocol not allowed: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 检查被禁止的主机名
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { safe: false, reason: `Hostname blocked: ${hostname}` };
  }

  // 检查是否为 IP 地址
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    // 检查私有 IP
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: `Private IP not allowed: ${hostname}` };
      }
    }
  }

  // 检查 IPv6 loopback
  if (hostname === '::1' || hostname.startsWith('[::1]')) {
    return { safe: false, reason: 'IPv6 loopback not allowed' };
  }

  // 检查内网域名后缀
  const internalSuffixes = ['.local', '.internal', '.lan', '.home', '.corp', '.intranet'];
  for (const suffix of internalSuffixes) {
    if (hostname.endsWith(suffix)) {
      return { safe: false, reason: `Internal domain not allowed: ${hostname}` };
    }
  }

  return { safe: true };
}

// 最大重定向次数
const MAX_REDIRECTS = 3;

/**
 * 获取远程订阅内容
 */
export async function fetchSubscription(url: string, timeout = 10000, redirectCount = 0): Promise<string> {
  // 重定向深度限制
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
  }

  // SSRF 防护检查
  const safeCheck = isUrlSafe(url);
  if (!safeCheck.safe) {
    throw new Error(`URL blocked: ${safeCheck.reason}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'QianKui-Sub/1.0',
      },
      redirect: 'manual', // 不自动跟随重定向，防止重定向到内网
    });

    // 处理重定向
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const redirectCheck = isUrlSafe(location);
        if (!redirectCheck.safe) {
          throw new Error(`Redirect blocked: ${redirectCheck.reason}`);
        }
        // 递归获取重定向目标
        return fetchSubscription(location, timeout, redirectCount + 1);
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 节点去重
 */
export function deduplicateNodes(nodes: ProxyNode[]): ProxyNode[] {
  const seen = new Set<string>();
  const result: ProxyNode[] = [];

  for (const node of nodes) {
    const id = getNodeId(node);
    if (!seen.has(id)) {
      seen.add(id);
      result.push(node);
    }
  }

  return result;
}

/**
 * 聚合多个订阅源的节点
 * 按照订阅源和输入项的顺序聚合节点
 */
export async function aggregateNodes(
  sources: Array<{ content: string }>,
  options: { deduplicate?: boolean; timeout?: number } = {}
): Promise<ProxyNode[]> {
  const { deduplicate = true, timeout = 10000 } = options;
  const allNodes: ProxyNode[] = [];

  for (const source of sources) {
    const { items } = parseMixedInput(source.content);
    
    // 按照输入顺序处理每一项
    for (const item of items) {
      if (item.type === 'node') {
        // 直接添加节点
        allNodes.push(item.value);
      } else if (item.type === 'url') {
        // 获取远程订阅内容并解析
        const url = fixUrl(item.value);
        try {
          const content = await fetchSubscription(url, timeout);
          const format = detectFormat(content);
          const parsedNodes = parse(content, format);
          allNodes.push(...parsedNodes);
        } catch (error) {
          console.error(`Failed to fetch subscription: ${url}`, error);
          // 继续处理其他项
        }
      }
    }
  }

  return deduplicate ? deduplicateNodes(allNodes) : allNodes;
}
