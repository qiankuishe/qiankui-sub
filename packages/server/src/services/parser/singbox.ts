import type { ProxyNode, VMessNode, VLESSNode, ShadowsocksNode, TrojanNode, Hysteria2Node, TUICNode } from '../../types/proxy.js';

interface SingBoxOutbound {
  tag: string;
  type: string;
  server?: string;
  server_port?: number;
  uuid?: string;
  alter_id?: number;
  security?: string;
  password?: string;
  method?: string;
  tls?: { enabled?: boolean; server_name?: string; insecure?: boolean };
  transport?: { type?: string; path?: string; headers?: Record<string, string>; service_name?: string };
  flow?: string;
  reality?: { enabled?: boolean; public_key?: string; short_id?: string };
  obfs?: { type?: string; password?: string };
  congestion_control?: string;
  alpn?: string[];
  udp_relay_mode?: string;
}

/**
 * 解析 SingBox JSON 格式订阅
 */
export function parseSingBox(content: string): ProxyNode[] {
  const config = JSON.parse(content);
  const outbounds: SingBoxOutbound[] = config.outbounds || [];
  const nodes: ProxyNode[] = [];

  for (const outbound of outbounds) {
    // 跳过非代理类型
    if (['direct', 'block', 'dns', 'selector', 'urltest'].includes(outbound.type)) {
      continue;
    }
    
    const node = convertSingBoxOutbound(outbound);
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

function convertSingBoxOutbound(outbound: SingBoxOutbound): ProxyNode | null {
  switch (outbound.type) {
    case 'vmess':
      return convertVMess(outbound);
    case 'vless':
      return convertVLESS(outbound);
    case 'shadowsocks':
      return convertShadowsocks(outbound);
    case 'trojan':
      return convertTrojan(outbound);
    case 'hysteria2':
      return convertHysteria2(outbound);
    case 'tuic':
      return convertTUIC(outbound);
    default:
      return null;
  }
}


function convertVMess(outbound: SingBoxOutbound): VMessNode {
  return {
    type: 'vmess',
    name: outbound.tag,
    server: outbound.server || '',
    port: outbound.server_port || 0,
    uuid: outbound.uuid || '',
    alterId: outbound.alter_id || 0,
    cipher: outbound.security || 'auto',
    tls: outbound.tls?.enabled,
    sni: outbound.tls?.server_name,
    skipCertVerify: outbound.tls?.insecure,
    network: outbound.transport?.type as VMessNode['network'],
    wsPath: outbound.transport?.path,
    wsHeaders: outbound.transport?.headers,
    grpcServiceName: outbound.transport?.service_name,
  };
}

function convertVLESS(outbound: SingBoxOutbound): VLESSNode {
  return {
    type: 'vless',
    name: outbound.tag,
    server: outbound.server || '',
    port: outbound.server_port || 0,
    uuid: outbound.uuid || '',
    flow: outbound.flow,
    tls: outbound.tls?.enabled || outbound.reality?.enabled,
    sni: outbound.tls?.server_name,
    skipCertVerify: outbound.tls?.insecure,
    network: outbound.transport?.type as VLESSNode['network'],
    wsPath: outbound.transport?.path,
    wsHeaders: outbound.transport?.headers,
    grpcServiceName: outbound.transport?.service_name,
    realityOpts: outbound.reality?.enabled ? {
      publicKey: outbound.reality.public_key || '',
      shortId: outbound.reality.short_id,
    } : undefined,
  };
}

function convertShadowsocks(outbound: SingBoxOutbound): ShadowsocksNode {
  return {
    type: 'ss',
    name: outbound.tag,
    server: outbound.server || '',
    port: outbound.server_port || 0,
    cipher: outbound.method || 'aes-256-gcm',
    password: outbound.password || '',
  };
}

function convertTrojan(outbound: SingBoxOutbound): TrojanNode {
  return {
    type: 'trojan',
    name: outbound.tag,
    server: outbound.server || '',
    port: outbound.server_port || 0,
    password: outbound.password || '',
    sni: outbound.tls?.server_name,
    skipCertVerify: outbound.tls?.insecure,
    network: outbound.transport?.type as TrojanNode['network'],
    wsPath: outbound.transport?.path,
    grpcServiceName: outbound.transport?.service_name,
  };
}

function convertHysteria2(outbound: SingBoxOutbound): Hysteria2Node {
  return {
    type: 'hysteria2',
    name: outbound.tag,
    server: outbound.server || '',
    port: outbound.server_port || 0,
    password: outbound.password || '',
    obfs: outbound.obfs?.type,
    obfsPassword: outbound.obfs?.password,
    sni: outbound.tls?.server_name,
    skipCertVerify: outbound.tls?.insecure,
  };
}

function convertTUIC(outbound: SingBoxOutbound): TUICNode {
  return {
    type: 'tuic',
    name: outbound.tag,
    server: outbound.server || '',
    port: outbound.server_port || 0,
    uuid: outbound.uuid || '',
    password: outbound.password || '',
    congestionControl: outbound.congestion_control,
    alpn: outbound.alpn,
    sni: outbound.tls?.server_name,
    skipCertVerify: outbound.tls?.insecure,
    udpRelayMode: outbound.udp_relay_mode,
  };
}
