/**
 * Rei Automator 窶・Daemon Process
 * Phase 9a+9b+9d: 繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｩ邨ｱ蜷・+ 繝輔ぃ繧､繝ｫ逶｣隕・+ REST API + WebSocket + 繧ｯ繝ｩ繧ｹ繧ｿ
 *
 * 笘・譌｢蟄倥・ daemon.ts 繧堤ｽｮ縺肴鋤縺医※縺上□縺輔＞縲・
 */

import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

import { parse } from '../lib/core/parser';
import { ReiRuntime } from '../lib/core/runtime';
import { AutoController } from '../lib/auto/controller';
import { WindowsBackend } from '../lib/auto/windows-backend';
import { WinApiBackend } from '../lib/auto/win-api-backend';
import { Logger } from './logger';
import { ScriptWatcher } from './watcher';
import { ApiServer } from './api-server';
import { NodeManager, NodeConfig } from './node-manager';
import { TaskDispatcher, DispatchStrategy } from './task-dispatcher';

// 笏笏笏 蝙句ｮ夂ｾｩ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export interface DaemonConfig {
  watchDir: string;
  logDir: string;
  healthPort: number;
  maxRetries: number;
  retryDelayMs: number;
  executionMode: 'cursor' | 'cursorless';
  defaultWindow?: string;
  apiHost?: string;
  authEnabled?: boolean;
  apiKeyFilePath?: string;
  clusterEnabled?: boolean;
  nodeId?: string;
  nodeName?: string;
  seedNodes?: string[];
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  dispatchStrategy?: DispatchStrategy;
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

// 笏笏笏 Daemon 繧ｯ繝ｩ繧ｹ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

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
  private apiServer?: ApiServer;
  private scheduleTimers: Map<string, NodeJS.Timeout> = new Map();

  private nodeManager?: NodeManager;
  private taskDispatcher?: TaskDispatcher;
  private statsUpdateTimer?: NodeJS.Timeout;

  constructor(config: DaemonConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  // 笏笏笏 Runtime逕滓・繝倥Ν繝代・ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  private createRuntime(): ReiRuntime {
    const backend = new WindowsBackend((msg: string) => this.logger.debug(msg));
    const controller = new AutoController(backend);
    const runtime = new ReiRuntime(controller);
    const winApi = new WinApiBackend((msg: string) => this.logger.debug(msg));
    runtime.setWinApiBackend(winApi);
    if (this.config.executionMode === 'cursorless' && this.config.defaultWindow) {
      runtime.setExecutionMode('cursorless', this.config.defaultWindow);
    }
    return runtime;
  }

  // 笏笏笏 繝ｩ繧､繝輔し繧､繧ｯ繝ｫ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  async start(): Promise<void> {
    this.running = true;
    this.startedAt = Date.now();
    this.logger.info('Daemon starting...');

    this.ensureDir(this.config.watchDir);
    this.ensureDir(this.config.logDir);

    await this.loadExistingScripts();

    this.watcher = new ScriptWatcher(this.config.watchDir, this.logger);
    this.watcher.on('script:added', (filePath: string) => this.onScriptAdded(filePath));
    this.watcher.on('script:changed', (filePath: string) => this.onScriptChanged(filePath));
    this.watcher.on('script:removed', (filePath: string) => this.onScriptRemoved(filePath));
    this.watcher.start();

    this.startScheduledTasks();

    if (this.config.clusterEnabled) {
      this.initCluster();
    }

    this.apiServer = new ApiServer(this, {
      port: this.config.healthPort,
      host: this.config.apiHost || '0.0.0.0',
      auth: {
        enabled: this.config.authEnabled ?? true,
        keyFilePath: this.config.apiKeyFilePath,
      },
    }, this.logger);
    await this.apiServer.start();

    if (this.nodeManager) {
      await this.nodeManager.start();
      this.startStatsSync();
      this.logger.info(
        `Cluster enabled: ${this.nodeManager.getSelf().name} ` +
        `(${this.nodeManager.getSelf().id}), role: ${this.nodeManager.getSelf().role}`
      );
    }

    this.logger.info(`Daemon started (PID: ${process.pid})`);
    await this.mainLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.logger.info('Daemon stopping...');

    for (const [, timer] of this.scheduleTimers) { clearInterval(timer); }
    this.scheduleTimers.clear();

    if (this.statsUpdateTimer) { clearInterval(this.statsUpdateTimer); }
    if (this.nodeManager) { await this.nodeManager.stop(); }
    if (this.watcher) { this.watcher.stop(); }
    if (this.apiServer) { await this.apiServer.stop(); }

    this.logger.info('Daemon stopped');
  }

  // 笏笏笏 繧ｯ繝ｩ繧ｹ繧ｿ蛻晄悄蛹・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  private initCluster(): void {
    const nodeConfig: Partial<NodeConfig> = {
      nodeId: this.config.nodeId || `node-${Date.now().toString(36)}`,
      nodeName: this.config.nodeName || `Rei Node (${process.pid})`,
      listenPort: this.config.healthPort,
      seedNodes: this.config.seedNodes || [],
      heartbeatInterval: this.config.heartbeatInterval || 10000,
      heartbeatTimeout: this.config.heartbeatTimeout || 30000,
    };

    this.nodeManager = new NodeManager(nodeConfig);
    this.taskDispatcher = new TaskDispatcher(this.nodeManager, {
      defaultStrategy: this.config.dispatchStrategy || 'round-robin',
    });

    this.nodeManager.on('node:joined', (node: any) => {
      this.logger.info(`[Cluster] Node joined: ${node.name} (${node.host})`);
      this.emit('cluster:node:joined', node);
    });
    this.nodeManager.on('node:offline', (node: any) => {
      this.logger.warn(`[Cluster] Node offline: ${node.name}`);
      this.emit('cluster:node:offline', node);
    });
    this.nodeManager.on('node:left', (node: any) => {
      this.logger.info(`[Cluster] Node left: ${node.name}`);
      this.emit('cluster:node:left', node);
    });
    this.nodeManager.on('leader:elected', (leader: any) => {
      this.logger.info(`[Cluster] Leader elected: ${leader.name} (${leader.id})`);
      this.emit('cluster:leader:elected', leader);
    });

    this.taskDispatcher.on('dispatch:success', (result: any) => {
      this.logger.info(`[Dispatch] Success: ${result.taskId} 竊・${result.targetNodeId} (${result.strategy})`);
      this.emit('dispatch:success', result);
    });
    this.taskDispatcher.on('dispatch:error', (result: any) => {
      this.logger.error(`[Dispatch] Error: ${result.taskId} 竊・${result.error}`);
      this.emit('dispatch:error', result);
    });

    this.logger.info('[Cluster] NodeManager + TaskDispatcher initialized');
  }

  private startStatsSync(): void {
    this.statsUpdateTimer = setInterval(() => {
      if (this.nodeManager) {
        const activeTasks = Array.from(this.tasks.values()).filter(t => t.running).length;
        this.nodeManager.updateTaskStats(activeTasks, this.queue.length, this.completedTasks);
      }
    }, 5000);
  }

  // 笏笏笏 蜈ｬ髢九Γ繧ｽ繝・ラ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  getPublicStats(): any {
    const mem = process.memoryUsage();
    const stats: any = {
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
    if (this.nodeManager) {
      stats.cluster = {
        enabled: true, nodeId: this.nodeManager.getSelf().id,
        nodeName: this.nodeManager.getSelf().name, role: this.nodeManager.getSelf().role,
        isLeader: this.nodeManager.isLeader(),
        totalNodes: this.nodeManager.getNodes().length,
        onlineNodes: this.nodeManager.getOnlineNodes().length,
        leaderId: this.nodeManager.getLeader()?.id || null,
      };
    } else {
      stats.cluster = { enabled: false };
    }
    return stats;
  }

  getTaskList(): TaskEntry[] { return Array.from(this.tasks.values()); }

  getTask(id: string): TaskEntry | null {
    const direct = this.tasks.get(id);
    if (direct) return direct;
    for (const task of this.tasks.values()) {
      if (task.name === id || task.id.includes(id)) return task;
    }
    return null;
  }

  getWatchDir(): string { return this.config.watchDir; }
  getNodeManager(): NodeManager | undefined { return this.nodeManager; }
  getTaskDispatcher(): TaskDispatcher | undefined { return this.taskDispatcher; }
  isClusterEnabled(): boolean { return !!this.nodeManager; }

  async executeRemote(taskId: string, name: string, code: string): Promise<{ elapsed: number }> {
    this.emit('task:started', { id: taskId, name });
    try {
      const program = parse(code);
      const runtime = this.createRuntime();
      const startTime = Date.now();
      await runtime.execute(program);
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

  stopTask(taskId: string): boolean {
    for (const [id, task] of this.tasks) {
      if (id === taskId || task.name === taskId || id.includes(taskId)) {
        if (task.running) { task.running = false; this.logger.info(`Stop requested: ${task.name}`); return true; }
      }
    }
    return false;
  }

  async reload(): Promise<void> {
    this.logger.info('Reloading daemon...');
    for (const [, timer] of this.scheduleTimers) { clearInterval(timer); }
    this.scheduleTimers.clear();
    this.tasks.clear();
    await this.loadExistingScripts();
    this.startScheduledTasks();
    this.logger.info('Daemon reloaded');
  }

  // 笏笏笏 繧ｹ繧ｯ繝ｪ繝励ヨ邂｡逅・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  private async loadExistingScripts(): Promise<void> {
    const files = fs.readdirSync(this.config.watchDir).filter(f => f.endsWith('.rei'));
    for (const file of files) { this.registerTask(path.join(this.config.watchDir, file)); }
    this.logger.info(`Loaded ${files.length} scripts from ${this.config.watchDir}`);
  }

  private registerTask(scriptPath: string): TaskEntry {
    const name = path.basename(scriptPath, '.rei');
    const id = this.taskId(scriptPath);
    const code = fs.readFileSync(scriptPath, 'utf-8');
    const schedule = this.extractSchedule(code);
    const task: TaskEntry = { id, name, scriptPath, schedule: schedule || undefined, running: false, runCount: 0, errorCount: 0 };
    this.tasks.set(id, task);
    this.logger.debug(`Registered task: ${name}${schedule ? ` (schedule: ${schedule})` : ''}`);
    return task;
  }

  private extractSchedule(code: string): string | null {
    for (const line of code.split('\n').slice(0, 10)) {
      const match = line.match(/\/\/\s*@schedule\s+(.+)/i);
      if (match) return match[1].trim();
    }
    return null;
  }

  // 笏笏笏 繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  private startScheduledTasks(): void {
    for (const [, task] of this.tasks) { if (task.schedule) this.scheduleTask(task); }
  }

  private scheduleTask(task: TaskEntry): void {
    const intervalMs = this.parseScheduleInterval(task.schedule!);
    if (intervalMs === null) { this.logger.warn(`Invalid schedule for ${task.name}: ${task.schedule}`); return; }
    if (intervalMs === 0) { this.enqueueTask(task.id, task.scriptPath); return; }

    const timer = setInterval(() => {
      if (this.running && !task.running) this.enqueueTask(task.id, task.scriptPath);
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
    const m: Record<string, number> = { 's': 1000, 'm': 60_000, 'h': 3_600_000, 'd': 86_400_000 };
    return value * (m[unit] || 0);
  }

  // 笏笏笏 繧ｿ繧ｹ繧ｯ繧ｭ繝･繝ｼ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  private enqueueTask(taskId: string, scriptPath: string): void {
    try {
      const code = fs.readFileSync(scriptPath, 'utf-8');
      this.queue.push({ taskId, scriptPath, code, retryCount: 0, addedAt: Date.now() });
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

      if (task) { task.running = true; task.lastRun = new Date().toISOString(); }
      this.emit('task:started', { id: item.taskId, name: scriptName });
      this.logger.info(`Executing: ${scriptName}`);

      try {
        const program = parse(item.code);
        const runtime = this.createRuntime();
        const startTime = Date.now();
        await runtime.execute(program);
        const elapsed = Date.now() - startTime;

        this.completedTasks++;
        if (task) { task.running = false; task.lastResult = 'success'; task.runCount++; }
        this.emit('task:completed', { id: item.taskId, name: scriptName, elapsed });
        this.logger.info(`Completed: ${scriptName} (${elapsed}ms)`);
      } catch (err: any) {
        this.errorTasks++;
        if (task) { task.running = false; task.lastResult = 'error'; task.lastError = err.message; task.errorCount++; }
        this.emit('task:error', { id: item.taskId, name: scriptName, error: err.message });
        this.logger.error(`Error in ${scriptName}: ${err.message}`);

        if (item.retryCount < this.config.maxRetries) {
          this.logger.info(`Retrying ${scriptName} (${item.retryCount + 1}/${this.config.maxRetries})...`);
          await this.delay(this.config.retryDelayMs);
          this.queue.push({ ...item, retryCount: item.retryCount + 1 });
        } else {
          this.logger.error(`Giving up on ${scriptName} after ${this.config.maxRetries} retries`);
        }
      }
    }
    this.processing = false;
  }

  // 笏笏笏 繝輔ぃ繧､繝ｫ逶｣隕悶う繝吶Φ繝・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  private onScriptAdded(filePath: string): void {
    const task = this.registerTask(filePath);
    this.logger.info(`New script detected: ${task.name}`);
    if (task.schedule) this.scheduleTask(task);
  }

  private onScriptChanged(filePath: string): void {
    const id = this.taskId(filePath);
    const existing = this.tasks.get(id);
    if (existing && !existing.running) {
      this.logger.info(`Script changed: ${existing.name}, re-registering`);
      const timer = this.scheduleTimers.get(id);
      if (timer) { clearInterval(timer); this.scheduleTimers.delete(id); }
      const task = this.registerTask(filePath);
      if (task.schedule) this.scheduleTask(task);
    }
  }

  private onScriptRemoved(filePath: string): void {
    const id = this.taskId(filePath);
    const task = this.tasks.get(id);
    if (task) {
      this.logger.info(`Script removed: ${task.name}`);
      const timer = this.scheduleTimers.get(id);
      if (timer) { clearInterval(timer); this.scheduleTimers.delete(id); }
      this.tasks.delete(id);
    }
  }

  // 笏笏笏 繝｡繧､繝ｳ繝ｫ繝ｼ繝・笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  private async mainLoop(): Promise<void> {
    while (this.running) {
      await this.delay(1000);
      const uptime = Date.now() - this.startedAt;
      if (uptime > 0 && uptime % 3_600_000 < 1000) {
        const stats = this.getPublicStats();
        this.logger.info(
          `Heartbeat 窶・uptime: ${Math.floor(uptime / 3_600_000)}h, ` +
          `tasks: ${stats.activeTasks} active / ${stats.completedTasks} completed / ${stats.errorTasks} errors, ` +
          `memory: ${stats.memoryMB.toFixed(1)}MB` +
          (stats.cluster.enabled ? `, cluster: ${stats.cluster.onlineNodes} nodes, role: ${stats.cluster.role}` : '')
        );
      }
    }
  }

  // 笏笏笏 繝倥Ν繝代・ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  private taskId(scriptPath: string): string { return path.resolve(scriptPath).toLowerCase().replace(/\\/g, '/'); }
  private ensureDir(dir: string): void { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
  private delay(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
}


