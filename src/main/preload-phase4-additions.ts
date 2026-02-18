/**
 * preload-phase4-additions.ts — Phase 4で preload.ts に追加するAPI
 *
 * 【統合方法】
 * 既存の preload.ts の contextBridge.exposeInMainWorld('electronAPI', { ... })
 * 内に以下のメソッドを追加してください。
 */

/*

  // ── Phase 4: テンプレート操作 ─────────────────────────

  // テンプレート作成（キャプチャ画像から部分切り出し）
  templateCreate: (args: {
    sourcePath: string;
    region: { x: number; y: number; width: number; height: number };
    name: string;
  }) => ipcRenderer.invoke('template:create', args),

  // テンプレート作成（Base64データから）
  templateCreateFromBase64: (args: {
    base64: string;
    region: { x: number; y: number; width: number; height: number };
    name: string;
  }) => ipcRenderer.invoke('template:create-from-base64', args),

  // テンプレート一覧取得
  templateList: () => ipcRenderer.invoke('template:list'),

  // テンプレート削除
  templateDelete: (name: string) => ipcRenderer.invoke('template:delete', name),

  // テンプレートマッチングテスト
  templateTestMatch: (args: {
    screenshotPath: string;
    templateName: string;
    threshold?: number;
  }) => ipcRenderer.invoke('template:test-match', args),

  // テンプレートプレビュー取得
  templateGetPreview: (name: string) => ipcRenderer.invoke('template:get-preview', name),

*/

// ── global.d.ts にも対応する型定義を追加 ────────────────

/**
 * 【統合方法】src/renderer/global.d.ts の ElectronAPI interface に追加:
 *
 *   templateCreate(args: {
 *     sourcePath: string;
 *     region: { x: number; y: number; width: number; height: number };
 *     name: string;
 *   }): Promise<{ success: boolean; template?: any; error?: string }>;
 *
 *   templateCreateFromBase64(args: {
 *     base64: string;
 *     region: { x: number; y: number; width: number; height: number };
 *     name: string;
 *   }): Promise<{ success: boolean; template?: any; error?: string }>;
 *
 *   templateList(): Promise<{ success: boolean; templates: any[]; error?: string }>;
 *
 *   templateDelete(name: string): Promise<{ success: boolean; deleted?: boolean; error?: string }>;
 *
 *   templateTestMatch(args: {
 *     screenshotPath: string;
 *     templateName: string;
 *     threshold?: number;
 *   }): Promise<{ success: boolean; result?: any; error?: string }>;
 *
 *   templateGetPreview(name: string): Promise<{ success: boolean; base64?: string; name?: string; error?: string }>;
 */

export {};
