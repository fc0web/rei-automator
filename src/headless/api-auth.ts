/**
 * Rei Automator — API Authentication
 * Phase 9b: APIキー認証
 *
 * シンプルなAPIキー方式で認証。
 * 初回起動時にランダムキーを自動生成し、設定ファイルに保存。
 * リクエストヘッダー Authorization: Bearer <key> で認証。
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as http from 'http';
import { Logger } from '../lib/core/logger';

// ─── 型定義 ──────────────────────────────────────────

export interface AuthConfig {
  enabled: boolean;
  apiKeys: ApiKeyEntry[];
  keyFilePath: string;
}

export interface ApiKeyEntry {
  key: string;
  name: string;           // 識別名（例: "local-dashboard", "vps-01"）
  createdAt: string;
  permissions: Permission[];
}

export type Permission =
  | 'read'        // GET系 — 状態取得
  | 'execute'     // POST /tasks/run — スクリプト実行
  | 'admin';      // 全操作 — サービス管理含む

const DEFAULT_KEY_FILE = './rei-api-keys.json';

// ─── ApiAuth クラス ──────────────────────────────────

export class ApiAuth {
  private config: AuthConfig;
  private logger: Logger;
  private keys: Map<string, ApiKeyEntry> = new Map();

  constructor(config: Partial<AuthConfig>, logger: Logger) {
    this.config = {
      enabled: config.enabled ?? true,
      apiKeys: config.apiKeys ?? [],
      keyFilePath: config.keyFilePath ?? DEFAULT_KEY_FILE,
    };
    this.logger = logger;
    this.loadKeys();
  }

  // ─── キー管理 ────────────────────────────────────

  /**
   * キーをファイルから読み込み。なければ初期キーを自動生成。
   */
  private loadKeys(): void {
    const keyPath = path.resolve(this.config.keyFilePath);

    if (fs.existsSync(keyPath)) {
      try {
        const raw = fs.readFileSync(keyPath, 'utf-8');
        const data = JSON.parse(raw);
        for (const entry of data.keys || []) {
          this.keys.set(entry.key, entry);
        }
        this.logger.info(`Loaded ${this.keys.size} API key(s)`);
      } catch (err: any) {
        this.logger.error(`Failed to load API keys: ${err.message}`);
      }
    }

    // キーが一つもなければ自動生成
    if (this.keys.size === 0 && this.config.enabled) {
      const entry = this.generateKey('default-admin', ['admin']);
      this.logger.info('');
      this.logger.info('═══════════════════════════════════════════');
      this.logger.info('  API Key generated (save this!):');
      this.logger.info(`  ${entry.key}`);
      this.logger.info('═══════════════════════════════════════════');
      this.logger.info('');
      this.saveKeys();
    }
  }

  /**
   * 新しいAPIキーを生成
   */
  generateKey(name: string, permissions: Permission[]): ApiKeyEntry {
    const key = `rei_${crypto.randomBytes(24).toString('hex')}`;
    const entry: ApiKeyEntry = {
      key,
      name,
      createdAt: new Date().toISOString(),
      permissions,
    };
    this.keys.set(key, entry);
    this.saveKeys();
    return entry;
  }

  /**
   * APIキーを削除
   */
  revokeKey(key: string): boolean {
    const deleted = this.keys.delete(key);
    if (deleted) this.saveKeys();
    return deleted;
  }

  /**
   * 全キー一覧（キー本体はマスク）
   */
  listKeys(): Array<{ name: string; masked: string; createdAt: string; permissions: Permission[] }> {
    return Array.from(this.keys.values()).map(entry => ({
      name: entry.name,
      masked: entry.key.slice(0, 8) + '...' + entry.key.slice(-4),
      createdAt: entry.createdAt,
      permissions: entry.permissions,
    }));
  }

  private saveKeys(): void {
    const keyPath = path.resolve(this.config.keyFilePath);
    const data = { keys: Array.from(this.keys.values()) };
    fs.writeFileSync(keyPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // ─── 認証チェック ────────────────────────────────

  /**
   * HTTPリクエストを認証
   * @returns 認証済みのApiKeyEntry、または null（認証失敗）
   */
  authenticate(req: http.IncomingMessage): ApiKeyEntry | null {
    if (!this.config.enabled) {
      // 認証無効時は全権限を持つダミーエントリを返す
      return {
        key: '',
        name: 'anonymous',
        createdAt: '',
        permissions: ['admin'],
      };
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;

    // Bearer token
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;

    const token = match[1].trim();
    return this.keys.get(token) || null;
  }

  /**
   * 権限チェック
   */
  hasPermission(entry: ApiKeyEntry, required: Permission): boolean {
    if (entry.permissions.includes('admin')) return true;
    return entry.permissions.includes(required);
  }

  /**
   * 認証ミドルウェア用のヘルパー
   * 認証失敗時は401/403レスポンスを送信してfalseを返す
   */
  authorize(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    required: Permission
  ): ApiKeyEntry | null {
    const entry = this.authenticate(req);

    if (!entry) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Unauthorized',
        message: 'Missing or invalid API key. Use Authorization: Bearer <key>',
      }));
      return null;
    }

    if (!this.hasPermission(entry, required)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Forbidden',
        message: `Requires '${required}' permission`,
      }));
      return null;
    }

    return entry;
  }
}
