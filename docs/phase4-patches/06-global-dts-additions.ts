// ============================================================
// Phase 4 global.d.ts 追加
// ElectronAPI interface 内に追加
// ============================================================

    templateCreate(args: {
      sourcePath: string;
      region: { x: number; y: number; width: number; height: number };
      name: string;
    }): Promise<{ success: boolean; template?: any; error?: string }>;

    templateCreateFromBase64(args: {
      base64: string;
      region: { x: number; y: number; width: number; height: number };
      name: string;
    }): Promise<{ success: boolean; template?: any; error?: string }>;

    templateList(): Promise<{ success: boolean; templates: any[]; error?: string }>;

    templateDelete(name: string): Promise<{ success: boolean; deleted?: boolean; error?: string }>;

    templateTestMatch(args: {
      screenshotPath: string;
      templateName: string;
      threshold?: number;
    }): Promise<{ success: boolean; result?: any; error?: string }>;

    templateGetPreview(name: string): Promise<{ success: boolean; base64?: string; name?: string; error?: string }>;
