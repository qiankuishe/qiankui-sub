import type { ProxyNode } from '../../types/proxy.js';

/**
 * 转换为 Quantumult X 格式
 */
export function convertToQuantumultX(nodes: ProxyNode[]): string {
  const lines = nodes.map(convertNode).filter(Boolean);
  return lines.join('\n');
}

function convertNode(node: ProxyNode): string | null {
  switch (node.type) {
    case 'vmess':
      return `vmess=${node.server}:${node.port}, method=${node.cipher || 'auto'}, password=${node.uuid}${node.tls ? ', obfs=over-tls' : ''}${node.sni ? `, obfs-host=${node.sni}` : ''}${node.wsPath ? `, obfs-uri=${node.wsPath}` : ''}, tag=${node.name}`;

    case 'trojan':
      return `trojan=${node.server}:${node.port}, password=${node.password}${node.tls !== false ? ', over-tls=true' : ''}${node.sni ? `, tls-host=${node.sni}` : ''}${node.skipCertVerify ? ', tls-verification=false' : ''}, tag=${node.name}`;

    case 'ss':
      return `shadowsocks=${node.server}:${node.port}, method=${node.cipher}, password=${node.password}, tag=${node.name}`;

    case 'hysteria2':
      return `hysteria2=${node.server}:${node.port}, password=${node.password}${node.sni ? `, sni=${node.sni}` : ''}${node.skipCertVerify ? ', tls-verification=false' : ''}, tag=${node.name}`;

    default:
      return null;
  }
}
