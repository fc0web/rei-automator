/**
 * Rei AIOS — Tunnel Client
 * Phase E: セキュアトンネル
 *
 * VPS 上のデーモンにインターネット経由で安全にアクセスするための
 * リバーストンネルクライアント。
 *
 * 方式1: SSH リバーストンネル（推奨・最も安全）
 * 方式2: WebSocket リレートンネル（SSH不可の環境向け）
 *
 * VPS側でポートを直接公開せずに、ローカルPCからアクセスできる。
 */

import { EventEmitter } from 'events';
import * as http from 'http';

// ─── 型定義 ──────────────────────────────────────────

export interface TunnelConfig {
  enabled: boolean;
  method: 'ssh' | 'ws-relay' | 'none';

  // SSH tunnel settings
  ssh?: {
    host: string;        // SSH server (relay/jump host)
    port: number;        // SSH port (default: 22)
    user: string;
    keyPath?: string;    // SSH private key path
    password?: string;   // SSH password (not recommended)
    remotePort: number;  // Port to expose on the relay server
    localPort: number;   // Local daemon port to forward
    keepAlive: number;   // Keep-alive interval in seconds
    autoreconnect: boolean;
    reconnectDelay: number; // ms
  };

  // WebSocket relay settings (for non-SSH environments)
  wsRelay?: {
    relayUrl: string;     // WebSocket relay server URL
    channelId: string;    // Unique channel ID for this node
    authToken: string;    // Auth token for the relay
    reconnectDelay: number;
  };
}

export const DEFAULT_TUNNEL_CONFIG: TunnelConfig = {
  enabled: false,
  method: 'none',
  ssh: {
    host: '',
    port: 22,
    user: '',
    remotePort: 19720,
    localPort: 19720,
    keepAlive: 60,
    autoreconnect: true,
    reconnectDelay: 5000,
  },
};

// ─── Tunnel Client ───────────────────────────────────

export class TunnelClient extends EventEmitter {
  private config: TunnelConfig;
  private sshProcess: any = null;
  private wsRelay: any = null;
  private running = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: Partial<TunnelConfig> = {}) {
    super();
    this.config = { ...DEFAULT_TUNNEL_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (!this.config.enabled || this.config.method === 'none') {
      console.log('[Tunnel] Tunnel disabled.');
      return;
    }

    this.running = true;

    switch (this.config.method) {
      case 'ssh':
        await this.startSSHTunnel();
        break;
      case 'ws-relay':
        await this.startWSRelay();
        break;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.sshProcess) {
      this.sshProcess.kill();
      this.sshProcess = null;
      console.log('[Tunnel] SSH tunnel closed.');
    }

    if (this.wsRelay) {
      this.wsRelay.close();
      this.wsRelay = null;
      console.log('[Tunnel] WS relay disconnected.');
    }

    this.emit('stopped');
  }

  isConnected(): boolean {
    if (this.config.method === 'ssh') return this.sshProcess !== null;
    if (this.config.method === 'ws-relay') return this.wsRelay !== null;
    return false;
  }

  getStatus(): { method: string; connected: boolean; target: string } {
    return {
      method: this.config.method,
      connected: this.isConnected(),
      target: this.config.method === 'ssh'
        ? `${this.config.ssh?.host}:${this.config.ssh?.remotePort}`
        : this.config.wsRelay?.relayUrl || '',
    };
  }

  // ─── SSH Reverse Tunnel ──────────────────────────

  /**
   * SSH -R リバーストンネルを子プロセスで起動
   *
   * 例: ssh -R 19720:localhost:19720 user@relay-server -N
   * → relay-server:19720 へのアクセスが VPS の localhost:19720 に転送される
   */
  private async startSSHTunnel(): Promise<void> {
    const cfg = this.config.ssh!;
    if (!cfg.host || !cfg.user) {
      console.error('[Tunnel] SSH tunnel requires host and user.');
      return;
    }

    const { spawn } = require('child_process');

    const args: string[] = [
      '-R', `${cfg.remotePort}:localhost:${cfg.localPort}`,
      '-N',  // no remote command
      '-o', 'StrictHostKeyChecking=no',
      '-o', `ServerAliveInterval=${cfg.keepAlive}`,
      '-o', 'ServerAliveCountMax=3',
      '-o', 'ExitOnForwardFailure=yes',
      '-p', String(cfg.port),
    ];

    if (cfg.keyPath) {
      args.push('-i', cfg.keyPath);
    }

    args.push(`${cfg.user}@${cfg.host}`);

    console.log(`[Tunnel] Starting SSH tunnel: localhost:${cfg.localPort} → ${cfg.host}:${cfg.remotePort}`);

    this.sshProcess = spawn('ssh', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.sshProcess.stdout?.on('data', (data: Buffer) => {
      console.log(`[Tunnel/SSH] ${data.toString().trim()}`);
    });

    this.sshProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[Tunnel/SSH] ${msg}`);
    });

    this.sshProcess.on('close', (code: number) => {
      console.log(`[Tunnel] SSH tunnel closed (code: ${code})`);
      this.sshProcess = null;
      this.emit('disconnected', { method: 'ssh', code });

      if (this.running && cfg.autoreconnect) {
        console.log(`[Tunnel] Reconnecting in ${cfg.reconnectDelay}ms...`);
        this.reconnectTimer = setTimeout(() => this.startSSHTunnel(), cfg.reconnectDelay);
      }
    });

    this.sshProcess.on('error', (err: Error) => {
      console.error(`[Tunnel] SSH error: ${err.message}`);
      this.emit('error', err);

      // ssh.exe が見つからない場合の案内
      if (err.message.includes('ENOENT')) {
        console.error('[Tunnel] SSH client not found.');
        console.error('[Tunnel]   Windows 10+: Settings → Apps → Optional Features → OpenSSH Client');
        console.error('[Tunnel]   Or install Git for Windows (includes ssh.exe)');
      }
    });

    this.emit('connected', { method: 'ssh', target: `${cfg.host}:${cfg.remotePort}` });
  }

  // ─── WebSocket Relay Tunnel ────────────────────

  /**
   * WebSocket ベースのリレートンネル
   *
   * 仕組み:
   * 1. VPS 側: ローカルデーモン → WS relay server に接続（outbound のみ）
   * 2. クライアント側: WS relay server に接続
   * 3. relay server が両者をブリッジ
   *
   * → VPS 側でインバウンドポートを開ける必要がない
   */
  private async startWSRelay(): Promise<void> {
    const cfg = this.config.wsRelay;
    if (!cfg || !cfg.relayUrl) {
      console.error('[Tunnel] WS relay requires relayUrl.');
      return;
    }

    try {
      // ws パッケージがある場合はそれを使用
      const WebSocket = require('ws');

      console.log(`[Tunnel] Connecting to WS relay: ${cfg.relayUrl}`);

      this.wsRelay = new WebSocket(cfg.relayUrl, {
        headers: {
          'X-Channel-Id': cfg.channelId,
          'Authorization': `Bearer ${cfg.authToken}`,
          'X-Node-Type': 'daemon',
        },
      });

      this.wsRelay.on('open', () => {
        console.log(`[Tunnel] WS relay connected (channel: ${cfg.channelId})`);
        this.emit('connected', { method: 'ws-relay', channel: cfg.channelId });

        // Register as daemon
        this.wsRelay.send(JSON.stringify({
          type: 'register',
          role: 'daemon',
          channelId: cfg.channelId,
        }));
      });

      // Relay incoming requests to local daemon
      this.wsRelay.on('message', async (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'request') {
            const response = await this.proxyToLocal(msg);
            this.wsRelay.send(JSON.stringify({
              type: 'response',
              requestId: msg.requestId,
              ...response,
            }));
          }
        } catch (err: any) {
          console.error(`[Tunnel] WS relay error: ${err.message}`);
        }
      });

      this.wsRelay.on('close', () => {
        console.log('[Tunnel] WS relay disconnected');
        this.wsRelay = null;
        this.emit('disconnected', { method: 'ws-relay' });

        if (this.running) {
          console.log(`[Tunnel] Reconnecting in ${cfg.reconnectDelay}ms...`);
          this.reconnectTimer = setTimeout(
            () => this.startWSRelay(),
            cfg.reconnectDelay
          );
        }
      });

      this.wsRelay.on('error', (err: Error) => {
        console.error(`[Tunnel] WS relay error: ${err.message}`);
        this.emit('error', err);
      });
    } catch (err: any) {
      console.error(`[Tunnel] Failed to start WS relay: ${err.message}`);
    }
  }

  /**
   * WS relay 経由のリクエストをローカルデーモンに転送
   */
  private proxyToLocal(msg: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    return new Promise((resolve) => {
      const localPort = this.config.ssh?.localPort || 19720;
      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: localPort,
        path: msg.path,
        method: msg.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(msg.headers || {}),
        },
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 200,
            headers: res.headers as Record<string, string>,
            body,
          });
        });
      });

      req.on('error', (err) => {
        resolve({
          status: 502,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Local daemon unreachable', message: err.message }),
        });
      });

      if (msg.body) req.write(msg.body);
      req.end();
    });
  }
}
