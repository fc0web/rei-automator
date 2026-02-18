/**
 * Rei Automator - Preload Script
 * レンダラープロセスに安全なAPIを公開
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // コード実行
  executeCode: (code: string) => ipcRenderer.invoke('execute-code', code),
  stopExecution: () => ipcRenderer.invoke('stop-execution'),
  pauseExecution: () => ipcRenderer.invoke('pause-execution'),
  resumeExecution: () => ipcRenderer.invoke('resume-execution'),

  // ファイル操作（ダイアログ）
  saveScriptDialog: (code: string) => ipcRenderer.invoke('save-script-dialog', code),
  loadScriptDialog: () => ipcRenderer.invoke('load-script-dialog'),

  // ファイル操作（直接）
  saveScript: (filename: string, code: string) =>
    ipcRenderer.invoke('save-script', filename, code),
  loadScript: (filename: string) => ipcRenderer.invoke('load-script', filename),
  listScripts: () => ipcRenderer.invoke('list-scripts'),

  // イベントリスナー
  onExecutionStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('execution-status', (_event, status) => callback(status));
  },
  onExecutionLog: (callback: (data: { message: string; level: string }) => void) => {
    ipcRenderer.on('execution-log', (_event, data) => callback(data));
  },
  onExecutionLine: (callback: (line: number) => void) => {
    ipcRenderer.on('execution-line', (_event, line) => callback(line));
  },
  onExecutionComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('execution-complete', (_event, result) => callback(result));
  },
});

// TypeScript用の型定義
declare global {
  interface Window {
    electronAPI: {
      executeCode: (code: string) => Promise<{ success: boolean; message?: string; error?: string }>;
      stopExecution: () => Promise<{ success: boolean }>;
      pauseExecution: () => Promise<{ success: boolean }>;
      resumeExecution: () => Promise<{ success: boolean }>;
      saveScriptDialog: (code: string) => Promise<{ success: boolean; path?: string }>;
      loadScriptDialog: () => Promise<{ success: boolean; code?: string; path?: string }>;
      saveScript: (filename: string, code: string) => Promise<{ success: boolean; path?: string }>;
      loadScript: (filename: string) => Promise<{ success: boolean; code?: string }>;
      listScripts: () => Promise<string[]>;
      onExecutionStatus: (callback: (status: string) => void) => void;
      onExecutionLog: (callback: (data: { message: string; level: string }) => void) => void;
      onExecutionLine: (callback: (line: number) => void) => void;
      onExecutionComplete: (callback: (result: any) => void) => void;
    };
  }
}
