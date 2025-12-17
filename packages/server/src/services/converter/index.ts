import type { ProxyNode, OutputFormat } from '../../types/proxy.js';
import { serializeUri } from '../serializer/uri.js';
import { convertToClash } from './clash.js';
import { convertToSurge } from './surge.js';
import { convertToLoon } from './loon.js';
import { convertToQuantumultX } from './qx.js';
import { convertToSingBox } from './singbox.js';

/**
 * 将节点列表转换为指定格式
 */
export function convert(nodes: ProxyNode[], format: OutputFormat): string {
  switch (format) {
    case 'base64':
      return convertToBase64(nodes);
    case 'clash':
    case 'stash':
      return convertToClash(nodes);
    case 'surge':
      return convertToSurge(nodes);
    case 'loon':
      return convertToLoon(nodes);
    case 'qx':
      return convertToQuantumultX(nodes);
    case 'singbox':
      return convertToSingBox(nodes);
    default:
      return convertToBase64(nodes);
  }
}

/**
 * 转换为 Base64 格式
 */
function convertToBase64(nodes: ProxyNode[]): string {
  const uris = nodes.map((node) => serializeUri(node)).filter(Boolean);
  return Buffer.from(uris.join('\n')).toString('base64');
}
