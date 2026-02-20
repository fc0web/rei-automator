/**
 * Rei Automator — Health Checker Client
 * Phase 9a: デーモンの死活監視クライアント
 *
 * CLIの `rei-headless health` / `rei-headless list` から使用。
 * デーモンが公開するHTTPエンドポイントに問い合わせる。
 */

import * as http from 'http';

// ─── 型定義 ──────────────────────────────────────────

export interface HealthResult {
  ok: boolean;
  uptime: number;       // seconds
  activeTasks: number;
  completedTasks: number;
  errorTasks: number;
  memoryMB: number;
  pid: number;
}

export interface TaskInfo {
  id: string;
  name: string;
  schedule?: string;
  running: boolean;
  lastRun?: string;
  lastResult?: string;
  runCount: number;
  errorCount: number;
}

// ─── HealthChecker ───────────────────────────────────

export class HealthChecker {
  private port: number;
  private host: string;
  private timeoutMs: number;

  constructor(port: number, host = '127.0.0.1', timeoutMs = 3000) {
    this.port = port;
    this.host = host;
    this.timeoutMs = timeoutMs;
  }

  /**
   * デーモンのヘルスチェック
   */
  async check(): Promise<HealthResult> {
    try {
      const data = await this.request('/health');
      return {
        ok: true,
        uptime: Math.floor((Date.now() - data.startedAt) / 1000),
        activeTasks: data.activeTasks || 0,
        completedTasks: data.completedTasks || 0,
        errorTasks: data.errorTasks || 0,
        memoryMB: data.memoryMB || 0,
        pid: data.pid || 0,
      };
    } catch {
      return {
        ok: false,
        uptime: 0,
        activeTasks: 0,
        completedTasks: 0,
        errorTasks: 0,
        memoryMB: 0,
        pid: 0,
      };
    }
  }

  /**
   * タスク一覧取得
   */
  async listTasks(): Promise<TaskInfo[]> {
    try {
      const data = await this.request('/tasks');
      return data.tasks || [];
    } catch {
      return [];
    }
  }

  /**
   * HTTP GETリクエスト
   */
  private request(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        {
          hostname: this.host,
          port: this.port,
          path,
          timeout: this.timeoutMs,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk: string) => { body += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });
  }
}
