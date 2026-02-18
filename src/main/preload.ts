/**
 * Rei Automator - Preload Script
 * レンダラープロセスに安全なAPIを公開
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * レンダラープロセスに公開するAPI
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // コード実行
  executeCode: (code: string) => ipcRenderer.invoke('execute-code', code),
  
  // 実行停止
  stopExecution: () => ipcRenderer.invoke('stop-execution'),
  
  // スクリプト保存
  saveScript: (filename: string, code: string) => 
    ipcRenderer.invoke('save-script', filename, code),
  
  // スクリプト読み込み
  loadScript: (filename: string) => ipcRenderer.invoke('load-script', filename),
  
  // イベントリスナー
  onExecutionStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('execution-status', (_event, status) => callback(status));
  },
});

// TypeScript用の型定義
declare global {
  interface Window {
    electronAPI: {
      executeCode: (code: string) => Promise<{ success: boolean; message?: string }>;
      stopExecution: () => Promise<{ success: boolean }>;
      saveScript: (filename: string, code: string) => Promise<{ success: boolean; path?: string }>;
      loadScript: (filename: string) => Promise<{ success: boolean; code?: string }>;
      onExecutionStatus: (callback: (status: string) => void) => void;
    };
  }
}
