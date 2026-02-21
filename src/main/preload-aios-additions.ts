/**
 * Rei AIOS — Preload Additions
 * AIアシスタント用IPC APIブリッジ
 *
 * ★ preload.ts の末尾に追加するか、このファイルをimportしてください
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('aiosAPI', {
  // ── チャット ─────────────────────────────────
  chat: (params: {
    message: string;
    sessionId?: string;
    provider?: string;
    model?: string;
    enableBranching?: boolean;
    systemPrompt?: string;
    temperature?: number;
  }) => ipcRenderer.invoke('aios:chat', params),

  // ── セッション管理 ───────────────────────────
  getSessions: (limit?: number) =>
    ipcRenderer.invoke('aios:get-sessions', limit),

  getSession: (sessionId: string) =>
    ipcRenderer.invoke('aios:get-session', sessionId),

  deleteSession: (sessionId: string) =>
    ipcRenderer.invoke('aios:delete-session', sessionId),

  renameSession: (sessionId: string, title: string) =>
    ipcRenderer.invoke('aios:rename-session', sessionId, title),

  searchChats: (query: string) =>
    ipcRenderer.invoke('aios:search-chats', query),

  // ── プロバイダー管理 ─────────────────────────
  getProviders: () =>
    ipcRenderer.invoke('aios:get-providers'),

  setActiveProvider: (providerId: string) =>
    ipcRenderer.invoke('aios:set-active-provider', providerId),

  updateProvider: (providerId: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke('aios:update-provider', providerId, updates),

  testProvider: (providerId: string) =>
    ipcRenderer.invoke('aios:test-provider', providerId),

  // ── 設定 ─────────────────────────────────────
  getSystemPrompt: () =>
    ipcRenderer.invoke('aios:get-system-prompt'),

  setSystemPrompt: (prompt: string) =>
    ipcRenderer.invoke('aios:set-system-prompt', prompt),

  getStats: () =>
    ipcRenderer.invoke('aios:get-stats'),
});

// TypeScript型定義
declare global {
  interface Window {
    aiosAPI: {
      chat: (params: {
        message: string;
        sessionId?: string;
        provider?: string;
        model?: string;
        enableBranching?: boolean;
        systemPrompt?: string;
        temperature?: number;
      }) => Promise<any>;
      getSessions: (limit?: number) => Promise<any>;
      getSession: (sessionId: string) => Promise<any>;
      deleteSession: (sessionId: string) => Promise<any>;
      renameSession: (sessionId: string, title: string) => Promise<any>;
      searchChats: (query: string) => Promise<any>;
      getProviders: () => Promise<any>;
      setActiveProvider: (providerId: string) => Promise<any>;
      updateProvider: (providerId: string, updates: Record<string, unknown>) => Promise<any>;
      testProvider: (providerId: string) => Promise<any>;
      getSystemPrompt: () => Promise<string>;
      setSystemPrompt: (prompt: string) => Promise<void>;
      getStats: () => Promise<any>;
    };
  }
}
