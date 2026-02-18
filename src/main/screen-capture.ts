/**
 * Rei Automator - スクリーンショットキャプチャ
 * Electronの desktopCapturer を使用（外部パッケージ不要）
 */

import { desktopCapturer, screen, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * キャプチャ結果
 */
export interface CaptureResult {
  success: boolean;
  /** Base64エンコードされたPNG画像 */
  imageData?: string;
  /** 画像の幅 */
  width?: number;
  /** 画像の高さ */
  height?: number;
  /** 保存先パス（保存した場合） */
  savedPath?: string;
  error?: string;
}

/**
 * スクリーンショットマネージャー
 */
export class ScreenCapture {
  private capturesDir: string;

  constructor(capturesDir?: string) {
    this.capturesDir = capturesDir || path.join(process.cwd(), 'captures');
    this.ensureCapturesDir();
  }

  /**
   * capturesディレクトリを作成
   */
  private ensureCapturesDir(): void {
    if (!fs.existsSync(this.capturesDir)) {
      fs.mkdirSync(this.capturesDir, { recursive: true });
    }
  }

  /**
   * 画面全体をキャプチャ
   */
  async captureScreen(): Promise<CaptureResult> {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      const scaleFactor = primaryDisplay.scaleFactor;

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.floor(width * scaleFactor),
          height: Math.floor(height * scaleFactor),
        },
      });

      if (sources.length === 0) {
        return { success: false, error: 'キャプチャソースが見つかりません' };
      }

      const source = sources[0];
      const thumbnail = source.thumbnail;

      if (thumbnail.isEmpty()) {
        return { success: false, error: 'キャプチャ画像が空です' };
      }

      const pngBuffer = thumbnail.toPNG();
      const base64 = pngBuffer.toString('base64');

      return {
        success: true,
        imageData: base64,
        width,
        height,
      };
    } catch (error: any) {
      console.error('[ScreenCapture] Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * キャプチャしてファイルに保存
   */
  async captureAndSave(filename?: string): Promise<CaptureResult> {
    const result = await this.captureScreen();
    if (!result.success || !result.imageData) return result;

    const name = filename || `capture_${Date.now()}.png`;
    const filePath = path.join(this.capturesDir, name);

    try {
      const buffer = Buffer.from(result.imageData, 'base64');
      fs.writeFileSync(filePath, buffer);
      result.savedPath = filePath;
      console.log(`[ScreenCapture] Saved: ${filePath}`);
    } catch (error: any) {
      console.error('[ScreenCapture] Save error:', error);
      result.error = `保存エラー: ${error.message}`;
    }

    return result;
  }

  /**
   * 保存済みキャプチャ一覧を取得
   */
  listCaptures(): string[] {
    try {
      return fs.readdirSync(this.capturesDir)
        .filter((f) => f.endsWith('.png'))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * キャプチャ画像をBase64で読み込み
   */
  loadCapture(filename: string): CaptureResult {
    const filePath = path.join(this.capturesDir, filename);
    try {
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');
      return {
        success: true,
        imageData: base64,
        savedPath: filePath,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
