/**
 * Rei AIOS — Main Process IPC Handlers
 * AIアシスタント用IPCハンドラー登録
 *
 * ★ main.ts から registerAIOSHandlers(aiosEngine) を呼び出してください
 */

import { ipcMain } from 'electron';
import { AIOSEngine } from '../aios/aios-engine';

export function registerAIOSHandlers(engine: AIOSEngine): void {
  // ── チャット ─────────────────────────────────
  ipcMain.handle('aios:chat', async (_event, params) => {
    try {
      return await engine.chat(params);
    } catch (e: any) {
      return { error: e.message };
    }
  });

  // ── セッション管理 ───────────────────────────
  ipcMain.handle('aios:get-sessions', async (_event, limit?: number) => {
    return engine.getSessions(limit);
  });

  ipcMain.handle('aios:get-session', async (_event, sessionId: string) => {
    return engine.getSession(sessionId);
  });

  ipcMain.handle('aios:delete-session', async (_event, sessionId: string) => {
    return engine.deleteSession(sessionId);
  });

  ipcMain.handle('aios:rename-session', async (_event, sessionId: string, title: string) => {
    return engine.renameSession(sessionId, title);
  });

  ipcMain.handle('aios:search-chats', async (_event, query: string) => {
    return engine.searchChats(query);
  });

  // ── プロバイダー管理 ─────────────────────────
  ipcMain.handle('aios:get-providers', async () => {
    return {
      providers: engine.getProviders(),
      activeProvider: engine.getActiveProvider(),
    };
  });

  ipcMain.handle('aios:set-active-provider', async (_event, providerId: string) => {
    engine.setActiveProvider(providerId);
    return { success: true, activeProvider: providerId };
  });

  ipcMain.handle('aios:update-provider', async (_event, providerId: string, updates: any) => {
    try {
      engine.updateProvider(providerId, updates);
      return { success: true };
    } catch (e: any) {
      return { error: e.message };
    }
  });

  ipcMain.handle('aios:test-provider', async (_event, providerId: string) => {
    return engine.testProvider(providerId);
  });

  // ── 設定 ─────────────────────────────────────
  ipcMain.handle('aios:get-system-prompt', async () => {
    return engine.getSystemPrompt();
  });

  ipcMain.handle('aios:set-system-prompt', async (_event, prompt: string) => {
    engine.setSystemPrompt(prompt);
    return { success: true };
  });

  ipcMain.handle('aios:get-stats', async () => {
    return engine.getChatStats();
  });
}
