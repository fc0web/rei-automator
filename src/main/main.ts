/**
 * Rei Automator - Main Process
 * Electron メインプロセス
 */

import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import { ReiExecutor } from './executor';
import { FileManager } from './file-manager';
import { ScreenCapture } from './screen-capture';
import { convertJapaneseToRei, convertWithClaudeAPI } from '../lib/core/converter';
import { ImageMatcher } from '../lib/auto/image-matcher';

let mainWindow: BrowserWindow | null = null;
let executor: ReiExecutor | null = null;
let fileManager: FileManager | null = null;
let screenCapture: ScreenCapture | null = null;
let imageMatcher: ImageMatcher | null = null;

/**
 * メインウィンドウを作成
 */
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Rei Automator v0.3',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  if (executor) {
    executor.setWindow(mainWindow);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * ESCキーで緊急停止
 */
function registerGlobalShortcuts(): void {
  globalShortcut.register('Escape', () => {
    if (executor && executor.isRunning()) {
      console.log('[Main] ESC pressed - Emergency stop!');
      executor.stop();
    }
  });
}

/**
 * IPC ハンドラー
 */
function setupIpcHandlers(): void {
  // コード実行
  ipcMain.handle('execute-code', async (_event, code: string) => {
    if (!executor) {
      return { success: false, error: 'Executor not initialized' };
    }
    if (executor.isRunning()) {
      return { success: false, error: '既に実行中です' };
    }

    // 非同期実行（UIをブロックしない）
    executor.execute(code).then((result) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('execution-complete', result);
      }
    }).catch((error) => {
      console.error('[Main] Execution error:', error);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('execution-complete', {
          success: false,
          error: error.message,
          executedLines: 0,
          totalTime: 0,
        });
      }
    });

    return { success: true, message: 'Execution started' };
  });

  // 停止
  ipcMain.handle('stop-execution', async () => {
    if (executor) {
      executor.stop();
      return { success: true };
    }
    return { success: false };
  });

  // 一時停止
  ipcMain.handle('pause-execution', async () => {
    if (executor) { executor.pause(); return { success: true }; }
    return { success: false };
  });

  // 再開
  ipcMain.handle('resume-execution', async () => {
    if (executor) { executor.resume(); return { success: true }; }
    return { success: false };
  });

  // ファイルダイアログで保存
  ipcMain.handle('save-script-dialog', async (_event, code: string) => {
    if (!fileManager || !mainWindow) return { success: false };
    return fileManager.saveWithDialog(code, mainWindow);
  });

  // ファイルダイアログで読み込み
  ipcMain.handle('load-script-dialog', async () => {
    if (!fileManager || !mainWindow) return { success: false };
    return fileManager.loadWithDialog(mainWindow);
  });

  // 日本語→Reiコード変換（ルールベース）
  ipcMain.handle('convert-japanese', async (_event, text: string) => {
    try {
      const code = convertJapaneseToRei(text);
      return { success: true, code };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 日本語→Reiコード変換（Claude API）
  ipcMain.handle('convert-japanese-api', async (_event, text: string, apiKey: string) => {
    try {
      const code = await convertWithClaudeAPI(text, apiKey);
      return { success: true, code };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 直接保存
  ipcMain.handle('save-script', async (_event, filename: string, code: string) => {
    if (!fileManager) return { success: false };
    return fileManager.saveScript(filename, code);
  });

  // 直接読み込み
  ipcMain.handle('load-script', async (_event, filename: string) => {
    if (!fileManager) return { success: false };
    return fileManager.loadScript(filename);
  });

  // スクリプト一覧
  ipcMain.handle('list-scripts', async () => {
    if (!fileManager) return [];
    return fileManager.listScripts();
  });

  // ========== Phase 3: 画面キャプチャ ==========

  // 画面キャプチャ（ウィンドウを一時非表示にしてキャプチャ）
  ipcMain.handle('capture-screen', async () => {
    if (!screenCapture || !mainWindow) {
      return { success: false, error: 'ScreenCapture not initialized' };
    }

    // ウィンドウを一時的に非表示
    mainWindow.hide();
    await new Promise((r) => setTimeout(r, 300));

    const result = await screenCapture.captureAndSave();

    // ウィンドウを再表示
    mainWindow.show();
    mainWindow.focus();

    return result;
  });

  // 保存済みキャプチャ一覧
  ipcMain.handle('list-captures', async () => {
    if (!screenCapture) return [];
    return screenCapture.listCaptures();
  });

  // キャプチャ画像を読み込み
  ipcMain.handle('load-capture', async (_event, filename: string) => {
    if (!screenCapture) return { success: false };
    return screenCapture.loadCapture(filename);
  });

  // ── Phase 4: テンプレート管理 IPC ─────────────────────

  ipcMain.handle('template:create', async (_event, args: {
    sourcePath: string;
    region: { x: number; y: number; width: number; height: number };
    name: string;
  }) => {
    try {
      if (!imageMatcher) return { success: false, error: '未初期化' };
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
      if (!imageMatcher) return { success: false, error: '未初期化' };
      const buffer = Buffer.from(args.base64, 'base64');
      const info = await imageMatcher.createTemplateFromBuffer(buffer, args.region, args.name);
      return { success: true, template: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template:list', async () => {
    try {
      if (!imageMatcher) return { success: false, error: '未初期化', templates: [] };
      const templates = await imageMatcher.listTemplates();
      return { success: true, templates };
    } catch (error: any) {
      return { success: false, error: error.message, templates: [] };
    }
  });

  ipcMain.handle('template:delete', async (_event, name: string) => {
    try {
      if (!imageMatcher) return { success: false, error: '未初期化' };
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
      if (!imageMatcher) return { success: false, error: '未初期化' };
      const result = await imageMatcher.findTemplate(
        args.screenshotPath, args.templateName, { threshold: args.threshold }
      );
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template:get-preview', async (_event, name: string) => {
    try {
      const fs = require('fs');
      const templatesDir = path.join(app.getAppPath(), '..', 'templates');
      const safeName = name.endsWith('.png') ? name : `${name}.png`;
      const filePath = path.join(templatesDir, safeName);
      if (!fs.existsSync(filePath)) return { success: false, error: 'テンプレートが見つかりません' };
      const buffer = fs.readFileSync(filePath);
      return { success: true, base64: buffer.toString('base64'), name: safeName };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

// アプリ起動
﻿  // ========== Phase 6 ==========
  const { ScriptManager } = require('../lib/core/script-manager');
  const { Logger } = require('../lib/core/logger');
  const { ErrorHandler } = require('../lib/core/error-handler');
  const { scanParams } = require('../lib/core/variables');
  const scriptManager = new ScriptManager();
  const logger = new Logger();
  const errorHandler = new ErrorHandler(logger);
  logger.onLog = (entry: any) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('log:entry', entry); };
  logger.onStepPause = (entry: any) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('log:step-pause', entry); };
  ipcMain.handle('script:save', async (_e, name, content, tags, id) => scriptManager.saveScript(name, content, tags, id));
  ipcMain.handle('script:load', async (_e, id) => scriptManager.loadScript(id));
  ipcMain.handle('script:delete', async (_e, id) => scriptManager.deleteScript(id));
  ipcMain.handle('script:list', async () => scriptManager.listScripts());
  ipcMain.handle('script:history', async (_e, scriptId) => scriptManager.getHistory(scriptId));
  ipcMain.handle('script:record-execution', async (_e, id, duration, success, errorMsg) => scriptManager.recordExecution(id, duration, success, errorMsg));
  ipcMain.handle('script:scan-params', async (_e, cnt) => scanParams(cnt));
  ipcMain.handle('script:export', async (_e, id, destPath) => scriptManager.exportScript(id, destPath));
  ipcMain.handle('script:import', async (_e, srcPath, name) => scriptManager.importScript(srcPath, name));
  ipcMain.handle('log:start-session', async (_e, scriptName) => logger.startSession(scriptName));
  ipcMain.handle('log:end-session', async (_e, success) => logger.endSession(success));
  ipcMain.handle('log:get-current', async () => logger.getRecentLogs(200));
  ipcMain.handle('log:export-text', async () => logger.exportLogsAsText());
  ipcMain.handle('log:set-step-mode', async (_e, enabled) => logger.setStepMode(enabled));
  ipcMain.handle('log:step-next', async () => logger.stepNext());
  ipcMain.handle('log:step-continue', async () => logger.stepContinue());
  ipcMain.handle('error:set-policy', async (_e, policy) => { if (policy==='stop'||policy==='skip') { errorHandler.setGlobalPolicy(policy); } else if (policy.startsWith('retry:')) { errorHandler.setGlobalPolicy({retry:parseInt(policy.split(':')[1],10)}); } });
  ipcMain.handle('error:get-errors', async () => errorHandler.getErrors());
  ipcMain.handle('error:clear', async () => errorHandler.clearErrors());
  ipcMain.handle('dialog:save-file', async (_e, defaultName) => { if (!mainWindow) return null; const {dialog} = require('electron'); const r = await dialog.showSaveDialog(mainWindow, {defaultPath:defaultName, filters:[{name:'Rei Script',extensions:['rei','txt']}]}); return r.canceled ? null : r.filePath; });
  ipcMain.handle('dialog:open-file', async () => { if (!mainWindow) return null; const {dialog} = require('electron'); const r = await dialog.showOpenDialog(mainWindow, {filters:[{name:'Rei Script',extensions:['rei','txt']}],properties:['openFile']}); return r.canceled ? null : r.filePaths[0]; });

  // ========== Phase 7: スケジューラー ==========
  const { Scheduler } = require('../lib/core/scheduler');
  const scheduler = new Scheduler();

  // スケジュール実行コールバック: scriptId からスクリプトを読み込んで実行
  scheduler.setExecutor(async (scriptId: string, scheduleName: string) => {
    const script = scriptManager.loadScript(scriptId);
    if (!script) return { success: false, error: 'スクリプトが見つかりません' };
    if (!executor) return { success: false, error: 'Executor未初期化' };
    if (executor.isRunning()) return { success: false, error: '別のスクリプトが実行中です' };

    console.log(`[Scheduler] Running "${scheduleName}" → script "${script.name}"`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('schedule:running', { scheduleName, scriptName: script.name });
    }

    const result = await executor.execute(script.content);
    scriptManager.recordExecution(scriptId, result.totalTime, result.success, result.error);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('execution-complete', result);
    }
    return { success: result.success, error: result.error };
  });

  // スケジュール通知コールバック
  scheduler.setNotifier((schedule: any, event: string, detail?: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('schedule:event', { scheduleId: schedule.id, name: schedule.name, event, detail });
    }
  });

  // スケジューラー IPC
  ipcMain.handle('schedule:list', async () => scheduler.list());
  ipcMain.handle('schedule:create', async (_e, params) => scheduler.create(params));
  ipcMain.handle('schedule:update', async (_e, id, params) => scheduler.update(id, params));
  ipcMain.handle('schedule:delete', async (_e, id) => scheduler.delete(id));
  ipcMain.handle('schedule:toggle', async (_e, id) => scheduler.toggle(id));

app.whenReady().then(() => {
  const useStub = process.argv.includes('--stub');
  executor = new ReiExecutor(useStub);
  fileManager = new FileManager();
  screenCapture = new ScreenCapture();

  // Phase 4: ImageMatcher 初期化
  const templatesDir = path.join(app.getAppPath(), '..', 'templates');
  imageMatcher = new ImageMatcher(templatesDir);
  // runtime に注入（executor経由）
  if (executor && screenCapture) {
    executor.setImageMatcher(imageMatcher);
  executor.setLogger(logger);
  executor.setErrorHandler(errorHandler);
    executor.setCaptureFunc(async () => {
      const r = await screenCapture!.captureAndSave();
      if (!r.success || !r.savedPath) throw new Error('キャプチャ失敗');
      return r.savedPath;
    });
  }

  setupIpcHandlers();
  createMainWindow();
  registerGlobalShortcuts();
  scheduler.startAll();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  scheduler.stopAll();
  if (executor && executor.isRunning()) executor.stop();
});
