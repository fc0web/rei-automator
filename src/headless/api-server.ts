/**
 * Rei Automator — API Server
 * Phase 9b+9d: REST API + WebSocket + クラスタAPI 統合サーバー
 *
 * ★ 既存の api-server.ts を置き換えてください。
 *
 * Phase 9dで追加された変更点:
 * - cluster-routes（11エンドポイント）を統合、合計25エンドポイント
 * - NodeManager/TaskDispatcher をDaemonから取得
 * - クラスタイベントをWebSocketに中継
 */

import * as http from 'http';
import { Logger } from '../lib/core/logger';
import { ApiAuth, AuthConfig } from './api-auth';
import { ApiRoutes } from './api-routes';
import { WsManager } from './ws-manager';
import { Daemon } from './daemon';
import { createClusterRoutes } from './cluster-routes';
import { NodeManager } from './node-manager';
import { TaskDispatcher } from './task-dispatcher';

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

// ─── クラスタルート型（cluster-routes.ts からの返却値） ───

interface ClusterRouteHandler {
  method: string;
  path: string;
  handler: (req: http.IncomingMessage, res: http.ServerResponse, body: any, params: Record<string, string>) => Promise<void>;
  auth?: 'read' | 'execute' | 'admin';
}

// ─── ApiServer クラス ────────────────────────────────

export class ApiServer {
  private config: ApiServerConfig;
  private logger: Logger;
  private daemon: Daemon;
  private server?: http.Server;
  private auth: ApiAuth;
  private routes: ApiRoutes;
  private wsManager: WsManager;

  // ★ Phase 9d: クラスタルート
  private clusterRoutes: ClusterRouteHandler[] = [];
  private nodeManager?: NodeManager;
  private taskDispatcher?: TaskDispatcher;

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

    // ★ Phase 9d: クラスタルート初期化
    this.nodeManager = daemon.getNodeManager();
    this.taskDispatcher = daemon.getTaskDispatcher();
    if (this.nodeManager && this.taskDispatcher) {
      this.clusterRoutes = createClusterRoutes(this.nodeManager, this.taskDispatcher);
      this.logger.info(`Cluster API routes registered: ${this.clusterRoutes.length} endpoints`);
    }

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
        if (this.clusterRoutes.length > 0) {
          this.logger.info(`  Cluster:   http://localhost:${this.config.port}/api/cluster/`);
          this.logger.info(`  Dispatch:  http://localhost:${this.config.port}/api/dispatch`);
        }
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
      // 1. 既存のAPIルート（Phase 9b: 14エンドポイント）で処理を試行
      const handled = await this.routes.handle(req, res);
      if (handled) return;

      // 2. ★ Phase 9d: クラスタルート（11エンドポイント）で処理を試行
      const clusterHandled = await this.handleClusterRoute(req, res);
      if (clusterHandled) return;

      // 3. ルート不一致 → 404
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
          // Phase 9d
          clusterInfo: 'GET /api/cluster/info',
          clusterNodes: 'GET /api/cluster/nodes',
          clusterLeader: 'GET /api/cluster/leader',
          dispatch: 'POST /api/dispatch',
          dispatchBroadcast: 'POST /api/dispatch/broadcast',
          dispatchHistory: 'GET /api/dispatch/history',
        },
      }));
    } catch (err: any) {
      this.logger.error(`Request error: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  // ─── ★ Phase 9d: クラスタルート処理 ──────────────

  /**
   * クラスタルートのマッチングと実行
   * cluster-routes.ts が返す RouteHandler[] を逐次マッチング。
   */
  private async handleClusterRoute(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<boolean> {
    if (this.clusterRoutes.length === 0) return false;

    const method = req.method || 'GET';
    const urlPath = (req.url || '/').split('?')[0];

    // CORS は既に api-routes.ts の handle() で処理されているが、
    // そこで handled=false の場合はここで改めて設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }

    for (const route of this.clusterRoutes) {
      if (route.method !== method) continue;
      if (route.path !== urlPath) continue;

      // 認証チェック（auth が指定されている場合）
      if (route.auth) {
        const entry = this.auth.authorize(req, res, route.auth);
        if (!entry) return true; // 401/403 は送信済み
      }

      // リクエストボディの読み取り（POST の場合）
      let body: any = {};
      if (method === 'POST') {
        body = await this.readBody(req);
      }

      try {
        await route.handler(req, res, body, {});
      } catch (err: any) {
        this.logger.error(`Cluster API error [${method} ${urlPath}]: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
      }

      return true;
    }

    return false;
  }

  /**
   * リクエストボディの読み取り
   */
  private readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: string) => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          reject(new Error('Invalid JSON body'));
        }
      });
      req.on('error', reject);
    });
  }

  // ─── デーモンイベント連携 ────────────────────────

  /**
   * Daemonからのイベントを受けて、WebSocketに中継＋ログに記録
   */
  private connectDaemonEvents(): void {
    // ── 既存タスクイベント（Phase 9b） ──
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

    // ── ★ Phase 9d: クラスタイベント ──
    this.daemon.on('cluster:node:joined', (node: any) => {
      this.wsManager.broadcastLog('info', `[Cluster] Node joined: ${node.name} (${node.host})`);
    });

    this.daemon.on('cluster:node:offline', (node: any) => {
      this.wsManager.broadcastLog('warn', `[Cluster] Node offline: ${node.name}`);
    });

    this.daemon.on('cluster:node:left', (node: any) => {
      this.wsManager.broadcastLog('info', `[Cluster] Node left: ${node.name}`);
    });

    this.daemon.on('cluster:leader:elected', (leader: any) => {
      this.wsManager.broadcastLog('info', `[Cluster] Leader elected: ${leader.name}`);
    });

    this.daemon.on('dispatch:success', (result: any) => {
      this.wsManager.broadcastLog('info',
        `[Dispatch] ${result.taskId} → ${result.targetNodeId} (${result.strategy})`
      );
    });

    this.daemon.on('dispatch:error', (result: any) => {
      this.wsManager.broadcastLog('error',
        `[Dispatch] Failed: ${result.taskId} — ${result.error}`
      );
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
