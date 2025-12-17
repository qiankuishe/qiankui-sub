import type { ProxyNode } from '../../types/proxy.js';

/**
 * 转换为 Surge 格式
 */
export function convertToSurge(nodes: ProxyNode[]): string {
  const lines = nodes.map(convertNode).filter(Boolean);
  return lines.join('\n');
}

function convertNode(node: ProxyNode): string | null {
  switch (node.type) {
    case 'vmess':
      return `${node.name} = vmess, ${node.server}, ${node.port}, username=${node.uuid}${node.tls ? ', tls=true' : ''}${node.sni ? `, sni=${node.sni}` : ''}${node.wsPath ? `, ws=true, ws-path=${node.wsPath}` : ''}`;

    case 'trojan':
      return `${node.name} = trojan, ${node.server}, ${node.port}, password=${node.password}${node.sni ? `, sni=${node.sni}` : ''}${node.skipCertVerify ? ', skip-cert-verify=true' : ''}`;

    case 'ss':
      return `${node.name} = ss, ${node.server}, ${node.port}, encrypt-method=${node.cipher}, password=${node.password}`;

    case 'hysteria2':
      return `${node.name} = hysteria2, ${node.server}, ${node.port}, password=${node.password}${node.sni ? `, sni=${node.sni}` : ''}${node.skipCertVerify ? ', skip-cert-verify=true' : ''}`;

    case 'tuic':
      return `${node.name} = tuic, ${node.server}, ${node.port}, token=${node.uuid}:${node.password}${node.sni ? `, sni=${node.sni}` : ''}`;

    default:
      return null;
  }
}
