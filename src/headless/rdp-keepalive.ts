/**
 * Rei AIOS — RDP Session Keepalive
 * Phase E: VPS セッション維持
 *
 * Windows VPS 上で RDP 切断後もプロセスとウィンドウハンドルを維持する。
 *
 * 問題:
 *   RDP 切断 → セッションがロック → 一部のGUI操作が失敗
 *   長時間放置 → セッション切断 → ウィンドウハンドルが無効化
 *
 * 解決:
 *   1. セッション状態の監視
 *   2. ロック画面でも SendMessage/PostMessage は動作する（cursorless モード）
 *   3. セッション切断を検知してログ出力
 *   4. 必要に応じて tscon で再接続
 */

import { EventEmitter } from 'events';

// ─── 型定義 ──────────────────────────────────────────

export interface RdpKeepaliveConfig {
  enabled: boolean;
  checkInterval: number;     // ms (default: 30000 = 30s)
  preventLockScreen: boolean; // スクリーンセーバー無効化を試みる
  logSessionChanges: boolean; // セッション変更をログ出力
}

export interface SessionStatus {
  connected: boolean;
  sessionId: number;
  locked: boolean;
  lastCheck: number;
  lastConnected: number;
  lastDisconnected: number;
  uptime: number;  // seconds since daemon start
}

const DEFAULT_CONFIG: RdpKeepaliveConfig = {
  enabled: false,
  checkInterval: 30000,
  preventLockScreen: true,
  logSessionChanges: true,
};

// ─── RDP Keepalive ───────────────────────────────────

export class RdpKeepalive extends EventEmitter {
  private config: RdpKeepaliveConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private status: SessionStatus;
  private startedAt: number;

  constructor(config: Partial<RdpKeepaliveConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startedAt = Date.now();
    this.status = {
      connected: true,
      sessionId: 0,
      locked: false,
      lastCheck: 0,
      lastConnected: Date.now(),
      lastDisconnected: 0,
      uptime: 0,
    };
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[RDP] Session keepalive disabled.');
      return;
    }

    if (process.platform !== 'win32') {
      console.log('[RDP] Session keepalive is Windows-only. Skipping.');
      return;
    }

    console.log('[RDP] Session keepalive started.');

    // 初回チェック
    await this.checkSession();

    // スクリーンセーバー無効化
    if (this.config.preventLockScreen) {
      await this.disableScreenSaver();
    }

    // 定期チェック
    this.timer = setInterval(() => this.checkSession(), this.config.checkInterval);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[RDP] Session keepalive stopped.');
  }

  getStatus(): SessionStatus {
    return { ...this.status };
  }

  // ─── Session Check ─────────────────────────────

  private async checkSession(): Promise<void> {
    this.status.lastCheck = Date.now();
    this.status.uptime = Math.floor((Date.now() - this.startedAt) / 1000);

    try {
      const { execSync } = require('child_process');

      // query session で現在のセッション状態を取得
      const output = execSync('query session 2>&1', {
        encoding: 'utf-8',
        timeout: 5000,
        windowsHide: true,
      });

      const wasConnected = this.status.connected;

      // "Active" があれば接続中
      this.status.connected = /Active/i.test(output);

      // セッション ID を取得
      const sessionMatch = output.match(/(\d+)\s+Active/);
      if (sessionMatch) {
        this.status.sessionId = parseInt(sessionMatch[1], 10);
      }

      // ロック状態チェック（tasklist で LogonUI.exe の有無）
      try {
        const taskOutput = execSync('tasklist /FI "IMAGENAME eq LogonUI.exe" 2>&1', {
          encoding: 'utf-8',
          timeout: 5000,
          windowsHide: true,
        });
        this.status.locked = /LogonUI\.exe/i.test(taskOutput);
      } catch {
        this.status.locked = false;
      }

      // 状態変化の検知とログ
      if (this.config.logSessionChanges) {
        if (wasConnected && !this.status.connected) {
          this.status.lastDisconnected = Date.now();
          console.log('[RDP] ⚠ Session disconnected. Cursorless mode will continue to work.');
          this.emit('disconnected', this.status);
        } else if (!wasConnected && this.status.connected) {
          this.status.lastConnected = Date.now();
          console.log('[RDP] ✓ Session reconnected.');
          this.emit('reconnected', this.status);
        }
      }
    } catch (err: any) {
      // query session が使えない環境（非RDP）
      this.status.connected = true; // ローカルコンソールと仮定
    }
  }

  // ─── Screen Saver Prevention ───────────────────

  /**
   * スクリーンセーバーとディスプレイOFFを無効化
   * VPS では画面が見えなくてもセッション維持に影響する場合がある
   */
  private async disableScreenSaver(): Promise<void> {
    try {
      const { execSync } = require('child_process');

      // 電源設定: ディスプレイOFF無効化、スリープ無効化
      execSync('powershell -NoProfile -Command "powercfg /change monitor-timeout-ac 0"', {
        stdio: 'pipe',
        windowsHide: true,
      });
      execSync('powershell -NoProfile -Command "powercfg /change standby-timeout-ac 0"', {
        stdio: 'pipe',
        windowsHide: true,
      });

      // スクリーンセーバー無効化（レジストリ）
      execSync(
        'reg add "HKCU\\Control Panel\\Desktop" /v ScreenSaveActive /t REG_SZ /d 0 /f',
        { stdio: 'pipe', windowsHide: true }
      );

      console.log('[RDP] Screen saver and display timeout disabled.');
    } catch (err: any) {
      console.warn(`[RDP] Failed to disable screen saver: ${err.message}`);
    }
  }

  // ─── Session Reconnect (Advanced) ──────────────

  /**
   * RDP セッションを tscon で再接続（管理者権限が必要）
   * 通常は不要（cursorless モードで動作するため）
   */
  async reconnectSession(targetSessionId?: number): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      const sessionId = targetSessionId || this.status.sessionId;

      if (sessionId <= 0) {
        console.warn('[RDP] No valid session ID for reconnection.');
        return false;
      }

      // tscon でコンソールセッションに再接続
      execSync(`tscon ${sessionId} /dest:console`, {
        stdio: 'pipe',
        windowsHide: true,
      });

      console.log(`[RDP] Session ${sessionId} reconnected to console.`);
      this.status.connected = true;
      this.status.lastConnected = Date.now();
      this.emit('reconnected', this.status);
      return true;
    } catch (err: any) {
      console.warn(`[RDP] Reconnect failed: ${err.message}`);
      return false;
    }
  }
}
