// ============================================================
// Phase 4 preload.ts 追加
// contextBridge.exposeInMainWorld('electronAPI', { ... }) 内に追加
// ============================================================

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
