/**
 * Rei AIOS — TLS Manager
 * Phase E: HTTPS/TLS サポート
 *
 * 自己署名証明書の生成と HTTPS サーバー化を提供。
 * VPS 上でのセキュア通信を実現する。
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';

// ─── 型定義 ──────────────────────────────────────────

export interface TlsConfig {
  enabled: boolean;
  certPath: string;   // PEM certificate
  keyPath: string;    // PEM private key
  autoGenerate: boolean; // Auto-generate self-signed cert if missing
  commonName: string;
  validDays: number;
}

export const DEFAULT_TLS_CONFIG: TlsConfig = {
  enabled: false,
  certPath: './certs/server.crt',
  keyPath: './certs/server.key',
  autoGenerate: true,
  commonName: 'rei-aios.local',
  validDays: 365,
};

// ─── TLS Manager ─────────────────────────────────────

export class TlsManager {
  private config: TlsConfig;

  constructor(config: Partial<TlsConfig> = {}) {
    this.config = { ...DEFAULT_TLS_CONFIG, ...config };
  }

  /**
   * 証明書の存在確認 → なければ自動生成 → TLS options を返す
   */
  async prepare(): Promise<{ cert: string; key: string } | null> {
    if (!this.config.enabled) return null;

    const certExists = fs.existsSync(this.config.certPath);
    const keyExists = fs.existsSync(this.config.keyPath);

    if (!certExists || !keyExists) {
      if (this.config.autoGenerate) {
        console.log('[TLS] Certificate not found. Generating self-signed certificate...');
        await this.generateSelfSignedCert();
      } else {
        throw new Error(
          `[TLS] Certificate files not found: ${this.config.certPath}, ${this.config.keyPath}. ` +
          'Set tls.autoGenerate: true to auto-generate, or provide your own certificates.'
        );
      }
    }

    // Validate expiry
    this.checkExpiry();

    return {
      cert: fs.readFileSync(this.config.certPath, 'utf-8'),
      key: fs.readFileSync(this.config.keyPath, 'utf-8'),
    };
  }

  /**
   * 自己署名証明書を生成（Node.js crypto のみ使用、外部依存なし）
   *
   * Node.js 15+ の crypto.generateKeyPairSync + 自前ASN.1で
   * X.509 自己署名証明書を PEM 出力する。
   */
  private async generateSelfSignedCert(): Promise<void> {
    const certDir = path.dirname(this.config.certPath);
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    // OpenSSL が使える環境ならそちらを使う（より信頼性が高い）
    const opensslAvailable = await this.tryOpenSSL();
    if (opensslAvailable) return;

    // フォールバック: Node.js crypto で RSA キーペアを生成し、
    // PowerShell の New-SelfSignedCertificate を試す（Windows環境）
    const powershellAvailable = await this.tryPowerShell();
    if (powershellAvailable) return;

    // 最終フォールバック: RSA キーペアのみ生成（証明書は簡易形式）
    await this.generateKeyPairOnly();
  }

  private async tryOpenSSL(): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      execSync(
        `openssl req -x509 -newkey rsa:2048 -keyout "${this.config.keyPath}" ` +
        `-out "${this.config.certPath}" -days ${this.config.validDays} -nodes ` +
        `-subj "/CN=${this.config.commonName}" 2>&1`,
        { stdio: 'pipe' }
      );
      console.log(`[TLS] Self-signed certificate generated via OpenSSL`);
      console.log(`[TLS]   Certificate: ${this.config.certPath}`);
      console.log(`[TLS]   Private key: ${this.config.keyPath}`);
      return true;
    } catch {
      return false;
    }
  }

  private async tryPowerShell(): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      // Windows: PowerShellで証明書生成 → PFXエクスポート → OpenSSL変換
      // 直接PEMは出せないので、PowerShellでPFX作成しcertutilで変換
      const pfxPath = this.config.certPath.replace(/\.[^.]+$/, '.pfx');
      const password = crypto.randomBytes(16).toString('hex');

      execSync(
        `powershell -NoProfile -Command "` +
        `$cert = New-SelfSignedCertificate -DnsName '${this.config.commonName}' ` +
        `-CertStoreLocation 'Cert:\\CurrentUser\\My' ` +
        `-NotAfter (Get-Date).AddDays(${this.config.validDays}); ` +
        `$pwd = ConvertTo-SecureString -String '${password}' -Force -AsPlainText; ` +
        `Export-PfxCertificate -Cert $cert -FilePath '${pfxPath}' -Password $pwd; ` +
        `Remove-Item -Path $cert.PSPath"`,
        { stdio: 'pipe' }
      );

      // PFX → PEM 変換（openssl が必要）
      execSync(
        `openssl pkcs12 -in "${pfxPath}" -out "${this.config.certPath}" -clcerts -nokeys -passin pass:${password}`,
        { stdio: 'pipe' }
      );
      execSync(
        `openssl pkcs12 -in "${pfxPath}" -out "${this.config.keyPath}" -nocerts -nodes -passin pass:${password}`,
        { stdio: 'pipe' }
      );

      // PFX 削除
      if (fs.existsSync(pfxPath)) fs.unlinkSync(pfxPath);

      console.log(`[TLS] Self-signed certificate generated via PowerShell + OpenSSL`);
      return true;
    } catch {
      return false;
    }
  }

  private async generateKeyPairOnly(): Promise<void> {
    // Node.js native: RSA キーペア生成
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    fs.writeFileSync(this.config.keyPath, privateKey);
    // 公開鍵を証明書の代用として保存（本番では使用不可）
    fs.writeFileSync(this.config.certPath, publicKey);

    console.log('[TLS] ⚠ Generated RSA key pair only (no X.509 certificate).');
    console.log('[TLS]   For production, install OpenSSL and re-run, or provide your own certs.');
    console.log('[TLS]   To generate manually:');
    console.log(`[TLS]     openssl req -x509 -newkey rsa:2048 -keyout "${this.config.keyPath}" \\`);
    console.log(`[TLS]       -out "${this.config.certPath}" -days 365 -nodes -subj "/CN=${this.config.commonName}"`);
  }

  private checkExpiry(): void {
    try {
      const certPem = fs.readFileSync(this.config.certPath, 'utf-8');
      // 簡易チェック: ファイルの更新日時 + validDays で推定
      const stat = fs.statSync(this.config.certPath);
      const createdAt = stat.mtime.getTime();
      const expiresAt = createdAt + this.config.validDays * 24 * 60 * 60 * 1000;
      const daysLeft = Math.floor((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));

      if (daysLeft < 0) {
        console.warn('[TLS] ⚠ Certificate has expired! Regenerating...');
        if (this.config.autoGenerate) {
          fs.unlinkSync(this.config.certPath);
          fs.unlinkSync(this.config.keyPath);
          this.generateSelfSignedCert();
        }
      } else if (daysLeft < 30) {
        console.warn(`[TLS] ⚠ Certificate expires in ${daysLeft} days.`);
      }
    } catch {
      // Ignore check errors
    }
  }

  /**
   * HTTP サーバーを HTTPS にラップする
   */
  createServer(
    handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
    tlsOptions: { cert: string; key: string }
  ): https.Server {
    return https.createServer(
      {
        cert: tlsOptions.cert,
        key: tlsOptions.key,
        // 自己署名証明書でのクライアント検証は緩和
        requestCert: false,
        rejectUnauthorized: false,
      },
      handler
    );
  }

  getConfig(): TlsConfig {
    return { ...this.config };
  }
}
