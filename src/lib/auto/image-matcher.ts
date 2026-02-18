/**
 * image-matcher.ts — Phase 4: テンプレートマッチングエンジン
 *
 * jimpベースの軽量テンプレートマッチング。
 * opencv4nodejsのネイティブビルド問題を回避し、
 * Phase 1からの「純JS・外部依存最小」設計方針と一貫。
 *
 * アルゴリズム: SAD（Sum of Absolute Differences）
 *   - 高速で実装がシンプル
 *   - 明るさの均一な変化に弱いが、同一PC上のスクリーンショット同士なので問題なし
 *   - 必要に応じてNCC（正規化相互相関）に差し替え可能
 */

import Jimp from 'jimp';
import * as path from 'path';
import * as fs from 'fs';

// ── 型定義 ────────────────────────────────────────────

export interface MatchResult {
  found: boolean;
  x: number;          // マッチ左上X
  y: number;          // マッチ左上Y
  centerX: number;    // マッチ中心X（クリック用）
  centerY: number;    // マッチ中心Y（クリック用）
  confidence: number; // 0.0〜1.0（1.0 = 完全一致）
  width: number;      // テンプレート幅
  height: number;     // テンプレート高さ
}

export interface MatchOptions {
  threshold?: number;     // マッチ判定閾値（デフォルト: 0.85）
  scaleFactors?: number[];// 複数スケールで探索（DPI対応）
  grayscale?: boolean;    // グレースケール変換してマッチング（高速化）
  region?: {              // 探索範囲の限定（高速化）
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TemplateInfo {
  name: string;
  path: string;
  width: number;
  height: number;
  createdAt: string;
}

// ── デフォルト設定 ──────────────────────────────────────

const DEFAULT_THRESHOLD = 0.85;
const DEFAULT_SCALE_FACTORS = [1.0]; // 必要に応じて [0.9, 1.0, 1.1] 等

// ── テンプレートマッチャー ───────────────────────────────

export class ImageMatcher {
  private templatesDir: string;
  private templateCache: Map<string, Jimp> = new Map();

  constructor(templatesDir: string) {
    this.templatesDir = templatesDir;
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
  }

  /**
   * スクリーンショット上でテンプレートを探す
   */
  async findTemplate(
    screenshotPath: string,
    templateName: string,
    options: MatchOptions = {}
  ): Promise<MatchResult> {
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const scaleFactors = options.scaleFactors ?? DEFAULT_SCALE_FACTORS;
    const useGrayscale = options.grayscale ?? true;

    // 画像読み込み
    const screenshot = await this.loadImage(screenshotPath);
    const template = await this.loadTemplate(templateName);

    if (!template) {
      return this.noMatch();
    }

    let bestResult = this.noMatch();

    for (const scale of scaleFactors) {
      // スケール適用
      const scaledTemplate = scale === 1.0
        ? template.clone()
        : template.clone().scale(scale);

      const result = await this.matchSAD(
        screenshot,
        scaledTemplate,
        useGrayscale,
        options.region
      );

      if (result.confidence > bestResult.confidence) {
        bestResult = result;
      }
    }

    bestResult.found = bestResult.confidence >= threshold;
    return bestResult;
  }

  /**
   * Base64画像データからテンプレートを探す（キャプチャ直後用）
   */
  async findTemplateFromBuffer(
    screenshotBuffer: Buffer,
    templateName: string,
    options: MatchOptions = {}
  ): Promise<MatchResult> {
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const useGrayscale = options.grayscale ?? true;
    const scaleFactors = options.scaleFactors ?? DEFAULT_SCALE_FACTORS;

    const screenshot = await Jimp.read(screenshotBuffer);
    const template = await this.loadTemplate(templateName);

    if (!template) {
      return this.noMatch();
    }

    let bestResult = this.noMatch();

    for (const scale of scaleFactors) {
      const scaledTemplate = scale === 1.0
        ? template.clone()
        : template.clone().scale(scale);

      const result = await this.matchSAD(
        screenshot,
        scaledTemplate,
        useGrayscale,
        options.region
      );

      if (result.confidence > bestResult.confidence) {
        bestResult = result;
      }
    }

    bestResult.found = bestResult.confidence >= threshold;
    return bestResult;
  }

  /**
   * SAD（Sum of Absolute Differences）テンプレートマッチング
   *
   * スクリーンショット上をスライディングウィンドウで走査し、
   * 各位置でのピクセル差分の合計が最小の位置を返す。
   */
  private async matchSAD(
    screenshot: Jimp,
    template: Jimp,
    useGrayscale: boolean,
    region?: { x: number; y: number; width: number; height: number }
  ): Promise<MatchResult> {
    // グレースケール変換（オプション、高速化のため）
    const src = useGrayscale ? screenshot.clone().greyscale() : screenshot;
    const tpl = useGrayscale ? template.clone().greyscale() : template;

    const sw = src.getWidth();
    const sh = src.getHeight();
    const tw = tpl.getWidth();
    const th = tpl.getHeight();

    if (tw > sw || th > sh) {
      return this.noMatch();
    }

    // 探索範囲
    const startX = region?.x ?? 0;
    const startY = region?.y ?? 0;
    const endX = region ? Math.min(region.x + region.width - tw, sw - tw) : sw - tw;
    const endY = region ? Math.min(region.y + region.height - th, sh - th) : sh - th;

    // ビットマップデータ取得（高速アクセス）
    const srcBitmap = src.bitmap.data;
    const tplBitmap = tpl.bitmap.data;
    const srcW = src.bitmap.width;
    const tplW = tpl.bitmap.width;
    const channels = useGrayscale ? 1 : 3; // greyscaleでもRGBA形式だが値は同一

    let minSAD = Infinity;
    let bestX = 0;
    let bestY = 0;

    // テンプレートの最大SADを事前計算（正規化用）
    const maxPossibleSAD = tw * th * 255 * (useGrayscale ? 1 : 3);

    // ステップサイズ（Phase 6で高速化する場合、初回粗探索→細探索に変更可能）
    const step = 1;

    for (let y = startY; y <= endY; y += step) {
      for (let x = startX; x <= endX; x += step) {
        let sad = 0;

        // テンプレート全ピクセルとの差分計算
        for (let ty = 0; ty < th; ty++) {
          const srcRowOffset = ((y + ty) * srcW + x) * 4;
          const tplRowOffset = (ty * tplW) * 4;

          for (let tx = 0; tx < tw; tx++) {
            const si = srcRowOffset + tx * 4;
            const ti = tplRowOffset + tx * 4;

            // R, G, B チャンネルの差分（greyscaleならRだけで十分だが安全のため）
            sad += Math.abs(srcBitmap[si] - tplBitmap[ti]);
            if (!useGrayscale) {
              sad += Math.abs(srcBitmap[si + 1] - tplBitmap[ti + 1]);
              sad += Math.abs(srcBitmap[si + 2] - tplBitmap[ti + 2]);
            }
          }

          // 早期打ち切り：既にminSADを超えたらこの位置はスキップ
          if (sad >= minSAD) break;
        }

        if (sad < minSAD) {
          minSAD = sad;
          bestX = x;
          bestY = y;
        }
      }
    }

    const confidence = 1.0 - (minSAD / maxPossibleSAD);

    return {
      found: false, // 呼び出し側でthresholdと比較して設定
      x: bestX,
      y: bestY,
      centerX: bestX + Math.floor(tw / 2),
      centerY: bestY + Math.floor(th / 2),
      confidence,
      width: tw,
      height: th,
    };
  }

  /**
   * キャプチャ画像から部分領域を切り出してテンプレートとして保存
   */
  async createTemplate(
    sourcePath: string,
    region: { x: number; y: number; width: number; height: number },
    templateName: string
  ): Promise<TemplateInfo> {
    const image = await Jimp.read(sourcePath);
    const cropped = image.crop(region.x, region.y, region.width, region.height);

    const safeName = templateName.endsWith('.png') ? templateName : `${templateName}.png`;
    const templatePath = path.join(this.templatesDir, safeName);
    await cropped.writeAsync(templatePath);

    // キャッシュクリア（更新された可能性）
    this.templateCache.delete(safeName);

    return {
      name: safeName,
      path: templatePath,
      width: region.width,
      height: region.height,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Base64画像データから部分領域を切り出してテンプレートとして保存
   */
  async createTemplateFromBuffer(
    buffer: Buffer,
    region: { x: number; y: number; width: number; height: number },
    templateName: string
  ): Promise<TemplateInfo> {
    const image = await Jimp.read(buffer);
    const cropped = image.crop(region.x, region.y, region.width, region.height);

    const safeName = templateName.endsWith('.png') ? templateName : `${templateName}.png`;
    const templatePath = path.join(this.templatesDir, safeName);
    await cropped.writeAsync(templatePath);

    this.templateCache.delete(safeName);

    return {
      name: safeName,
      path: templatePath,
      width: region.width,
      height: region.height,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * テンプレート一覧取得
   */
  async listTemplates(): Promise<TemplateInfo[]> {
    const files = fs.readdirSync(this.templatesDir)
      .filter(f => f.endsWith('.png'));

    const templates: TemplateInfo[] = [];
    for (const file of files) {
      const filePath = path.join(this.templatesDir, file);
      const stat = fs.statSync(filePath);
      try {
        const img = await this.loadTemplate(file);
        if (img) {
          templates.push({
            name: file,
            path: filePath,
            width: img.getWidth(),
            height: img.getHeight(),
            createdAt: stat.birthtime.toISOString(),
          });
        }
      } catch {
        // 破損ファイルはスキップ
      }
    }
    return templates;
  }

  /**
   * テンプレート削除
   */
  deleteTemplate(templateName: string): boolean {
    const safeName = templateName.endsWith('.png') ? templateName : `${templateName}.png`;
    const filePath = path.join(this.templatesDir, safeName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.templateCache.delete(safeName);
      return true;
    }
    return false;
  }

  // ── 内部ヘルパー ──────────────────────────────────────

  private async loadImage(imagePath: string): Promise<Jimp> {
    return Jimp.read(imagePath);
  }

  private async loadTemplate(templateName: string): Promise<Jimp | null> {
    const safeName = templateName.endsWith('.png') ? templateName : `${templateName}.png`;

    // キャッシュチェック
    if (this.templateCache.has(safeName)) {
      return this.templateCache.get(safeName)!.clone();
    }

    const filePath = path.join(this.templatesDir, safeName);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const img = await Jimp.read(filePath);
    this.templateCache.set(safeName, img);
    return img.clone();
  }

  private noMatch(): MatchResult {
    return {
      found: false,
      x: 0,
      y: 0,
      centerX: 0,
      centerY: 0,
      confidence: 0,
      width: 0,
      height: 0,
    };
  }
}
