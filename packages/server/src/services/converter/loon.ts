import type { ProxyNode } from '../../types/proxy.js';

/**
 * 转换为 Loon 格式
 */
export function convertToLoon(nodes: ProxyNode[]): string {
  const lines = nodes.map(convertNode).filter(Boolean);
  return lines.join('\n');
}

function convertNode(node: ProxyNode): string | null {
  switch (node.type) {
    case 'vmess':
      return `${node.name} = vmess, ${node.server}, ${node.port}, ${node.uuid}, transport=${node.network || 'tcp'}${node.tls ? ', over-tls=true' : ''}${node.sni ? `, tls-name=${node.sni}` : ''}${node.wsPath ? `, path=${node.wsPath}` : ''}`;

    case 'vless':
      return `${node.name} = vless, ${node.server}, ${node.port}, ${node.uuid}, transport=${node.network || 'tcp'}${node.tls ? ', over-tls=true' : ''}${node.sni ? `, tls-name=${node.sni}` : ''}`;

    case 'trojan':
      return `${node.name} = trojan, ${node.server}, ${node.port}, ${node.password}${node.sni ? `, tls-name=${node.sni}` : ''}${node.skipCertVerify ? ', skip-cert-verify=true' : ''}`;

    case 'ss':
      return `${node.name} = shadowsocks, ${node.server}, ${node.port}, ${node.cipher}, "${node.password}"`;

    case 'hysteria2':
      return `${node.name} = Hysteria2, ${node.server}, ${node.port}, "${node.password}"${node.sni ? `, tls-name=${node.sni}` : ''}${node.skipCertVerify ? ', skip-cert-verify=true' : ''}`;

    default:
      return null;
  }
}
