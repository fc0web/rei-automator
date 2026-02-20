/**
 * Rei Automator - Windows API バックエンド（カーソルなし実行）
 * 
 * SendMessage / PostMessage を使い、カーソルを動かさずにウィンドウを操作する。
 * VPS（RDP切断後）でも動作可能。
 * 
 * 利点:
 *   - カーソルを動かさない → 他の作業と干渉しない
 *   - RDP切断後も動作 → VPS対応
 *   - 複数ウィンドウへの並列操作が可能 → マルチタスクの基盤
 * 
 * 制約:
 *   - Windows専用
 *   - 一部アプリはSendMessageに応答しない場合がある
 *   - DirectX/ゲーム系は別途対応が必要
 */

import { execFile } from 'child_process';

// ── C# Helper: Windows API定義 ──────────────────────────

const WIN_API_HELPER = `
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class ReiWinApi {
    // ── Window検索 ────────────────────────────
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindowEx(IntPtr hWndParent, IntPtr hWndChildAfter, string lpszClass, string lpszWindow);

    [DllImport("user32.dll")]
    static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    // ── メッセージ送信 ────────────────────────
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    // ── ウィンドウ操作 ────────────────────────
    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll")]
    static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X, Y;
    }

    // ── 定数 ──────────────────────────────────
    const uint WM_LBUTTONDOWN = 0x0201;
    const uint WM_LBUTTONUP   = 0x0202;
    const uint WM_LBUTTONDBLCLK = 0x0203;
    const uint WM_RBUTTONDOWN = 0x0204;
    const uint WM_RBUTTONUP   = 0x0205;
    const uint WM_MOUSEMOVE   = 0x0200;
    const uint WM_KEYDOWN     = 0x0100;
    const uint WM_KEYUP       = 0x0101;
    const uint WM_CHAR        = 0x0102;
    const uint WM_CLOSE       = 0x0010;
    const uint WM_SETTEXT     = 0x000C;
    const uint WM_GETTEXT     = 0x000D;
    const uint WM_GETTEXTLENGTH = 0x000E;
    const uint BM_CLICK       = 0x00F5;

    const int MK_LBUTTON = 0x0001;
    const int MK_RBUTTON = 0x0002;

    const int SW_SHOW     = 5;
    const int SW_MINIMIZE = 6;
    const int SW_RESTORE  = 9;
    const int SW_MAXIMIZE = 3;

    // ── lParam生成 ────────────────────────────
    static IntPtr MakeLParam(int x, int y) {
        return (IntPtr)((y << 16) | (x & 0xFFFF));
    }

    // ── ウィンドウ検索 ────────────────────────
    public static IntPtr FindByTitle(string title) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            int len = GetWindowTextLength(hWnd);
            if (len == 0) return true;
            StringBuilder sb = new StringBuilder(len + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            string wndTitle = sb.ToString();
            if (wndTitle.Contains(title)) {
                found = hWnd;
                return false; // 最初に見つかったものを返す
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }

    public static IntPtr FindByExactTitle(string title) {
        return FindWindow(null, title);
    }

    // ── ウィンドウ一覧 ────────────────────────
    public static string ListWindows() {
        var list = new List<string>();
        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            int len = GetWindowTextLength(hWnd);
            if (len == 0) return true;
            StringBuilder sb = new StringBuilder(len + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            list.Add(hWnd.ToInt64() + "|" + pid + "|" + sb.ToString());
            return true;
        }, IntPtr.Zero);
        return string.Join("\\n", list);
    }

    // ── カーソルなしクリック ──────────────────
    public static bool ClickAt(IntPtr hWnd, int x, int y) {
        if (hWnd == IntPtr.Zero) return false;
        IntPtr lParam = MakeLParam(x, y);
        PostMessage(hWnd, WM_LBUTTONDOWN, (IntPtr)MK_LBUTTON, lParam);
        Thread.Sleep(30);
        PostMessage(hWnd, WM_LBUTTONUP, IntPtr.Zero, lParam);
        return true;
    }

    public static bool DblClickAt(IntPtr hWnd, int x, int y) {
        if (hWnd == IntPtr.Zero) return false;
        IntPtr lParam = MakeLParam(x, y);
        PostMessage(hWnd, WM_LBUTTONDOWN, (IntPtr)MK_LBUTTON, lParam);
        PostMessage(hWnd, WM_LBUTTONUP, IntPtr.Zero, lParam);
        Thread.Sleep(50);
        PostMessage(hWnd, WM_LBUTTONDBLCLK, (IntPtr)MK_LBUTTON, lParam);
        PostMessage(hWnd, WM_LBUTTONUP, IntPtr.Zero, lParam);
        return true;
    }

    public static bool RightClickAt(IntPtr hWnd, int x, int y) {
        if (hWnd == IntPtr.Zero) return false;
        IntPtr lParam = MakeLParam(x, y);
        PostMessage(hWnd, WM_RBUTTONDOWN, (IntPtr)MK_RBUTTON, lParam);
        Thread.Sleep(30);
        PostMessage(hWnd, WM_RBUTTONUP, IntPtr.Zero, lParam);
        return true;
    }

    // ── カーソルなしテキスト入力 ──────────────
    public static bool TypeText(IntPtr hWnd, string text) {
        if (hWnd == IntPtr.Zero) return false;
        foreach (char c in text) {
            PostMessage(hWnd, WM_CHAR, (IntPtr)c, IntPtr.Zero);
            Thread.Sleep(10);
        }
        return true;
    }

    // ── カーソルなしキー送信 ──────────────────
    public static bool SendKey(IntPtr hWnd, int vkCode) {
        if (hWnd == IntPtr.Zero) return false;
        PostMessage(hWnd, WM_KEYDOWN, (IntPtr)vkCode, IntPtr.Zero);
        Thread.Sleep(30);
        PostMessage(hWnd, WM_KEYUP, (IntPtr)vkCode, IntPtr.Zero);
        return true;
    }

    // ── ウィンドウ操作 ────────────────────────
    public static bool Activate(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return false;
        ShowWindow(hWnd, SW_RESTORE);
        return SetForegroundWindow(hWnd);
    }

    public static bool Close(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return false;
        return PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
    }

    public static bool Minimize(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return false;
        return ShowWindow(hWnd, SW_MINIMIZE);
    }

    public static bool Maximize(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return false;
        return ShowWindow(hWnd, SW_MAXIMIZE);
    }

    public static bool Restore(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return false;
        return ShowWindow(hWnd, SW_RESTORE);
    }

    public static string GetRect(IntPtr hWnd) {
        RECT rect;
        if (GetWindowRect(hWnd, out rect)) {
            return rect.Left + "," + rect.Top + "," + rect.Right + "," + rect.Bottom;
        }
        return "";
    }
}
'@ -ReferencedAssemblies System.Windows.Forms
`;

// ── Virtual Key Code マッピング ──────────────────────────

const VK_MAP: Record<string, number> = {
  'Enter': 0x0D,
  'Return': 0x0D,
  'Tab': 0x09,
  'Escape': 0x1B,
  'Esc': 0x1B,
  'Backspace': 0x08,
  'Delete': 0x2E,
  'Del': 0x2E,
  'Home': 0x24,
  'End': 0x23,
  'PageUp': 0x21,
  'PageDown': 0x22,
  'Up': 0x26,
  'Down': 0x28,
  'Left': 0x25,
  'Right': 0x27,
  'Space': 0x20,
  'Insert': 0x2D,
  'F1': 0x70, 'F2': 0x71, 'F3': 0x72, 'F4': 0x73,
  'F5': 0x74, 'F6': 0x75, 'F7': 0x76, 'F8': 0x77,
  'F9': 0x78, 'F10': 0x79, 'F11': 0x7A, 'F12': 0x7B,
  'Ctrl': 0x11, 'Control': 0x11,
  'Alt': 0x12,
  'Shift': 0x10,
  'A': 0x41, 'B': 0x42, 'C': 0x43, 'D': 0x44, 'E': 0x45,
  'F': 0x46, 'G': 0x47, 'H': 0x48, 'I': 0x49, 'J': 0x4A,
  'K': 0x4B, 'L': 0x4C, 'M': 0x4D, 'N': 0x4E, 'O': 0x4F,
  'P': 0x50, 'Q': 0x51, 'R': 0x52, 'S': 0x53, 'T': 0x54,
  'U': 0x55, 'V': 0x56, 'W': 0x57, 'X': 0x58, 'Y': 0x59,
  'Z': 0x5A,
  '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
  '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
};

// ── PowerShell実行ヘルパー ───────────────────────────────

function runPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script,
    ], { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`PowerShell error: ${error.message}\n${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// ── ウィンドウ情報 ───────────────────────────────────────

export interface WindowInfo {
  hwnd: number;
  pid: number;
  title: string;
}

// ── WinApiBackend クラス ─────────────────────────────────

export class WinApiBackend {
  private logger: (message: string) => void;

  constructor(logger?: (message: string) => void) {
    this.logger = logger || ((msg) => console.log(`[WinAPI] ${msg}`));
  }

  /**
   * ウィンドウをタイトル（部分一致）で検索し、ハンドルを返す
   */
  async findWindow(title: string): Promise<number> {
    this.logger(`ウィンドウ検索: "${title}"`);
    const escaped = title.replace(/'/g, "''").replace(/"/g, '`"');
    const result = await runPowerShell(
      `${WIN_API_HELPER}\n$h = [ReiWinApi]::FindByTitle('${escaped}'); Write-Output $h`
    );
    const hwnd = parseInt(result, 10);
    if (isNaN(hwnd) || hwnd === 0) {
      throw new Error(`ウィンドウが見つかりません: "${title}"`);
    }
    this.logger(`ウィンドウ発見: hwnd=${hwnd}`);
    return hwnd;
  }

  /**
   * 表示中のウィンドウ一覧を取得
   */
  async listWindows(): Promise<WindowInfo[]> {
    this.logger('ウィンドウ一覧を取得');
    const result = await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::ListWindows()`
    );
    if (!result) return [];

    return result.split('\n').filter(line => line.trim()).map(line => {
      const parts = line.split('|');
      return {
        hwnd: parseInt(parts[0], 10),
        pid: parseInt(parts[1], 10),
        title: parts.slice(2).join('|'),
      };
    });
  }

  /**
   * カーソルなしクリック（ウィンドウ内座標）
   */
  async click(hwndOrTitle: number | string, x: number, y: number): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`[カーソルなし] Click at (${x}, ${y}) → hwnd=${hwnd}`);
    const result = await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::ClickAt([IntPtr]${hwnd}, ${x}, ${y})`
    );
    if (result === 'False') {
      throw new Error(`クリック失敗: hwnd=${hwnd}`);
    }
  }

  /**
   * カーソルなしダブルクリック
   */
  async dblclick(hwndOrTitle: number | string, x: number, y: number): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`[カーソルなし] DblClick at (${x}, ${y}) → hwnd=${hwnd}`);
    const result = await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::DblClickAt([IntPtr]${hwnd}, ${x}, ${y})`
    );
    if (result === 'False') {
      throw new Error(`ダブルクリック失敗: hwnd=${hwnd}`);
    }
  }

  /**
   * カーソルなし右クリック
   */
  async rightclick(hwndOrTitle: number | string, x: number, y: number): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`[カーソルなし] RightClick at (${x}, ${y}) → hwnd=${hwnd}`);
    const result = await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::RightClickAt([IntPtr]${hwnd}, ${x}, ${y})`
    );
    if (result === 'False') {
      throw new Error(`右クリック失敗: hwnd=${hwnd}`);
    }
  }

  /**
   * カーソルなしテキスト入力
   */
  async type(hwndOrTitle: number | string, text: string): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`[カーソルなし] Type: "${text}" → hwnd=${hwnd}`);
    const escaped = text.replace(/'/g, "''");
    const result = await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::TypeText([IntPtr]${hwnd}, '${escaped}')`
    );
    if (result === 'False') {
      throw new Error(`テキスト入力失敗: hwnd=${hwnd}`);
    }
  }

  /**
   * カーソルなしキー送信
   */
  async key(hwndOrTitle: number | string, keyName: string): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    const vk = VK_MAP[keyName] || VK_MAP[keyName.toUpperCase()];
    if (vk === undefined) {
      throw new Error(`不明なキー: "${keyName}"`);
    }
    this.logger(`[カーソルなし] Key: ${keyName} (VK=0x${vk.toString(16)}) → hwnd=${hwnd}`);
    const result = await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::SendKey([IntPtr]${hwnd}, ${vk})`
    );
    if (result === 'False') {
      throw new Error(`キー送信失敗: hwnd=${hwnd}`);
    }
  }

  /**
   * カーソルなしショートカット送信
   */
  async shortcut(hwndOrTitle: number | string, keys: string[]): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`[カーソルなし] Shortcut: ${keys.join('+')} → hwnd=${hwnd}`);

    // 全てのキーのVKコードを取得
    const vkCodes = keys.map(k => {
      const vk = VK_MAP[k] || VK_MAP[k.toUpperCase()];
      if (vk === undefined) throw new Error(`不明なキー: "${k}"`);
      return vk;
    });

    // KeyDown → 最後のキーをDown/Up → KeyUp（逆順）
    const script = vkCodes.map(vk =>
      `PostMessage([IntPtr]${hwnd}, 0x0100, [IntPtr]${vk}, [IntPtr]0)`
    ).join('\n') + '\nStart-Sleep -Milliseconds 30\n' +
    vkCodes.reverse().map(vk =>
      `PostMessage([IntPtr]${hwnd}, 0x0101, [IntPtr]${vk}, [IntPtr]0)`
    ).join('\n');

    await runPowerShell(
      `${WIN_API_HELPER}\n${script}`
    );
  }

  /**
   * ウィンドウをアクティブにする
   */
  async activate(hwndOrTitle: number | string): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`ウィンドウアクティブ化: hwnd=${hwnd}`);
    await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::Activate([IntPtr]${hwnd})`
    );
  }

  /**
   * ウィンドウを閉じる
   */
  async close(hwndOrTitle: number | string): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`ウィンドウ閉じる: hwnd=${hwnd}`);
    await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::Close([IntPtr]${hwnd})`
    );
  }

  /**
   * ウィンドウを最小化
   */
  async minimize(hwndOrTitle: number | string): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`ウィンドウ最小化: hwnd=${hwnd}`);
    await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::Minimize([IntPtr]${hwnd})`
    );
  }

  /**
   * ウィンドウを最大化
   */
  async maximize(hwndOrTitle: number | string): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`ウィンドウ最大化: hwnd=${hwnd}`);
    await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::Maximize([IntPtr]${hwnd})`
    );
  }

  /**
   * ウィンドウを復元
   */
  async restore(hwndOrTitle: number | string): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`ウィンドウ復元: hwnd=${hwnd}`);
    await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::Restore([IntPtr]${hwnd})`
    );
  }

  /**
   * ウィンドウの位置・サイズを取得
   */
  async getRect(hwndOrTitle: number | string): Promise<{ left: number; top: number; right: number; bottom: number } | null> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    const result = await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::GetRect([IntPtr]${hwnd})`
    );
    if (!result) return null;
    const [left, top, right, bottom] = result.split(',').map(Number);
    return { left, top, right, bottom };
  }
}
