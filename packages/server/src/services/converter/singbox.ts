import type { ProxyNode } from '../../types/proxy.js';

/**
 * 转换为 SingBox JSON 格式
 */
export function convertToSingBox(nodes: ProxyNode[]): string {
  const outbounds = nodes.map(convertNode).filter(Boolean);
  
  const config = {
    outbounds,
  };

  return JSON.stringify(config, null, 2);
}

function convertNode(node: ProxyNode): Record<string, unknown> | null {
  switch (node.type) {
    case 'vmess':
      return {
        tag: node.name,
        type: 'vmess',
        server: node.server,
        server_port: node.port,
        uuid: node.uuid,
        alter_id: node.alterId,
        security: node.cipher,
        ...(node.tls && { tls: { enabled: true, server_name: node.sni, insecure: node.skipCertVerify } }),
        ...(node.network && node.network !== 'tcp' && { transport: { type: node.network, path: node.wsPath, headers: node.wsHeaders, service_name: node.grpcServiceName } }),
      };

    case 'vless':
      return {
        tag: node.name,
        type: 'vless',
        server: node.server,
        server_port: node.port,
        uuid: node.uuid,
        ...(node.flow && { flow: node.flow }),
        ...(node.tls && !node.realityOpts && { tls: { enabled: true, server_name: node.sni, insecure: node.skipCertVerify } }),
        ...(node.realityOpts && { reality: { enabled: true, public_key: node.realityOpts.publicKey, short_id: node.realityOpts.shortId } }),
        ...(node.network && node.network !== 'tcp' && { transport: { type: node.network, path: node.wsPath, headers: node.wsHeaders, service_name: node.grpcServiceName } }),
      };

    case 'ss':
      return {
        tag: node.name,
        type: 'shadowsocks',
        server: node.server,
        server_port: node.port,
        method: node.cipher,
        password: node.password,
      };

    case 'trojan':
      return {
        tag: node.name,
        type: 'trojan',
        server: node.server,
        server_port: node.port,
        password: node.password,
        tls: { enabled: true, server_name: node.sni, insecure: node.skipCertVerify },
        ...(node.network && node.network !== 'tcp' && { transport: { type: node.network, path: node.wsPath, service_name: node.grpcServiceName } }),
      };

    case 'hysteria2':
      return {
        tag: node.name,
        type: 'hysteria2',
        server: node.server,
        server_port: node.port,
        password: node.password,
        ...(node.obfs && { obfs: { type: node.obfs, password: node.obfsPassword } }),
        tls: { enabled: true, server_name: node.sni, insecure: node.skipCertVerify },
      };

    case 'tuic':
      return {
        tag: node.name,
        type: 'tuic',
        server: node.server,
        server_port: node.port,
        uuid: node.uuid,
        password: node.password,
        ...(node.congestionControl && { congestion_control: node.congestionControl }),
        ...(node.alpn && { alpn: node.alpn }),
        ...(node.udpRelayMode && { udp_relay_mode: node.udpRelayMode }),
        tls: { enabled: true, server_name: node.sni, insecure: node.skipCertVerify },
      };

    default:
      return null;
  }
}
