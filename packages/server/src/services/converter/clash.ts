import YAML from 'yaml';
import type { ProxyNode } from '../../types/proxy.js';

/**
 * 确保节点名称唯一，重复的添加序号
 */
function ensureUniqueNames(nodes: ProxyNode[]): ProxyNode[] {
  const nameCount = new Map<string, number>();
  const result: ProxyNode[] = [];

  for (const node of nodes) {
    const baseName = node.name;
    const count = nameCount.get(baseName) || 0;
    
    if (count > 0) {
      // 有重复，添加序号
      result.push({ ...node, name: `${baseName} (${count + 1})` });
    } else {
      result.push(node);
    }
    
    nameCount.set(baseName, count + 1);
  }

  return result;
}

/**
 * 转换为 Clash YAML 格式
 */
export function convertToClash(nodes: ProxyNode[]): string {
  const uniqueNodes = ensureUniqueNames(nodes);
  const proxies = uniqueNodes.map(convertNode).filter(Boolean);
  const proxyNames = proxies.map((p) => (p as Record<string, unknown>).name as string);

  const config = {
    'mixed-port': 7890,
    'allow-lan': true,
    mode: 'rule',
    'log-level': 'info',
    'external-controller': '127.0.0.1:9090',
    proxies,
    'proxy-groups': [
      {
        name: '🚀 节点选择',
        type: 'select',
        proxies: ['♻️ 自动选择', '☑️ 手动切换', 'DIRECT'],
      },
      {
        name: '♻️ 自动选择',
        type: 'url-test',
        proxies: proxyNames,
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
        tolerance: 50,
      },
      {
        name: '☑️ 手动切换',
        type: 'select',
        proxies: proxyNames,
      },
      {
        name: '🤖 AI 服务',
        type: 'select',
        proxies: ['🚀 节点选择', '♻️ 自动选择', '☑️ 手动切换'],
      },
      {
        name: '📺 流媒体',
        type: 'select',
        proxies: ['🚀 节点选择', '♻️ 自动选择', '☑️ 手动切换'],
      },
      {
        name: '🛑 广告拦截',
        type: 'select',
        proxies: ['REJECT', 'DIRECT'],
      },
      {
        name: '🐟 漏网之鱼',
        type: 'select',
        proxies: ['🚀 节点选择', '♻️ 自动选择', 'DIRECT'],
      },
    ],
    rules: [
      // AI 服务
      'DOMAIN-SUFFIX,openai.com,🤖 AI 服务',
      'DOMAIN-SUFFIX,chatgpt.com,🤖 AI 服务',
      'DOMAIN-SUFFIX,chat.com,🤖 AI 服务',
      'DOMAIN-SUFFIX,ai.com,🤖 AI 服务',
      'DOMAIN-SUFFIX,claude.ai,🤖 AI 服务',
      'DOMAIN-SUFFIX,anthropic.com,🤖 AI 服务',
      'DOMAIN-SUFFIX,gemini.google.com,🤖 AI 服务',
      'DOMAIN-SUFFIX,bard.google.com,🤖 AI 服务',
      'DOMAIN-SUFFIX,copilot.microsoft.com,🤖 AI 服务',
      'DOMAIN-SUFFIX,perplexity.ai,🤖 AI 服务',
      // 流媒体
      'DOMAIN-SUFFIX,youtube.com,📺 流媒体',
      'DOMAIN-SUFFIX,googlevideo.com,📺 流媒体',
      'DOMAIN-SUFFIX,ytimg.com,📺 流媒体',
      'DOMAIN-SUFFIX,netflix.com,📺 流媒体',
      'DOMAIN-SUFFIX,nflxvideo.net,📺 流媒体',
      'DOMAIN-SUFFIX,spotify.com,📺 流媒体',
      'DOMAIN-SUFFIX,disneyplus.com,📺 流媒体',
      'DOMAIN-SUFFIX,hulu.com,📺 流媒体',
      'DOMAIN-SUFFIX,twitch.tv,📺 流媒体',
      'DOMAIN-SUFFIX,tiktok.com,📺 流媒体',
      // Google 服务
      'DOMAIN-SUFFIX,google.com,🚀 节点选择',
      'DOMAIN-SUFFIX,googleapis.com,🚀 节点选择',
      'DOMAIN-SUFFIX,gstatic.com,🚀 节点选择',
      'DOMAIN-SUFFIX,gmail.com,🚀 节点选择',
      'DOMAIN-SUFFIX,googleusercontent.com,🚀 节点选择',
      // GitHub
      'DOMAIN-SUFFIX,github.com,🚀 节点选择',
      'DOMAIN-SUFFIX,githubusercontent.com,🚀 节点选择',
      'DOMAIN-SUFFIX,githubassets.com,🚀 节点选择',
      // 社交媒体
      'DOMAIN-SUFFIX,twitter.com,🚀 节点选择',
      'DOMAIN-SUFFIX,x.com,🚀 节点选择',
      'DOMAIN-SUFFIX,twimg.com,🚀 节点选择',
      'DOMAIN-SUFFIX,facebook.com,🚀 节点选择',
      'DOMAIN-SUFFIX,instagram.com,🚀 节点选择',
      'DOMAIN-SUFFIX,telegram.org,🚀 节点选择',
      'DOMAIN-SUFFIX,t.me,🚀 节点选择',
      // 广告拦截
      'DOMAIN-KEYWORD,adservice,🛑 广告拦截',
      'DOMAIN-KEYWORD,adtrack,🛑 广告拦截',
      'DOMAIN-KEYWORD,adsystem,🛑 广告拦截',
      'DOMAIN-KEYWORD,adserver,🛑 广告拦截',
      'DOMAIN-KEYWORD,adsrvr,🛑 广告拦截',
      'DOMAIN-SUFFIX,doubleclick.net,🛑 广告拦截',
      'DOMAIN-SUFFIX,googleadservices.com,🛑 广告拦截',
      'DOMAIN-SUFFIX,googlesyndication.com,🛑 广告拦截',
      // 局域网直连
      'IP-CIDR,192.168.0.0/16,DIRECT,no-resolve',
      'IP-CIDR,10.0.0.0/8,DIRECT,no-resolve',
      'IP-CIDR,172.16.0.0/12,DIRECT,no-resolve',
      'IP-CIDR,127.0.0.0/8,DIRECT,no-resolve',
      'IP-CIDR,100.64.0.0/10,DIRECT,no-resolve',
      'IP-CIDR6,::1/128,DIRECT,no-resolve',
      'IP-CIDR6,fc00::/7,DIRECT,no-resolve',
      'IP-CIDR6,fe80::/10,DIRECT,no-resolve',
      // 国内直连
      'GEOIP,CN,DIRECT',
      // 兜底规则
      'MATCH,🐟 漏网之鱼',
    ],
  };

  return YAML.stringify(config);
}

function convertNode(node: ProxyNode): Record<string, unknown> | null {
  switch (node.type) {
    case 'vmess':
      return {
        name: node.name,
        type: 'vmess',
        server: node.server,
        port: node.port,
        uuid: node.uuid,
        alterId: node.alterId,
        cipher: node.cipher,
        tls: node.tls,
        ...(node.sni && { servername: node.sni }),
        'skip-cert-verify': true,
        ...(node.network && { network: node.network }),
        ...(node.wsPath && {
          'ws-opts': {
            path: node.wsPath,
            headers: { Host: node.sni || node.server },
          },
        }),
        ...(node.grpcServiceName && { 'grpc-opts': { 'grpc-service-name': node.grpcServiceName } }),
      };

    case 'vless':
      return {
        name: node.name,
        type: 'vless',
        server: node.server,
        port: node.port,
        uuid: node.uuid,
        ...(node.flow && { flow: node.flow }),
        tls: node.tls,
        ...(node.sni && { servername: node.sni }),
        'skip-cert-verify': true,
        'client-fingerprint': 'chrome',
        ...(node.network && { network: node.network }),
        ...(node.wsPath && {
          'ws-opts': {
            path: node.wsPath,
            headers: { Host: node.sni || node.server },
          },
        }),
        ...(node.grpcServiceName && { 'grpc-opts': { 'grpc-service-name': node.grpcServiceName } }),
        ...(node.realityOpts && { 'reality-opts': { 'public-key': node.realityOpts.publicKey, 'short-id': node.realityOpts.shortId } }),
      };

    case 'ss':
      return {
        name: node.name,
        type: 'ss',
        server: node.server,
        port: node.port,
        cipher: node.cipher,
        password: node.password,
      };

    case 'trojan':
      return {
        name: node.name,
        type: 'trojan',
        server: node.server,
        port: node.port,
        password: node.password,
        ...(node.sni && { sni: node.sni }),
        'skip-cert-verify': true,
        ...(node.network && { network: node.network }),
        ...(node.wsPath && {
          'ws-opts': {
            path: node.wsPath,
            headers: { Host: node.sni || node.server },
          },
        }),
        ...(node.grpcServiceName && { 'grpc-opts': { 'grpc-service-name': node.grpcServiceName } }),
      };

    case 'hysteria2':
      return {
        name: node.name,
        type: 'hysteria2',
        server: node.server,
        port: node.port,
        password: node.password,
        ...(node.obfs && { obfs: node.obfs }),
        ...(node.obfsPassword && { 'obfs-password': node.obfsPassword }),
        ...(node.sni && { sni: node.sni }),
        'skip-cert-verify': true,
        alpn: ['h3'],
      };

    case 'tuic':
      return {
        name: node.name,
        type: 'tuic',
        server: node.server,
        port: node.port,
        uuid: node.uuid,
        password: node.password,
        'congestion-controller': node.congestionControl || 'bbr',
        alpn: node.alpn || ['h3'],
        ...(node.sni && { sni: node.sni }),
        'skip-cert-verify': true,
        'udp-relay-mode': node.udpRelayMode || 'native',
      };

    default:
      return null;
  }
}
