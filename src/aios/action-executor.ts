/**
 * Rei AIOS — Action Executor
 * Phase A: LLM 出力 → Rei スクリプト変換 → 実行
 *
 * D-FUMT 中心-周囲パターン:
 *   中心 = 単一の Rei コマンド（agent が出力した1行）
 *   周囲 = バリデーション / 安全性チェック / 実行コンテキスト
 */

import { parse } from '../lib/core/parser';
import { ReiRuntime } from '../lib/core/runtime';
import { AutoController } from '../lib/auto/controller';

// ─── 型定義 ──────────────────────────────────────────

export interface ActionResult {
  /** 実行成功 or 失敗 */
  success: boolean;
  /** 実行されたコマンド */
  command: string;
  /** 経過時間（ms） */
  elapsedMs: number;
  /** エラーメッセージ */
  error?: string;
  /** バリデーション拒否理由 */
  rejectionReason?: string;
}

export interface ActionExecutorConfig {
  /** 実行モード */
  executionMode: 'cursor' | 'cursorless';
  /** cursorless のデフォルトウィンドウ */
  defaultWindow?: string;
  /** ドライラン（実際には実行しない） */
  dryRun: boolean;
  /** タイムアウト（ms） */
  timeoutMs: number;
  /** ログ関数 */
  log?: (msg: string) => void;
}

const DEFAULT_CONFIG: ActionExecutorConfig = {
  executionMode: 'cursor',
  dryRun: false,
  timeoutMs: 30000,
};

// ─── 安全性チェック ──────────────────────────────────

/** 絶対に実行してはいけないパターン */
const BLOCKED_PATTERNS: RegExp[] = [
  /format\s+[a-z]:/i,                   // ドライブのフォーマット
  /del\s+\/[sfq]/i,                     // 一括削除
  /rmdir\s+\/s/i,                       // ディレクトリ一括削除
  /rm\s+-rf\s+\//i,                     // Unix 一括削除
  /shutdown\s+/i,                       // シャットダウン
  /taskkill\s+.*\/f/i,                  // プロセス強制終了
  /reg\s+(delete|add).*\\hklm/i,        // レジストリ変更（HKLM）
  /net\s+user\s+.*\/add/i,             // ユーザー追加
  /netsh\s+firewall/i,                 // ファイアウォール操作
];

/** 警告を出すが実行は許可するパターン */
const WARN_PATTERNS: RegExp[] = [
  /launch\s+".*install/i,              // インストーラ起動
  /hotkey\s+["']?alt\+f4/i,           // Alt+F4
  /key\s+delete/i,                     // Delete キー
];

// ─── ActionExecutor クラス ────────────────────────────

export class ActionExecutor {
  private config: ActionExecutorConfig;
  private log: (msg: string) => void;

  constructor(config?: Partial<ActionExecutorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log = this.config.log || ((msg: string) => console.log(`[ActionExec] ${msg}`));
  }

  /**
   * コマンドをバリデーションして実行する
   */
  async execute(command: string): Promise<ActionResult> {
    const trimmed = command.trim();
    if (!trimmed) {
      return {
        success: false,
        command: '',
        elapsedMs: 0,
        error: 'Empty command',
      };
    }

    // ─── 安全性バリデーション ───────────────────
    const rejection = this.validate(trimmed);
    if (rejection) {
      this.log(`BLOCKED: ${trimmed} — ${rejection}`);
      return {
        success: false,
        command: trimmed,
        elapsedMs: 0,
        rejectionReason: rejection,
      };
    }

    // 警告チェック
    for (const pat of WARN_PATTERNS) {
      if (pat.test(trimmed)) {
        this.log(`WARNING: potentially destructive command: ${trimmed}`);
        break;
      }
    }

    // ─── ドライラン ────────────────────────────
    if (this.config.dryRun) {
      this.log(`DRY RUN: ${trimmed}`);
      return {
        success: true,
        command: trimmed,
        elapsedMs: 0,
      };
    }

    // ─── 実行 ──────────────────────────────────
    return this.executeReiCommand(trimmed);
  }

  /**
   * コマンドのバリデーション
   * @returns 拒否理由。null なら OK。
   */
  validate(command: string): string | null {
    // ブロックパターンチェック
    for (const pat of BLOCKED_PATTERNS) {
      if (pat.test(command)) {
        return `Blocked by safety rule: ${pat.source}`;
      }
    }

    // 基本的な構文チェック（Rei パーサーに通す）
    try {
      parse(command);
    } catch (e: any) {
      // パース失敗 = 不正なコマンド
      return `Parse error: ${e.message}`;
    }

    return null;
  }

  /**
   * 複数コマンドを順番に実行（スクリプトブロック）
   */
  async executeBlock(commands: string[]): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    for (const cmd of commands) {
      const result = await this.execute(cmd);
      results.push(result);
      if (!result.success) break;  // エラーで中断
    }
    return results;
  }

  // ─── Private ─────────────────────────────────────

  private async executeReiCommand(command: string): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      const program = parse(command);
      const runtime = this.createRuntime();

      // タイムアウト付き実行
      await Promise.race([
        runtime.execute(program),
        this.timeoutPromise(this.config.timeoutMs),
      ]);

      const elapsed = Date.now() - startTime;
      this.log(`OK (${elapsed}ms): ${command}`);

      return {
        success: true,
        command,
        elapsedMs: elapsed,
      };
    } catch (e: any) {
      const elapsed = Date.now() - startTime;
      this.log(`ERROR (${elapsed}ms): ${command} — ${e.message}`);

      return {
        success: false,
        command,
        elapsedMs: elapsed,
        error: e.message,
      };
    }
  }

  private createRuntime(): ReiRuntime {
    // NOTE: Windows でしか動作しないバックエンド。
    //       非Windows環境では StubBackend にフォールバック。
    let backend: any;
    let controller: AutoController;

    if (process.platform === 'win32') {
      const { WindowsBackend } = require('../lib/auto/windows-backend');
      backend = new WindowsBackend((msg: string) => this.log(msg));
    } else {
      const { StubBackend } = require('../lib/auto/stub-backend');
      backend = new StubBackend((msg: string) => this.log(msg));
    }

    controller = new AutoController(backend);
    const runtime = new ReiRuntime(controller);

    if (this.config.executionMode === 'cursorless' && this.config.defaultWindow) {
      runtime.setExecutionMode('cursorless', this.config.defaultWindow);
    }

    // WinAPI バックエンド（cursorless）
    if (process.platform === 'win32') {
      try {
        const { WinApiBackend } = require('../lib/auto/win-api-backend');
        const winApi = new WinApiBackend((msg: string) => this.log(msg));
        runtime.setWinApiBackend(winApi);
      } catch { /* WinApi not available */ }
    }

    return runtime;
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timeout (${ms}ms)`)), ms);
    });
  }
}
