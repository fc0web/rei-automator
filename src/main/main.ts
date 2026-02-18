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

let mainWindow: BrowserWindow | null = null;
let executor: ReiExecutor | null = null;
let fileManager: FileManager | null = null;
let screenCapture: ScreenCapture | null = null;

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
}

// アプリ起動
app.whenReady().then(() => {
  const useStub = process.argv.includes('--stub');
  executor = new ReiExecutor(useStub);
  fileManager = new FileManager();
  screenCapture = new ScreenCapture();

  setupIpcHandlers();
  createMainWindow();
  registerGlobalShortcuts();

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
