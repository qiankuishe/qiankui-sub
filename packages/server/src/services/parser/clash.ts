import YAML from 'yaml';
import type { ProxyNode, VMessNode, VLESSNode, ShadowsocksNode, TrojanNode, Hysteria2Node, TUICNode } from '../../types/proxy.js';

interface ClashProxy {
  name: string;
  type: string;
  server: string;
  port: number;
  uuid?: string;
  alterId?: number;
  cipher?: string;
  password?: string;
  tls?: boolean;
  sni?: string;
  'skip-cert-verify'?: boolean;
  network?: string;
  'ws-opts'?: { path?: string; headers?: Record<string, string> };
  'grpc-opts'?: { 'grpc-service-name'?: string };
  flow?: string;
  'reality-opts'?: { 'public-key'?: string; 'short-id'?: string };
  obfs?: string;
  'obfs-password'?: string;
  'congestion-control'?: string;
  alpn?: string[];
  'udp-relay-mode'?: string;
}

/**
 * 解析 Clash YAML 格式订阅
 */
export function parseClash(content: string): ProxyNode[] {
  const config = YAML.parse(content);
  const proxies: ClashProxy[] = config.proxies || [];
  const nodes: ProxyNode[] = [];

  for (const proxy of proxies) {
    const node = convertClashProxy(proxy);
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

function convertClashProxy(proxy: ClashProxy): ProxyNode | null {
  switch (proxy.type) {
    case 'vmess':
      return convertVMess(proxy);
    case 'vless':
      return convertVLESS(proxy);
    case 'ss':
      return convertShadowsocks(proxy);
    case 'trojan':
      return convertTrojan(proxy);
    case 'hysteria2':
      return convertHysteria2(proxy);
    case 'tuic':
      return convertTUIC(proxy);
    default:
      return null;
  }
}


function convertVMess(proxy: ClashProxy): VMessNode {
  return {
    type: 'vmess',
    name: proxy.name,
    server: proxy.server,
    port: proxy.port,
    uuid: proxy.uuid || '',
    alterId: proxy.alterId || 0,
    cipher: proxy.cipher || 'auto',
    tls: proxy.tls,
    sni: proxy.sni,
    skipCertVerify: proxy['skip-cert-verify'],
    network: proxy.network as VMessNode['network'],
    wsPath: proxy['ws-opts']?.path,
    wsHeaders: proxy['ws-opts']?.headers,
    grpcServiceName: proxy['grpc-opts']?.['grpc-service-name'],
  };
}

function convertVLESS(proxy: ClashProxy): VLESSNode {
  return {
    type: 'vless',
    name: proxy.name,
    server: proxy.server,
    port: proxy.port,
    uuid: proxy.uuid || '',
    flow: proxy.flow,
    tls: proxy.tls,
    sni: proxy.sni,
    skipCertVerify: proxy['skip-cert-verify'],
    network: proxy.network as VLESSNode['network'],
    wsPath: proxy['ws-opts']?.path,
    wsHeaders: proxy['ws-opts']?.headers,
    grpcServiceName: proxy['grpc-opts']?.['grpc-service-name'],
    realityOpts: proxy['reality-opts'] ? {
      publicKey: proxy['reality-opts']['public-key'] || '',
      shortId: proxy['reality-opts']['short-id'],
    } : undefined,
  };
}

function convertShadowsocks(proxy: ClashProxy): ShadowsocksNode {
  return {
    type: 'ss',
    name: proxy.name,
    server: proxy.server,
    port: proxy.port,
    cipher: proxy.cipher || 'aes-256-gcm',
    password: proxy.password || '',
  };
}

function convertTrojan(proxy: ClashProxy): TrojanNode {
  return {
    type: 'trojan',
    name: proxy.name,
    server: proxy.server,
    port: proxy.port,
    password: proxy.password || '',
    sni: proxy.sni,
    skipCertVerify: proxy['skip-cert-verify'],
    network: proxy.network as TrojanNode['network'],
    wsPath: proxy['ws-opts']?.path,
    grpcServiceName: proxy['grpc-opts']?.['grpc-service-name'],
  };
}

function convertHysteria2(proxy: ClashProxy): Hysteria2Node {
  return {
    type: 'hysteria2',
    name: proxy.name,
    server: proxy.server,
    port: proxy.port,
    password: proxy.password || '',
    obfs: proxy.obfs,
    obfsPassword: proxy['obfs-password'],
    sni: proxy.sni,
    skipCertVerify: proxy['skip-cert-verify'],
  };
}

function convertTUIC(proxy: ClashProxy): TUICNode {
  return {
    type: 'tuic',
    name: proxy.name,
    server: proxy.server,
    port: proxy.port,
    uuid: proxy.uuid || '',
    password: proxy.password || '',
    congestionControl: proxy['congestion-control'],
    alpn: proxy.alpn,
    sni: proxy.sni,
    skipCertVerify: proxy['skip-cert-verify'],
    udpRelayMode: proxy['udp-relay-mode'],
  };
}
