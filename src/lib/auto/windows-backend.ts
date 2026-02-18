/**
 * Rei Automator - Windows ネイティブバックエンド
 * PowerShell経由でWindows APIを呼び出す（ネイティブモジュール不要）
 * 
 * 利点:
 *   - npm install 不要（Windows標準機能のみ使用）
 *   - ビルドエラーが起きない
 *   - Electronのバージョン依存なし
 * 
 * 制約:
 *   - Windows専用
 *   - PowerShell起動のオーバーヘッド（初回のみ）
 */

import { execFile } from 'child_process';
import { AutoBackend } from './controller';

/**
 * PowerShellコマンドを実行
 */
function runPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script,
    ], { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`PowerShell error: ${error.message}\n${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/**
 * C# コードを使ったWindows API呼び出し用のヘルパー
 */
const CSHARP_HELPER = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Threading;

public class ReiAuto {
    [DllImport("user32.dll")]
    static extern bool SetCursorPos(int X, int Y);
    
    [DllImport("user32.dll")]
    static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, int dwExtraInfo);
    
    const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    const uint MOUSEEVENTF_LEFTUP = 0x0004;
    const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
    
    public static void MoveTo(int x, int y) {
        SetCursorPos(x, y);
    }
    
    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        Thread.Sleep(30);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
    
    public static void DoubleClick(int x, int y) {
        SetCursorPos(x, y);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        Thread.Sleep(80);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
    
    public static void RightClick(int x, int y) {
        SetCursorPos(x, y);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
        Thread.Sleep(30);
        mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
    }
    
    public static void Drag(int x1, int y1, int x2, int y2) {
        SetCursorPos(x1, y1);
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        Thread.Sleep(100);
        // 段階的に移動
        int steps = 20;
        for (int i = 1; i <= steps; i++) {
            int cx = x1 + (x2 - x1) * i / steps;
            int cy = y1 + (y2 - y1) * i / steps;
            SetCursorPos(cx, cy);
            Thread.Sleep(10);
        }
        Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
    
    public static void TypeText(string text) {
        SendKeys.SendWait(text);
    }
    
    public static void SendKey(string key) {
        SendKeys.SendWait(key);
    }
}
'@ -ReferencedAssemblies System.Windows.Forms
`;

/**
 * SendKeys用のキーマッピング
 */
const KEY_MAP: Record<string, string> = {
  'Enter': '{ENTER}',
  'Tab': '{TAB}',
  'Escape': '{ESC}',
  'Esc': '{ESC}',
  'Backspace': '{BACKSPACE}',
  'Delete': '{DELETE}',
  'Del': '{DELETE}',
  'Home': '{HOME}',
  'End': '{END}',
  'PageUp': '{PGUP}',
  'PageDown': '{PGDN}',
  'Up': '{UP}',
  'Down': '{DOWN}',
  'Left': '{LEFT}',
  'Right': '{RIGHT}',
  'F1': '{F1}', 'F2': '{F2}', 'F3': '{F3}', 'F4': '{F4}',
  'F5': '{F5}', 'F6': '{F6}', 'F7': '{F7}', 'F8': '{F8}',
  'F9': '{F9}', 'F10': '{F10}', 'F11': '{F11}', 'F12': '{F12}',
  'Space': ' ',
  'Insert': '{INSERT}',
  'PrintScreen': '{PRTSC}',
};

/**
 * SendKeysのモディファイアマッピング
 */
const MODIFIER_MAP: Record<string, string> = {
  'Ctrl': '^',
  'Control': '^',
  'Alt': '%',
  'Shift': '+',
};

/**
 * Windows ネイティブバックエンド
 */
export class WindowsBackend implements AutoBackend {
  private initialized = false;
  private logger: (message: string) => void;

  constructor(logger?: (message: string) => void) {
    this.logger = logger || ((msg) => console.log(`[Windows] ${msg}`));
  }

  /**
   * C# ヘルパーを初期化（初回のみ）
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      await runPowerShell(CSHARP_HELPER + '\nWrite-Output "OK"');
      this.initialized = true;
      this.logger('Windows backend initialized');
    } catch (error: any) {
      this.logger(`初期化エラー: ${error.message}`);
      throw new Error('Windows バックエンドの初期化に失敗しました');
    }
  }

  async click(x: number, y: number): Promise<void> {
    this.logger(`Click at (${x}, ${y})`);
    await runPowerShell(`${CSHARP_HELPER}\n[ReiAuto]::Click(${x}, ${y})`);
  }

  async dblclick(x: number, y: number): Promise<void> {
    this.logger(`Double-click at (${x}, ${y})`);
    await runPowerShell(`${CSHARP_HELPER}\n[ReiAuto]::DoubleClick(${x}, ${y})`);
  }

  async rightclick(x: number, y: number): Promise<void> {
    this.logger(`Right-click at (${x}, ${y})`);
    await runPowerShell(`${CSHARP_HELPER}\n[ReiAuto]::RightClick(${x}, ${y})`);
  }

  async move(x: number, y: number): Promise<void> {
    this.logger(`Move to (${x}, ${y})`);
    await runPowerShell(`${CSHARP_HELPER}\n[ReiAuto]::MoveTo(${x}, ${y})`);
  }

  async drag(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    this.logger(`Drag from (${x1}, ${y1}) to (${x2}, ${y2})`);
    await runPowerShell(`${CSHARP_HELPER}\n[ReiAuto]::Drag(${x1}, ${y1}, ${x2}, ${y2})`);
  }

  async type(text: string): Promise<void> {
    this.logger(`Type: "${text}"`);
    // SendKeysの特殊文字をエスケープ
    const escaped = text
      .replace(/([+^%~(){}])/g, '{$1}')
      .replace(/'/g, "''");
    await runPowerShell(`${CSHARP_HELPER}\n[ReiAuto]::TypeText('${escaped}')`);
  }

  async key(keyName: string): Promise<void> {
    this.logger(`Key: ${keyName}`);
    const sendKey = KEY_MAP[keyName] || keyName;
    const escaped = sendKey.replace(/'/g, "''");
    await runPowerShell(`${CSHARP_HELPER}\n[ReiAuto]::SendKey('${escaped}')`);
  }

  async shortcut(keys: string[]): Promise<void> {
    this.logger(`Shortcut: ${keys.join('+')}`);

    // モディファイアキーと通常キーを分離
    let sendKeysStr = '';
    let normalKey = '';

    for (const key of keys) {
      const modifier = MODIFIER_MAP[key];
      if (modifier) {
        sendKeysStr += modifier;
      } else {
        normalKey = KEY_MAP[key] || key.toLowerCase();
      }
    }

    sendKeysStr += normalKey;
    const escaped = sendKeysStr.replace(/'/g, "''");
    await runPowerShell(`${CSHARP_HELPER}\n[ReiAuto]::SendKey('${escaped}')`);
  }
}
