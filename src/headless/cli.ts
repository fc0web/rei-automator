/**
 * Rei Automator — Headless CLI Entry Point
 * Phase 9a: VPS 24時間稼働の基盤
 *
 * Usage:
 *   rei-headless run <script.rei>          — スクリプト単発実行
 *   rei-headless daemon [--watch <dir>]    — デーモン起動（スケジューラ＋監視）
 *   rei-headless service install            — Windowsサービスとして登録
 *   rei-headless service uninstall          — サービス解除
 *   rei-headless service status             — サービス状態確認
 *   rei-headless health                     — ヘルスチェック
 *   rei-headless list                       — スケジュール済みタスク一覧
 */

import * as path from 'path';
import * as fs from 'fs';

// 既存モジュールの再利用
import { ReiRuntime } from '../lib/core/runtime';
import { ReiParser } from '../lib/core/parser';
import { ErrorHandler } from '../lib/core/error-handler';
import { Logger, LogLevel } from '../lib/core/logger';
import { Daemon, DaemonConfig } from './daemon';
import { ServiceManager } from './service';
import { HealthChecker } from './health';

// ─── 定数 ────────────────────────────────────────────
const VERSION = '0.6.0-headless';
const DEFAULT_WATCH_DIR = './scripts';
const DEFAULT_LOG_DIR = './logs';
const DEFAULT_CONFIG_FILE = './rei-headless.json';
const PID_FILE = './rei-headless.pid';

// ─── 設定型 ──────────────────────────────────────────
export interface HeadlessConfig {
  watchDir: string;
  logDir: string;
  logLevel: LogLevel;
  healthPort: number;
  maxRetries: number;
  retryDelayMs: number;
  executionMode: 'cursor' | 'cursorless';
  defaultWindow?: string;
}

const DEFAULT_CONFIG: HeadlessConfig = {
  watchDir: DEFAULT_WATCH_DIR,
  logDir: DEFAULT_LOG_DIR,
  logLevel: 'info',
  healthPort: 19720,    // Rei = 019720 (語呂合わせ)
  maxRetries: 3,
  retryDelayMs: 5000,
  executionMode: 'cursorless',
};

// ─── メイン ──────────────────────────────────────────
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log(`Rei Automator Headless v${VERSION}`);
    return;
  }

  const config = loadConfig();
  const logger = new Logger({
    level: config.logLevel,
    dir: config.logDir,
    prefix: 'rei-headless',
  });

  const command = args[0];

  try {
    switch (command) {
      case 'run':
        await handleRun(args.slice(1), config, logger);
        break;

      case 'daemon':
        await handleDaemon(args.slice(1), config, logger);
        break;

      case 'service':
        await handleService(args.slice(1), logger);
        break;

      case 'health':
        await handleHealth(config, logger);
        break;

      case 'list':
        await handleList(config, logger);
        break;

      default:
        // 引数がファイルパスならrunとして扱う
        if (command.endsWith('.rei')) {
          await handleRun([command], config, logger);
        } else {
          console.error(`Unknown command: ${command}`);
          printUsage();
          process.exit(1);
        }
    }
  } catch (err: any) {
    logger.error(`Fatal error: ${err.message}`);
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// ─── コマンドハンドラ ────────────────────────────────

/**
 * run — スクリプト単発実行
 */
async function handleRun(
  args: string[],
  config: HeadlessConfig,
  logger: Logger
): Promise<void> {
  if (args.length === 0) {
    console.error('Usage: rei-headless run <script.rei>');
    process.exit(1);
  }

  const scriptPath = path.resolve(args[0]);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }

  logger.info(`Running script: ${scriptPath}`);
  const code = fs.readFileSync(scriptPath, 'utf-8');

  const parser = new ReiParser();
  const commands = parser.parse(code);

  const runtime = new ReiRuntime({
    mode: config.executionMode,
    defaultWindow: config.defaultWindow,
    logger,
  });

  const startTime = Date.now();
  await runtime.execute(commands);
  const elapsed = Date.now() - startTime;

  logger.info(`Script completed in ${elapsed}ms`);
  console.log(`✅ Done (${elapsed}ms)`);
}

/**
 * daemon — デーモンモード起動
 */
async function handleDaemon(
  args: string[],
  config: HeadlessConfig,
  logger: Logger
): Promise<void> {
  // --watch <dir> オプション
  const watchIdx = args.indexOf('--watch');
  if (watchIdx !== -1 && args[watchIdx + 1]) {
    config.watchDir = args[watchIdx + 1];
  }

  // --port <number> オプション
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    config.healthPort = parseInt(args[portIdx + 1], 10);
  }

  // PIDファイル書き込み
  writePidFile();

  const daemonConfig: DaemonConfig = {
    watchDir: path.resolve(config.watchDir),
    logDir: path.resolve(config.logDir),
    healthPort: config.healthPort,
    maxRetries: config.maxRetries,
    retryDelayMs: config.retryDelayMs,
    executionMode: config.executionMode,
    defaultWindow: config.defaultWindow,
  };

  const daemon = new Daemon(daemonConfig, logger);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    console.log(`\n🛑 Shutting down (${signal})...`);
    await daemon.stop();
    removePidFile();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Windows: Ctrl+C handling
  if (process.platform === 'win32') {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('SIGINT', () => shutdown('SIGINT'));
  }

  console.log(`🚀 Rei Automator Daemon v${VERSION}`);
  console.log(`   Watch dir:   ${daemonConfig.watchDir}`);
  console.log(`   Health port: ${daemonConfig.healthPort}`);
  console.log(`   Mode:        ${daemonConfig.executionMode}`);
  console.log(`   PID:         ${process.pid}`);
  console.log('');

  await daemon.start();
}

/**
 * service — Windowsサービス管理
 */
async function handleService(
  args: string[],
  logger: Logger
): Promise<void> {
  const subcommand = args[0];
  const manager = new ServiceManager(logger);

  switch (subcommand) {
    case 'install':
      await manager.install();
      break;
    case 'uninstall':
      await manager.uninstall();
      break;
    case 'status':
      await manager.status();
      break;
    case 'start':
      await manager.start();
      break;
    case 'stop':
      await manager.stop();
      break;
    default:
      console.error('Usage: rei-headless service [install|uninstall|status|start|stop]');
      process.exit(1);
  }
}

/**
 * health — ヘルスチェック
 */
async function handleHealth(
  config: HeadlessConfig,
  logger: Logger
): Promise<void> {
  const checker = new HealthChecker(config.healthPort);
  const result = await checker.check();

  if (result.ok) {
    console.log('✅ Daemon is running');
    console.log(`   Uptime:     ${formatUptime(result.uptime)}`);
    console.log(`   Tasks:      ${result.activeTasks} active, ${result.completedTasks} completed`);
    console.log(`   Memory:     ${(result.memoryMB).toFixed(1)} MB`);
    console.log(`   PID:        ${result.pid}`);
  } else {
    console.log('❌ Daemon is not running');
    process.exit(1);
  }
}

/**
 * list — スケジュール済みタスク一覧
 */
async function handleList(
  config: HeadlessConfig,
  logger: Logger
): Promise<void> {
  const checker = new HealthChecker(config.healthPort);
  const tasks = await checker.listTasks();

  if (tasks.length === 0) {
    console.log('No scheduled tasks.');
    return;
  }

  console.log('Scheduled Tasks:');
  console.log('─'.repeat(60));
  for (const task of tasks) {
    const status = task.running ? '🟢 running' : '⏸️  waiting';
    console.log(`  ${status}  ${task.name}`);
    console.log(`           Schedule: ${task.schedule}`);
    console.log(`           Last run: ${task.lastRun || 'never'}`);
    console.log('');
  }
}

// ─── ユーティリティ ──────────────────────────────────

function loadConfig(): HeadlessConfig {
  const configPath = path.resolve(DEFAULT_CONFIG_FILE);
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const user = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...user };
    } catch {
      console.warn(`Warning: Could not parse ${configPath}, using defaults`);
    }
  }
  return { ...DEFAULT_CONFIG };
}

function writePidFile(): void {
  fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');
}

function removePidFile(): void {
  try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function printUsage(): void {
  console.log(`
Rei Automator Headless v${VERSION}

Usage:
  rei-headless run <script.rei>             Run a script
  rei-headless daemon [options]             Start daemon mode
  rei-headless service <command>            Manage Windows service
  rei-headless health                       Check daemon status
  rei-headless list                         List scheduled tasks

Daemon options:
  --watch <dir>     Watch directory for .rei scripts (default: ./scripts)
  --port <port>     Health check port (default: 19720)

Service commands:
  install           Register as Windows service
  uninstall         Remove Windows service
  start             Start the service
  stop              Stop the service
  status            Check service status

Config file: ./rei-headless.json
`);
}

// ─── エントリ ────────────────────────────────────────
main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
