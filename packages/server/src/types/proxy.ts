// 代理协议类型
export type ProxyType = 'vmess' | 'vless' | 'ss' | 'trojan' | 'hysteria' | 'hysteria2' | 'tuic' | 'wireguard';

// 传输层类型
export type NetworkType = 'tcp' | 'ws' | 'grpc' | 'h2' | 'quic' | 'kcp';

// 通用节点基础结构
export interface ProxyNodeBase {
  name: string;
  type: ProxyType;
  server: string;
  port: number;
}

// VMess 节点
export interface VMessNode extends ProxyNodeBase {
  type: 'vmess';
  uuid: string;
  alterId: number;
  cipher: string;
  tls?: boolean;
  sni?: string;
  skipCertVerify?: boolean;
  network?: NetworkType;
  wsPath?: string;
  wsHeaders?: Record<string, string>;
  grpcServiceName?: string;
}

// VLESS 节点
export interface VLESSNode extends ProxyNodeBase {
  type: 'vless';
  uuid: string;
  flow?: string;
  tls?: boolean;
  sni?: string;
  skipCertVerify?: boolean;
  network?: NetworkType;
  wsPath?: string;
  wsHeaders?: Record<string, string>;
  grpcServiceName?: string;
  realityOpts?: {
    publicKey: string;
    shortId?: string;
  };
}

// Shadowsocks 节点
export interface ShadowsocksNode extends ProxyNodeBase {
  type: 'ss';
  cipher: string;
  password: string;
  plugin?: string;
  pluginOpts?: Record<string, string>;
}

// Trojan 节点
export interface TrojanNode extends ProxyNodeBase {
  type: 'trojan';
  password: string;
  sni?: string;
  skipCertVerify?: boolean;
  network?: NetworkType;
  wsPath?: string;
  grpcServiceName?: string;
}


// Hysteria 节点
export interface HysteriaNode extends ProxyNodeBase {
  type: 'hysteria';
  auth?: string;
  authStr?: string;
  obfs?: string;
  alpn?: string[];
  sni?: string;
  skipCertVerify?: boolean;
  upMbps?: number;
  downMbps?: number;
}

// Hysteria2 节点
export interface Hysteria2Node extends ProxyNodeBase {
  type: 'hysteria2';
  password: string;
  obfs?: string;
  obfsPassword?: string;
  sni?: string;
  skipCertVerify?: boolean;
}

// TUIC 节点
export interface TUICNode extends ProxyNodeBase {
  type: 'tuic';
  uuid: string;
  password: string;
  congestionControl?: string;
  alpn?: string[];
  sni?: string;
  skipCertVerify?: boolean;
  udpRelayMode?: string;
}

// WireGuard 节点
export interface WireGuardNode extends ProxyNodeBase {
  type: 'wireguard';
  privateKey: string;
  publicKey: string;
  presharedKey?: string;
  ip: string;
  ipv6?: string;
  dns?: string[];
  mtu?: number;
  reserved?: number[];
}

// 联合类型
export type ProxyNode =
  | VMessNode
  | VLESSNode
  | ShadowsocksNode
  | TrojanNode
  | HysteriaNode
  | Hysteria2Node
  | TUICNode
  | WireGuardNode;

// 订阅格式类型
export type SubscriptionFormat = 'base64' | 'clash' | 'surge' | 'singbox' | 'unknown';

// 输出格式类型
export type OutputFormat = 'base64' | 'clash' | 'surge' | 'loon' | 'qx' | 'singbox' | 'stash';

// 节点唯一标识生成
export function getNodeId(node: ProxyNode): string {
  return `${node.type}:${node.server}:${node.port}`;
}
