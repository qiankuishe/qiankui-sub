import type {
  ProxyNode,
  VMessNode,
  VLESSNode,
  ShadowsocksNode,
  TrojanNode,
  Hysteria2Node,
  TUICNode,
} from '../../types/proxy.js';

/**
 * 解析节点 URI
 */
export function parseUri(uri: string): ProxyNode | null {
  const trimmed = uri.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith('vmess://')) {
      return parseVMessUri(trimmed);
    }
    if (trimmed.startsWith('vless://')) {
      return parseVLESSUri(trimmed);
    }
    if (trimmed.startsWith('ss://')) {
      return parseShadowsocksUri(trimmed);
    }
    if (trimmed.startsWith('trojan://')) {
      return parseTrojanUri(trimmed);
    }
    if (trimmed.startsWith('hysteria2://') || trimmed.startsWith('hy2://')) {
      return parseHysteria2Uri(trimmed);
    }
    if (trimmed.startsWith('tuic://')) {
      return parseTUICUri(trimmed);
    }
  } catch (e) {
    console.error('Failed to parse URI:', uri, e);
  }

  return null;
}

/**
 * 解析 VMess URI (v2rayN 格式)
 * vmess://base64(json)
 */
function parseVMessUri(uri: string): VMessNode | null {
  const base64 = uri.slice(8);
  const json = Buffer.from(base64, 'base64').toString('utf-8');
  const config = JSON.parse(json);

  return {
    type: 'vmess',
    name: config.ps || config.remarks || `VMess-${config.add}`,
    server: config.add,
    port: parseInt(config.port, 10),
    uuid: config.id,
    alterId: parseInt(config.aid || '0', 10),
    cipher: config.scy || 'auto',
    tls: config.tls === 'tls',
    sni: config.sni || config.host,
    network: config.net || 'tcp',
    wsPath: config.path,
    wsHeaders: config.host ? { Host: config.host } : undefined,
  };
}


/**
 * 解析 VLESS URI
 * vless://uuid@server:port?params#name
 */
function parseVLESSUri(uri: string): VLESSNode | null {
  const url = new URL(uri);
  const params = url.searchParams;

  return {
    type: 'vless',
    name: decodeURIComponent(url.hash.slice(1)) || `VLESS-${url.hostname}`,
    server: url.hostname,
    port: parseInt(url.port, 10),
    uuid: url.username,
    flow: params.get('flow') || undefined,
    tls: params.get('security') === 'tls' || params.get('security') === 'reality',
    sni: params.get('sni') || undefined,
    skipCertVerify: params.get('allowInsecure') === '1',
    network: (params.get('type') as VLESSNode['network']) || 'tcp',
    wsPath: params.get('path') || undefined,
    grpcServiceName: params.get('serviceName') || undefined,
    realityOpts: params.get('security') === 'reality' ? {
      publicKey: params.get('pbk') || '',
      shortId: params.get('sid') || undefined,
    } : undefined,
  };
}

/**
 * 解析 Shadowsocks URI
 * ss://base64(method:password)@server:port#name
 * ss://base64(method:password@server:port)#name (SIP002)
 */
function parseShadowsocksUri(uri: string): ShadowsocksNode | null {
  // 处理 SIP002 格式
  const hashIndex = uri.indexOf('#');
  const name = hashIndex > -1 ? decodeURIComponent(uri.slice(hashIndex + 1)) : '';
  const mainPart = hashIndex > -1 ? uri.slice(5, hashIndex) : uri.slice(5);

  let server: string, port: number, cipher: string, password: string;

  if (mainPart.includes('@')) {
    // 新格式: base64(method:password)@server:port
    const [encoded, serverPart] = mainPart.split('@');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    [cipher, password] = decoded.split(':');
    const [host, portStr] = serverPart.split(':');
    server = host;
    port = parseInt(portStr, 10);
  } else {
    // 旧格式: base64(method:password@server:port)
    const decoded = Buffer.from(mainPart, 'base64').toString('utf-8');
    const match = decoded.match(/^(.+?):(.+)@(.+):(\d+)$/);
    if (!match) return null;
    [, cipher, password, server, port] = match as unknown as [string, string, string, string, number];
    port = parseInt(port as unknown as string, 10);
  }

  return {
    type: 'ss',
    name: name || `SS-${server}`,
    server,
    port,
    cipher,
    password,
  };
}

/**
 * 解析 Trojan URI
 * trojan://password@server:port?params#name
 */
function parseTrojanUri(uri: string): TrojanNode | null {
  const url = new URL(uri);
  const params = url.searchParams;

  return {
    type: 'trojan',
    name: decodeURIComponent(url.hash.slice(1)) || `Trojan-${url.hostname}`,
    server: url.hostname,
    port: parseInt(url.port, 10),
    password: decodeURIComponent(url.username),
    sni: params.get('sni') || url.hostname,
    skipCertVerify: params.get('allowInsecure') === '1',
    network: (params.get('type') as TrojanNode['network']) || 'tcp',
    wsPath: params.get('path') || undefined,
    grpcServiceName: params.get('serviceName') || undefined,
  };
}

/**
 * 解析 Hysteria2 URI
 * hysteria2://password@server:port?params#name
 */
function parseHysteria2Uri(uri: string): Hysteria2Node | null {
  const normalized = uri.replace('hy2://', 'hysteria2://');
  const url = new URL(normalized);
  const params = url.searchParams;

  return {
    type: 'hysteria2',
    name: decodeURIComponent(url.hash.slice(1)) || `Hysteria2-${url.hostname}`,
    server: url.hostname,
    port: parseInt(url.port, 10),
    password: decodeURIComponent(url.username),
    obfs: params.get('obfs') || undefined,
    obfsPassword: params.get('obfs-password') || undefined,
    sni: params.get('sni') || url.hostname,
    skipCertVerify: params.get('insecure') === '1',
  };
}

/**
 * 解析 TUIC URI
 * tuic://uuid:password@server:port?params#name
 */
function parseTUICUri(uri: string): TUICNode | null {
  const url = new URL(uri);
  const params = url.searchParams;

  return {
    type: 'tuic',
    name: decodeURIComponent(url.hash.slice(1)) || `TUIC-${url.hostname}`,
    server: url.hostname,
    port: parseInt(url.port, 10),
    uuid: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    congestionControl: params.get('congestion_control') || 'bbr',
    alpn: params.get('alpn')?.split(',') || ['h3'],
    sni: params.get('sni') || url.hostname,
    skipCertVerify: params.get('allow_insecure') === '1',
    udpRelayMode: params.get('udp_relay_mode') || undefined,
  };
}

/**
 * 检查是否为有效的节点 URI
 */
export function isValidNodeUri(uri: string): boolean {
  const protocols = ['vmess://', 'vless://', 'ss://', 'trojan://', 'hysteria2://', 'hy2://', 'tuic://'];
  return protocols.some((p) => uri.trim().startsWith(p));
}

/**
 * 检查是否为订阅链接
 */
export function isSubscriptionUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}
