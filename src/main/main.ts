/**
 * Rei Automator - Main Process
 * Electron メインプロセス
 * i18n 対応版
 */

import { app, BrowserWindow, ipcMain, globalShortcut, Menu, shell } from 'electron';
import * as path from 'path';
import { ReiExecutor } from './executor';
import { FileManager } from './file-manager';
import { ScreenCapture } from './screen-capture';
import { convertJapaneseToRei, convertWithClaudeAPI } from '../lib/core/converter';
import { ImageMatcher } from '../lib/auto/image-matcher';
// ── i18n ──
import i18n, { t } from '../i18n';

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
    title: `Rei Automator v0.4`,
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
      return { success: false, error: t('error.executionFailed', { message: 'Already running' }) };
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
  ipcMain.handle('capture-screen', async () => {
    if (!screenCapture || !mainWindow) {
      return { success: false, error: 'ScreenCapture not initialized' };
    }
    mainWindow.hide();
    await new Promise((r) => setTimeout(r, 300));
    const result = await screenCapture.captureAndSave();
    mainWindow.show();
    mainWindow.focus();
    return result;
  });

  ipcMain.handle('list-captures', async () => {
    if (!screenCapture) return [];
    return screenCapture.listCaptures();
  });

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
      if (!imageMatcher) return { success: false, error: t('error.executionFailed', { message: 'Not initialized' }) };
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
      if (!imageMatcher) return { success: false, error: 'Not initialized' };
      const info = await imageMatcher.createTemplateFromBuffer(Buffer.from(args.base64, "base64"), args.region, args.name);
      return { success: true, template: info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template:list', async () => {
    try {
      if (!imageMatcher) return { success: false, error: 'Not initialized' };
      const templates = await imageMatcher.listTemplates();
      return { success: true, templates };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('template:delete', async (_event, name: string) => {
    try {
      if (!imageMatcher) return { success: false, error: 'Not initialized' };
      const deleted = await imageMatcher.deleteTemplate(name);
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
      if (!imageMatcher) return { success: false, error: 'Not initialized' };
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
      if (!fs.existsSync(filePath)) return { success: false, error: t('error.fileNotFound', { path: safeName }) };
      const buffer = fs.readFileSync(filePath);
      return { success: true, base64: buffer.toString('base64'), name: safeName };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ========== i18n IPC ハンドラー ==========
  ipcMain.on('i18n-translate', (event, key: string, params?: any) => {
    event.returnValue = t(key, params);
  });
  ipcMain.on('i18n-get-language', (event) => {
    event.returnValue = i18n.getLanguage();
  });
  ipcMain.on('i18n-set-language', (_event, lang: string) => {
    i18n.setLanguage(lang);
    // メニューを再構築
    setupApplicationMenu();
    // レンダラーに言語変更を通知
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('i18n-language-changed', lang);
    }
  });
  ipcMain.on('i18n-get-languages', (event) => {
    event.returnValue = i18n.getSupportedLanguages();
  });
  // 全翻訳データを一括送信（renderer初期化用）
  ipcMain.handle('i18n-get-all-translations', async () => {
    const lang = i18n.getLanguage();
    const fs = require('fs');
    const localesDir = path.join(process.resourcesPath || path.join(__dirname, '..', '..'), 'locales');
    let translations: Record<string, string> = {};
    try {
      const filePath = path.join(localesDir, `${lang}.json`);
      if (fs.existsSync(filePath)) {
        translations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (e) {
      console.warn('[i18n] Failed to load translations for renderer:', e);
    }
    return { lang, translations };
  });
}

// ── i18n対応 日本語メニュー定義 ──
function setupApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: t('menu.file'),
      submenu: [
        { label: t('menu.file.new'), accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-action', 'new-script') },
        { label: t('menu.file.open'), accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu-action', 'open-script') },
        { type: 'separator' },
        { label: t('menu.file.save'), accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu-action', 'save-script') },
        { label: t('menu.file.saveAs'), accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu-action', 'save-as-script') },
        { type: 'separator' },
        { label: t('menu.file.import'), click: () => mainWindow?.webContents.send('menu-action', 'import-script') },
        { label: t('menu.file.export'), click: () => mainWindow?.webContents.send('menu-action', 'export-script') },
        { type: 'separator' },
        { label: t('menu.file.exit'), accelerator: 'Alt+F4', role: 'quit' }
      ]
    },
    {
      label: t('menu.edit'),
      submenu: [
        { label: t('menu.edit.undo'), accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: t('menu.edit.redo'), accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: t('menu.edit.cut'), accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: t('menu.edit.copy'), accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: t('menu.edit.paste'), accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { type: 'separator' },
        { label: t('menu.edit.selectAll'), accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: t('menu.view'),
      submenu: [
        { label: t('menu.view.fullscreen'), accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: t('menu.help.docs'), accelerator: 'F12', role: 'toggleDevTools' }
      ]
    },
    {
      label: t('menu.tools'),
      submenu: [
        { label: t('menu.tools.settings'), click: () => mainWindow?.webContents.send('menu-action', 'open-settings') },
        { label: t('menu.tools.uwscConvert'), click: () => mainWindow?.webContents.send('menu-action', 'uwsc-convert') },
        { type: 'separator' },
        {
          label: t('menu.tools.language'),
          submenu: i18n.getSupportedLanguages().map(lang => ({
            label: `${lang.nativeName} (${lang.name})`,
            type: 'radio' as const,
            checked: i18n.getLanguage() === lang.code,
            click: () => {
              i18n.setLanguage(lang.code);
              setupApplicationMenu();
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('i18n-language-changed', lang.code);
              }
            }
          }))
        }
      ]
    },
    {
      label: t('menu.window'),
      submenu: [
        { label: t('menu.window.minimize'), role: 'minimize' },
        { label: t('menu.window.close'), role: 'close' }
      ]
    },
    {
      label: t('menu.help'),
      submenu: [
        { label: t('menu.help.about'), click: () => {
          const { dialog } = require('electron');
          dialog.showMessageBox(mainWindow!, {
            type: 'info',
            title: t('about.title'),
            message: t('about.version', { version: '0.4.0' }),
            detail: `${t('about.description')}\n\n${t('about.author')}\n${t('about.license')}`,
            buttons: ['OK']
          });
        }},
        { label: t('menu.help.checkUpdate'), click: () => { /* TODO */ } },
        { type: 'separator' },
        { label: t('menu.help.github'), click: () => shell.openExternal('https://github.com/fc0web/rei-automator') },
        { label: 'Rei Language (npm)', click: () => shell.openExternal('https://www.npmjs.com/package/rei-lang') }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// アプリ起動
app.whenReady().then(() => {
  // ── i18n 初期化 ──
  i18n.init();

  const useStub = process.argv.includes('--stub');
  executor = new ReiExecutor(useStub);
  fileManager = new FileManager();
  screenCapture = new ScreenCapture();

  // Phase 4: ImageMatcher 初期化
  const templatesDir = path.join(app.getAppPath(), '..', 'templates');
  imageMatcher = new ImageMatcher(templatesDir);

  // ========== Phase 6 ==========
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

  scheduler.setExecutor(async (scriptId: string, scheduleName: string) => {
    const script = scriptManager.loadScript(scriptId);
    if (!script) return { success: false, error: t('error.fileNotFound', { path: scriptId }) };
    if (!executor) return { success: false, error: 'Executor not initialized' };
    if (executor.isRunning()) return { success: false, error: t('error.executionFailed', { message: 'Another script is running' }) };

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

  scheduler.setNotifier((schedule: any, event: string, detail?: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('schedule:event', { scheduleId: schedule.id, name: schedule.name, event, detail });
    }
  });

  ipcMain.handle('schedule:list', async () => scheduler.list());
  ipcMain.handle('schedule:create', async (_e, params) => scheduler.create(params));
  ipcMain.handle('schedule:update', async (_e, id, params) => scheduler.update(id, params));
  ipcMain.handle('schedule:delete', async (_e, id) => scheduler.delete(id));
  ipcMain.handle('schedule:toggle', async (_e, id) => scheduler.toggle(id));

  // ========== Phase 8: Execution Mode ==========
  ipcMain.handle('exec:set-mode', async (_e, mode: string, targetWindow?: string) => {
    if (executor) {
      executor.setExecutionMode(
        mode as 'cursor' | 'cursorless',
        targetWindow
      );
      console.log(`[Main] Execution mode set: ${mode}${targetWindow ? ` → "${targetWindow}"` : ''}`);
    }
  });

  // runtime に注入（executor経由）
  if (executor && screenCapture) {
    executor.setImageMatcher(imageMatcher);
    executor.setLogger(logger);
    executor.setErrorHandler(errorHandler);
    executor.setCaptureFunc(async () => {
      const r = await screenCapture!.captureAndSave();
      if (!r.success || !r.savedPath) throw new Error(t('error.captureError', { message: 'Failed' }));
      return r.savedPath;
    });
  }

  setupApplicationMenu();
  setupIpcHandlers();
  createMainWindow();
  registerGlobalShortcuts();
  scheduler.startAll();

  // 言語変更時にメニューを自動再構築
  i18n.onLanguageChange(() => {
    setupApplicationMenu();
  });

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
  if (executor && executor.isRunning()) executor.stop();
});
