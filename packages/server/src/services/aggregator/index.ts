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
 * 获取远程订阅内容
 */
export async function fetchSubscription(url: string, timeout = 10000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'QianKui-Sub/1.0',
      },
    });

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
