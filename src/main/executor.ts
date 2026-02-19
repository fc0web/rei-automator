/**
 * Rei Automator - 実行管理
 * メインプロセスでの実行管理とIPCブリッジ
 */

import { BrowserWindow } from 'electron';
import { parse } from '../lib/core/parser';
import { ReiRuntime } from '../lib/core/runtime';
import { AutoController } from '../lib/auto/controller';
import { WindowsBackend } from '../lib/auto/windows-backend';
import { StubBackend } from '../lib/auto/stub-backend';
import { ExecutionResult } from '../lib/core/types';
import { ImageMatcher } from '../lib/auto/image-matcher';
import { VariableStore, preprocessLine } from '../lib/core/variables';
import { Logger } from '../lib/core/logger';

export class ReiExecutor {
  private runtime: ReiRuntime;
  private window: BrowserWindow | null = null;
  private logger: Logger | null = null;
  private varStore: VariableStore = new VariableStore();
  private useStub: boolean;

  constructor(useStub = false) {
    this.useStub = useStub;

    // バックエンドを選択
    const logFn = (msg: string) => {
      console.log(`[Rei] ${msg}`);
      this.sendToRenderer('execution-log', { message: msg, level: 'debug' });
    };

    let backend;
    if (useStub || process.platform !== 'win32') {
      console.log('[Rei] Using stub backend (no actual PC control)');
      backend = new StubBackend(logFn);
    } else {
      console.log('[Rei] Using Windows native backend');
      backend = new WindowsBackend(logFn);
    }

    const controller = new AutoController(backend);
    this.runtime = new ReiRuntime(controller);

    // ランタイムコールバックの設定
    this.runtime.setCallbacks({
      onLog: (message, level) => {
        console.log(`[Rei Runtime] ${message}`);
        this.sendToRenderer('execution-log', { message, level });
      },
      onStatusChange: (status) => {
        console.log(`[Rei Status] ${status}`);
        this.sendToRenderer('execution-status', status);
      },
      onLineExecute: (line) => {
        this.sendToRenderer('execution-line', line);
        // ログエントリ送信
        if (this.logger) {
          this.logger.logStep(line, 'executing', this.varStore.getAll());
        }
        // 変数状態をリアルタイム送信
        this.sendToRenderer('log:entry', {
          id: 'line_' + line + '_' + Date.now(),
          timestamp: new Date().toISOString(),
          level: 'step',
          message: 'Line ' + line + ' 実行中',
          lineNumber: line,
          variables: this.varStore.getAll(),
        });
      },
    });
  }

  /**
   * ウィンドウを設定（IPC通信用）
   */
  setWindow(window: BrowserWindow): void {
    this.window = window;
  }
  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Reiコードを実行
   */
  async execute(code: string): Promise<ExecutionResult> {
    console.log('[Rei Executor] Parsing code...');
    console.log('[Rei Executor] Code:', code);

    // 変数処理
    this.varStore.clear();
    const processedLines = code.split('\n').map((line) => preprocessLine(line, this.varStore));
    const processedCode = processedLines.filter((l) => l !== '__SET__' && l !== '__PARAM__').join('\n');
    if (this.logger) this.logger.startSession('script');
    // パース
    const program = parse(processedCode);

    if (program.errors.length > 0) {
      console.log('[Rei Executor] Parse errors:', program.errors);
      return {
        success: false,
        error: program.errors.map((e) => `行${e.line}: ${e.message}`).join('\n'),
        executedLines: 0,
        totalTime: 0,
      };
    }

    console.log(`[Rei Executor] Parsed ${program.commands.length} commands`);

    // 実行
    const result = await this.runtime.execute(program);
    console.log('[Rei Executor] Result:', result);

    return result;
  }

  /**
   * 実行を停止
   */
  stop(): void {
    console.log('[Rei Executor] Stopping...');
    this.runtime.stop();
  }

  /**
   * 一時停止
   */
  pause(): void {
    this.runtime.pause();
  }

  /**
   * 再開
   */
  resume(): void {
    this.runtime.resume();
  }

  /**
   * 実行中かどうか
   */
  isRunning(): boolean {
    return this.runtime.isRunning();
  }

  // ── Phase 4: ImageMatcher 注入 ────────────────────────
  setImageMatcher(matcher: ImageMatcher): void {
    this.runtime.setImageMatcher(matcher);
  }

  setCaptureFunc(func: () => Promise<string>): void {
    this.runtime.setCaptureFunc(func);
  }

  /**
   * レンダラーにメッセージを送信
   */
  private sendToRenderer(channel: string, data: any): void {
    if (this.window && !this.window.isDestroyed()) {
      try {
        this.window.webContents.send(channel, data);
      } catch (e) {
        // ウィンドウが閉じられた場合は無視
      }
    }
  }
}
