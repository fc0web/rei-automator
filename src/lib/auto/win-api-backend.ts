/**
 * Rei Automator - Windows API バックエンド（カーソルなし実行）
 * 
 * Phase 9g: UIAutomation + SendInput 方式に再設計
 * 
 * テキスト入力の3段フォールバック:
 *   1. UIAutomation ValuePattern — フォーカス不要・カーソル不要・WinUI3対応
 *   2. SendInput API — 物理入力シミュレーション・WinUI3対応（要フォーカス）
 *   3. WM_CHAR PostMessage — レガシー Win32 アプリ用フォールバック
 * 
 * 利点:
 *   - カーソルを動かさない → 他の作業と干渉しない
 *   - RDP切断後も動作 → VPS対応
 *   - デーモン経由でもテキスト入力可能
 *   - Win11 WinUI3 アプリ（メモ帳等）に対応
 * 
 * 制約:
 *   - Windows専用
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

    // ── フォーカス強制取得用 ──────────────────
    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr lpdwProcessId);

    [DllImport("kernel32.dll")]
    static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("user32.dll")]
    static extern bool AllowSetForegroundWindow(int dwProcessId);

    [DllImport("user32.dll")]
    static extern bool BringWindowToTop(IntPtr hWnd);

    // ── SendInput API ─────────────────────────
    [DllImport("user32.dll", SetLastError = true)]
    static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public INPUTUNION u;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUTUNION {
        [FieldOffset(0)] public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    const uint INPUT_KEYBOARD = 1;
    const uint KEYEVENTF_UNICODE = 0x0004;
    const uint KEYEVENTF_KEYUP = 0x0002;

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

    // ── カーソルなしテキスト入力（レガシー WM_CHAR）──
    public static bool TypeText(IntPtr hWnd, string text) {
        if (hWnd == IntPtr.Zero) return false;
        foreach (char c in text) {
            PostMessage(hWnd, WM_CHAR, (IntPtr)c, IntPtr.Zero);
            Thread.Sleep(10);
        }
        return true;
    }

    // ── SendInput によるUnicode文字入力 ───────
    // フォーカスウィンドウに対して物理キーボード入力をシミュレート
    // WinUI3 を含むすべてのアプリで動作する
    public static bool TypeViaSendInput(string text) {
        var inputs = new List<INPUT>();
        foreach (char c in text) {
            // KeyDown
            inputs.Add(new INPUT {
                type = INPUT_KEYBOARD,
                u = new INPUTUNION {
                    ki = new KEYBDINPUT {
                        wVk = 0,
                        wScan = (ushort)c,
                        dwFlags = KEYEVENTF_UNICODE,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero
                    }
                }
            });
            // KeyUp
            inputs.Add(new INPUT {
                type = INPUT_KEYBOARD,
                u = new INPUTUNION {
                    ki = new KEYBDINPUT {
                        wVk = 0,
                        wScan = (ushort)c,
                        dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero
                    }
                }
            });
        }
        var inputArray = inputs.ToArray();
        uint sent = SendInput((uint)inputArray.Length, inputArray, Marshal.SizeOf(typeof(INPUT)));
        return sent == inputArray.Length;
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

    // ── 強制フォーカス取得（デーモン対応）─────
    // AttachThreadInput でスレッドを接続し、フォアグラウンド権限を得る
    public static bool ForceActivate(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return false;
        
        IntPtr foreground = GetForegroundWindow();
        uint foreThread = GetWindowThreadProcessId(foreground, IntPtr.Zero);
        uint curThread = GetCurrentThreadId();
        uint targetThread = GetWindowThreadProcessId(hWnd, IntPtr.Zero);
        
        bool attached = false;
        try {
            // 現在のフォアグラウンドスレッドに接続
            if (foreThread != curThread) {
                attached = AttachThreadInput(curThread, foreThread, true);
            }
            
            ShowWindow(hWnd, SW_RESTORE);
            BringWindowToTop(hWnd);
            SetForegroundWindow(hWnd);
            
            return true;
        } finally {
            if (attached) {
                AttachThreadInput(curThread, foreThread, false);
            }
        }
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

// ── UIAutomation PowerShell スニペット ──────────────────
// フォーカス不要・カーソル不要でテキストを設定する
// Win11 WinUI3 アプリ（メモ帳等）に対応

const UIA_TYPE_SCRIPT = (hwnd: number, text: string): string => {
  const escapedText = text.replace(/'/g, "''").replace(/\\/g, '\\\\');
  return `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$hwnd = [IntPtr]${hwnd}
$text = '${escapedText}'

try {
    $ae = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)

    # 方式A: ウィンドウ直下のValuePatternを探す（多くのエディタ）
    $vpCond = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::IsValuePatternAvailableProperty, $true
    )
    $editEl = $ae.FindFirst(
        [System.Windows.Automation.TreeScope]::Descendants, $vpCond
    )

    if ($editEl -ne $null) {
        $vp = $editEl.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        # 現在値の末尾に追加（SetValueは置換なので既存値を取得して連結）
        try {
            $current = $vp.Current.Value
        } catch {
            $current = ''
        }
        $vp.SetValue($current + $text)
        Write-Output 'UIA_VALUE_OK'
    } else {
        # 方式B: TextPatternを探す（リッチエディタ等）
        # TextPattern は読み取り専用の場合が多いので、ValuePattern 失敗時の情報提供用
        Write-Output 'UIA_NO_PATTERN'
    }
} catch {
    Write-Output "UIA_ERROR:$($_.Exception.Message)"
}
`;
};

// ── SendInput PowerShell スニペット ─────────────────────
// ForceActivate でフォーカスを奪い、SendInput で Unicode 入力
// UIAutomation 失敗時のフォールバック

const SENDINPUT_TYPE_SCRIPT = (hwnd: number, text: string): string => {
  const escapedText = text.replace(/'/g, "''").replace(/\\/g, '\\\\');
  return `
${WIN_API_HELPER}
$hwnd = [IntPtr]${hwnd}
$text = '${escapedText}'

# ForceActivate でフォーカスを確実に取得
[ReiWinApi]::ForceActivate($hwnd)
Start-Sleep -Milliseconds 150

# SendInput で Unicode 文字を直接入力
$result = [ReiWinApi]::TypeViaSendInput($text)
if ($result) {
    Write-Output 'SENDINPUT_OK'
} else {
    Write-Output 'SENDINPUT_FAIL'
}
`;
};

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

// ── テキスト入力方式 ────────────────────────────────────

export type TypeMethod = 'uia' | 'sendinput' | 'wm_char' | 'auto';

// ── PowerShell実行ヘルパー ───────────────────────────────

function runPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script,
    ], { timeout: 15000, windowsHide: true }, (error, stdout, stderr) => {
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

  /** デフォルトのテキスト入力方式。'auto' は UIAutomation → SendInput → WM_CHAR の順に試行 */
  public defaultTypeMethod: TypeMethod = 'auto';

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
   * テキスト入力 — 3段フォールバック方式
   * 
   * 入力方式（method パラメータで指定可能、デフォルト 'auto'）:
   *   'auto'      — UIAutomation → SendInput → WM_CHAR の順に試行
   *   'uia'       — UIAutomation ValuePattern のみ
   *   'sendinput'  — SendInput API のみ（要フォーカス）
   *   'wm_char'   — WM_CHAR PostMessage のみ（レガシー）
   * 
   * @param hwndOrTitle ウィンドウハンドル or タイトル（部分一致）
   * @param text 入力するテキスト
   * @param method 入力方式（省略時は defaultTypeMethod を使用）
   */
  async type(hwndOrTitle: number | string, text: string, method?: TypeMethod): Promise<void> {
    const resolvedMethod = method || this.defaultTypeMethod;
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;

    this.logger(`[Type] "${text}" → hwnd=${hwnd} (method=${resolvedMethod})`);

    if (resolvedMethod === 'uia') {
      await this.typeViaUIA(hwnd, text);
      return;
    }

    if (resolvedMethod === 'sendinput') {
      await this.typeViaSendInput(hwnd, text);
      return;
    }

    if (resolvedMethod === 'wm_char') {
      await this.typeViaWmChar(hwnd, text);
      return;
    }

    // ── auto: 3段フォールバック ──
    // 1. UIAutomation（フォーカス不要・カーソル不要）
    this.logger('[Type:auto] 方式1: UIAutomation ValuePattern を試行');
    try {
      const uiaResult = await runPowerShell(UIA_TYPE_SCRIPT(hwnd, text));
      if (uiaResult === 'UIA_VALUE_OK') {
        this.logger('[Type:auto] UIAutomation 成功');
        return;
      }
      this.logger(`[Type:auto] UIAutomation 不可: ${uiaResult}`);
    } catch (err: any) {
      this.logger(`[Type:auto] UIAutomation エラー: ${err.message}`);
    }

    // 2. SendInput（ForceActivate + Unicode入力）
    this.logger('[Type:auto] 方式2: SendInput (ForceActivate) を試行');
    try {
      const siResult = await runPowerShell(SENDINPUT_TYPE_SCRIPT(hwnd, text));
      if (siResult === 'SENDINPUT_OK') {
        this.logger('[Type:auto] SendInput 成功');
        return;
      }
      this.logger(`[Type:auto] SendInput 不可: ${siResult}`);
    } catch (err: any) {
      this.logger(`[Type:auto] SendInput エラー: ${err.message}`);
    }

    // 3. WM_CHAR フォールバック（レガシー Win32 アプリ用）
    this.logger('[Type:auto] 方式3: WM_CHAR PostMessage フォールバック');
    await this.typeViaWmChar(hwnd, text);
  }

  /**
   * UIAutomation ValuePattern でテキストを設定
   * フォーカス不要・カーソル不要・Win11 WinUI3 対応
   */
  private async typeViaUIA(hwnd: number, text: string): Promise<void> {
    const result = await runPowerShell(UIA_TYPE_SCRIPT(hwnd, text));
    if (result === 'UIA_VALUE_OK') {
      this.logger('[Type:UIA] 成功');
      return;
    }
    throw new Error(`UIAutomation 失敗: ${result}`);
  }

  /**
   * SendInput API でテキストを入力
   * ForceActivate でフォーカスを奪い、Unicode文字を物理入力としてシミュレート
   */
  private async typeViaSendInput(hwnd: number, text: string): Promise<void> {
    const result = await runPowerShell(SENDINPUT_TYPE_SCRIPT(hwnd, text));
    if (result === 'SENDINPUT_OK') {
      this.logger('[Type:SendInput] 成功');
      return;
    }
    throw new Error(`SendInput 失敗: ${result}`);
  }

  /**
   * WM_CHAR PostMessage でテキストを入力（レガシー方式）
   * Win32クラシックアプリでは動作するが、WinUI3には届かない
   */
  private async typeViaWmChar(hwnd: number, text: string): Promise<void> {
    const result = await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::TypeText([IntPtr]${hwnd}, '${text.replace(/'/g, "''")}')`
    );
    if (result === 'False') {
      throw new Error(`WM_CHAR テキスト入力失敗: hwnd=${hwnd}`);
    }
    this.logger('[Type:WM_CHAR] 成功');
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
    [...vkCodes].reverse().map(vk =>
      `PostMessage([IntPtr]${hwnd}, 0x0101, [IntPtr]${vk}, [IntPtr]0)`
    ).join('\n');

    await runPowerShell(
      `${WIN_API_HELPER}\n${script}`
    );
  }

  /**
   * ウィンドウをアクティブにする
   * デーモン対応: ForceActivate（AttachThreadInput方式）優先
   */
  async activate(hwndOrTitle: number | string): Promise<void> {
    const hwnd = typeof hwndOrTitle === 'string'
      ? await this.findWindow(hwndOrTitle) : hwndOrTitle;
    this.logger(`ウィンドウアクティブ化 (ForceActivate): hwnd=${hwnd}`);
    await runPowerShell(
      `${WIN_API_HELPER}\n[ReiWinApi]::ForceActivate([IntPtr]${hwnd})`
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
