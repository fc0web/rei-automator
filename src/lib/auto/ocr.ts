/**
 * Rei Automator - OCRモジュール (Phase 5)
 * tesseract.js を使って指定領域のテキストを読み取る
 *
 * 純JSネイティブビルド不要。
 * Electronメインプロセスから呼び出される。
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * OCR結果
 */
export interface OcrResult {
  text: string;        // 認識結果（トリム済み）
  confidence: number;  // 信頼度 0〜100
  success: boolean;
  error?: string;
}

/**
 * OcrEngine クラス
 * - Tesseract.js Worker を遅延初期化してキャッシュする
 * - 同一プロセス内で複数回 read() しても Worker を使い回す
 */
export class OcrEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private worker: any | null = null;
  private lang: string;
  private initialized = false;

  constructor(lang = 'jpn+eng') {
    this.lang = lang;
  }

  /**
   * Worker を初期化（初回呼び出し時のみ実行）
   */
  private async ensureWorker(): Promise<void> {
    if (this.initialized) return;

    // tesseract.js は ESM / CJS 両対応
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Tesseract = require('tesseract.js');

    this.worker = await Tesseract.createWorker(this.lang, 1, {
      logger: () => {}, // ログ抑制
    });

    this.initialized = true;
  }

  /**
   * 画像ファイルの指定領域を OCR して結果を返す
   *
   * @param imagePath スクリーンショット画像パス
   * @param x        領域左上X
   * @param y        領域左上Y
   * @param width    領域幅
   * @param height   領域高さ
   */
  async read(
    imagePath: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<OcrResult> {
    try {
      await this.ensureWorker();

      // tesseract.js の rectangle オプションで領域を指定
      const { data } = await this.worker.recognize(imagePath, {
        rectangle: { top: y, left: x, width, height },
      });

      return {
        text: data.text.trim(),
        confidence: data.confidence,
        success: true,
      };
    } catch (err: any) {
      return {
        text: '',
        confidence: 0,
        success: false,
        error: err?.message ?? String(err),
      };
    }
  }

  /**
   * Worker をシャットダウン（アプリ終了時に呼ぶ）
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }
}
