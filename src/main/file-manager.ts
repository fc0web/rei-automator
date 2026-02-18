/**
 * Rei Automator - ファイル管理
 * .reiスクリプトの保存・読み込み
 */

import * as fs from 'fs';
import * as path from 'path';
import { app, dialog, BrowserWindow } from 'electron';

export class FileManager {
  private scriptsDir: string;

  constructor() {
    // scriptsディレクトリをアプリのデータフォルダに作成
    this.scriptsDir = path.join(app.getPath('userData'), 'scripts');
    this.ensureScriptsDir();
  }

  /**
   * scriptsディレクトリの存在を保証
   */
  private ensureScriptsDir(): void {
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
      console.log(`[FileManager] Created scripts directory: ${this.scriptsDir}`);
    }
  }

  /**
   * スクリプトを保存（ファイルダイアログ）
   */
  async saveWithDialog(
    code: string,
    window: BrowserWindow
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const result = await dialog.showSaveDialog(window, {
        title: 'Reiスクリプトを保存',
        defaultPath: path.join(this.scriptsDir, 'script.rei'),
        filters: [
          { name: 'Rei Script', extensions: ['rei'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'キャンセルされました' };
      }

      fs.writeFileSync(result.filePath, code, 'utf-8');
      console.log(`[FileManager] Saved: ${result.filePath}`);

      return { success: true, path: result.filePath };
    } catch (error: any) {
      console.error('[FileManager] Save error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * スクリプトを読み込み（ファイルダイアログ）
   */
  async loadWithDialog(
    window: BrowserWindow
  ): Promise<{ success: boolean; code?: string; path?: string; error?: string }> {
    try {
      const result = await dialog.showOpenDialog(window, {
        title: 'Reiスクリプトを開く',
        defaultPath: this.scriptsDir,
        filters: [
          { name: 'Rei Script', extensions: ['rei'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'キャンセルされました' };
      }

      const filePath = result.filePaths[0];
      const code = fs.readFileSync(filePath, 'utf-8');
      console.log(`[FileManager] Loaded: ${filePath}`);

      return { success: true, code, path: filePath };
    } catch (error: any) {
      console.error('[FileManager] Load error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * スクリプトを直接保存（ファイル名指定）
   */
  saveScript(
    filename: string,
    code: string
  ): { success: boolean; path?: string; error?: string } {
    try {
      const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(this.scriptsDir, `${safeName}.rei`);

      fs.writeFileSync(filePath, code, 'utf-8');
      console.log(`[FileManager] Saved: ${filePath}`);

      return { success: true, path: filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * スクリプトを直接読み込み（ファイル名指定）
   */
  loadScript(
    filename: string
  ): { success: boolean; code?: string; error?: string } {
    try {
      const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(this.scriptsDir, `${safeName}.rei`);

      if (!fs.existsSync(filePath)) {
        return { success: false, error: `ファイルが見つかりません: ${safeName}.rei` };
      }

      const code = fs.readFileSync(filePath, 'utf-8');
      return { success: true, code };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * スクリプト一覧を取得
   */
  listScripts(): string[] {
    try {
      return fs
        .readdirSync(this.scriptsDir)
        .filter((f) => f.endsWith('.rei'))
        .map((f) => f.replace('.rei', ''));
    } catch {
      return [];
    }
  }

  /**
   * scriptsディレクトリのパスを取得
   */
  getScriptsDir(): string {
    return this.scriptsDir;
  }
}
