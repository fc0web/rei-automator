// ============================================================
// Phase 4 main.ts 追加
// ============================================================

// --- 先頭に追加 ---
// import { ImageMatcher } from '../lib/auto/image-matcher';
// import * as path from 'path';

// --- app.whenReady() 内に追加 ---
//   const templatesDir = path.join(app.getAppPath(), '..', 'templates');
//   const imageMatcher = new ImageMatcher(templatesDir);
//   // runtime.setImageMatcher(imageMatcher);  // executor経由で注入

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
      const safeName = name.endsWith('.png') ? name : name + '.png';
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
