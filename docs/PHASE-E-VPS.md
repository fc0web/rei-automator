# Phase E: VPS運用・セキュア通信

**バージョン:** v0.5.0+
**前提:** Phase 9a-9d（ヘッドレスデーモン・API・クラスタ）完了

---

## 概要

Phase Eは Rei Automator / Rei-AIOS を Windows VPS 上で24時間安全に稼働させるための基盤です。

### 新規追加ファイル

```
src/headless/
  ├── tls-manager.ts        ← HTTPS/TLS 証明書管理（190行）
  ├── tunnel-client.ts      ← SSH/WS リバーストンネル（280行）
  ├── rdp-keepalive.ts      ← RDP セッション維持（220行）
  ├── vps-integration.ts    ← VPS機能統合モジュール（130行）
  └── index.ts              ← ★更新（Phase E exports追加）

scripts/
  └── vps-deploy.ps1        ← VPS デプロイスクリプト（250行）

docs/
  └── PHASE-E-VPS.md        ← 本ドキュメント
```

**合計: 約1,070行の追加**

---

## アーキテクチャ

```
┌──────────────────────────────────────────────────────────┐
│  VPS (Windows Server)                                     │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Daemon (既存)                                     │   │
│  │  ├── TaskQueue / Scheduler / Watcher              │   │
│  │  ├── ApiServer (:19720)                           │   │
│  │  │     ├── HTTP  → TLS Manager → HTTPS            │ ← NEW
│  │  │     ├── REST API + Auth                        │   │
│  │  │     └── WebSocket                              │   │
│  │  ├── NodeManager (クラスタ)                        │   │
│  │  └── VPS Integration                              │ ← NEW
│  │        ├── TLS Manager (証明書管理)                │   │
│  │        ├── Tunnel Client (SSH/WS リバーストンネル) │   │
│  │        └── RDP Keepalive (セッション維持)          │   │
│  └───────────────────────────────────────────────────┘   │
│                    ↕ SSH -R / WS Relay                    │
└──────────────────────────────────────────────────────────┘
         ↕ HTTPS
┌──────────────────┐
│  ローカルPC / 他VPS │
│  ├── Dashboard    │
│  ├── PS Client    │
│  └── WS Monitor   │
└──────────────────┘
```

---

## 1. HTTPS/TLS サポート

### 自動証明書生成

初回起動時に自己署名証明書を自動生成します。

```json
// rei-headless.json
{
  "tls": {
    "enabled": true,
    "certPath": "./certs/server.crt",
    "keyPath": "./certs/server.key",
    "autoGenerate": true,
    "commonName": "rei-aios.local",
    "validDays": 365
  }
}
```

### 手動生成（OpenSSL）

```powershell
# OpenSSL がある場合
openssl req -x509 -newkey rsa:2048 -keyout certs/server.key `
  -out certs/server.crt -days 365 -nodes -subj "/CN=rei-aios.local"

# またはデプロイスクリプト使用
.\scripts\vps-deploy.ps1 -GenerateCert
```

### Let's Encrypt（本番推奨）

```powershell
# Certbot for Windows
winget install Certbot
certbot certonly --standalone -d your-domain.com
```

`certPath` / `keyPath` を Let's Encrypt の出力パスに変更してください。

---

## 2. セキュアトンネル

VPS のポートを直接インターネットに公開せずにアクセスする方法。

### 方式1: SSH リバーストンネル（推奨）

```
ローカルPC → relay-server:19720 → SSH → VPS:19720
```

```json
// rei-headless.json
{
  "tunnel": {
    "enabled": true,
    "method": "ssh",
    "ssh": {
      "host": "relay.example.com",
      "port": 22,
      "user": "tunnel-user",
      "keyPath": "C:\\Users\\admin\\.ssh\\id_rsa",
      "remotePort": 19720,
      "localPort": 19720,
      "keepAlive": 60,
      "autoreconnect": true,
      "reconnectDelay": 5000
    }
  }
}
```

**前提条件:**
- 中継サーバー（relay server）が必要（安価なLinux VPSで可）
- relay server の sshd_config に `GatewayPorts yes` を設定
- VPS に SSH クライアントがインストール済み（Windows 10+ は標準搭載）

### 方式2: WS リレートンネル

SSH が使えない環境向け。WebSocket ベースのリレーサーバーを経由。

```json
{
  "tunnel": {
    "enabled": true,
    "method": "ws-relay",
    "wsRelay": {
      "relayUrl": "wss://relay.example.com/tunnel",
      "channelId": "my-vps-001",
      "authToken": "your-secret-token",
      "reconnectDelay": 5000
    }
  }
}
```

### 方式3: VPN（手動設定）

WireGuard や Tailscale を使用する場合は、daemon のポートをVPNネットワーク内のみに公開。

```json
{
  "apiHost": "10.0.0.1",  // VPN の IP のみリッスン
  "tls": { "enabled": false }  // VPN内なのでTLS不要
}
```

**Tailscale の場合（最も簡単）:**
```powershell
# VPS と ローカルPC 両方に Tailscale をインストール
winget install Tailscale
tailscale up

# VPS の Tailscale IP で直接アクセス
curl http://100.x.y.z:19720/health
```

---

## 3. RDP セッション維持

VPS で RDP を切断しても自動化が継続するための機能。

```json
{
  "rdpKeepalive": {
    "enabled": true,
    "checkInterval": 30000,
    "preventLockScreen": true,
    "logSessionChanges": true
  }
}
```

### 動作

- **RDP接続中:** 通常動作（cursor / cursorless 両方OK）
- **RDP切断後:** cursorless モード（SendMessage/PostMessage）は継続動作
- **セッション変化:** ログに記録、イベント発火

### 重要事項

- VPS では **必ず `executionMode: "cursorless"` を使用**
- cursor モード（マウス移動方式）はRDP切断で動作不可
- スクリーンセーバーとスリープは自動で無効化される

---

## 4. VPS デプロイ

### 初回デプロイ（PowerShell）

```powershell
# ローカルからVPSに一括デプロイ
.\scripts\vps-deploy.ps1 -VpsHost "192.168.1.100" -VpsUser "administrator"

# サービスとして登録も同時に
.\scripts\vps-deploy.ps1 -VpsHost "192.168.1.100" -VpsUser "administrator" -InstallService
```

### 手動デプロイ

```powershell
# 1. VPS に SSH
ssh administrator@192.168.1.100

# 2. リポジトリクローン
git clone https://github.com/fc0web/rei-automator.git C:\rei-aios
cd C:\rei-aios

# 3. セットアップ
npm install
npm run build

# 4. 設定ファイル作成
# rei-headless.json を編集

# 5. デーモン起動
node dist/headless/cli.js daemon

# 6. サービスとして登録（24時間稼働）
node dist/headless/cli.js service install
```

### 更新デプロイ

```powershell
.\scripts\vps-deploy.ps1 -VpsHost "192.168.1.100" -VpsUser "administrator" -UpdateOnly
```

---

## 5. 設定ファイル（完全版）

```json
{
  "watchDir": "./scripts",
  "logDir": "./logs",
  "logLevel": "info",
  "healthPort": 19720,
  "maxRetries": 3,
  "retryDelayMs": 5000,
  "executionMode": "cursorless",
  "defaultWindow": "",
  "apiHost": "0.0.0.0",
  "authEnabled": true,

  "tls": {
    "enabled": true,
    "certPath": "./certs/server.crt",
    "keyPath": "./certs/server.key",
    "autoGenerate": true,
    "commonName": "rei-aios.local",
    "validDays": 365
  },

  "tunnel": {
    "enabled": false,
    "method": "none",
    "ssh": {
      "host": "",
      "port": 22,
      "user": "",
      "keyPath": "",
      "remotePort": 19720,
      "localPort": 19720,
      "keepAlive": 60,
      "autoreconnect": true,
      "reconnectDelay": 5000
    }
  },

  "rdpKeepalive": {
    "enabled": true,
    "checkInterval": 30000,
    "preventLockScreen": true,
    "logSessionChanges": true
  },

  "clusterEnabled": false,
  "seedNodes": []
}
```

---

## 6. daemon.ts への統合方法

`daemon.ts` の `start()` メソッド内に以下を追加:

```typescript
import { VpsIntegration } from './vps-integration';

// start() 内:
const vpsIntegration = new VpsIntegration({
  tls: this.config.tls,
  tunnel: this.config.tunnel,
  rdpKeepalive: this.config.rdpKeepalive,
}, this.logger);
await vpsIntegration.start();

// ApiServer を HTTPS モードで起動する場合:
const tlsOptions = vpsIntegration.getTlsOptions();
// → tlsOptions を apiServer に渡す
```

**注意:** この統合は次の Step で行います。Phase E のファイル追加のみで
既存コードへの変更は最小限です。

---

## 7. セキュリティチェックリスト

| 項目 | 説明 | 推奨 |
|------|------|------|
| TLS | HTTPS 通信暗号化 | ✅ 本番では必須 |
| API Key | 認証トークン | ✅ authEnabled: true |
| ファイアウォール | ポート制限 | ✅ 19720 のみ開放 |
| SSH鍵認証 | パスワード認証無効化 | ✅ 推奨 |
| VPN | ネットワーク分離 | ◎ Tailscale が最も簡単 |
| RDP | 切断対策 | ✅ rdpKeepalive: true |

---

## コミットメッセージ案

```
feat: Phase E - VPS deployment with TLS, secure tunnel, and RDP keepalive

- Add TLS manager with auto-generated self-signed certificates
- Add SSH reverse tunnel and WebSocket relay tunnel clients
- Add RDP session keepalive for VPS operation
- Add VPS integration module combining all VPS features
- Add VPS deployment PowerShell script
- Update headless index with Phase E exports
- Add comprehensive VPS documentation
```
