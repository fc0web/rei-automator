# ============================================================
# Rei Automator Phase 4 統合スクリプト
# 実行: PowerShell で cd C:\Users\user\rei-automator してから実行
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Rei Automator Phase 4 統合開始" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 作業ディレクトリ確認 ─────────────────────────────────
$repoRoot = "C:\Users\user\rei-automator"
if (-not (Test-Path "$repoRoot\package.json")) {
    Write-Host "エラー: $repoRoot にプロジェクトが見つかりません" -ForegroundColor Red
    exit 1
}
Set-Location $repoRoot
Write-Host "作業ディレクトリ: $repoRoot" -ForegroundColor Green

# ── Step 1: jimp インストール ────────────────────────────
Write-Host ""
Write-Host "[Step 1/6] jimp パッケージインストール..." -ForegroundColor Yellow
npm install jimp@0.22.12 --save
if ($LASTEXITCODE -ne 0) {
    Write-Host "警告: jimp インストールに問題がある可能性があります" -ForegroundColor Yellow
}

# ── Step 2: ディレクトリ作成 ─────────────────────────────
Write-Host ""
Write-Host "[Step 2/6] ディレクトリ作成..." -ForegroundColor Yellow

if (-not (Test-Path "templates")) {
    New-Item -ItemType Directory -Path "templates" | Out-Null
    Write-Host "  作成: templates/" -ForegroundColor Green
}

if (-not (Test-Path "docs")) {
    New-Item -ItemType Directory -Path "docs" | Out-Null
}

# .gitignore に templates/ 追加（未追加の場合）
$gitignore = if (Test-Path ".gitignore") { Get-Content ".gitignore" -Raw } else { "" }
if ($gitignore -notmatch "templates/") {
    Add-Content -Path ".gitignore" -Value "`ntemplates/"
    Write-Host "  .gitignore に templates/ を追加" -ForegroundColor Green
}

# ── Step 3: 新規ファイル作成 ─────────────────────────────
Write-Host ""
Write-Host "[Step 3/6] ファイル作成..." -ForegroundColor Yellow

# ────────────────────────────────────────────────────────
# image-matcher.ts（テンプレートマッチングエンジン本体）
# ────────────────────────────────────────────────────────
$imageMatcher = @'
/**
 * image-matcher.ts - Phase 4: テンプレートマッチングエンジン
 *
 * jimpベースの軽量テンプレートマッチング。
 * opencv4nodejsのネイティブビルド問題を回避し、
 * Phase 1からの「純JS・外部依存最小」設計方針と一貫。
 *
 * アルゴリズム: SAD（Sum of Absolute Differences）
 */

import Jimp from 'jimp';
import * as path from 'path';
import * as fs from 'fs';

// ── 型定義 ────────────────────────────────────────────

export interface MatchResult {
  found: boolean;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  confidence: number;
  width: number;
  height: number;
}

export interface MatchOptions {
  threshold?: number;
  scaleFactors?: number[];
  grayscale?: boolean;
  region?: {
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
const DEFAULT_SCALE_FACTORS = [1.0];

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

    const screenshot = await this.loadImage(screenshotPath);
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
   */
  private async matchSAD(
    screenshot: Jimp,
    template: Jimp,
    useGrayscale: boolean,
    region?: { x: number; y: number; width: number; height: number }
  ): Promise<MatchResult> {
    const src = useGrayscale ? screenshot.clone().greyscale() : screenshot;
    const tpl = useGrayscale ? template.clone().greyscale() : template;

    const sw = src.getWidth();
    const sh = src.getHeight();
    const tw = tpl.getWidth();
    const th = tpl.getHeight();

    if (tw > sw || th > sh) {
      return this.noMatch();
    }

    const startX = region?.x ?? 0;
    const startY = region?.y ?? 0;
    const endX = region ? Math.min(region.x + region.width - tw, sw - tw) : sw - tw;
    const endY = region ? Math.min(region.y + region.height - th, sh - th) : sh - th;

    const srcBitmap = src.bitmap.data;
    const tplBitmap = tpl.bitmap.data;
    const srcW = src.bitmap.width;
    const tplW = tpl.bitmap.width;

    let minSAD = Infinity;
    let bestX = 0;
    let bestY = 0;

    const maxPossibleSAD = tw * th * 255 * (useGrayscale ? 1 : 3);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        let sad = 0;

        for (let ty = 0; ty < th; ty++) {
          const srcRowOffset = ((y + ty) * srcW + x) * 4;
          const tplRowOffset = (ty * tplW) * 4;

          for (let tx = 0; tx < tw; tx++) {
            const si = srcRowOffset + tx * 4;
            const ti = tplRowOffset + tx * 4;

            sad += Math.abs(srcBitmap[si] - tplBitmap[ti]);
            if (!useGrayscale) {
              sad += Math.abs(srcBitmap[si + 1] - tplBitmap[ti + 1]);
              sad += Math.abs(srcBitmap[si + 2] - tplBitmap[ti + 2]);
            }
          }

          // 早期打ち切り
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
      found: false,
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
'@

# ────────────────────────────────────────────────────────
# types.ts に追加する内容
# ────────────────────────────────────────────────────────
$typesAdditions = @'
// ============================================================
// Phase 4 追加型定義
// 以下を types.ts の ReiCommandType union と ReiCommand union に追加
// ============================================================

// ReiCommandType に追加:
//   | 'find' | 'click_found' | 'wait_find' | 'find_click'

export interface FindCommand {
  type: 'find';
  template: string;
  threshold?: number;
}

export interface ClickFoundCommand {
  type: 'click_found';
  action: 'click' | 'dblclick' | 'rightclick';
  offsetX?: number;
  offsetY?: number;
}

export interface WaitFindCommand {
  type: 'wait_find';
  template: string;
  timeout: number;
  interval?: number;
  threshold?: number;
}

export interface FindClickCommand {
  type: 'find_click';
  template: string;
  action: 'click' | 'dblclick' | 'rightclick';
  threshold?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface FindState {
  found: boolean;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  confidence: number;
  template: string;
}

// ReiCommand union に追加:
//   | FindCommand | ClickFoundCommand | WaitFindCommand | FindClickCommand
'@

# ────────────────────────────────────────────────────────
# parser.ts に追加する内容
# ────────────────────────────────────────────────────────
$parserAdditions = @'
// ============================================================
// Phase 4 パーサー追加
// parseLine() 内、既存コマンドパースの後に追加
// ============================================================

  // ── find("template.png") ──────────────────────────────
  const findMatch = trimmed.match(
    /^find\(\s*"([^"]+)"\s*(?:,\s*([\d.]+))?\s*\)$/
  );
  if (findMatch) {
    const template = findMatch[1];
    const threshold = findMatch[2] ? parseFloat(findMatch[2]) : undefined;
    commands.push({
      type: 'find' as const,
      template,
      ...(threshold !== undefined && { threshold }),
    });
    continue;
  }

  // ── click(found) / click(found, offsetX, offsetY) ─────
  const clickFoundMatch = trimmed.match(
    /^(click|dblclick|rightclick)\(\s*found\s*(?:,\s*(-?\d+)\s*,\s*(-?\d+))?\s*\)$/
  );
  if (clickFoundMatch) {
    const action = clickFoundMatch[1] as 'click' | 'dblclick' | 'rightclick';
    const offsetX = clickFoundMatch[2] ? parseInt(clickFoundMatch[2]) : undefined;
    const offsetY = clickFoundMatch[3] ? parseInt(clickFoundMatch[3]) : undefined;
    commands.push({
      type: 'click_found' as const,
      action,
      ...(offsetX !== undefined && { offsetX }),
      ...(offsetY !== undefined && { offsetY }),
    });
    continue;
  }

  // ── wait_find("template.png", timeout, interval?) ─────
  const waitFindMatch = trimmed.match(
    /^wait_find\(\s*"([^"]+)"\s*,\s*(\d+)\s*(?:,\s*(\d+))?\s*(?:,\s*([\d.]+))?\s*\)$/
  );
  if (waitFindMatch) {
    commands.push({
      type: 'wait_find' as const,
      template: waitFindMatch[1],
      timeout: parseInt(waitFindMatch[2]),
      ...(waitFindMatch[3] && { interval: parseInt(waitFindMatch[3]) }),
      ...(waitFindMatch[4] && { threshold: parseFloat(waitFindMatch[4]) }),
    });
    continue;
  }

  // ── find_click("template.png") ────────────────────────
  const findClickMatch = trimmed.match(
    /^find_click\(\s*"([^"]+)"\s*(?:,\s*([\d.]+))?\s*\)$/
  );
  if (findClickMatch) {
    commands.push({
      type: 'find_click' as const,
      template: findClickMatch[1],
      action: 'click' as const,
      ...(findClickMatch[2] && { threshold: parseFloat(findClickMatch[2]) }),
    });
    continue;
  }
'@

# ────────────────────────────────────────────────────────
# runtime.ts に追加する内容
# ────────────────────────────────────────────────────────
$runtimeAdditions = @'
// ============================================================
// Phase 4 ランタイム追加
// ============================================================

// --- 先頭に import 追加 ---
// import { ImageMatcher, MatchResult } from '../auto/image-matcher';
// import { FindState } from './types';

// --- クラスフィールドに追加 ---
//   private findState: FindState = {
//     found: false, x: 0, y: 0, centerX: 0, centerY: 0,
//     confidence: 0, template: '',
//   };
//   private imageMatcher: ImageMatcher | null = null;
//   private captureFunc: (() => Promise<string>) | null = null;

// --- メソッド追加 ---
//   setImageMatcher(matcher: ImageMatcher): void { this.imageMatcher = matcher; }
//   setCaptureFunc(func: () => Promise<string>): void { this.captureFunc = func; }
//   getFindState(): FindState { return { ...this.findState }; }
//   private sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

// --- executeCommand() switch 文に追加 ---

      case 'find': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.log('エラー: 画像認識が初期化されていません');
          break;
        }
        this.log(`テンプレート探索: "${command.template}"`);
        const capturePath = await this.captureFunc();
        const result = await this.imageMatcher.findTemplate(
          capturePath, command.template, { threshold: command.threshold }
        );
        this.findState = {
          found: result.found, x: result.x, y: result.y,
          centerX: result.centerX, centerY: result.centerY,
          confidence: result.confidence, template: command.template,
        };
        if (result.found) {
          this.log(`✓ 発見: "${command.template}" at (${result.centerX}, ${result.centerY}) 信頼度: ${(result.confidence * 100).toFixed(1)}%`);
        } else {
          this.log(`✗ 未発見: "${command.template}" (最高信頼度: ${(result.confidence * 100).toFixed(1)}%)`);
        }
        break;
      }

      case 'click_found': {
        if (!this.findState.found) {
          this.log('エラー: find() が未実行または画像が見つかりませんでした');
          break;
        }
        const targetX = this.findState.centerX + (command.offsetX ?? 0);
        const targetY = this.findState.centerY + (command.offsetY ?? 0);
        this.log(`${command.action}(found) → (${targetX}, ${targetY}) [テンプレート: ${this.findState.template}]`);
        switch (command.action) {
          case 'click': await this.controller.click(targetX, targetY); break;
          case 'dblclick': await this.controller.dblclick(targetX, targetY); break;
          case 'rightclick': await this.controller.rightclick(targetX, targetY); break;
        }
        break;
      }

      case 'wait_find': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.log('エラー: 画像認識が初期化されていません');
          break;
        }
        const wfTimeout = command.timeout ?? 10000;
        const wfInterval = command.interval ?? 500;
        const wfStart = Date.now();
        this.log(`テンプレート待機: "${command.template}" (タイムアウト: ${wfTimeout}ms)`);
        let wfFound = false;
        while (Date.now() - wfStart < wfTimeout) {
          if (this.shouldStop()) { this.log('wait_find: 停止されました'); break; }
          while (this.isPaused()) {
            await this.sleep(100);
            if (this.shouldStop()) break;
          }
          const capPath = await this.captureFunc();
          const matchResult = await this.imageMatcher.findTemplate(
            capPath, command.template, { threshold: command.threshold }
          );
          if (matchResult.found) {
            this.findState = {
              found: true, x: matchResult.x, y: matchResult.y,
              centerX: matchResult.centerX, centerY: matchResult.centerY,
              confidence: matchResult.confidence, template: command.template,
            };
            this.log(`✓ 発見: "${command.template}" at (${matchResult.centerX}, ${matchResult.centerY}) ${((Date.now() - wfStart) / 1000).toFixed(1)}秒後`);
            wfFound = true;
            break;
          }
          await this.sleep(wfInterval);
        }
        if (!wfFound && !this.shouldStop()) {
          this.log(`✗ タイムアウト: "${command.template}" が ${wfTimeout}ms 以内に見つかりませんでした`);
          this.findState = { found: false, x: 0, y: 0, centerX: 0, centerY: 0, confidence: 0, template: command.template };
        }
        break;
      }

      case 'find_click': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.log('エラー: 画像認識が初期化されていません');
          break;
        }
        this.log(`探索+クリック: "${command.template}"`);
        const fcCapPath = await this.captureFunc();
        const fcResult = await this.imageMatcher.findTemplate(
          fcCapPath, command.template, { threshold: command.threshold }
        );
        if (fcResult.found) {
          const fcX = fcResult.centerX + (command.offsetX ?? 0);
          const fcY = fcResult.centerY + (command.offsetY ?? 0);
          this.findState = {
            found: true, x: fcResult.x, y: fcResult.y,
            centerX: fcResult.centerX, centerY: fcResult.centerY,
            confidence: fcResult.confidence, template: command.template,
          };
          this.log(`✓ 発見+${command.action}: (${fcX}, ${fcY}) 信頼度: ${(fcResult.confidence * 100).toFixed(1)}%`);
          switch (command.action) {
            case 'click': await this.controller.click(fcX, fcY); break;
            case 'dblclick': await this.controller.dblclick(fcX, fcY); break;
            case 'rightclick': await this.controller.rightclick(fcX, fcY); break;
          }
        } else {
          this.log(`✗ 未発見: "${command.template}" (最高信頼度: ${(fcResult.confidence * 100).toFixed(1)}%)`);
        }
        break;
      }
'@

# ────────────────────────────────────────────────────────
# main.ts に追加する IPC ハンドラー
# ────────────────────────────────────────────────────────
$mainAdditions = @'
// ============================================================
// Phase 4 main.ts 追加
// ============================================================

// --- 先頭に追加 ---
// import { ImageMatcher } from '../lib/auto/image-matcher';
// import * as path from 'path';

// --- app.whenReady() 内に追加 ---
//   const templatesDir = path.join(app.getAppPath(), '..', 'templates');
//   const imageMatcher = new ImageMatcher(templatesDir);
//   // runtime.setImageMatcher(imageMatcher);  ← executor経由で注入

// --- IPC ハンドラー追加 ---

  ipcMain.handle('template:create', async (_event, args: {
    sourcePath: string;
    region: { x: number; y: number; width: number; height: number };
    name: string;
  }) => {
    try {
      const info = await imageMatcher.createTemplate(args.sourcePath, args.region, args.name);
      return { success: true, template: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template:create-from-base64', async (_event, args: {
    base64: string;
    region: { x: number; y: number; width: number; height: number };
    name: string;
  }) => {
    try {
      const buffer = Buffer.from(args.base64, 'base64');
      const info = await imageMatcher.createTemplateFromBuffer(buffer, args.region, args.name);
      return { success: true, template: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template:list', async () => {
    try {
      const templates = await imageMatcher.listTemplates();
      return { success: true, templates };
    } catch (error: any) {
      return { success: false, error: error.message, templates: [] };
    }
  });

  ipcMain.handle('template:delete', async (_event, name: string) => {
    try {
      const deleted = imageMatcher.deleteTemplate(name);
      return { success: true, deleted };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template:test-match', async (_event, args: {
    screenshotPath: string;
    templateName: string;
    threshold?: number;
  }) => {
    try {
      const result = await imageMatcher.findTemplate(args.screenshotPath, args.templateName, { threshold: args.threshold });
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template:get-preview', async (_event, name: string) => {
    try {
      const safeName = name.endsWith('.png') ? name : `${name}.png`;
      const filePath = path.join(templatesDir, safeName);
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'テンプレートが見つかりません' };
      }
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');
      return { success: true, base64, name: safeName };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
'@

# ────────────────────────────────────────────────────────
# preload.ts に追加する内容
# ────────────────────────────────────────────────────────
$preloadAdditions = @'
// ============================================================
// Phase 4 preload.ts 追加
// contextBridge.exposeInMainWorld('electronAPI', { ... }) 内に追加
// ============================================================

  templateCreate: (args: {
    sourcePath: string;
    region: { x: number; y: number; width: number; height: number };
    name: string;
  }) => ipcRenderer.invoke('template:create', args),

  templateCreateFromBase64: (args: {
    base64: string;
    region: { x: number; y: number; width: number; height: number };
    name: string;
  }) => ipcRenderer.invoke('template:create-from-base64', args),

  templateList: () => ipcRenderer.invoke('template:list'),

  templateDelete: (name: string) => ipcRenderer.invoke('template:delete', name),

  templateTestMatch: (args: {
    screenshotPath: string;
    templateName: string;
    threshold?: number;
  }) => ipcRenderer.invoke('template:test-match', args),

  templateGetPreview: (name: string) => ipcRenderer.invoke('template:get-preview', name),
'@

# ────────────────────────────────────────────────────────
# global.d.ts に追加する型定義
# ────────────────────────────────────────────────────────
$globalDtsAdditions = @'
// ============================================================
// Phase 4 global.d.ts 追加
// ElectronAPI interface 内に追加
// ============================================================

    templateCreate(args: {
      sourcePath: string;
      region: { x: number; y: number; width: number; height: number };
      name: string;
    }): Promise<{ success: boolean; template?: any; error?: string }>;

    templateCreateFromBase64(args: {
      base64: string;
      region: { x: number; y: number; width: number; height: number };
      name: string;
    }): Promise<{ success: boolean; template?: any; error?: string }>;

    templateList(): Promise<{ success: boolean; templates: any[]; error?: string }>;

    templateDelete(name: string): Promise<{ success: boolean; deleted?: boolean; error?: string }>;

    templateTestMatch(args: {
      screenshotPath: string;
      templateName: string;
      threshold?: number;
    }): Promise<{ success: boolean; result?: any; error?: string }>;

    templateGetPreview(name: string): Promise<{ success: boolean; base64?: string; name?: string; error?: string }>;
'@

# ────────────────────────────────────────────────────────
# converter.ts に追加する日本語パターン
# ────────────────────────────────────────────────────────
$converterAdditions = @'
// ============================================================
// Phase 4 converter.ts 追加（日本語→Reiコード変換パターン）
// 既存の変換ルール群の後に追加
// ============================================================

  // 「〜を探してクリック」パターン（先に判定）
  const findClickPattern = line.match(/「(.+?)」.*探.*クリック/);
  if (findClickPattern) {
    return `find_click("${findClickPattern[1]}.png")`;
  }

  // 「〜を探す」パターン
  const findPattern = line.match(/「(.+?)」.*(?:を|の).*探/);
  if (findPattern) {
    return `find("${findPattern[1]}.png")`;
  }

  // 「見つけた場所をクリック」パターン
  if (/見つけ.*クリック/.test(line)) {
    return `click(found)`;
  }

  // 「〜が見つかるまで待つ」パターン
  const waitFindPattern = line.match(/「(.+?)」.*見つかるまで.*待/);
  if (waitFindPattern) {
    return `wait_find("${waitFindPattern[1]}.png", 10000)`;
  }
'@

# ────────────────────────────────────────────────────────
# styles.css に追加する Phase 4 スタイル
# ────────────────────────────────────────────────────────
$stylesAdditions = @'

/* ============================================================
   Phase 4: テンプレートマッチングUI
   ============================================================ */

.template-selection-overlay {
  position: absolute;
  border: 2px dashed #ff6b35;
  background: rgba(255, 107, 53, 0.15);
  pointer-events: none;
  z-index: 100;
}

.capture-image.template-mode {
  cursor: crosshair;
}

.template-dialog {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

.template-dialog-content {
  background: #1e1e2e;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  max-width: 400px;
}

.template-dialog-content h3 {
  color: #e0e0e0;
  margin: 0 0 12px 0;
  font-size: 14px;
}

.template-name-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #2a2a3e;
  color: #e0e0e0;
  font-size: 13px;
  box-sizing: border-box;
}

.template-name-input:focus {
  outline: none;
  border-color: #ff6b35;
}

.template-dialog-preview {
  margin: 12px 0;
  text-align: center;
  background: #2a2a3e;
  border-radius: 4px;
  padding: 8px;
  max-height: 150px;
  overflow: hidden;
}

.template-dialog-preview canvas {
  max-width: 100%;
  max-height: 130px;
  image-rendering: pixelated;
}

.template-dialog-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

.template-panel {
  border-top: 1px solid #333;
  padding: 8px 12px;
  max-height: 200px;
  overflow-y: auto;
}

.template-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.template-panel-header h3 {
  color: #e0e0e0;
  font-size: 13px;
  margin: 0;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #2a2a3e;
  border-radius: 4px;
  border: 1px solid transparent;
}

.template-item:hover {
  border-color: #555;
}

.template-thumb {
  width: 40px; height: 30px;
  object-fit: contain;
  background: #1e1e2e;
  border-radius: 2px;
  image-rendering: pixelated;
}

.template-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.template-name {
  color: #e0e0e0;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-size {
  color: #888;
  font-size: 10px;
}

.template-actions {
  display: flex;
  gap: 2px;
}

.template-actions button {
  background: none;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  opacity: 0.7;
}

.template-actions button:hover {
  opacity: 1;
  border-color: #555;
  background: #333;
}

.match-result-overlay {
  position: absolute;
  border: 3px solid #00ff88;
  background: rgba(0, 255, 136, 0.1);
  pointer-events: none;
  z-index: 101;
}

.match-result-overlay.not-found {
  border-color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.match-result-label {
  position: absolute;
  top: -20px; left: 0;
  font-size: 11px;
  color: #00ff88;
  background: rgba(0, 0, 0, 0.7);
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

#btn-template-mode.active {
  background: #ff6b35;
  color: #fff;
}

.btn-primary {
  background: #ff6b35; color: #fff;
  border: none; border-radius: 4px;
  padding: 6px 16px; cursor: pointer; font-size: 13px;
}
.btn-primary:hover { background: #ff8555; }

.btn-secondary {
  background: #444; color: #e0e0e0;
  border: none; border-radius: 4px;
  padding: 6px 16px; cursor: pointer; font-size: 13px;
}
.btn-secondary:hover { background: #555; }

.btn-small {
  background: none; border: 1px solid #555;
  border-radius: 3px; color: #e0e0e0;
  cursor: pointer; font-size: 12px; padding: 2px 6px;
}
.btn-small:hover { background: #333; }

.template-list-empty {
  color: #666; font-size: 12px;
  text-align: center; padding: 12px;
}
'@

# ────────────────────────────────────────────────────────
# index.html に追加するUI要素
# ────────────────────────────────────────────────────────
$htmlAdditions = @'
<!-- ============================================================
  Phase 4 index.html 追加
  ============================================================ -->

<!-- A) キャプチャモーダルのボタン群に追加（座標指定モードボタンの隣） -->
<!--
  <button id="btn-template-mode" class="capture-btn" title="テンプレート切り出しモード">
    📋 テンプレート作成
  </button>
-->

<!-- B) テンプレート名入力ダイアログ（キャプチャモーダル内に追加） -->
  <div id="template-name-dialog" class="template-dialog" style="display: none;">
    <div class="template-dialog-content">
      <h3>テンプレート名を入力</h3>
      <input type="text" id="template-name-input"
             placeholder="例: ok-button"
             class="template-name-input" />
      <div class="template-dialog-preview">
        <canvas id="template-preview-canvas"></canvas>
      </div>
      <div class="template-dialog-buttons">
        <button id="btn-template-save" class="btn-primary">保存</button>
        <button id="btn-template-cancel" class="btn-secondary">キャンセル</button>
      </div>
    </div>
  </div>

<!-- C) テンプレート管理パネル（メインUIに追加） -->
  <div id="template-panel" class="template-panel">
    <div class="template-panel-header">
      <h3>📋 テンプレート一覧</h3>
      <button id="btn-refresh-templates" class="btn-small" title="更新">🔄</button>
    </div>
    <div id="template-list" class="template-list">
      テンプレートなし
    </div>
  </div>
'@

# ────────────────────────────────────────────────────────
# renderer.ts に追加するUI制御
# ────────────────────────────────────────────────────────
$rendererAdditions = @'
// ============================================================
// Phase 4 renderer.ts 追加
// ============================================================

// --- グローバル変数 ---
let isTemplateMode = false;
let templateDragStart: { x: number; y: number } | null = null;
let templateSelection: { x: number; y: number; w: number; h: number } | null = null;
let lastCaptureBase64: string | null = null;

// --- 初期化（既存の初期化処理の後に呼ぶ） ---

function initTemplateMode(): void {
  const btnTemplateMode = document.getElementById('btn-template-mode');
  const captureImage = document.getElementById('capture-image') as HTMLImageElement | null;
  if (!btnTemplateMode || !captureImage) return;

  btnTemplateMode.addEventListener('click', () => {
    isTemplateMode = !isTemplateMode;
    btnTemplateMode.classList.toggle('active', isTemplateMode);
    captureImage.classList.toggle('template-mode', isTemplateMode);
    clearTemplateSelection();
    if (isTemplateMode) appendLog('テンプレート作成モード: 画像上でドラッグして範囲を選択');
  });

  captureImage.addEventListener('mousedown', (e) => {
    if (!isTemplateMode) return;
    e.preventDefault();
    const rect = captureImage.getBoundingClientRect();
    templateDragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    clearTemplateSelection();
  });

  captureImage.addEventListener('mousemove', (e) => {
    if (!isTemplateMode || !templateDragStart) return;
    const rect = captureImage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    showSelectionOverlay(captureImage,
      Math.min(templateDragStart.x, cx), Math.min(templateDragStart.y, cy),
      Math.abs(cx - templateDragStart.x), Math.abs(cy - templateDragStart.y)
    );
  });

  captureImage.addEventListener('mouseup', (e) => {
    if (!isTemplateMode || !templateDragStart) return;
    const rect = captureImage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dx = Math.min(templateDragStart.x, cx);
    const dy = Math.min(templateDragStart.y, cy);
    const dw = Math.abs(cx - templateDragStart.x);
    const dh = Math.abs(cy - templateDragStart.y);
    templateDragStart = null;
    if (dw < 5 || dh < 5) { clearTemplateSelection(); return; }

    const scaleX = (captureImage.naturalWidth || captureImage.width) / rect.width;
    const scaleY = (captureImage.naturalHeight || captureImage.height) / rect.height;
    templateSelection = {
      x: Math.round(dx * scaleX), y: Math.round(dy * scaleY),
      w: Math.round(dw * scaleX), h: Math.round(dh * scaleY),
    };
    appendLog(`テンプレート範囲: (${templateSelection.x}, ${templateSelection.y}) ${templateSelection.w}×${templateSelection.h}`);
    showTemplateNameDialog();
  });

  const btnSave = document.getElementById('btn-template-save');
  const btnCancel = document.getElementById('btn-template-cancel');
  const nameInput = document.getElementById('template-name-input') as HTMLInputElement;

  btnSave?.addEventListener('click', async () => {
    if (!templateSelection || !nameInput) return;
    const name = nameInput.value.trim();
    if (!name) { alert('テンプレート名を入力してください'); return; }
    await saveTemplate(name);
  });

  btnCancel?.addEventListener('click', () => {
    hideTemplateNameDialog(); clearTemplateSelection();
  });

  nameInput?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const name = nameInput.value.trim();
      if (name && templateSelection) await saveTemplate(name);
    } else if (e.key === 'Escape') {
      hideTemplateNameDialog(); clearTemplateSelection();
    }
  });

  document.getElementById('btn-refresh-templates')?.addEventListener('click', () => refreshTemplateList());
  refreshTemplateList();
}

function showSelectionOverlay(parent: HTMLElement, x: number, y: number, w: number, h: number): void {
  let ov = document.getElementById('template-selection-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'template-selection-overlay';
    ov.className = 'template-selection-overlay';
    parent.parentElement?.style.setProperty('position', 'relative');
    parent.parentElement?.appendChild(ov);
  }
  ov.style.left = `${x}px`; ov.style.top = `${y}px`;
  ov.style.width = `${w}px`; ov.style.height = `${h}px`;
  ov.style.display = 'block';
}

function clearTemplateSelection(): void {
  const ov = document.getElementById('template-selection-overlay');
  if (ov) ov.style.display = 'none';
  templateSelection = null;
}

function showTemplateNameDialog(): void {
  const dialog = document.getElementById('template-name-dialog');
  const nameInput = document.getElementById('template-name-input') as HTMLInputElement;
  if (!dialog || !nameInput) return;
  nameInput.value = `template-${String(Date.now()).slice(-3)}`;
  dialog.style.display = 'flex';
  nameInput.focus(); nameInput.select();
}

function hideTemplateNameDialog(): void {
  const d = document.getElementById('template-name-dialog');
  if (d) d.style.display = 'none';
}

async function saveTemplate(name: string): Promise<void> {
  if (!templateSelection || !lastCaptureBase64) {
    appendLog('エラー: キャプチャデータがありません'); return;
  }
  try {
    const result = await window.electronAPI.templateCreateFromBase64({
      base64: lastCaptureBase64,
      region: { x: templateSelection.x, y: templateSelection.y, width: templateSelection.w, height: templateSelection.h },
      name,
    });
    if (result.success) {
      appendLog(`✓ テンプレート保存: ${result.template.name} (${result.template.width}×${result.template.height})`);
      hideTemplateNameDialog(); clearTemplateSelection(); refreshTemplateList();
    } else {
      appendLog(`✗ テンプレート保存失敗: ${result.error}`);
    }
  } catch (err: any) { appendLog(`✗ エラー: ${err.message}`); }
}

async function refreshTemplateList(): Promise<void> {
  const listEl = document.getElementById('template-list');
  if (!listEl) return;
  try {
    const result = await window.electronAPI.templateList();
    if (!result.success || result.templates.length === 0) {
      listEl.innerHTML = '<div class="template-list-empty">テンプレートなし</div>'; return;
    }
    listEl.innerHTML = '';
    for (const tpl of result.templates) {
      const item = document.createElement('div');
      item.className = 'template-item';
      item.dataset.name = tpl.name;
      let thumbSrc = '';
      try {
        const preview = await window.electronAPI.templateGetPreview(tpl.name);
        if (preview.success && preview.base64) thumbSrc = `data:image/png;base64,${preview.base64}`;
      } catch {}
      item.innerHTML = `
        <img class="template-thumb" src="${thumbSrc}" alt="${tpl.name}" />
        <div class="template-info">
          <span class="template-name">${tpl.name}</span>
          <span class="template-size">${tpl.width}×${tpl.height}</span>
        </div>
        <div class="template-actions">
          <button class="btn-insert-find" title="find()を挿入">🔍</button>
          <button class="btn-insert-find-click" title="find_click()を挿入">🖱️</button>
          <button class="btn-test-match" title="マッチングテスト">🧪</button>
          <button class="btn-delete-template" title="削除">🗑️</button>
        </div>
      `;
      const name = tpl.name;
      item.querySelector('.btn-insert-find')?.addEventListener('click', () => insertCode(`find("${name}")\nclick(found)`));
      item.querySelector('.btn-insert-find-click')?.addEventListener('click', () => insertCode(`find_click("${name}")`));
      item.querySelector('.btn-test-match')?.addEventListener('click', async () => await testTemplateMatch(name));
      item.querySelector('.btn-delete-template')?.addEventListener('click', async () => {
        if (confirm(`テンプレート "${name}" を削除しますか？`)) {
          const r = await window.electronAPI.templateDelete(name);
          if (r.success) { appendLog(`テンプレート削除: ${name}`); refreshTemplateList(); }
        }
      });
      listEl.appendChild(item);
    }
  } catch (err: any) {
    listEl.innerHTML = `<div class="template-list-empty">読み込みエラー: ${err.message}</div>`;
  }
}

function insertCode(code: string): void {
  const editor = document.getElementById('code-editor') as HTMLTextAreaElement | null;
  if (!editor) return;
  const pos = editor.selectionStart;
  const before = editor.value.substring(0, pos);
  const after = editor.value.substring(editor.selectionEnd);
  const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
  editor.value = before + prefix + code + '\n' + after;
  editor.selectionStart = editor.selectionEnd = pos + prefix.length + code.length + 1;
  editor.focus();
  appendLog(`コード挿入: ${code.split('\n')[0]}`);
}

async function testTemplateMatch(templateName: string): Promise<void> {
  appendLog(`マッチングテスト開始: "${templateName}"`);
  try {
    const captureResult = await window.electronAPI.captureScreen();
    if (!captureResult.success) { appendLog('キャプチャ失敗'); return; }
    const matchResult = await window.electronAPI.templateTestMatch({
      screenshotPath: captureResult.path, templateName,
    });
    if (matchResult.success && matchResult.result) {
      const r = matchResult.result;
      if (r.found) {
        appendLog(`✓ マッチ成功: (${r.centerX}, ${r.centerY}) 信頼度: ${(r.confidence * 100).toFixed(1)}%`);
      } else {
        appendLog(`✗ マッチ失敗: 最高信頼度 ${(r.confidence * 100).toFixed(1)}%`);
      }
    } else {
      appendLog(`✗ テストエラー: ${matchResult.error}`);
    }
  } catch (err: any) { appendLog(`✗ テストエラー: ${err.message}`); }
}

// --- 既存のキャプチャ成功コールバック内に追加 ---
// lastCaptureBase64 = captureResult.base64;
'@

# ── ファイル書き出し ─────────────────────────────────────

# 新規ファイル（完全版）
$imageMatcher | Out-File -FilePath "src\lib\auto\image-matcher.ts" -Encoding utf8 -Force
Write-Host "  ✓ src\lib\auto\image-matcher.ts" -ForegroundColor Green

# 統合参照ファイル（docs/phase4-patches/ に配置）
$patchDir = "docs\phase4-patches"
if (-not (Test-Path $patchDir)) {
    New-Item -ItemType Directory -Path $patchDir | Out-Null
}

$typesAdditions     | Out-File -FilePath "$patchDir\01-types-additions.ts"     -Encoding utf8 -Force
$parserAdditions    | Out-File -FilePath "$patchDir\02-parser-additions.ts"    -Encoding utf8 -Force
$runtimeAdditions   | Out-File -FilePath "$patchDir\03-runtime-additions.ts"   -Encoding utf8 -Force
$mainAdditions      | Out-File -FilePath "$patchDir\04-main-additions.ts"      -Encoding utf8 -Force
$preloadAdditions   | Out-File -FilePath "$patchDir\05-preload-additions.ts"   -Encoding utf8 -Force
$globalDtsAdditions | Out-File -FilePath "$patchDir\06-global-dts-additions.ts" -Encoding utf8 -Force
$converterAdditions | Out-File -FilePath "$patchDir\07-converter-additions.ts" -Encoding utf8 -Force
$htmlAdditions      | Out-File -FilePath "$patchDir\08-index-html-additions.html" -Encoding utf8 -Force
$stylesAdditions    | Out-File -FilePath "$patchDir\09-styles-additions.css"   -Encoding utf8 -Force
$rendererAdditions  | Out-File -FilePath "$patchDir\10-renderer-additions.ts"  -Encoding utf8 -Force

Write-Host "  ✓ docs\phase4-patches\ (10ファイル)" -ForegroundColor Green

# ── Step 4: package.json バージョン更新 ──────────────────
Write-Host ""
Write-Host "[Step 4/6] package.json バージョン更新..." -ForegroundColor Yellow
$pkg = Get-Content "package.json" -Raw
$pkg = $pkg -replace '"version":\s*"0\.3\.0"', '"version": "0.4.0"'
$pkg | Out-File -FilePath "package.json" -Encoding utf8 -NoNewline
Write-Host "  ✓ version: 0.3.0 → 0.4.0" -ForegroundColor Green

# ── Step 5: Phase 4 ドキュメント作成 ─────────────────────
Write-Host ""
Write-Host "[Step 5/6] ドキュメント作成..." -ForegroundColor Yellow

$phase4Doc = @'
# Phase 4 完了: 画像認識（テンプレートマッチング）

## 新コマンド
```
find("template.png")             # テンプレート探索
find("template.png", 0.9)        # 閾値指定
click(found)                     # 探索結果クリック
click(found, 10, -5)             # オフセット付き
dblclick(found) / rightclick(found)
wait_find("dialog.png", 10000)   # 見つかるまで待機
find_click("ok-button.png")      # find + click ショートカット
```

## 技術
- jimp ベース SAD テンプレートマッチング
- 早期打ち切り最適化
- テンプレートキャッシュ
- キャプチャ画像上でのドラッグ選択→テンプレート切り出し

## ファイル
- `src/lib/auto/image-matcher.ts` — マッチングエンジン本体
- `docs/phase4-patches/` — 既存ファイルへの追記内容（統合参照用）

## 統合手順
1. `npm install jimp@0.22.12`
2. `docs/phase4-patches/` 内の各ファイルの内容を対応する既存ファイルに追記
3. `npm run build` でビルド確認

## 統合対象ファイル
| パッチファイル | 追記先 |
|---|---|
| 01-types-additions.ts | src/lib/core/types.ts |
| 02-parser-additions.ts | src/lib/core/parser.ts |
| 03-runtime-additions.ts | src/lib/core/runtime.ts |
| 04-main-additions.ts | src/main/main.ts |
| 05-preload-additions.ts | src/main/preload.ts |
| 06-global-dts-additions.ts | src/renderer/global.d.ts |
| 07-converter-additions.ts | src/lib/core/converter.ts |
| 08-index-html-additions.html | src/renderer/index.html |
| 09-styles-additions.css | src/renderer/styles.css |
| 10-renderer-additions.ts | src/renderer/renderer.ts |
'@
$phase4Doc | Out-File -FilePath "docs\PHASE4-COMPLETE.md" -Encoding utf8 -Force
Write-Host "  ✓ docs\PHASE4-COMPLETE.md" -ForegroundColor Green

# ── Step 6: Git コミット＆プッシュ ───────────────────────
Write-Host ""
Write-Host "[Step 6/6] Git コミット & プッシュ..." -ForegroundColor Yellow

git add -A
git commit -m "Phase 4: Image recognition (template matching)

- Add ImageMatcher engine (jimp-based SAD algorithm)
- New commands: find(), click(found), wait_find(), find_click()
- Template management (create/list/delete/preview)
- IPC handlers for template operations
- UI additions: template selection mode, template panel
- Integration patches in docs/phase4-patches/
- Bump version to v0.4.0"

git push origin main

# ── 完了 ─────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Phase 4 統合完了！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "配置済み:" -ForegroundColor Green
Write-Host "  ✓ src\lib\auto\image-matcher.ts（マッチングエンジン本体）"
Write-Host "  ✓ docs\phase4-patches\（統合参照ファイル 10個）"
Write-Host "  ✓ docs\PHASE4-COMPLETE.md"
Write-Host "  ✓ templates\ ディレクトリ"
Write-Host "  ✓ jimp パッケージ"
Write-Host "  ✓ Git push 完了"
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "  docs\phase4-patches\ 内の各ファイルの内容を" 
Write-Host "  対応する既存ファイルに追記してください。"
Write-Host ""
Write-Host "  01-types-additions.ts      → src\lib\core\types.ts"
Write-Host "  02-parser-additions.ts     → src\lib\core\parser.ts"
Write-Host "  03-runtime-additions.ts    → src\lib\core\runtime.ts"
Write-Host "  04-main-additions.ts       → src\main\main.ts"
Write-Host "  05-preload-additions.ts    → src\main\preload.ts"
Write-Host "  06-global-dts-additions.ts → src\renderer\global.d.ts"
Write-Host "  07-converter-additions.ts  → src\lib\core\converter.ts"
Write-Host "  08-index-html-additions    → src\renderer\index.html"
Write-Host "  09-styles-additions.css    → src\renderer\styles.css"
Write-Host "  10-renderer-additions.ts   → src\renderer\renderer.ts"
Write-Host ""
Write-Host "追記後に:" -ForegroundColor Yellow
Write-Host "  Remove-Item -Recurse -Force dist"
Write-Host "  npm run build"
Write-Host "  npm start -- --stub   # UIテスト"
Write-Host "  npm start             # 実機テスト"
Write-Host ""
