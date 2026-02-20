/**
 * Rei Automator — WebSocket Manager
 * Phase 9b: リアルタイムストリーム
 *
 * WebSocketで以下をリアルタイム配信:
 * - タスク実行ログ
 * - タスク状態変更（開始/完了/エラー）
 * - デーモン統計（定期）
 *
 * 依存: ws (npm install ws)
 *
 * プロトコル:
 *   Client → Server: JSON { type: "subscribe", channels: ["logs", "tasks", "stats"] }
 *   Server → Client: JSON { type: "log"|"task"|"stats", data: {...}, timestamp: "..." }
 */

import * as http from 'http';
import { Logger } from '../lib/core/logger';

// ─── 型定義 ──────────────────────────────────────────

export type WsChannel = 'logs' | 'tasks' | 'stats' | 'all';

export interface WsMessage {
  type: string;
  channel: WsChannel;
  data: any;
  timestamp: string;
}

interface ClientState {
  id: string;
  ws: any;             // WebSocket instance
  channels: Set<WsChannel>;
  name?: string;
  connectedAt: number;
}

// ─── WsManager クラス ────────────────────────────────

export class WsManager {
  private logger: Logger;
  private clients: Map<string, ClientState> = new Map();
  private wss: any = null;       // WebSocket.Server
  private clientCounter = 0;
  private statsInterval?: NodeJS.Timeout;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * HTTPサーバーにWebSocketをアタッチ
   */
  attach(server: http.Server): void {
    try {
      const WebSocket = require('ws');
      this.wss = new WebSocket.Server({ server, path: '/ws' });

      this.wss.on('connection', (ws: any, req: http.IncomingMessage) => {
        this.onConnection(ws, req);
      });

      // 30秒ごとにping送信（接続維持）
      this.statsInterval = setInterval(() => {
        this.pingAll();
      }, 30_000);

      this.logger.info(`WebSocket server attached on /ws`);
    } catch (err: any) {
      this.logger.warn(`WebSocket unavailable (install ws package): ${err.message}`);
    }
  }

  /**
   * 停止
   */
  stop(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    for (const client of this.clients.values()) {
      try {
        client.ws.close(1000, 'Server shutting down');
      } catch { /* ignore */ }
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }
  }

  // ─── ブロードキャスト ────────────────────────────

  /**
   * ログメッセージを配信
   */
  broadcastLog(level: string, message: string, taskId?: string): void {
    this.broadcast('logs', {
      type: 'log',
      channel: 'logs',
      data: { level, message, taskId },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * タスク状態変更を配信
   */
  broadcastTaskEvent(
    event: 'started' | 'completed' | 'error' | 'queued',
    task: { id: string; name: string; [key: string]: any }
  ): void {
    this.broadcast('tasks', {
      type: 'task',
      channel: 'tasks',
      data: { event, ...task },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 統計情報を配信
   */
  broadcastStats(stats: any): void {
    this.broadcast('stats', {
      type: 'stats',
      channel: 'stats',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * チャネル指定ブロードキャスト
   */
  private broadcast(channel: WsChannel, message: WsMessage): void {
    const json = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (client.channels.has(channel) || client.channels.has('all')) {
        try {
          if (client.ws.readyState === 1) {  // OPEN
            client.ws.send(json);
          }
        } catch {
          // 送信失敗は無視（次のpingで検出）
        }
      }
    }
  }

  // ─── 接続管理 ────────────────────────────────────

  private onConnection(ws: any, req: http.IncomingMessage): void {
    const clientId = `client-${++this.clientCounter}`;
    const ip = req.socket.remoteAddress || 'unknown';

    const client: ClientState = {
      id: clientId,
      ws,
      channels: new Set(['all']),  // デフォルトは全チャネル
      connectedAt: Date.now(),
    };

    this.clients.set(clientId, client);
    this.logger.info(`WebSocket connected: ${clientId} from ${ip}`);

    // ウェルカムメッセージ
    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        clientId,
        channels: Array.from(client.channels),
        message: 'Connected to Rei Automator',
      },
      timestamp: new Date().toISOString(),
    }));

    // クライアントからのメッセージ処理
    ws.on('message', (data: any) => {
      this.onMessage(clientId, data);
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      this.logger.debug(`WebSocket disconnected: ${clientId}`);
    });

    ws.on('error', (err: Error) => {
      this.logger.warn(`WebSocket error (${clientId}): ${err.message}`);
      this.clients.delete(clientId);
    });
  }

  private onMessage(clientId: string, raw: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'subscribe': {
          // チャネル購読変更
          if (Array.isArray(msg.channels)) {
            client.channels = new Set(msg.channels as WsChannel[]);
            client.ws.send(JSON.stringify({
              type: 'subscribed',
              data: { channels: Array.from(client.channels) },
              timestamp: new Date().toISOString(),
            }));
          }
          break;
        }

        case 'ping': {
          client.ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString(),
          }));
          break;
        }

        case 'identify': {
          // クライアント名の設定（Phase 9c ダッシュボード用）
          if (msg.name) {
            client.name = msg.name;
            this.logger.debug(`Client ${clientId} identified as: ${msg.name}`);
          }
          break;
        }

        default:
          this.logger.debug(`Unknown WS message type: ${msg.type}`);
      }
    } catch {
      this.logger.debug(`Invalid WS message from ${clientId}`);
    }
  }

  private pingAll(): void {
    for (const [id, client] of this.clients) {
      try {
        if (client.ws.readyState === 1) {
          client.ws.ping();
        } else {
          this.clients.delete(id);
        }
      } catch {
        this.clients.delete(id);
      }
    }
  }

  // ─── 情報取得 ────────────────────────────────────

  /**
   * 接続中クライアント数
   */
  get clientCount(): number {
    return this.clients.size;
  }

  /**
   * 接続中クライアント一覧
   */
  getClients(): Array<{ id: string; name?: string; channels: string[]; connectedAt: number }> {
    return Array.from(this.clients.values()).map(c => ({
      id: c.id,
      name: c.name,
      channels: Array.from(c.channels),
      connectedAt: c.connectedAt,
    }));
  }
}
