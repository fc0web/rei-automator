/**
 * Rei Automator — REST API Routes
 * Phase 9b: リモートタスク管理API
 *
 * エンドポイント一覧:
 *
 * 認証不要（read）:
 *   GET  /health              — ヘルスチェック
 *   GET  /stats               — 統計情報
 *
 * 読み取り（read）:
 *   GET  /api/tasks           — タスク一覧
 *   GET  /api/tasks/:id       — タスク詳細
 *   GET  /api/logs            — 実行ログ
 *   GET  /api/ws/clients      — WebSocket接続一覧
 *
 * 実行（execute）:
 *   POST /api/tasks/run       — スクリプト即座実行
 *   POST /api/tasks/schedule  — スケジュール登録
 *   POST /api/tasks/:id/stop  — タスク停止
 *
 * 管理（admin）:
 *   POST   /api/keys          — APIキー生成
 *   GET    /api/keys          — APIキー一覧
 *   DELETE /api/keys/:key     — APIキー削除
 *   POST   /api/daemon/reload — デーモンリロード
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { ApiAuth, Permission } from './api-auth';
import { WsManager } from './ws-manager';
import { Daemon, TaskEntry } from './daemon';

// ─── 型定義 ──────────────────────────────────────────

interface RouteHandler {
  method: string;
  pattern: RegExp;
  permission: Permission | null;  // nullなら認証不要
  handler: (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => Promise<void>;
}

// ─── ApiRoutes クラス ────────────────────────────────

export class ApiRoutes {
  private logger: Logger;
  private auth: ApiAuth;
  private wsManager: WsManager;
  private daemon: Daemon;
  private routes: RouteHandler[] = [];
  private executionLogs: LogEntry[] = [];
  private maxLogEntries = 1000;

  constructor(
    daemon: Daemon,
    auth: ApiAuth,
    wsManager: WsManager,
    logger: Logger
  ) {
    this.daemon = daemon;
    this.auth = auth;
    this.wsManager = wsManager;
    this.logger = logger;
    this.registerRoutes();
  }

  // ─── ルート登録 ──────────────────────────────────

  private registerRoutes(): void {
    // ── ダッシュボード配信（認証不要） ──
    this.route('GET', /^\/dashboard$/, null, this.handleDashboard);
    this.route('GET', /^\/$/, null, this.handleDashboardRedirect);

    // ── ヘルス（認証不要） ──
    this.route('GET', /^\/health$/, null, this.handleHealth);
    this.route('GET', /^\/stats$/, null, this.handleStats);

    // ── タスク管理（read） ──
    this.route('GET', /^\/api\/tasks$/, 'read', this.handleGetTasks);
    this.route('GET', /^\/api\/tasks\/(.+)$/, 'read', this.handleGetTask);
    this.route('GET', /^\/api\/logs$/, 'read', this.handleGetLogs);
    this.route('GET', /^\/api\/ws\/clients$/, 'read', this.handleGetWsClients);

    // ── タスク実行（execute） ──
    this.route('POST', /^\/api\/tasks\/run$/, 'execute', this.handleRunTask);
    this.route('POST', /^\/api\/tasks\/schedule$/, 'execute', this.handleScheduleTask);
    this.route('POST', /^\/api\/tasks\/(.+)\/stop$/, 'execute', this.handleStopTask);

    // ── 管理（admin） ──
    this.route('POST', /^\/api\/keys$/, 'admin', this.handleCreateKey);
    this.route('GET', /^\/api\/keys$/, 'admin', this.handleListKeys);
    this.route('DELETE', /^\/api\/keys\/(.+)$/, 'admin', this.handleDeleteKey);
    this.route('POST', /^\/api\/daemon\/reload$/, 'admin', this.handleReload);
  }

  private route(
    method: string,
    pattern: RegExp,
    permission: Permission | null,
    handler: (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => Promise<void>
  ): void {
    this.routes.push({ method, pattern, permission, handler: handler.bind(this) });
  }

  // ─── リクエストディスパッチ ──────────────────────

  /**
   * HTTPリクエストを処理。マッチするルートがなければfalseを返す。
   */
  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
    const method = req.method || 'GET';
    const url = (req.url || '/').split('?')[0];

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = url.match(route.pattern);
      if (!match) continue;

      // 認証チェック
      if (route.permission !== null) {
        const entry = this.auth.authorize(req, res, route.permission);
        if (!entry) return true;  // 401/403は送信済み
      }

      // パスパラメータ抽出
      const params: Record<string, string> = {};
      if (match[1]) params.id = decodeURIComponent(match[1]);

      try {
        await route.handler(req, res, params);
      } catch (err: any) {
        this.logger.error(`API error [${method} ${url}]: ${err.message}`);
        this.sendJson(res, 500, { error: 'Internal server error', message: err.message });
      }

      return true;
    }

    return false;  // ルート不一致
  }

  // ─── ダッシュボードハンドラ ──────────────────────

  private async handleDashboard(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // dashboard.html を複数のパスから探索
    const candidates = [
      path.resolve(__dirname, '..', 'renderer', 'dashboard.html'),
      path.resolve(__dirname, '..', '..', 'src', 'renderer', 'dashboard.html'),
      path.resolve(__dirname, 'dashboard.html'),
      path.resolve(process.cwd(), 'src', 'renderer', 'dashboard.html'),
      path.resolve(process.cwd(), 'dist', 'renderer', 'dashboard.html'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        const html = fs.readFileSync(candidate, 'utf-8');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        res.end(html);
        return;
      }
    }

    this.logger.warn(`dashboard.html not found. Searched: ${candidates.join(', ')}`);
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><body style="background:#0c0e12;color:#c0c5d0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div><h2>Dashboard not found</h2><p>dashboard.html が見つかりません。<br/>src/renderer/dashboard.html を配置してください。</p></div></body></html>`);
  }

  private async handleDashboardRedirect(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    res.writeHead(302, { 'Location': '/dashboard' });
    res.end();
  }

  // ─── ヘルス系ハンドラ ────────────────────────────

  private async handleHealth(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const stats = this.daemon.getPublicStats();
    this.sendJson(res, 200, {
      ok: true,
      version: '0.6.0',
      ...stats,
      wsClients: this.wsManager.clientCount,
    });
  }

  private async handleStats(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const stats = this.daemon.getPublicStats();
    this.sendJson(res, 200, {
      ...stats,
      wsClients: this.wsManager.clientCount,
    });
  }

  // ─── タスク管理ハンドラ ──────────────────────────

  private async handleGetTasks(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const tasks = this.daemon.getTaskList();
    this.sendJson(res, 200, { tasks, count: tasks.length });
  }

  private async handleGetTask(_req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>): Promise<void> {
    const task = this.daemon.getTask(params.id);
    if (task) {
      this.sendJson(res, 200, { task });
    } else {
      this.sendJson(res, 404, { error: 'Task not found' });
    }
  }

  private async handleGetLogs(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 1000);
    const level = url.searchParams.get('level');  // debug, info, warn, error
    const taskId = url.searchParams.get('task');

    let logs = this.executionLogs.slice(-limit);
    if (level) logs = logs.filter(l => l.level === level);
    if (taskId) logs = logs.filter(l => l.taskId === taskId);

    this.sendJson(res, 200, { logs, count: logs.length });
  }

  private async handleGetWsClients(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const clients = this.wsManager.getClients();
    this.sendJson(res, 200, { clients, count: clients.length });
  }

  // ─── タスク実行ハンドラ ──────────────────────────

  /**
   * POST /api/tasks/run
   * Body: { "code": "click(100, 200)\nwait(1000)", "name": "remote-task" }
   *   or: { "file": "my-script.rei" }
   */
  private async handleRunTask(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);

    if (!body.code && !body.file) {
      this.sendJson(res, 400, { error: 'Missing "code" or "file" in request body' });
      return;
    }

    let code = body.code || '';
    let name = body.name || 'remote-task';

    // ファイル指定の場合はwatchDirから読み込み
    if (body.file) {
      const filePath = path.resolve(this.daemon.getWatchDir(), body.file);
      if (!fs.existsSync(filePath)) {
        this.sendJson(res, 404, { error: `Script not found: ${body.file}` });
        return;
      }
      code = fs.readFileSync(filePath, 'utf-8');
      name = path.basename(body.file, '.rei');
    }

    const taskId = `remote-${Date.now()}`;

    // WebSocket通知
    this.wsManager.broadcastTaskEvent('queued', { id: taskId, name });

    this.logger.info(`Remote task queued: ${name} (${taskId})`);

    // 非同期実行（すぐにレスポンスを返す）
    const executionPromise = this.daemon.executeRemote(taskId, name, code);

    // 実行結果をWebSocketで通知（バックグラウンド）
    executionPromise.then((result) => {
      this.wsManager.broadcastTaskEvent('completed', {
        id: taskId,
        name,
        elapsed: result.elapsed,
      });
      this.addLog('info', `Completed: ${name} (${result.elapsed}ms)`, taskId);
    }).catch((err) => {
      this.wsManager.broadcastTaskEvent('error', {
        id: taskId,
        name,
        error: err.message,
      });
      this.addLog('error', `Error: ${name} - ${err.message}`, taskId);
    });

    this.sendJson(res, 202, {
      message: 'Task queued',
      taskId,
      name,
    });
  }

  /**
   * POST /api/tasks/schedule
   * Body: { "file": "my-script.rei", "schedule": "every 30m" }
   *   or: { "code": "...", "name": "task-name", "schedule": "every 1h" }
   */
  private async handleScheduleTask(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);

    if (!body.schedule) {
      this.sendJson(res, 400, { error: 'Missing "schedule" in request body' });
      return;
    }

    if (!body.code && !body.file) {
      this.sendJson(res, 400, { error: 'Missing "code" or "file" in request body' });
      return;
    }

    let name = body.name || body.file || 'scheduled-task';

    // コード指定の場合、watchDirにファイルとして保存
    if (body.code) {
      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(this.daemon.getWatchDir(), `${safeName}.rei`);
      const codeWithSchedule = `// @schedule ${body.schedule}\n${body.code}`;
      fs.writeFileSync(filePath, codeWithSchedule, 'utf-8');
      this.logger.info(`Saved scheduled script: ${filePath}`);

      this.sendJson(res, 201, {
        message: 'Schedule created',
        name: safeName,
        schedule: body.schedule,
        file: `${safeName}.rei`,
      });
    } else {
      // ファイル指定の場合、@scheduleディレクティブを追加
      const filePath = path.resolve(this.daemon.getWatchDir(), body.file);
      if (!fs.existsSync(filePath)) {
        this.sendJson(res, 404, { error: `Script not found: ${body.file}` });
        return;
      }

      let code = fs.readFileSync(filePath, 'utf-8');
      // 既存の@scheduleがあれば置換、なければ追加
      if (code.match(/\/\/\s*@schedule\s+/)) {
        code = code.replace(/\/\/\s*@schedule\s+.+/, `// @schedule ${body.schedule}`);
      } else {
        code = `// @schedule ${body.schedule}\n${code}`;
      }
      fs.writeFileSync(filePath, code, 'utf-8');

      this.sendJson(res, 200, {
        message: 'Schedule updated',
        file: body.file,
        schedule: body.schedule,
      });
    }
  }

  private async handleStopTask(_req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>): Promise<void> {
    const stopped = this.daemon.stopTask(params.id);
    if (stopped) {
      this.wsManager.broadcastTaskEvent('completed', { id: params.id, name: params.id, stopped: true });
      this.sendJson(res, 200, { message: 'Task stop requested', taskId: params.id });
    } else {
      this.sendJson(res, 404, { error: 'Task not found or not running' });
    }
  }

  // ─── 管理系ハンドラ ──────────────────────────────

  private async handleCreateKey(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const name = body.name || 'unnamed';
    const permissions = body.permissions || ['read', 'execute'];

    const entry = this.auth.generateKey(name, permissions);
    this.logger.info(`API key created: ${name}`);

    this.sendJson(res, 201, {
      message: 'API key created',
      key: entry.key,         // 生成時のみ全体を返す
      name: entry.name,
      permissions: entry.permissions,
    });
  }

  private async handleListKeys(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const keys = this.auth.listKeys();
    this.sendJson(res, 200, { keys });
  }

  private async handleDeleteKey(_req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>): Promise<void> {
    const deleted = this.auth.revokeKey(params.id);
    if (deleted) {
      this.sendJson(res, 200, { message: 'Key revoked' });
    } else {
      this.sendJson(res, 404, { error: 'Key not found' });
    }
  }

  private async handleReload(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    this.logger.info('Daemon reload requested via API');
    await this.daemon.reload();
    this.sendJson(res, 200, { message: 'Daemon reloaded' });
  }

  // ─── ログ管理 ────────────────────────────────────

  addLog(level: string, message: string, taskId?: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      taskId,
    };

    this.executionLogs.push(entry);
    if (this.executionLogs.length > this.maxLogEntries) {
      this.executionLogs = this.executionLogs.slice(-this.maxLogEntries);
    }

    // WebSocketにも配信
    this.wsManager.broadcastLog(level, message, taskId);
  }

  // ─── ユーティリティ ──────────────────────────────

  private sendJson(res: http.ServerResponse, status: number, data: any): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

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
}

// ─── ログエントリ型 ──────────────────────────────────

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  taskId?: string;
}
