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

  // 日本語→Reiコード変換
  convertJapanese: (text: string) => ipcRenderer.invoke('convert-japanese', text),
  convertJapaneseAPI: (text: string, apiKey: string) =>
    ipcRenderer.invoke('convert-japanese-api', text, apiKey),

  // 画面キャプチャ（Phase 3）
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  listCaptures: () => ipcRenderer.invoke('list-captures'),
  loadCapture: (filename: string) => ipcRenderer.invoke('load-capture', filename),

  // テンプレート操作（Phase 4）
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
      convertJapanese: (text: string) => Promise<{ success: boolean; code?: string; error?: string }>;
      convertJapaneseAPI: (text: string, apiKey: string) => Promise<{ success: boolean; code?: string; error?: string }>;
      onExecutionStatus: (callback: (status: string) => void) => void;
      onExecutionLog: (callback: (data: { message: string; level: string }) => void) => void;
      onExecutionLine: (callback: (line: number) => void) => void;
      onExecutionComplete: (callback: (result: any) => void) => void;
      // Phase 4: テンプレート操作
      templateCreate(args: { sourcePath: string; region: { x: number; y: number; width: number; height: number }; name: string }): Promise<{ success: boolean; template?: any; error?: string }>;
      templateCreateFromBase64(args: { base64: string; region: { x: number; y: number; width: number; height: number }; name: string }): Promise<{ success: boolean; template?: any; error?: string }>;
      templateList(): Promise<{ success: boolean; templates: any[]; error?: string }>;
      templateDelete(name: string): Promise<{ success: boolean; deleted?: boolean; error?: string }>;
      templateTestMatch(args: { screenshotPath: string; templateName: string; threshold?: number }): Promise<{ success: boolean; result?: any; error?: string }>;
      templateGetPreview(name: string): Promise<{ success: boolean; base64?: string; name?: string; error?: string }>;
    };
  }
}
