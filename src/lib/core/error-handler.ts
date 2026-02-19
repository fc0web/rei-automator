/**
 * Rei Automator Phase 6 - エラーハンドリング強化
 *
 * 対応構文:
 *   retry(3):           // 最大3回リトライ
 *     click(100, 200)
 *   on_error: skip      // エラー時にスキップ
 *   on_error: stop      // エラー時に停止（デフォルト）
 *   on_error: retry(2)  // エラー時にN回リトライ
 */

import { Logger } from './logger';

export interface ErrorDetail {
  lineNumber: number;
  line: string;
  command: string;
  message: string;
  originalError?: Error;
  retryCount?: number;
  timestamp: string;
}

export type ErrorPolicy = 'stop' | 'skip' | { retry: number };

export class ExecutionError extends Error {
  detail: ErrorDetail;

  constructor(detail: ErrorDetail) {
    super(detail.message);
    this.name = 'ExecutionError';
    this.detail = detail;
  }
}

export class ErrorHandler {
  private globalPolicy: ErrorPolicy = 'stop';
  private errors: ErrorDetail[] = [];
  private logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  setGlobalPolicy(policy: ErrorPolicy): void {
    this.globalPolicy = policy;
  }

  getErrors(): ErrorDetail[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  /**
   * コマンド実行をエラーハンドリング付きでラップ
   */
  async executeWithPolicy<T>(
    lineNumber: number,
    line: string,
    command: string,
    executor: () => Promise<T>,
    policy?: ErrorPolicy
  ): Promise<T | null> {
    const effectivePolicy = policy ?? this.globalPolicy;
    let lastError: Error | null = null;

    const maxRetries = typeof effectivePolicy === 'object' ? effectivePolicy.retry : 1;
    const shouldRetry = typeof effectivePolicy === 'object';
    const shouldSkip = effectivePolicy === 'skip';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await executor();
        if (attempt > 0) {
          this.logger?.log('info', `リトライ成功 (${attempt + 1}回目): ${command}`, { lineNumber });
        }
        return result;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));

        if (shouldRetry && attempt < maxRetries - 1) {
          this.logger?.log('warn', `リトライ中 (${attempt + 1}/${maxRetries}): ${command} - ${lastError.message}`, { lineNumber });
          await sleep(500 * (attempt + 1)); // 指数バックオフ
          continue;
        }

        const detail: ErrorDetail = {
          lineNumber,
          line,
          command,
          message: lastError.message,
          originalError: lastError,
          retryCount: attempt,
          timestamp: new Date().toISOString(),
        };
        this.errors.push(detail);
        this.logger?.log('error', `エラー: ${detail.message}`, { lineNumber, command });

        if (shouldSkip) {
          this.logger?.log('warn', `スキップ: Line ${lineNumber} - ${command}`, { lineNumber });
          return null;
        }

        throw new ExecutionError(detail);
      }
    }

    return null;
  }

  /**
   * エラー詳細をフォーマット（UI表示用）
   */
  formatError(detail: ErrorDetail): string {
    const lines = [
      `❌ 実行エラー`,
      `  行番号: ${detail.lineNumber}`,
      `  コマンド: ${detail.command}`,
      `  エラー内容: ${detail.message}`,
    ];

    if (detail.retryCount && detail.retryCount > 0) {
      lines.push(`  リトライ回数: ${detail.retryCount}`);
    }

    return lines.join('\n');
  }

  /**
   * エラーから自動復帰を試みるヒントを生成
   */
  getSuggestion(detail: ErrorDetail): string {
    const msg = detail.message.toLowerCase();

    if (msg.includes('timeout') || msg.includes('タイムアウト')) {
      return '💡 ヒント: wait() でウェイトを追加するか、retry() でリトライ設定を検討してください';
    }
    if (msg.includes('not found') || msg.includes('見つかり')) {
      return '💡 ヒント: 画像が見つかりません。テンプレート画像を更新するか、解像度設定を確認してください';
    }
    if (msg.includes('click') || msg.includes('座標')) {
      return '💡 ヒント: クリック座標を確認してください。画面解像度が変わっている可能性があります';
    }
    if (msg.includes('ocr') || msg.includes('text')) {
      return '💡 ヒント: OCR読み取りに失敗しました。対象エリアと言語設定を確認してください';
    }

    return '💡 ヒント: エラー箇所をステップ実行モードで確認することをお勧めします';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
