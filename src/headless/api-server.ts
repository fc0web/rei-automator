/**
 * Rei Automator — API Server
 * Phase 9b+9d: REST API + WebSocket + クラスタAPI 統合サーバー
 *
 * ★ 既存の api-server.ts を置き換えてください。
 */

import * as http from 'http';
import * as https from 'https';
import { Logger } from './logger';
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
  tlsOptions?: { cert: string; key: string };
}

const DEFAULT_API_CONFIG: ApiServerConfig = {
  port: 19720,
  host: '0.0.0.0',
  auth: { enabled: true },
};

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

  private clusterRoutes: ClusterRouteHandler[] = [];
  private nodeManager?: NodeManager;
  private taskDispatcher?: TaskDispatcher;

  constructor(daemon: Daemon, config: Partial<ApiServerConfig>, logger: Logger) {
    this.config = { ...DEFAULT_API_CONFIG, ...config };
    this.logger = logger;
    this.daemon = daemon;

    this.auth = new ApiAuth(this.config.auth, logger);
    this.wsManager = new WsManager(logger);
    this.routes = new ApiRoutes(daemon, this.auth, this.wsManager, logger);

    this.nodeManager = daemon.getNodeManager();
    this.taskDispatcher = daemon.getTaskDispatcher();
    if (this.nodeManager && this.taskDispatcher) {
      this.clusterRoutes = createClusterRoutes(this.nodeManager, this.taskDispatcher);
      this.logger.info(`Cluster API routes registered: ${this.clusterRoutes.length} endpoints`);
    }

    this.connectDaemonEvents();
  }

  // ─── ライフサイクル ──────────────────────────────

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const requestHandler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
        await this.handleRequest(req, res);
      };

      const isHttps = !!this.config.tlsOptions;
      if (isHttps) {
        this.server = https.createServer(
          { cert: this.config.tlsOptions!.cert, key: this.config.tlsOptions!.key },
          requestHandler
        ) as unknown as http.Server;
      } else {
        this.server = http.createServer(requestHandler);
      }

      const proto = isHttps ? 'https' : 'http';
      const wsProto = isHttps ? 'wss' : 'ws';

      this.wsManager.attach(this.server);

      this.server.listen(this.config.port, this.config.host, () => {
        this.logger.info(`API server listening on ${this.config.host}:${this.config.port} [${proto.toUpperCase()}]`);
        this.logger.info(`  Dashboard: ${proto}://localhost:${this.config.port}/dashboard`);
        this.logger.info(`  REST API:  ${proto}://localhost:${this.config.port}/api/`);
        this.logger.info(`  WebSocket: ${wsProto}://localhost:${this.config.port}/ws`);
        this.logger.info(`  Health:    ${proto}://localhost:${this.config.port}/health`);
        if (this.clusterRoutes.length > 0) {
          this.logger.info(`  Cluster:   ${proto}://localhost:${this.config.port}/api/cluster/`);
          this.logger.info(`  Dispatch:  ${proto}://localhost:${this.config.port}/api/dispatch`);
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

  async stop(): Promise<void> {
    this.wsManager.stop();
    if (this.server) {
      await new Promise<void>((resolve) => { this.server!.close(() => resolve()); });
      this.logger.info('API server stopped');
    }
  }

  getRoutes(): ApiRoutes { return this.routes; }
  getWsManager(): WsManager { return this.wsManager; }

  // ─── リクエスト処理 ──────────────────────────────

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const method = req.method || 'GET';
    const url = req.url || '/';
    this.logger.debug(`${method} ${url}`);

    try {
      const handled = await this.routes.handle(req, res);
      if (handled) return;

      const clusterHandled = await this.handleClusterRoute(req, res);
      if (clusterHandled) return;

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(404);
      res.end(JSON.stringify({
        error: 'Not found',
        availableEndpoints: {
          health: 'GET /health', stats: 'GET /stats', tasks: 'GET /api/tasks',
          run: 'POST /api/tasks/run', schedule: 'POST /api/tasks/schedule',
          logs: 'GET /api/logs', keys: 'GET /api/keys', ws: 'WebSocket /ws',
          clusterInfo: 'GET /api/cluster/info', clusterNodes: 'GET /api/cluster/nodes',
          dispatch: 'POST /api/dispatch', dispatchHistory: 'GET /api/dispatch/history',
        },
      }));
    } catch (err: any) {
      this.logger.error(`Request error: ${err.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  // ─── クラスタルート処理 ──────────────────────────

  private async handleClusterRoute(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
    if (this.clusterRoutes.length === 0) return false;

    const method = req.method || 'GET';
    const urlPath = (req.url || '/').split('?')[0];

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return true; }

    for (const route of this.clusterRoutes) {
      if (route.method !== method) continue;
      if (route.path !== urlPath) continue;

      if (route.auth) {
        const entry = this.auth.authorize(req, res, route.auth);
        if (!entry) return true;
      }

      let body: any = {};
      if (method === 'POST') { body = await this.readBody(req); }

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

  private readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: string) => { body += chunk; });
      req.on('end', () => {
        try { resolve(body ? JSON.parse(body) : {}); }
        catch { reject(new Error('Invalid JSON body')); }
      });
      req.on('error', reject);
    });
  }

  // ─── デーモンイベント連携 ────────────────────────

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

    // クラスタイベント
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
      this.wsManager.broadcastLog('info', `[Dispatch] ${result.taskId} → ${result.targetNodeId} (${result.strategy})`);
    });
    this.daemon.on('dispatch:error', (result: any) => {
      this.wsManager.broadcastLog('error', `[Dispatch] Failed: ${result.taskId} — ${result.error}`);
    });

    setInterval(() => {
      if (this.wsManager.clientCount > 0) {
        this.wsManager.broadcastStats(this.daemon.getPublicStats());
      }
    }, 60_000);
  }
}
