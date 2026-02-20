/**
 * Rei Automator — Daemon Process
 * Phase 9a+9b: スケジューラ統合 + ファイル監視 + REST API + WebSocket
 *
 * ★ Phase 9aのdaemon.tsを置き換えてください。
 *
 * Phase 9bで追加された変更点:
 * - ヘルスHTTPサーバー → ApiServerに置き換え（REST API + WebSocket統合）
 * - 公開メソッド追加（getPublicStats, getTaskList, executeRemote, etc.）
 * - EventEmitter経由でタスクイベントを発火（APIサーバーがWebSocketに中継）
 * - DaemonConfigにAPI関連設定を追加
 */

import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

import { ReiRuntime } from '../lib/core/runtime';
import { ReiParser } from '../lib/core/parser';
import { Logger } from '../lib/core/logger';
import { ScriptWatcher } from './watcher';
import { ApiServer } from './api-server';

// ─── 型定義 ──────────────────────────────────────────

export interface DaemonConfig {
  watchDir: string;
  logDir: string;
  healthPort: number;
  maxRetries: number;
  retryDelayMs: number;
  executionMode: 'cursor' | 'cursorless';
  defaultWindow?: string;
  // Phase 9b: API設定
  apiHost?: string;
  authEnabled?: boolean;
  apiKeyFilePath?: string;
}

export interface TaskEntry {
  id: string;
  name: string;
  scriptPath: string;
  schedule?: string;
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
  private apiServer?: ApiServer;                     // ★ Phase 9b: APIサーバー
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

    // 1. ディレクトリ確認・作成
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

    // 5. ★ Phase 9b: APIサーバー起動（REST + WebSocket + ヘルス統合）
    this.apiServer = new ApiServer(this, {
      port: this.config.healthPort,
      host: this.config.apiHost || '0.0.0.0',
      auth: {
        enabled: this.config.authEnabled ?? true,
        keyFilePath: this.config.apiKeyFilePath,
      },
    }, this.logger);
    await this.apiServer.start();

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
    }
    this.scheduleTimers.clear();

    // ファイル監視停止
    if (this.watcher) {
      this.watcher.stop();
    }

    // ★ Phase 9b: APIサーバー停止
    if (this.apiServer) {
      await this.apiServer.stop();
    }

    this.logger.info('Daemon stopped');
  }

  // ─── ★ Phase 9b: 公開メソッド ────────────────────

  /**
   * 統計情報を外部に公開（ApiRoutesから呼ばれる）
   */
  getPublicStats(): any {
    const mem = process.memoryUsage();
    return {
      startedAt: this.startedAt,
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      activeTasks: Array.from(this.tasks.values()).filter(t => t.running).length,
      completedTasks: this.completedTasks,
      errorTasks: this.errorTasks,
      totalTasks: this.tasks.size,
      queueLength: this.queue.length,
      pid: process.pid,
      memoryMB: mem.heapUsed / (1024 * 1024),
    };
  }

  /**
   * タスク一覧を外部に公開
   */
  getTaskList(): TaskEntry[] {
    return Array.from(this.tasks.values());
  }

  /**
   * タスク詳細を外部に公開
   */
  getTask(id: string): TaskEntry | null {
    // IDが完全一致 or 名前に部分一致
    const direct = this.tasks.get(id);
    if (direct) return direct;

    for (const task of this.tasks.values()) {
      if (task.name === id || task.id.includes(id)) return task;
    }
    return null;
  }

  /**
   * watchDirパスを外部に公開
   */
  getWatchDir(): string {
    return this.config.watchDir;
  }

  /**
   * リモートからのスクリプト実行（POST /api/tasks/run）
   */
  async executeRemote(taskId: string, name: string, code: string): Promise<{ elapsed: number }> {
    this.emit('task:started', { id: taskId, name });

    try {
      const commands = this.parser.parse(code);
      const runtime = new ReiRuntime({
        mode: this.config.executionMode,
        defaultWindow: this.config.defaultWindow,
        logger: this.logger,
      });

      const startTime = Date.now();
      await runtime.execute(commands);
      const elapsed = Date.now() - startTime;

      this.completedTasks++;
      this.emit('task:completed', { id: taskId, name, elapsed });
      return { elapsed };
    } catch (err: any) {
      this.errorTasks++;
      this.emit('task:error', { id: taskId, name, error: err.message });
      throw err;
    }
  }

  /**
   * タスクの停止リクエスト
   */
  stopTask(taskId: string): boolean {
    for (const [id, task] of this.tasks) {
      if (id === taskId || task.name === taskId || id.includes(taskId)) {
        if (task.running) {
          task.running = false;
          this.logger.info(`Stop requested: ${task.name}`);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * デーモンのリロード（スクリプト再読み込み）
   */
  async reload(): Promise<void> {
    this.logger.info('Reloading daemon...');

    // スケジュールクリア
    for (const [, timer] of this.scheduleTimers) {
      clearInterval(timer);
    }
    this.scheduleTimers.clear();
    this.tasks.clear();

    // 再読み込み
    await this.loadExistingScripts();
    this.startScheduledTasks();

    this.logger.info('Daemon reloaded');
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

  private extractSchedule(code: string): string | null {
    const lines = code.split('\n');
    for (const line of lines.slice(0, 10)) {
      const match = line.match(/\/\/\s*@schedule\s+(.+)/i);
      if (match) return match[1].trim();
    }
    return null;
  }

  // ─── スケジュール実行 ────────────────────────────

  private startScheduledTasks(): void {
    for (const [, task] of this.tasks) {
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
      this.enqueueTask(task.id, task.scriptPath);
      return;
    }

    const timer = setInterval(() => {
      if (this.running && !task.running) {
        this.enqueueTask(task.id, task.scriptPath);
      }
    }, intervalMs);

    this.scheduleTimers.set(task.id, timer);
    this.logger.info(`Scheduled ${task.name}: every ${intervalMs / 1000}s`);

    this.enqueueTask(task.id, task.scriptPath);
  }

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

      const task = this.tasks.get(taskId);
      this.emit('task:queued', { id: taskId, name: task?.name || taskId });
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
      const scriptName = task?.name || path.basename(item.scriptPath);

      if (task) {
        task.running = true;
        task.lastRun = new Date().toISOString();
      }

      this.emit('task:started', { id: item.taskId, name: scriptName });
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

        this.emit('task:completed', { id: item.taskId, name: scriptName, elapsed });
        this.logger.info(`Completed: ${scriptName} (${elapsed}ms)`);
      } catch (err: any) {
        this.errorTasks++;
        if (task) {
          task.running = false;
          task.lastResult = 'error';
          task.lastError = err.message;
          task.errorCount++;
        }

        this.emit('task:error', { id: item.taskId, name: scriptName, error: err.message });
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

      const timer = this.scheduleTimers.get(id);
      if (timer) {
        clearInterval(timer);
        this.scheduleTimers.delete(id);
      }

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

  // ─── メインループ ────────────────────────────────

  private async mainLoop(): Promise<void> {
    while (this.running) {
      await this.delay(1000);

      // 定期的なステータスログ（1時間ごと）
      const uptime = Date.now() - this.startedAt;
      if (uptime > 0 && uptime % 3_600_000 < 1000) {
        const stats = this.getPublicStats();
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
