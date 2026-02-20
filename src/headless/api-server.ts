/**
 * Rei Automator — API Server
 * Phase 9b: REST API + WebSocket 統合サーバー
 *
 * Phase 9aのヘルスHTTPサーバーを拡張し、以下を統合:
 * - REST API（タスク管理、スクリプト実行、APIキー管理）
 * - WebSocket（リアルタイムログ・ステータスストリーム）
 * - APIキー認証
 *
 * DaemonクラスのstartHealthServer()を置き換える形で統合。
 */

import * as http from 'http';
import { Logger } from '../lib/core/logger';
import { ApiAuth, AuthConfig } from './api-auth';
import { ApiRoutes } from './api-routes';
import { WsManager } from './ws-manager';
import { Daemon } from './daemon';

// ─── 型定義 ──────────────────────────────────────────

export interface ApiServerConfig {
  port: number;
  host: string;
  auth: Partial<AuthConfig>;
}

const DEFAULT_API_CONFIG: ApiServerConfig = {
  port: 19720,
  host: '0.0.0.0',
  auth: { enabled: true },
};

// ─── ApiServer クラス ────────────────────────────────

export class ApiServer {
  private config: ApiServerConfig;
  private logger: Logger;
  private daemon: Daemon;
  private server?: http.Server;
  private auth: ApiAuth;
  private routes: ApiRoutes;
  private wsManager: WsManager;

  constructor(daemon: Daemon, config: Partial<ApiServerConfig>, logger: Logger) {
    this.config = { ...DEFAULT_API_CONFIG, ...config };
    this.logger = logger;
    this.daemon = daemon;

    // 認証モジュール初期化
    this.auth = new ApiAuth(this.config.auth, logger);

    // WebSocketマネージャー初期化
    this.wsManager = new WsManager(logger);

    // APIルート初期化
    this.routes = new ApiRoutes(daemon, this.auth, this.wsManager, logger);

    // デーモンのイベントをWebSocket/ログに連携
    this.connectDaemonEvents();
  }

  // ─── ライフサイクル ──────────────────────────────

  /**
   * サーバー起動
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      // WebSocketをHTTPサーバーにアタッチ
      this.wsManager.attach(this.server);

      this.server.listen(this.config.port, this.config.host, () => {
        this.logger.info(
          `API server listening on ${this.config.host}:${this.config.port}`
        );
        this.logger.info(`  REST API:  http://localhost:${this.config.port}/api/`);
        this.logger.info(`  WebSocket: ws://localhost:${this.config.port}/ws`);
        this.logger.info(`  Health:    http://localhost:${this.config.port}/health`);
        resolve();
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          this.logger.warn(`Port ${this.config.port} in use, trying ${this.config.port + 1}`);
          this.config.port++;
          this.server!.listen(this.config.port, this.config.host);
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * サーバー停止
   */
  async stop(): Promise<void> {
    this.wsManager.stop();

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.logger.info('API server stopped');
    }
  }

  /**
   * APIルートへの参照を返す（外部からログ追加等）
   */
  getRoutes(): ApiRoutes {
    return this.routes;
  }

  /**
   * WebSocketマネージャーへの参照
   */
  getWsManager(): WsManager {
    return this.wsManager;
  }

  // ─── リクエスト処理 ──────────────────────────────

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const method = req.method || 'GET';
    const url = req.url || '/';

    this.logger.debug(`${method} ${url}`);

    try {
      // APIルートで処理を試行
      const handled = await this.routes.handle(req, res);
      if (handled) return;

      // ルート不一致 → 404
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(404);
      res.end(JSON.stringify({
        error: 'Not found',
        availableEndpoints: {
          health: 'GET /health',
          stats: 'GET /stats',
          tasks: 'GET /api/tasks',
          run: 'POST /api/tasks/run',
          schedule: 'POST /api/tasks/schedule',
          logs: 'GET /api/logs',
          keys: 'GET /api/keys',
          ws: 'WebSocket /ws',
        },
      }));
    } catch (err: any) {
      this.logger.error(`Request error: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  // ─── デーモンイベント連携 ────────────────────────

  /**
   * Daemonからのイベントを受けて、WebSocketに中継＋ログに記録
   */
  private connectDaemonEvents(): void {
    this.daemon.on('task:queued', (task: any) => {
      this.wsManager.broadcastTaskEvent('queued', task);
      this.routes.addLog('info', `Queued: ${task.name}`, task.id);
    });

    this.daemon.on('task:started', (task: any) => {
      this.wsManager.broadcastTaskEvent('started', task);
      this.routes.addLog('info', `Started: ${task.name}`, task.id);
    });

    this.daemon.on('task:completed', (task: any) => {
      this.wsManager.broadcastTaskEvent('completed', task);
      this.routes.addLog('info', `Completed: ${task.name} (${task.elapsed}ms)`, task.id);
    });

    this.daemon.on('task:error', (task: any) => {
      this.wsManager.broadcastTaskEvent('error', task);
      this.routes.addLog('error', `Error: ${task.name} - ${task.error}`, task.id);
    });

    this.daemon.on('log', (entry: any) => {
      this.wsManager.broadcastLog(entry.level, entry.message, entry.taskId);
    });

    // 定期的にstatsをブロードキャスト（60秒ごと）
    setInterval(() => {
      if (this.wsManager.clientCount > 0) {
        const stats = this.daemon.getPublicStats();
        this.wsManager.broadcastStats(stats);
      }
    }, 60_000);
  }
}
