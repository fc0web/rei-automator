/**
 * Phase 6 preload.ts 追記分
 * 既存の contextBridge.exposeInMainWorld('reiAPI', { ... }) の中に
 * 以下を追加する
 */

export const phase6PreloadAdditions = `
  // ---- Script Manager ----
  scriptSave: (name: string, content: string, tags: string[], id?: string) =>
    ipcRenderer.invoke('script:save', name, content, tags, id),
  scriptLoad: (id: string) =>
    ipcRenderer.invoke('script:load', id),
  scriptDelete: (id: string) =>
    ipcRenderer.invoke('script:delete', id),
  scriptList: () =>
    ipcRenderer.invoke('script:list'),
  scriptHistory: (scriptId?: string) =>
    ipcRenderer.invoke('script:history', scriptId),
  scriptRecordExecution: (id: string, duration: number, success: boolean, error?: string) =>
    ipcRenderer.invoke('script:record-execution', id, duration, success, error),
  scriptScanParams: (content: string) =>
    ipcRenderer.invoke('script:scan-params', content),
  scriptExport: (id: string, path: string) =>
    ipcRenderer.invoke('script:export', id, path),
  scriptImport: (path: string, name?: string) =>
    ipcRenderer.invoke('script:import', path, name),

  // ---- Logger ----
  logStartSession: (scriptName: string) =>
    ipcRenderer.invoke('log:start-session', scriptName),
  logEndSession: (success: boolean) =>
    ipcRenderer.invoke('log:end-session', success),
  logGetCurrent: () =>
    ipcRenderer.invoke('log:get-current'),
  logExportText: () =>
    ipcRenderer.invoke('log:export-text'),
  logSetStepMode: (enabled: boolean) =>
    ipcRenderer.invoke('log:set-step-mode', enabled),
  logStepNext: () =>
    ipcRenderer.invoke('log:step-next'),
  logStepContinue: () =>
    ipcRenderer.invoke('log:step-continue'),

  // ---- Error Handler ----
  errorSetPolicy: (policy: string) =>
    ipcRenderer.invoke('error:set-policy', policy),
  errorGetErrors: () =>
    ipcRenderer.invoke('error:get-errors'),
  errorClear: () =>
    ipcRenderer.invoke('error:clear'),

  // ---- Dialog ----
  dialogSaveFile: (defaultName: string) =>
    ipcRenderer.invoke('dialog:save-file', defaultName),
  dialogOpenFile: () =>
    ipcRenderer.invoke('dialog:open-file'),

  // ---- IPC Events (main → renderer) ----
  onLogEntry: (callback: (entry: unknown) => void) =>
    ipcRenderer.on('log:entry', (_event, entry) => callback(entry)),
  onStepPause: (callback: (entry: unknown) => void) =>
    ipcRenderer.on('log:step-pause', (_event, entry) => callback(entry)),
`;
