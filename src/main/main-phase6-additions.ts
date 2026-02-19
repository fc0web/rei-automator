/**
 * Phase 6 IPC Handlers 追加分
 * 既存の src/main/main.ts の ipcMain.handle 群に追記する
 *
 * --- 追記箇所 ---
 * 1. ScriptManager, Logger, ErrorHandler のimport
 * 2. インスタンス生成
 * 3. 以下のipcMain.handleを追加
 */

// ============================================================
// Import追加（main.tsの先頭importに追記）
// ============================================================
/*
import { ScriptManager } from '../lib/core/script-manager';
import { Logger, LogEntry } from '../lib/core/logger';
import { ErrorHandler } from '../lib/core/error-handler';
import { scanParams } from '../lib/core/variables';
*/

// ============================================================
// インスタンス生成（createWindow()の前あたりに追記）
// ============================================================
/*
const scriptManager = new ScriptManager();
const logger = new Logger();
const errorHandler = new ErrorHandler(logger);

// ログをレンダラーへリアルタイム転送
logger.onLog = (entry: LogEntry) => {
  mainWindow?.webContents.send('log:entry', entry);
};
logger.onStepPause = (entry: LogEntry) => {
  mainWindow?.webContents.send('log:step-pause', entry);
};
*/

// ============================================================
// IPC Handlers（既存のipcMain.handle群の末尾に追記）
// ============================================================

export const phase6IpcHandlers = `
// ---- Script Manager ----

ipcMain.handle('script:save', async (_event, name: string, content: string, tags: string[], existingId?: string) => {
  return scriptManager.saveScript(name, content, tags, existingId);
});

ipcMain.handle('script:load', async (_event, id: string) => {
  return scriptManager.loadScript(id);
});

ipcMain.handle('script:delete', async (_event, id: string) => {
  return scriptManager.deleteScript(id);
});

ipcMain.handle('script:list', async () => {
  return scriptManager.listScripts();
});

ipcMain.handle('script:history', async (_event, scriptId?: string) => {
  return scriptManager.getHistory(scriptId);
});

ipcMain.handle('script:record-execution', async (
  _event, scriptId: string, duration: number, success: boolean, errorMessage?: string
) => {
  scriptManager.recordExecution(scriptId, duration, success, errorMessage);
});

ipcMain.handle('script:export', async (_event, id: string, destPath: string) => {
  return scriptManager.exportScript(id, destPath);
});

ipcMain.handle('script:import', async (_event, srcPath: string, name?: string) => {
  return scriptManager.importScript(srcPath, name);
});

ipcMain.handle('script:scan-params', async (_event, content: string) => {
  return scanParams(content);
});

// ---- Logger ----

ipcMain.handle('log:start-session', async (_event, scriptName: string) => {
  return logger.startSession(scriptName);
});

ipcMain.handle('log:end-session', async (_event, success: boolean) => {
  logger.endSession(success);
});

ipcMain.handle('log:get-current', async () => {
  return logger.getRecentLogs(200);
});

ipcMain.handle('log:export-text', async () => {
  return logger.exportLogsAsText();
});

ipcMain.handle('log:set-step-mode', async (_event, enabled: boolean) => {
  logger.setStepMode(enabled);
});

ipcMain.handle('log:step-next', async () => {
  logger.stepNext();
});

ipcMain.handle('log:step-continue', async () => {
  logger.stepContinue();
});

// ---- Error Policy ----

ipcMain.handle('error:set-policy', async (_event, policy: string) => {
  if (policy === 'stop' || policy === 'skip') {
    errorHandler.setGlobalPolicy(policy);
  } else if (policy.startsWith('retry:')) {
    const n = parseInt(policy.split(':')[1], 10);
    errorHandler.setGlobalPolicy({ retry: n });
  }
});

ipcMain.handle('error:get-errors', async () => {
  return errorHandler.getErrors();
});

ipcMain.handle('error:clear', async () => {
  errorHandler.clearErrors();
});

// ---- ファイルダイアログ（保存・読込用） ----

ipcMain.handle('dialog:save-file', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName,
    filters: [
      { name: 'Rei Script', extensions: ['rei'] },
      { name: 'Text', extensions: ['txt'] },
    ],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('dialog:open-file', async () => {
  const result = await dialog.openDialog(mainWindow!, {
    filters: [
      { name: 'Rei Script', extensions: ['rei', 'txt'] },
    ],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});
`;

// ============================================================
// executor.ts の実行関数への統合（run関数の修正例）
// ============================================================

export const executorIntegration = `
// executor.ts の run() 関数を以下のように修正:

async function run(script: string, store: VariableStore, logger: Logger, errorHandler: ErrorHandler) {
  const lines = script.split('\\n');
  
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNumber = i + 1;
    
    // 変数展開・set/param処理
    const processed = preprocessLine(rawLine, store);
    if (processed === '__SET__' || processed === '__PARAM__') continue;
    
    const trimmed = processed.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    
    // ステップログ
    await logger.logStep(lineNumber, trimmed, store.getAll());
    
    // コマンド実行（エラーハンドリング付き）
    await errorHandler.executeWithPolicy(
      lineNumber,
      rawLine,
      trimmed,
      () => executeCommand(trimmed) // 既存のコマンド実行関数
    );
  }
}
`;
