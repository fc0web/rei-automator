/**
 * Rei Automator - 実行エンジン
 * パースされたASTを実行する
 */

import {
  ReiCommand,
  ReiProgram,
  ExecutionContext,
  ExecutionResult,
  ExecutionStatus,
} from './types';

import { AutoController } from '../auto/controller';

/**
 * Reiプログラムの実行エンジン
 */
export class ReiRuntime {
  private context: ExecutionContext;
  private controller: AutoController;
  private abortController: AbortController | null = null;

  constructor(controller: AutoController) {
    this.controller = controller;
    this.context = {
      running: false,
      paused: false,
      currentLine: 0,
      onLog: () => {},
      onStatusChange: () => {},
      onLineExecute: () => {},
    };
  }

  /**
   * コールバックを設定
   */
  setCallbacks(callbacks: {
    onLog?: (message: string, level: string) => void;
    onStatusChange?: (status: ExecutionStatus) => void;
    onLineExecute?: (line: number) => void;
  }) {
    if (callbacks.onLog) this.context.onLog = callbacks.onLog;
    if (callbacks.onStatusChange) this.context.onStatusChange = callbacks.onStatusChange;
    if (callbacks.onLineExecute) this.context.onLineExecute = callbacks.onLineExecute;
  }

  /**
   * プログラムを実行
   */
  async execute(program: ReiProgram): Promise<ExecutionResult> {
    // パースエラーがあれば実行しない
    if (program.errors.length > 0) {
      const errorMessages = program.errors
        .map((e) => `行${e.line}: ${e.message}`)
        .join('\n');
      return {
        success: false,
        error: `パースエラー:\n${errorMessages}`,
        executedLines: 0,
        totalTime: 0,
      };
    }

    if (program.commands.length === 0) {
      return {
        success: false,
        error: '実行するコマンドがありません',
        executedLines: 0,
        totalTime: 0,
      };
    }

    // 実行開始
    this.abortController = new AbortController();
    this.context.running = true;
    this.context.paused = false;
    this.context.currentLine = 0;
    this.context.onStatusChange('running');

    const startTime = Date.now();
    let executedLines = 0;

    try {
      this.context.onLog(`実行開始: ${program.commands.length} コマンド`, 'info');

      executedLines = await this.executeCommands(program.commands);

      const totalTime = Date.now() - startTime;

      if (!this.context.running) {
        // 停止された
        this.context.onLog(`実行停止: ${executedLines} コマンド実行済み`, 'info');
        this.context.onStatusChange('stopped');
        return {
          success: true,
          message: '実行が停止されました',
          executedLines,
          totalTime,
        };
      }

      this.context.onLog(`実行完了: ${executedLines} コマンド (${totalTime}ms)`, 'info');
      this.context.onStatusChange('completed');

      return {
        success: true,
        message: '実行が完了しました',
        executedLines,
        totalTime,
      };
    } catch (error: any) {
      const totalTime = Date.now() - startTime;

      if (error.name === 'AbortError') {
        this.context.onLog('実行が中断されました', 'info');
        this.context.onStatusChange('stopped');
        return {
          success: true,
          message: '実行が停止されました',
          executedLines,
          totalTime,
        };
      }

      this.context.onLog(`実行エラー: ${error.message}`, 'error');
      this.context.onStatusChange('error');
      return {
        success: false,
        error: error.message,
        executedLines,
        totalTime,
      };
    } finally {
      this.context.running = false;
      this.abortController = null;
    }
  }

  /**
   * 実行を停止
   */
  stop(): void {
    this.context.running = false;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.context.onLog('停止シグナルを送信しました', 'info');
  }

  /**
   * 一時停止
   */
  pause(): void {
    if (this.context.running && !this.context.paused) {
      this.context.paused = true;
      this.context.onStatusChange('paused');
      this.context.onLog('一時停止しました', 'info');
    }
  }

  /**
   * 再開
   */
  resume(): void {
    if (this.context.paused) {
      this.context.paused = false;
      this.context.onStatusChange('running');
      this.context.onLog('再開しました', 'info');
    }
  }

  /**
   * 実行中かどうか
   */
  isRunning(): boolean {
    return this.context.running;
  }

  // ========== 内部メソッド ==========

  /**
   * コマンドリストを順番に実行
   */
  private async executeCommands(commands: ReiCommand[]): Promise<number> {
    let executed = 0;

    for (const command of commands) {
      // 停止チェック
      if (!this.context.running) break;

      // 一時停止チェック
      await this.waitWhilePaused();

      // コメントはスキップ
      if (command.type === 'comment') continue;

      // 行番号を通知
      this.context.currentLine = command.line;
      this.context.onLineExecute(command.line);

      // コマンドを実行
      await this.executeCommand(command);
      executed++;
    }

    return executed;
  }

  /**
   * 単一コマンドを実行
   */
  private async executeCommand(command: ReiCommand): Promise<void> {
    switch (command.type) {
      case 'click':
        this.context.onLog(`click(${command.x}, ${command.y})`, 'debug');
        await this.controller.click(command.x, command.y);
        break;

      case 'dblclick':
        this.context.onLog(`dblclick(${command.x}, ${command.y})`, 'debug');
        await this.controller.dblclick(command.x, command.y);
        break;

      case 'rightclick':
        this.context.onLog(`rightclick(${command.x}, ${command.y})`, 'debug');
        await this.controller.rightclick(command.x, command.y);
        break;

      case 'move':
        this.context.onLog(`move(${command.x}, ${command.y})`, 'debug');
        await this.controller.move(command.x, command.y);
        break;

      case 'drag':
        this.context.onLog(`drag(${command.x1}, ${command.y1}, ${command.x2}, ${command.y2})`, 'debug');
        await this.controller.drag(command.x1, command.y1, command.x2, command.y2);
        break;

      case 'type':
        this.context.onLog(`type("${command.text}")`, 'debug');
        await this.controller.type(command.text);
        break;

      case 'key':
        this.context.onLog(`key("${command.keyName}")`, 'debug');
        await this.controller.key(command.keyName);
        break;

      case 'shortcut':
        this.context.onLog(`shortcut("${command.keys.join('+')}")`, 'debug');
        await this.controller.shortcut(command.keys);
        break;

      case 'wait':
        this.context.onLog(`wait(${command.durationMs}ms)`, 'debug');
        await this.sleep(command.durationMs);
        break;

      case 'loop':
        await this.executeLoop(command);
        break;

      case 'comment':
        // 何もしない
        break;

      default:
        this.context.onLog(`不明なコマンド: ${(command as any).type}`, 'warn');
    }
  }

  /**
   * ループを実行
   */
  private async executeLoop(command: ReiCommand & { type: 'loop' }): Promise<void> {
    const maxIterations = command.count ?? Infinity;
    let iteration = 0;

    this.context.onLog(
      `loop開始: ${command.count ? command.count + '回' : '無限'}`,
      'debug'
    );

    while (iteration < maxIterations && this.context.running) {
      iteration++;
      this.context.onLog(`loop: ${iteration}/${command.count ?? '∞'} 回目`, 'debug');

      await this.executeCommands(command.body);

      if (!this.context.running) break;
    }

    this.context.onLog(`loop終了: ${iteration}回実行`, 'debug');
  }

  /**
   * 一時停止中は待機
   */
  private async waitWhilePaused(): Promise<void> {
    while (this.context.paused && this.context.running) {
      await this.sleep(100);
    }
  }

  /**
   * 指定ミリ秒スリープ（中断可能）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);

      // AbortControllerで中断可能にする
      if (this.abortController) {
        this.abortController.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve(); // rejectではなくresolveで静かに終了
        }, { once: true });
      }
    });
  }
}
