/**
 * main-phase4-additions.ts — Phase 4で main.ts に追加するIPC処理
 *
 * 【統合方法】
 * 1. main.ts の先頭に import を追加
 * 2. app.whenReady() 内で ImageMatcher を初期化
 * 3. IPC ハンドラーを登録
 * 4. executor.ts 経由で runtime に ImageMatcher を注入
 */

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. main.ts 先頭に追加する import:

import { ImageMatcher } from '../lib/auto/image-matcher';
import * as path from 'path';

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. app.whenReady() 内に追加する初期化コード:

  // テンプレート画像の保存先
  const templatesDir = path.join(app.getAppPath(), '..', 'templates');
  const imageMatcher = new ImageMatcher(templatesDir);

  // runtime に ImageMatcher を注入
  // (executor.ts 経由で runtime.setImageMatcher(imageMatcher) を呼ぶ)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. IPC ハンドラー（既存の ipcMain.handle 群の後に追加）:
*/

/*

  // ── Phase 4: テンプレート作成（キャプチャ画像から切り出し） ──
  ipcMain.handle('template:create', async (_event, args: {
    sourcePath: string;
    region: { x: number; y: number; width: number; height: number };
    name: string;
  }) => {
    try {
      const info = await imageMatcher.createTemplate(
        args.sourcePath,
        args.region,
        args.name
      );
      return { success: true, template: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Phase 4: テンプレート作成（Base64から） ────────────
  ipcMain.handle('template:create-from-base64', async (_event, args: {
    base64: string;
    region: { x: number; y: number; width: number; height: number };
    name: string;
  }) => {
    try {
      const buffer = Buffer.from(args.base64, 'base64');
      const info = await imageMatcher.createTemplateFromBuffer(
        buffer,
        args.region,
        args.name
      );
      return { success: true, template: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Phase 4: テンプレート一覧取得 ──────────────────────
  ipcMain.handle('template:list', async () => {
    try {
      const templates = await imageMatcher.listTemplates();
      return { success: true, templates };
    } catch (error: any) {
      return { success: false, error: error.message, templates: [] };
    }
  });

  // ── Phase 4: テンプレート削除 ──────────────────────────
  ipcMain.handle('template:delete', async (_event, name: string) => {
    try {
      const deleted = imageMatcher.deleteTemplate(name);
      return { success: true, deleted };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Phase 4: テンプレートマッチングテスト（UI上で確認用） ──
  ipcMain.handle('template:test-match', async (_event, args: {
    screenshotPath: string;
    templateName: string;
    threshold?: number;
  }) => {
    try {
      const result = await imageMatcher.findTemplate(
        args.screenshotPath,
        args.templateName,
        { threshold: args.threshold }
      );
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ── Phase 4: テンプレート画像のBase64取得（プレビュー用） ──
  ipcMain.handle('template:get-preview', async (_event, name: string) => {
    try {
      const fs = require('fs');
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

*/

export {}; // TypeScriptモジュールとして認識させるため
