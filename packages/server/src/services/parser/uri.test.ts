import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseUri, isValidNodeUri, isSubscriptionUrl } from './uri.js';
import type { ProxyNode } from '../../types/proxy.js';

// 生成有效的 UUID
const arbitraryUuid = fc.uuid();

// 生成有效的服务器地址
const arbitraryServer = fc.oneof(
  fc.ipV4(),
  fc.domain().filter((d) => d.length > 0 && d.length < 64)
);

// 生成有效的端口
const arbitraryPort = fc.integer({ min: 1, max: 65535 });

// 生成有效的节点名称
const arbitraryName = fc.string({ minLength: 1, maxLength: 32 }).filter((s) => !s.includes('#') && !s.includes('?'));

// 生成有效的密码
const arbitraryPassword = fc.string({ minLength: 1, maxLength: 32 }).filter((s) => !s.includes('@') && !s.includes(':'));

/**
 * Property 9: 协议解析完整性
 * 对于任何支持的协议节点，解析后应该正确提取所有必要的配置参数
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
describe('Property 9: 协议解析完整性', () => {
  it('VMess URI 解析应保留所有必要参数', () => {
    fc.assert(
      fc.property(
        arbitraryUuid,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (uuid, server, port, name) => {
          const config = {
            v: '2',
            ps: name,
            add: server,
            port: port.toString(),
            id: uuid,
            aid: '0',
            scy: 'auto',
            net: 'tcp',
            tls: '',
          };
          const uri = `vmess://${Buffer.from(JSON.stringify(config)).toString('base64')}`;
          
          const node = parseUri(uri);
          expect(node).not.toBeNull();
          expect(node?.type).toBe('vmess');
          expect(node?.server).toBe(server);
          expect(node?.port).toBe(port);
          if (node?.type === 'vmess') {
            expect(node.uuid).toBe(uuid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('VLESS URI 解析应保留所有必要参数', () => {
    fc.assert(
      fc.property(
        arbitraryUuid,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (uuid, server, port, name) => {
          const uri = `vless://${uuid}@${server}:${port}?security=tls&type=tcp#${encodeURIComponent(name)}`;
          
          const node = parseUri(uri);
          expect(node).not.toBeNull();
          expect(node?.type).toBe('vless');
          expect(node?.server).toBe(server);
          expect(node?.port).toBe(port);
          if (node?.type === 'vless') {
            expect(node.uuid).toBe(uuid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Trojan URI 解析应保留所有必要参数', () => {
    fc.assert(
      fc.property(
        arbitraryPassword,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (password, server, port, name) => {
          const uri = `trojan://${encodeURIComponent(password)}@${server}:${port}?sni=${server}#${encodeURIComponent(name)}`;
          
          const node = parseUri(uri);
          expect(node).not.toBeNull();
          expect(node?.type).toBe('trojan');
          expect(node?.server).toBe(server);
          expect(node?.port).toBe(port);
          if (node?.type === 'trojan') {
            expect(node.password).toBe(password);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Hysteria2 URI 解析应保留所有必要参数', () => {
    fc.assert(
      fc.property(
        arbitraryPassword,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (password, server, port, name) => {
          const uri = `hysteria2://${encodeURIComponent(password)}@${server}:${port}?sni=${server}#${encodeURIComponent(name)}`;
          
          const node = parseUri(uri);
          expect(node).not.toBeNull();
          expect(node?.type).toBe('hysteria2');
          expect(node?.server).toBe(server);
          expect(node?.port).toBe(port);
          if (node?.type === 'hysteria2') {
            expect(node.password).toBe(password);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('TUIC URI 解析应保留所有必要参数', () => {
    fc.assert(
      fc.property(
        arbitraryUuid,
        arbitraryPassword,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (uuid, password, server, port, name) => {
          const uri = `tuic://${uuid}:${encodeURIComponent(password)}@${server}:${port}?congestion_control=bbr&alpn=h3&sni=${server}#${encodeURIComponent(name)}`;
          
          const node = parseUri(uri);
          expect(node).not.toBeNull();
          expect(node?.type).toBe('tuic');
          expect(node?.server).toBe(server);
          expect(node?.port).toBe(port);
          if (node?.type === 'tuic') {
            expect(node.uuid).toBe(uuid);
            expect(node.password).toBe(password);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('URI 验证', () => {
  it('应正确识别有效的节点 URI', () => {
    expect(isValidNodeUri('vmess://xxx')).toBe(true);
    expect(isValidNodeUri('vless://xxx')).toBe(true);
    expect(isValidNodeUri('ss://xxx')).toBe(true);
    expect(isValidNodeUri('trojan://xxx')).toBe(true);
    expect(isValidNodeUri('hysteria2://xxx')).toBe(true);
    expect(isValidNodeUri('tuic://xxx')).toBe(true);
  });

  it('应正确识别订阅链接', () => {
    expect(isSubscriptionUrl('https://example.com/sub')).toBe(true);
    expect(isSubscriptionUrl('http://example.com/sub')).toBe(true);
    expect(isSubscriptionUrl('vmess://xxx')).toBe(false);
  });
});
