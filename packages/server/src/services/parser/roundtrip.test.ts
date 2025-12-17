import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseUri } from './uri.js';
import { serializeUri } from '../serializer/uri.js';
import type { VMessNode, VLESSNode, TrojanNode, Hysteria2Node, TUICNode } from '../../types/proxy.js';

// 生成有效的 UUID
const arbitraryUuid = fc.uuid();

// 生成有效的服务器地址
const arbitraryServer = fc.ipV4();

// 生成有效的端口
const arbitraryPort = fc.integer({ min: 1, max: 65535 });

// 生成有效的节点名称（避免特殊字符）
const arbitraryName = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 1, maxLength: 16 });

// 生成有效的密码（避免特殊字符）
const arbitraryPassword = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), { minLength: 4, maxLength: 16 });

/**
 * Property 1: 解析-序列化往返一致性
 * 对于任何有效的节点，序列化后再解析应该产生语义等价的结果
 * Validates: Requirements 2.6
 */
describe('Property 1: 解析-序列化往返一致性', () => {
  it('VMess 节点往返应保持一致', () => {
    fc.assert(
      fc.property(
        arbitraryUuid,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (uuid, server, port, name) => {
          const original: VMessNode = {
            type: 'vmess',
            name,
            server,
            port,
            uuid,
            alterId: 0,
            cipher: 'auto',
            network: 'tcp',
          };

          const uri = serializeUri(original);
          const parsed = parseUri(uri);

          expect(parsed).not.toBeNull();
          expect(parsed?.type).toBe('vmess');
          expect(parsed?.server).toBe(server);
          expect(parsed?.port).toBe(port);
          if (parsed?.type === 'vmess') {
            expect(parsed.uuid).toBe(uuid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('VLESS 节点往返应保持一致', () => {
    fc.assert(
      fc.property(
        arbitraryUuid,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (uuid, server, port, name) => {
          const original: VLESSNode = {
            type: 'vless',
            name,
            server,
            port,
            uuid,
            tls: true,
            network: 'tcp',
          };

          const uri = serializeUri(original);
          const parsed = parseUri(uri);

          expect(parsed).not.toBeNull();
          expect(parsed?.type).toBe('vless');
          expect(parsed?.server).toBe(server);
          expect(parsed?.port).toBe(port);
          if (parsed?.type === 'vless') {
            expect(parsed.uuid).toBe(uuid);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Trojan 节点往返应保持一致', () => {
    fc.assert(
      fc.property(
        arbitraryPassword,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (password, server, port, name) => {
          const original: TrojanNode = {
            type: 'trojan',
            name,
            server,
            port,
            password,
            sni: server,
          };

          const uri = serializeUri(original);
          const parsed = parseUri(uri);

          expect(parsed).not.toBeNull();
          expect(parsed?.type).toBe('trojan');
          expect(parsed?.server).toBe(server);
          expect(parsed?.port).toBe(port);
          if (parsed?.type === 'trojan') {
            expect(parsed.password).toBe(password);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Hysteria2 节点往返应保持一致', () => {
    fc.assert(
      fc.property(
        arbitraryPassword,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (password, server, port, name) => {
          const original: Hysteria2Node = {
            type: 'hysteria2',
            name,
            server,
            port,
            password,
            sni: server,
          };

          const uri = serializeUri(original);
          const parsed = parseUri(uri);

          expect(parsed).not.toBeNull();
          expect(parsed?.type).toBe('hysteria2');
          expect(parsed?.server).toBe(server);
          expect(parsed?.port).toBe(port);
          if (parsed?.type === 'hysteria2') {
            expect(parsed.password).toBe(password);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('TUIC 节点往返应保持一致', () => {
    fc.assert(
      fc.property(
        arbitraryUuid,
        arbitraryPassword,
        arbitraryServer,
        arbitraryPort,
        arbitraryName,
        (uuid, password, server, port, name) => {
          const original: TUICNode = {
            type: 'tuic',
            name,
            server,
            port,
            uuid,
            password,
            congestionControl: 'bbr',
            sni: server,
          };

          const uri = serializeUri(original);
          const parsed = parseUri(uri);

          expect(parsed).not.toBeNull();
          expect(parsed?.type).toBe('tuic');
          expect(parsed?.server).toBe(server);
          expect(parsed?.port).toBe(port);
          if (parsed?.type === 'tuic') {
            expect(parsed.uuid).toBe(uuid);
            expect(parsed.password).toBe(password);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
