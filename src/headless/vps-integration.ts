/**
 * Rei AIOS — VPS Integration Module
 * Phase E: VPS 運用統合
 *
 * TLS、セキュアトンネル、RDPセッション維持を
 * 既存のデーモンに統合するためのモジュール。
 *
 * daemon.ts の start() 内で呼び出す:
 *   import { VpsIntegration } from './vps-integration';
 *   const vps = new VpsIntegration(config, logger);
 *   await vps.start();
 */

import { EventEmitter } from 'events';
import { TlsManager, TlsConfig, DEFAULT_TLS_CONFIG } from './tls-manager';
import { TunnelClient, TunnelConfig, DEFAULT_TUNNEL_CONFIG } from './tunnel-client';
import { RdpKeepalive, RdpKeepaliveConfig } from './rdp-keepalive';
import { Logger } from './logger';

// ─── 型定義 ──────────────────────────────────────────

export interface VpsConfig {
  tls?: Partial<TlsConfig>;
  tunnel?: Partial<TunnelConfig>;
  rdpKeepalive?: Partial<RdpKeepaliveConfig>;
}

export interface VpsStatus {
  tls: { enabled: boolean; certPath?: string };
  tunnel: { method: string; connected: boolean; target: string };
  rdp: { connected: boolean; locked: boolean; uptime: number };
}

// ─── VPS Integration ─────────────────────────────────

export class VpsIntegration extends EventEmitter {
  private logger: Logger;
  private tlsManager: TlsManager;
  private tunnelClient: TunnelClient;
  private rdpKeepalive: RdpKeepalive;
  private tlsOptions: { cert: string; key: string } | null = null;

  constructor(config: VpsConfig, logger: Logger) {
    super();
    this.logger = logger;
    this.tlsManager = new TlsManager(config.tls);
    this.tunnelClient = new TunnelClient(config.tunnel);
    this.rdpKeepalive = new RdpKeepalive(config.rdpKeepalive);
  }

  /**
   * VPS 関連サービスを全て起動
   */
  async start(): Promise<void> {
    this.logger.info('[VPS] Starting VPS integration...');

    // 1. TLS 証明書準備
    try {
      this.tlsOptions = await this.tlsManager.prepare();
      if (this.tlsOptions) {
        this.logger.info('[VPS] TLS enabled — HTTPS mode');
      }
    } catch (err: any) {
      this.logger.warn(`[VPS] TLS setup failed: ${err.message}`);
    }

    // 2. RDP セッション維持
    try {
      await this.rdpKeepalive.start();
      this.rdpKeepalive.on('disconnected', () => {
        this.logger.warn('[VPS] RDP session disconnected. Cursorless mode continues.');
        this.emit('rdp:disconnected');
      });
      this.rdpKeepalive.on('reconnected', () => {
        this.logger.info('[VPS] RDP session reconnected.');
        this.emit('rdp:reconnected');
      });
    } catch (err: any) {
      this.logger.warn(`[VPS] RDP keepalive setup failed: ${err.message}`);
    }

    // 3. セキュアトンネル
    try {
      await this.tunnelClient.start();
      this.tunnelClient.on('connected', (info: any) => {
        this.logger.info(`[VPS] Tunnel connected: ${JSON.stringify(info)}`);
        this.emit('tunnel:connected', info);
      });
      this.tunnelClient.on('disconnected', (info: any) => {
        this.logger.warn(`[VPS] Tunnel disconnected: ${JSON.stringify(info)}`);
        this.emit('tunnel:disconnected', info);
      });
    } catch (err: any) {
      this.logger.warn(`[VPS] Tunnel setup failed: ${err.message}`);
    }

    this.logger.info('[VPS] VPS integration started.');
  }

  async stop(): Promise<void> {
    await this.tunnelClient.stop();
    await this.rdpKeepalive.stop();
    this.logger.info('[VPS] VPS integration stopped.');
  }

  /**
   * TLS options を返す（ApiServer が HTTPS モードで使用）
   */
  getTlsOptions(): { cert: string; key: string } | null {
    return this.tlsOptions;
  }

  /**
   * VPS 全体のステータスを返す
   */
  getStatus(): VpsStatus {
    const tlsCfg = this.tlsManager.getConfig();
    const tunnelStatus = this.tunnelClient.getStatus();
    const rdpStatus = this.rdpKeepalive.getStatus();

    return {
      tls: {
        enabled: !!this.tlsOptions,
        certPath: tlsCfg.enabled ? tlsCfg.certPath : undefined,
      },
      tunnel: tunnelStatus,
      rdp: {
        connected: rdpStatus.connected,
        locked: rdpStatus.locked,
        uptime: rdpStatus.uptime,
      },
    };
  }
}
