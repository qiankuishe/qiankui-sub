import type { ProxyNode, VMessNode, VLESSNode, ShadowsocksNode, TrojanNode, Hysteria2Node, TUICNode } from '../../types/proxy.js';

/**
 * 将节点序列化为 URI
 */
export function serializeUri(node: ProxyNode): string {
  switch (node.type) {
    case 'vmess':
      return serializeVMess(node);
    case 'vless':
      return serializeVLESS(node);
    case 'ss':
      return serializeShadowsocks(node);
    case 'trojan':
      return serializeTrojan(node);
    case 'hysteria2':
      return serializeHysteria2(node);
    case 'tuic':
      return serializeTUIC(node);
    default:
      return '';
  }
}

function serializeVMess(node: VMessNode): string {
  const config = {
    v: '2',
    ps: node.name,
    add: node.server,
    port: node.port.toString(),
    id: node.uuid,
    aid: (node.alterId || 0).toString(),
    scy: node.cipher || 'auto',
    net: node.network || 'tcp',
    tls: node.tls ? 'tls' : '',
    sni: node.sni || '',
    host: node.wsHeaders?.Host || '',
    path: node.wsPath || '',
  };
  return `vmess://${Buffer.from(JSON.stringify(config)).toString('base64')}`;
}

function serializeVLESS(node: VLESSNode): string {
  const params = new URLSearchParams();
  params.set('type', node.network || 'tcp');
  if (node.tls) params.set('security', node.realityOpts ? 'reality' : 'tls');
  if (node.sni) params.set('sni', node.sni);
  if (node.flow) params.set('flow', node.flow);
  if (node.wsPath) params.set('path', node.wsPath);
  if (node.grpcServiceName) params.set('serviceName', node.grpcServiceName);
  if (node.realityOpts) {
    params.set('pbk', node.realityOpts.publicKey);
    if (node.realityOpts.shortId) params.set('sid', node.realityOpts.shortId);
  }
  
  return `vless://${node.uuid}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
}

function serializeShadowsocks(node: ShadowsocksNode): string {
  const userInfo = Buffer.from(`${node.cipher}:${node.password}`).toString('base64');
  return `ss://${userInfo}@${node.server}:${node.port}#${encodeURIComponent(node.name)}`;
}

function serializeTrojan(node: TrojanNode): string {
  const params = new URLSearchParams();
  if (node.sni) params.set('sni', node.sni);
  if (node.network && node.network !== 'tcp') params.set('type', node.network);
  if (node.wsPath) params.set('path', node.wsPath);
  if (node.grpcServiceName) params.set('serviceName', node.grpcServiceName);
  
  const query = params.toString();
  return `trojan://${encodeURIComponent(node.password)}@${node.server}:${node.port}${query ? '?' + query : ''}#${encodeURIComponent(node.name)}`;
}

function serializeHysteria2(node: Hysteria2Node): string {
  const params = new URLSearchParams();
  if (node.sni) params.set('sni', node.sni);
  if (node.obfs) params.set('obfs', node.obfs);
  if (node.obfsPassword) params.set('obfs-password', node.obfsPassword);
  if (node.skipCertVerify) params.set('insecure', '1');
  
  const query = params.toString();
  return `hysteria2://${encodeURIComponent(node.password)}@${node.server}:${node.port}${query ? '?' + query : ''}#${encodeURIComponent(node.name)}`;
}

function serializeTUIC(node: TUICNode): string {
  const params = new URLSearchParams();
  if (node.sni) params.set('sni', node.sni);
  if (node.congestionControl) params.set('congestion_control', node.congestionControl);
  if (node.alpn) params.set('alpn', node.alpn.join(','));
  if (node.udpRelayMode) params.set('udp_relay_mode', node.udpRelayMode);
  
  const query = params.toString();
  return `tuic://${node.uuid}:${encodeURIComponent(node.password)}@${node.server}:${node.port}${query ? '?' + query : ''}#${encodeURIComponent(node.name)}`;
}
