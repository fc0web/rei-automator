/**
 * Rei Automator — Script Watcher
 * Phase 9a: ファイル監視によるホットデプロイ
 *
 * watchDir内の.reiファイルの追加/変更/削除を検知し、
 * デーモンにイベントを発火する。
 *
 * fs.watchはプラットフォームによって不安定な場合があるため、
 * ポーリング方式をフォールバックとして併用。
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Logger } from '../lib/core/logger';

// ─── 型定義 ──────────────────────────────────────────

interface FileState {
  path: string;
  mtime: number;
  size: number;
}

// ─── ScriptWatcher ───────────────────────────────────

export class ScriptWatcher extends EventEmitter {
  private watchDir: string;
  private logger: Logger;
  private fileStates: Map<string, FileState> = new Map();
  private fsWatcher?: fs.FSWatcher;
  private pollTimer?: NodeJS.Timeout;
  private pollIntervalMs = 3000;  // 3秒ポーリング（フォールバック）
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 500;

  constructor(watchDir: string, logger: Logger) {
    super();
    this.watchDir = watchDir;
    this.logger = logger;
  }

  /**
   * 監視開始
   */
  start(): void {
    // 初回スキャン — 現在のファイル状態をキャッシュ
    this.scanDirectory();

    // fs.watch（ネイティブ監視）
    try {
      this.fsWatcher = fs.watch(this.watchDir, { persistent: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.rei')) {
          this.onFsEvent(filename);
        }
      });

      this.fsWatcher.on('error', (err) => {
        this.logger.warn(`fs.watch error: ${err.message}, falling back to polling`);
        this.fsWatcher = undefined;
      });

      this.logger.debug('File watcher started (native mode)');
    } catch (err: any) {
      this.logger.warn(`fs.watch unavailable: ${err.message}, using polling`);
    }

    // ポーリング（フォールバック＋変更検出の確実性向上）
    this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  /**
   * 監視停止
   */
  stop(): void {
    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = undefined;
    }

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.logger.debug('File watcher stopped');
  }

  // ─── 内部 ────────────────────────────────────────

  /**
   * ディレクトリの現在状態をスキャン
   */
  private scanDirectory(): Map<string, FileState> {
    const current = new Map<string, FileState>();

    try {
      const files = fs.readdirSync(this.watchDir)
        .filter(f => f.endsWith('.rei'));

      for (const file of files) {
        const filePath = path.join(this.watchDir, file);
        try {
          const stat = fs.statSync(filePath);
          current.set(filePath, {
            path: filePath,
            mtime: stat.mtimeMs,
            size: stat.size,
          });
        } catch {
          // ファイルが読み取れない場合はスキップ
        }
      }
    } catch (err: any) {
      this.logger.error(`Failed to scan directory: ${err.message}`);
    }

    return current;
  }

  /**
   * fs.watchイベントハンドラ（デバウンス付き）
   */
  private onFsEvent(filename: string): void {
    const filePath = path.join(this.watchDir, filename);

    // デバウンス — 短時間の連続イベントをまとめる
    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(filePath, setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.checkFile(filePath);
    }, this.debounceMs));
  }

  /**
   * ファイルの状態をチェックしてイベント発火
   */
  private checkFile(filePath: string): void {
    const prev = this.fileStates.get(filePath);

    if (!fs.existsSync(filePath)) {
      // 削除
      if (prev) {
        this.fileStates.delete(filePath);
        this.emit('script:removed', filePath);
        this.logger.debug(`Detected removal: ${path.basename(filePath)}`);
      }
      return;
    }

    try {
      const stat = fs.statSync(filePath);
      const current: FileState = {
        path: filePath,
        mtime: stat.mtimeMs,
        size: stat.size,
      };

      if (!prev) {
        // 新規追加
        this.fileStates.set(filePath, current);
        this.emit('script:added', filePath);
        this.logger.debug(`Detected new file: ${path.basename(filePath)}`);
      } else if (prev.mtime !== current.mtime || prev.size !== current.size) {
        // 変更
        this.fileStates.set(filePath, current);
        this.emit('script:changed', filePath);
        this.logger.debug(`Detected change: ${path.basename(filePath)}`);
      }
    } catch {
      // ファイルが一時的にロックされている場合はスキップ
    }
  }

  /**
   * ポーリングチェック
   */
  private poll(): void {
    const current = this.scanDirectory();

    // 新規追加・変更チェック
    for (const [filePath, state] of current) {
      const prev = this.fileStates.get(filePath);
      if (!prev) {
        this.fileStates.set(filePath, state);
        this.emit('script:added', filePath);
        this.logger.debug(`[poll] Detected new: ${path.basename(filePath)}`);
      } else if (prev.mtime !== state.mtime || prev.size !== state.size) {
        this.fileStates.set(filePath, state);
        this.emit('script:changed', filePath);
        this.logger.debug(`[poll] Detected change: ${path.basename(filePath)}`);
      }
    }

    // 削除チェック
    for (const [filePath] of this.fileStates) {
      if (!current.has(filePath)) {
        this.fileStates.delete(filePath);
        this.emit('script:removed', filePath);
        this.logger.debug(`[poll] Detected removal: ${path.basename(filePath)}`);
      }
    }
  }
}
