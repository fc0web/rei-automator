/**
 * Rei Automator - Main Process
 * Electron メインプロセス
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

/**
 * メインウィンドウを作成
 */
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Rei Automator v0.1',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  // 開発時はHTMLファイルを直接ロード
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 開発ツールを開く（開発時のみ）
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * アプリケーション準備完了時
 */
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    // macOSでは、ドックアイコンがクリックされた時にウィンドウを再作成
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

/**
 * 全ウィンドウが閉じられた時
 */
app.on('window-all-closed', () => {
  // macOS以外では、全ウィンドウが閉じられたらアプリを終了
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * IPC通信ハンドラー（Phase 1では基本のみ）
 */

// コード実行要求
ipcMain.handle('execute-code', async (_event, code: string) => {
  // TODO: Phase 1では実装スタブ
  console.log('Execute code:', code);
  return { success: true, message: 'Code execution started' };
});

// 実行停止要求
ipcMain.handle('stop-execution', async () => {
  // TODO: Phase 1では実装スタブ
  console.log('Stop execution');
  return { success: true };
});

// ファイル保存
ipcMain.handle('save-script', async (_event, filename: string, code: string) => {
  // TODO: Phase 1では実装スタブ
  console.log('Save script:', filename);
  return { success: true, path: `scripts/${filename}` };
});

// ファイル読み込み
ipcMain.handle('load-script', async (_event, filename: string) => {
  // TODO: Phase 1では実装スタブ
  console.log('Load script:', filename);
  return { success: true, code: '// Sample code\nclick(100, 200)' };
});
