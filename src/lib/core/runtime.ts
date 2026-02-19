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
  FindState,
} from './types';

import { AutoController } from '../auto/controller';
import { ImageMatcher } from '../auto/image-matcher';
import { OcrEngine } from '../auto/ocr';
import { ErrorHandler } from './error-handler';

/**
 * Reiプログラムの実行エンジン
 */
export class ReiRuntime {
  private context: ExecutionContext;
  private controller: AutoController;
  private abortController: AbortController | null = null;
  private errorHandler: ErrorHandler | null = null;

  // Phase 4: 画像認識
  private findState: FindState = {
    found: false, x: 0, y: 0, centerX: 0, centerY: 0, confidence: 0, template: '',
  };
  private imageMatcher: ImageMatcher | null = null;
  private captureFunc: (() => Promise<string>) | null = null;

  // Phase 5: OCR
  private ocrEngine: OcrEngine | null = null;
  private lastText = '';  // read() の結果を保持

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

  // ── Phase 4: 注入メソッド ─────────────────────────────
  setImageMatcher(matcher: ImageMatcher): void {
    this.imageMatcher = matcher;
  }

  setCaptureFunc(func: () => Promise<string>): void {
    this.captureFunc = func;
  }

  getFindState(): FindState {
    return { ...this.findState };
  }

  // ── Phase 5: OCR注入メソッド ──────────────────────────
  setOcrEngine(engine: OcrEngine): void {
    this.ocrEngine = engine;
  }

  // ── Phase 6: ErrorHandler注入メソッド ───────────────────
  setErrorHandler(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  getLastText(): string {
    return this.lastText;
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
    if (this.errorHandler) this.errorHandler.clearErrors();

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

      // Phase 6: ExecutionError の場合はフォーマット済みメッセージを使用
      if (error.name === 'ExecutionError' && this.errorHandler) {
        const detail = error.detail;
        const formatted = this.errorHandler.formatError(detail);
        const suggestion = this.errorHandler.getSuggestion(detail);
        this.context.onLog(`${formatted}\n${suggestion}`, 'error');
        this.context.onStatusChange('error');
        return {
          success: false,
          error: `行${detail.lineNumber}: ${detail.message}`,
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

      // コマンドを実行（ErrorHandler経由またはダイレクト）
      if (this.errorHandler) {
        const result = await this.errorHandler.executeWithPolicy(
          command.line,
          `${command.type}`,  // line text
          command.type,       // command name
          () => this.executeCommand(command)
        );
        // result === null の場合は skip ポリシーでエラーがスキップされた
        // ExecutionError が throw された場合は上位の execute() の catch で処理
      } else {
        await this.executeCommand(command);
      }
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

      // ── Phase 4: find ─────────────────────────────────
      case 'find': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.context.onLog('エラー: 画像認識が初期化されていません', 'error');
          break;
        }
        this.context.onLog(`テンプレート探索: "${command.template}"`, 'info');
        const capturePath = await this.captureFunc();
        const result = await this.imageMatcher.findTemplate(
          capturePath,
          command.template,
          { threshold: command.threshold }
        );
        this.findState = {
          found: result.found,
          x: result.x, y: result.y,
          centerX: result.centerX, centerY: result.centerY,
          confidence: result.confidence,
          template: command.template,
        };
        if (result.found) {
          this.context.onLog(
            `✓ 発見: "${command.template}" at (${result.centerX}, ${result.centerY}) 信頼度: ${(result.confidence * 100).toFixed(1)}%`,
            'info'
          );
        } else {
          this.context.onLog(
            `✗ 未発見: "${command.template}" (最高信頼度: ${(result.confidence * 100).toFixed(1)}%)`,
            'warn'
          );
        }
        break;
      }

      // ── Phase 4: click_found ──────────────────────────
      case 'click_found': {
        if (!this.findState.found) {
          this.context.onLog('エラー: find() が未実行または画像が見つかりませんでした', 'error');
          break;
        }
        const targetX = this.findState.centerX + (command.offsetX ?? 0);
        const targetY = this.findState.centerY + (command.offsetY ?? 0);
        this.context.onLog(
          `${command.action}(found) → (${targetX}, ${targetY}) [テンプレート: ${this.findState.template}]`,
          'info'
        );
        switch (command.action) {
          case 'click': await this.controller.click(targetX, targetY); break;
          case 'dblclick': await this.controller.dblclick(targetX, targetY); break;
          case 'rightclick': await this.controller.rightclick(targetX, targetY); break;
        }
        break;
      }

      // ── Phase 4: wait_find ────────────────────────────
      case 'wait_find': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.context.onLog('エラー: 画像認識が初期化されていません', 'error');
          break;
        }
        const timeout = command.timeout ?? 10000;
        const interval = command.interval ?? 500;
        const startTime = Date.now();
        this.context.onLog(
          `テンプレート待機: "${command.template}" (タイムアウト: ${timeout}ms, 間隔: ${interval}ms)`,
          'info'
        );
        let found = false;
        while (Date.now() - startTime < timeout && this.context.running) {
          await this.waitWhilePaused();
          if (!this.context.running) break;
          const capPath = await this.captureFunc();
          const matchResult = await this.imageMatcher.findTemplate(
            capPath, command.template, { threshold: command.threshold }
          );
          if (matchResult.found) {
            this.findState = {
              found: true,
              x: matchResult.x, y: matchResult.y,
              centerX: matchResult.centerX, centerY: matchResult.centerY,
              confidence: matchResult.confidence,
              template: command.template,
            };
            this.context.onLog(
              `✓ 発見: "${command.template}" at (${matchResult.centerX}, ${matchResult.centerY}) ${((Date.now() - startTime) / 1000).toFixed(1)}秒後`,
              'info'
            );
            found = true;
            break;
          }
          await this.sleep(interval);
        }
        if (!found && this.context.running) {
          this.context.onLog(
            `✗ タイムアウト: "${command.template}" が ${timeout}ms 以内に見つかりませんでした`,
            'warn'
          );
          this.findState = { found: false, x: 0, y: 0, centerX: 0, centerY: 0, confidence: 0, template: command.template };
        }
        break;
      }

      // ── Phase 4: find_click ───────────────────────────
      case 'find_click': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.context.onLog('エラー: 画像認識が初期化されていません', 'error');
          break;
        }
        this.context.onLog(`探索+クリック: "${command.template}"`, 'info');
        const capPath = await this.captureFunc();
        const matchResult = await this.imageMatcher.findTemplate(
          capPath, command.template, { threshold: command.threshold }
        );
        if (matchResult.found) {
          const fcX = matchResult.centerX + (command.offsetX ?? 0);
          const fcY = matchResult.centerY + (command.offsetY ?? 0);
          this.findState = {
            found: true,
            x: matchResult.x, y: matchResult.y,
            centerX: matchResult.centerX, centerY: matchResult.centerY,
            confidence: matchResult.confidence,
            template: command.template,
          };
          this.context.onLog(
            `✓ 発見+${command.action}: (${fcX}, ${fcY}) 信頼度: ${(matchResult.confidence * 100).toFixed(1)}%`,
            'info'
          );
          switch (command.action) {
            case 'click': await this.controller.click(fcX, fcY); break;
            case 'dblclick': await this.controller.dblclick(fcX, fcY); break;
            case 'rightclick': await this.controller.rightclick(fcX, fcY); break;
          }
        } else {
          this.context.onLog(
            `✗ 未発見: "${command.template}" (最高信頼度: ${(matchResult.confidence * 100).toFixed(1)}%)`,
            'warn'
          );
        }
        break;
      }

      // ── Phase 5: read(x, y, width, height) ───────────────
      case 'read': {
        if (!this.captureFunc) {
          this.context.onLog('エラー: キャプチャ機能が初期化されていません', 'error');
          break;
        }
        if (!this.ocrEngine) {
          this.context.onLog('エラー: OCRエンジンが初期化されていません', 'error');
          break;
        }
        this.context.onLog(
          `OCR読み取り: 領域 (${command.x}, ${command.y}, ${command.width}×${command.height})`,
          'info'
        );
        const capPathOcr = await this.captureFunc();
        const ocrResult = await this.ocrEngine.read(
          capPathOcr, command.x, command.y, command.width, command.height
        );
        if (ocrResult.success) {
          this.lastText = ocrResult.text;
          this.context.onLog(
            `✓ OCR結果: "${ocrResult.text}" (信頼度: ${ocrResult.confidence.toFixed(1)}%)`,
            'info'
          );
        } else {
          this.lastText = '';
          this.context.onLog(`✗ OCRエラー: ${ocrResult.error}`, 'error');
        }
        break;
      }

      // ── Phase 5: if文 ──────────────────────────────────────
      case 'if': {
        const cond = command.condition;
        let condResult = false;

        switch (cond.type) {
          case 'found':
            condResult = this.findState.found;
            this.context.onLog(
              `if found → ${condResult} [テンプレート: ${this.findState.template}]`,
              'debug'
            );
            break;
          case 'not_found':
            condResult = !this.findState.found;
            this.context.onLog(
              `if not found → ${condResult}`,
              'debug'
            );
            break;
          case 'text_eq':
            condResult = this.lastText === cond.value;
            this.context.onLog(
              `if text == "${cond.value}" → ${condResult} [text="${this.lastText}"]`,
              'debug'
            );
            break;
          case 'text_ne':
            condResult = this.lastText !== cond.value;
            this.context.onLog(
              `if text != "${cond.value}" → ${condResult} [text="${this.lastText}"]`,
              'debug'
            );
            break;
          case 'text_contains':
            condResult = this.lastText.includes(cond.value);
            this.context.onLog(
              `if text contains "${cond.value}" → ${condResult} [text="${this.lastText}"]`,
              'debug'
            );
            break;
          case 'text_not_contains':
            condResult = !this.lastText.includes(cond.value);
            this.context.onLog(
              `if text not contains "${cond.value}" → ${condResult} [text="${this.lastText}"]`,
              'debug'
            );
            break;
        }

        if (condResult) {
          this.context.onLog('→ then ブロックを実行', 'debug');
          await this.executeCommands(command.thenBlock);
        } else if (command.elseBlock) {
          this.context.onLog('→ else ブロックを実行', 'debug');
          await this.executeCommands(command.elseBlock);
        } else {
          this.context.onLog('→ 条件不成立 (elseなし、スキップ)', 'debug');
        }
        break;
      }

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
