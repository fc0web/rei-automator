import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface SavedScript {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface ScriptHistory {
  scriptId: string;
  executedAt: string;
  duration: number;  // ms
  success: boolean;
  errorMessage?: string;
}

export class ScriptManager {
  private scriptsDir: string;
  private historyFile: string;
  private indexFile: string;
  private history: ScriptHistory[] = [];
  private scripts: Map<string, SavedScript> = new Map();

  constructor() {
    const userDataPath = app.getPath('userData');
    this.scriptsDir = path.join(userDataPath, 'scripts');
    this.historyFile = path.join(userDataPath, 'history.json');
    this.indexFile = path.join(userDataPath, 'scripts-index.json');
    this.ensureDirectories();
    this.loadIndex();
    this.loadHistory();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
    }
  }

  private loadIndex(): void {
    try {
      if (fs.existsSync(this.indexFile)) {
        const data = JSON.parse(fs.readFileSync(this.indexFile, 'utf-8'));
        for (const script of data) {
          this.scripts.set(script.id, script);
        }
      }
    } catch (e) {
      console.error('Failed to load script index:', e);
    }
  }

  private saveIndex(): void {
    const data = Array.from(this.scripts.values());
    fs.writeFileSync(this.indexFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        this.history = JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
      }
    } catch (e) {
      this.history = [];
    }
  }

  private saveHistory(): void {
    // 最新100件のみ保持
    const trimmed = this.history.slice(-100);
    fs.writeFileSync(this.historyFile, JSON.stringify(trimmed, null, 2), 'utf-8');
  }

  saveScript(name: string, content: string, tags: string[] = [], existingId?: string): SavedScript {
    const id = existingId || `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const existing = this.scripts.get(id);

    const script: SavedScript = {
      id,
      name,
      content,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      tags,
    };

    const scriptFile = path.join(this.scriptsDir, `${id}.rei`);
    fs.writeFileSync(scriptFile, content, 'utf-8');

    this.scripts.set(id, { ...script, content: '' }); // インデックスにはcontent除外
    this.saveIndex();

    return script;
  }

  loadScript(id: string): SavedScript | null {
    const meta = this.scripts.get(id);
    if (!meta) return null;

    const scriptFile = path.join(this.scriptsDir, `${id}.rei`);
    if (!fs.existsSync(scriptFile)) return null;

    const content = fs.readFileSync(scriptFile, 'utf-8');
    return { ...meta, content };
  }

  deleteScript(id: string): boolean {
    if (!this.scripts.has(id)) return false;

    const scriptFile = path.join(this.scriptsDir, `${id}.rei`);
    if (fs.existsSync(scriptFile)) {
      fs.unlinkSync(scriptFile);
    }

    this.scripts.delete(id);
    this.saveIndex();
    return true;
  }

  listScripts(): Omit<SavedScript, 'content'>[] {
    return Array.from(this.scripts.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  recordExecution(scriptId: string, duration: number, success: boolean, errorMessage?: string): void {
    this.history.push({
      scriptId,
      executedAt: new Date().toISOString(),
      duration,
      success,
      errorMessage,
    });
    this.saveHistory();
  }

  getHistory(scriptId?: string): ScriptHistory[] {
    const data = scriptId
      ? this.history.filter(h => h.scriptId === scriptId)
      : this.history;
    return data.slice().reverse(); // 最新順
  }

  exportScript(id: string, destPath: string): boolean {
    const script = this.loadScript(id);
    if (!script) return false;
    fs.writeFileSync(destPath, script.content, 'utf-8');
    return true;
  }

  importScript(srcPath: string, name?: string): SavedScript {
    const content = fs.readFileSync(srcPath, 'utf-8');
    const scriptName = name || path.basename(srcPath, path.extname(srcPath));
    return this.saveScript(scriptName, content);
  }
}
