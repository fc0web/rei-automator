/**
 * Rei Automator — Headless Logger
 * Phase 9a: Electron非依存のロガー
 *
 * headless モジュール全体で使用される Logger クラス。
 * Electron の app.getPath() に依存しない、ファイル＋コンソール出力のロガー。
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── 型定義 ──────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level?: LogLevel;
  dir?: string;
  prefix?: string;
  console?: boolean;
}

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ─── Logger クラス ───────────────────────────────────

export class Logger {
  private level: LogLevel;
  private logDir?: string;
  private prefix: string;
  private enableConsole: boolean;
  private logStream?: fs.WriteStream;

  constructor(config: LoggerConfig = {}) {
    this.level = config.level || 'info';
    this.prefix = config.prefix || 'rei';
    this.enableConsole = config.console !== false;

    if (config.dir) {
      this.logDir = path.resolve(config.dir);
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      const logFile = path.join(this.logDir, `${this.prefix}-${this.dateStamp()}.log`);
      this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
    }
  }

  // ─── 公開メソッド ──────────────────────────────

  debug(message: string): void { this.write('debug', message); }
  info(message: string): void { this.write('info', message); }
  warn(message: string): void { this.write('warn', message); }
  error(message: string): void { this.write('error', message); }

  log(level: LogLevel, message: string): void { this.write(level, message); }

  close(): void {
    if (this.logStream) { this.logStream.end(); this.logStream = undefined; }
  }

  // ─── 内部メソッド ──────────────────────────────

  private write(level: LogLevel, message: string): void {
    if (LOG_PRIORITY[level] < LOG_PRIORITY[this.level]) return;

    const timestamp = new Date().toISOString();
    const tag = level.toUpperCase().padEnd(5);
    const line = `${timestamp} [${tag}] ${message}`;

    if (this.enableConsole) {
      switch (level) {
        case 'error': console.error(line); break;
        case 'warn': console.warn(line); break;
        case 'debug': console.debug(line); break;
        default: console.log(line);
      }
    }

    if (this.logStream) { this.logStream.write(line + '\n'); }
  }

  private dateStamp(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
