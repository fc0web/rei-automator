/**
 * Rei Automator — Daemon Process
 * Phase 9a: スケジューラ統合 + ファイル監視 + ヘルスHTTPサーバー
 *
 * デーモンの責務:
 * 1. スケジュール済みタスクの定期実行
 * 2. watchDirの.reiファイル追加/変更の検知 → 自動実行
 * 3. HTTPヘルスエンドポイントの提供
 * 4. タスクの再試行・エラーハンドリング
 */

import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { EventEmitter } from 'events';

import { ReiRuntime } from '../lib/core/runtime';
import { ReiParser } from '../lib/core/parser';
import { Logger } from '../lib/core/logger';
import { ScriptWatcher } from './watcher';

// ─── 型定義 ──────────────────────────────────────────

export interface DaemonConfig {
  watchDir: string;
  logDir: string;
  healthPort: number;
  maxRetries: number;
  retryDelayMs: number;
  executionMode: 'cursor' | 'cursorless';
  defaultWindow?: string;
}

export interface TaskEntry {
  id: string;
  name: string;
  scriptPath: string;
  schedule?: string;           // cron式 or interval (e.g., "*/5 * * * *", "every 30m")
  running: boolean;
  lastRun?: string;
  lastResult?: 'success' | 'error';
  lastError?: string;
  runCount: number;
  errorCount: number;
}

interface TaskQueueItem {
  taskId: string;
  scriptPath: string;
  code: string;
  retryCount: number;
  addedAt: number;
}

interface DaemonStats {
  startedAt: number;
  activeTasks: number;
  completedTasks: number;
  errorTasks: number;
  pid: number;
  memoryMB: number;
}

// ─── Daemon クラス ───────────────────────────────────

export class Daemon extends EventEmitter {
  private config: DaemonConfig;
  private logger: Logger;
  private tasks: Map<string, TaskEntry> = new Map();
  private queue: TaskQueueItem[] = [];
  private processing = false;
  private running = false;
  private startedAt = 0;
  private completedTasks = 0;
  private errorTasks = 0;

  private watcher?: ScriptWatcher;
  private healthServer?: http.Server;
  private scheduleTimers: Map<string, NodeJS.Timeout> = new Map();
  private parser: ReiParser;

  constructor(config: DaemonConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.parser = new ReiParser();
  }

  // ─── ライフサイクル ──────────────────────────────

  async start(): Promise<void> {
    this.running = true;
    this.startedAt = Date.now();

    this.logger.info('Daemon starting...');

    // 1. watchDirの確認・作成
    this.ensureDir(this.config.watchDir);
    this.ensureDir(this.config.logDir);

    // 2. 既存スクリプトの読み込み
    await this.loadExistingScripts();

    // 3. ファイル監視開始
    this.watcher = new ScriptWatcher(this.config.watchDir, this.logger);
    this.watcher.on('script:added', (filePath: string) => this.onScriptAdded(filePath));
    this.watcher.on('script:changed', (filePath: string) => this.onScriptChanged(filePath));
    this.watcher.on('script:removed', (filePath: string) => this.onScriptRemoved(filePath));
    this.watcher.start();

    // 4. スケジュールタスクの起動
    this.startScheduledTasks();

    // 5. ヘルスHTTPサーバー起動
    await this.startHealthServer();

    this.logger.info(`Daemon started (PID: ${process.pid})`);

    // メインループ（プロセスを維持）
    await this.mainLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.logger.info('Daemon stopping...');

    // スケジュールタイマー停止
    for (const [id, timer] of this.scheduleTimers) {
      clearInterval(timer);
      this.logger.debug(`Stopped schedule: ${id}`);
    }
    this.scheduleTimers.clear();

    // ファイル監視停止
    if (this.watcher) {
      this.watcher.stop();
    }

    // ヘルスサーバー停止
    if (this.healthServer) {
      await new Promise<void>((resolve) => {
        this.healthServer!.close(() => resolve());
      });
    }

    this.logger.info('Daemon stopped');
  }

  // ─── スクリプト管理 ──────────────────────────────

  private async loadExistingScripts(): Promise<void> {
    const files = fs.readdirSync(this.config.watchDir)
      .filter(f => f.endsWith('.rei'));

    for (const file of files) {
      const filePath = path.join(this.config.watchDir, file);
      this.registerTask(filePath);
    }

    this.logger.info(`Loaded ${files.length} scripts from ${this.config.watchDir}`);
  }

  private registerTask(scriptPath: string): TaskEntry {
    const name = path.basename(scriptPath, '.rei');
    const id = this.taskId(scriptPath);

    // スクリプトファイル内の schedule ディレクティブを探す
    const code = fs.readFileSync(scriptPath, 'utf-8');
    const schedule = this.extractSchedule(code);

    const task: TaskEntry = {
      id,
      name,
      scriptPath,
      schedule: schedule || undefined,
      running: false,
      runCount: 0,
      errorCount: 0,
    };

    this.tasks.set(id, task);
    this.logger.debug(`Registered task: ${name}${schedule ? ` (schedule: ${schedule})` : ''}`);

    return task;
  }

  /**
   * スクリプト先頭の schedule ディレクティブを解析
   * 例: // @schedule every 30m
   *      // @schedule cron 0 * * * *
   *      // @schedule once
   */
  private extractSchedule(code: string): string | null {
    const lines = code.split('\n');
    for (const line of lines.slice(0, 10)) {  // 先頭10行のみ
      const match = line.match(/\/\/\s*@schedule\s+(.+)/i);
      if (match) return match[1].trim();
    }
    return null;
  }

  // ─── スケジュール実行 ────────────────────────────

  private startScheduledTasks(): void {
    for (const [id, task] of this.tasks) {
      if (task.schedule) {
        this.scheduleTask(task);
      }
    }
  }

  private scheduleTask(task: TaskEntry): void {
    const intervalMs = this.parseScheduleInterval(task.schedule!);

    if (intervalMs === null) {
      this.logger.warn(`Invalid schedule for ${task.name}: ${task.schedule}`);
      return;
    }

    if (intervalMs === 0) {
      // "once" — 即座に1回実行
      this.enqueueTask(task.id, task.scriptPath);
      return;
    }

    // 定期実行
    const timer = setInterval(() => {
      if (this.running && !task.running) {
        this.enqueueTask(task.id, task.scriptPath);
      }
    }, intervalMs);

    this.scheduleTimers.set(task.id, timer);
    this.logger.info(`Scheduled ${task.name}: every ${intervalMs / 1000}s`);

    // 初回も即実行
    this.enqueueTask(task.id, task.scriptPath);
  }

  /**
   * スケジュール文字列をミリ秒間隔に変換
   * "every 30m" → 1800000
   * "every 1h"  → 3600000
   * "every 10s" → 10000
   * "once"      → 0
   */
  private parseScheduleInterval(schedule: string): number | null {
    if (schedule === 'once') return 0;

    const match = schedule.match(/every\s+(\d+)(s|m|h|d)/i);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    const multipliers: Record<string, number> = {
      's': 1000,
      'm': 60_000,
      'h': 3_600_000,
      'd': 86_400_000,
    };

    return value * (multipliers[unit] || 0);
  }

  // ─── タスクキュー ────────────────────────────────

  private enqueueTask(taskId: string, scriptPath: string): void {
    try {
      const code = fs.readFileSync(scriptPath, 'utf-8');
      this.queue.push({
        taskId,
        scriptPath,
        code,
        retryCount: 0,
        addedAt: Date.now(),
      });
      this.logger.debug(`Enqueued: ${path.basename(scriptPath)}`);
      this.processQueue();
    } catch (err: any) {
      this.logger.error(`Failed to read script ${scriptPath}: ${err.message}`);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0 && this.running) {
      const item = this.queue.shift()!;
      const task = this.tasks.get(item.taskId);

      if (task) {
        task.running = true;
        task.lastRun = new Date().toISOString();
      }

      const scriptName = path.basename(item.scriptPath);
      this.logger.info(`Executing: ${scriptName}`);

      try {
        const commands = this.parser.parse(item.code);
        const runtime = new ReiRuntime({
          mode: this.config.executionMode,
          defaultWindow: this.config.defaultWindow,
          logger: this.logger,
        });

        const startTime = Date.now();
        await runtime.execute(commands);
        const elapsed = Date.now() - startTime;

        this.completedTasks++;
        if (task) {
          task.running = false;
          task.lastResult = 'success';
          task.runCount++;
        }

        this.logger.info(`Completed: ${scriptName} (${elapsed}ms)`);
      } catch (err: any) {
        this.errorTasks++;
        if (task) {
          task.running = false;
          task.lastResult = 'error';
          task.lastError = err.message;
          task.errorCount++;
        }

        this.logger.error(`Error in ${scriptName}: ${err.message}`);

        // リトライ
        if (item.retryCount < this.config.maxRetries) {
          this.logger.info(
            `Retrying ${scriptName} (${item.retryCount + 1}/${this.config.maxRetries})...`
          );
          await this.delay(this.config.retryDelayMs);
          this.queue.push({ ...item, retryCount: item.retryCount + 1 });
        } else {
          this.logger.error(
            `Giving up on ${scriptName} after ${this.config.maxRetries} retries`
          );
        }
      }
    }

    this.processing = false;
  }

  // ─── ファイル監視イベント ────────────────────────

  private onScriptAdded(filePath: string): void {
    const task = this.registerTask(filePath);
    this.logger.info(`New script detected: ${task.name}`);

    if (task.schedule) {
      this.scheduleTask(task);
    }
  }

  private onScriptChanged(filePath: string): void {
    const id = this.taskId(filePath);
    const existing = this.tasks.get(id);

    if (existing && !existing.running) {
      this.logger.info(`Script changed: ${existing.name}, re-registering`);

      // 既存スケジュールをクリア
      const timer = this.scheduleTimers.get(id);
      if (timer) {
        clearInterval(timer);
        this.scheduleTimers.delete(id);
      }

      // 再登録
      const task = this.registerTask(filePath);
      if (task.schedule) {
        this.scheduleTask(task);
      }
    }
  }

  private onScriptRemoved(filePath: string): void {
    const id = this.taskId(filePath);
    const task = this.tasks.get(id);

    if (task) {
      this.logger.info(`Script removed: ${task.name}`);

      const timer = this.scheduleTimers.get(id);
      if (timer) {
        clearInterval(timer);
        this.scheduleTimers.delete(id);
      }

      this.tasks.delete(id);
    }
  }

  // ─── ヘルスHTTPサーバー ──────────────────────────

  private async startHealthServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.healthServer = http.createServer((req, res) => {
        this.handleHealthRequest(req, res);
      });

      this.healthServer.listen(this.config.healthPort, '0.0.0.0', () => {
        this.logger.info(`Health server listening on :${this.config.healthPort}`);
        resolve();
      });

      this.healthServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          this.logger.warn(`Port ${this.config.healthPort} in use, trying ${this.config.healthPort + 1}`);
          this.config.healthPort++;
          this.healthServer!.listen(this.config.healthPort, '0.0.0.0');
        } else {
          reject(err);
        }
      });
    });
  }

  private handleHealthRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url || '/';

    // CORS headers（Phase 9cダッシュボード用）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    switch (url) {
      case '/health':
      case '/': {
        const stats = this.getStats();
        res.writeHead(200);
        res.end(JSON.stringify({
          ok: true,
          version: '0.6.0-headless',
          ...stats,
        }));
        break;
      }

      case '/tasks': {
        const tasks = Array.from(this.tasks.values());
        res.writeHead(200);
        res.end(JSON.stringify({ tasks }));
        break;
      }

      case '/stats': {
        const stats = this.getStats();
        res.writeHead(200);
        res.end(JSON.stringify(stats));
        break;
      }

      default:
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  private getStats(): DaemonStats {
    const mem = process.memoryUsage();
    return {
      startedAt: this.startedAt,
      activeTasks: Array.from(this.tasks.values()).filter(t => t.running).length,
      completedTasks: this.completedTasks,
      errorTasks: this.errorTasks,
      pid: process.pid,
      memoryMB: mem.heapUsed / (1024 * 1024),
    };
  }

  // ─── メインループ ────────────────────────────────

  private async mainLoop(): Promise<void> {
    while (this.running) {
      await this.delay(1000);

      // 定期的なステータスログ（1時間ごと）
      const uptime = Date.now() - this.startedAt;
      if (uptime > 0 && uptime % 3_600_000 < 1000) {
        const stats = this.getStats();
        this.logger.info(
          `Heartbeat — uptime: ${Math.floor(uptime / 3_600_000)}h, ` +
          `tasks: ${stats.activeTasks} active / ${stats.completedTasks} completed / ${stats.errorTasks} errors, ` +
          `memory: ${stats.memoryMB.toFixed(1)}MB`
        );
      }
    }
  }

  // ─── ヘルパー ────────────────────────────────────

  private taskId(scriptPath: string): string {
    return path.resolve(scriptPath).toLowerCase().replace(/\\/g, '/');
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
