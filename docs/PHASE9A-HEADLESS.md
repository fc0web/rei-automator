# Phase 9a: ヘッドレスモード & Windowsサービス化

**バージョン:** v0.6.0
**前提:** Phase 8（カーソルなし実行）完了

---

## 概要

Phase 9aはRei AutomatorをVPS上で24時間稼働させるための基盤です。
ElectronのUIなしで動作する「ヘッドレスモード」を提供し、
Windowsサービスとして登録することでRDP切断後も自動実行を継続します。

### アーキテクチャ

```
┌─────────────────────────────────────────────┐
│  rei-headless CLI                           │
│  ┌───────────────────────────────────────┐  │
│  │  Daemon                               │  │
│  │  ├── ScriptWatcher (ファイル監視)      │  │
│  │  ├── TaskQueue (実行キュー)            │  │
│  │  ├── Scheduler (@schedule解析)        │  │
│  │  └── HealthServer (HTTP :19720)       │  │
│  └───────────────────────────────────────┘  │
│                    ↓                        │
│  ┌───────────────────────────────────────┐  │
│  │  Rei Runtime (既存)                    │  │
│  │  ├── Parser                           │  │
│  │  ├── WinApiBackend (cursorless)       │  │
│  │  └── ErrorHandler                     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         ↕
┌──────────────────┐
│  Windows Service  │  ← node-windows
│  (自動起動/復旧)  │
└──────────────────┘
```

---

## クイックスタート

### 1. 単発実行

```bash
# スクリプトを1回実行して終了
rei-headless run my-task.rei

# または短縮形
rei-headless my-task.rei
```

### 2. デーモンモード

```bash
# デフォルト設定で起動（./scripts を監視）
rei-headless daemon

# 監視ディレクトリ指定
rei-headless daemon --watch C:\tasks

# ヘルスポート変更
rei-headless daemon --port 8080
```

デーモン起動後:
- `./scripts/` 内の `.rei` ファイルを自動検知
- `@schedule` ディレクティブがあれば定期実行
- ファイルの追加/変更/削除をリアルタイム反映
- HTTP `:19720` でヘルスチェック提供

### 3. Windowsサービス化

```bash
# サービス登録（管理者権限が必要）
rei-headless service install

# サービス管理
rei-headless service start
rei-headless service stop
rei-headless service status

# サービス解除
rei-headless service uninstall
```

### 4. 状態確認

```bash
# デーモンのヘルスチェック
rei-headless health

# スケジュール済みタスク一覧
rei-headless list
```

---

## @schedule ディレクティブ

スクリプトの先頭10行以内に記述することで、デーモンが自動的にスケジュール実行します。

```rei
// @schedule every 30m     ← 30分ごと
// @schedule every 1h      ← 1時間ごと
// @schedule every 10s     ← 10秒ごと（テスト用）
// @schedule every 1d      ← 1日ごと
// @schedule once           ← デーモン起動時に1回だけ
```

### 例: 30分ごとのヘルスチェック

```rei
// @schedule every 30m
// VPSヘルスモニタリング

log("Health check started: " + now())
win_activate("health-log.txt")
win_key("health-log.txt", "End")
win_key("health-log.txt", "Enter")
win_type("health-log.txt", now() + " - OK")
win_shortcut("health-log.txt", "Ctrl+S")
```

---

## 設定ファイル

`rei-headless.json` をCLIと同じディレクトリに配置:

```json
{
  "watchDir": "./scripts",
  "logDir": "./logs",
  "logLevel": "info",
  "healthPort": 19720,
  "maxRetries": 3,
  "retryDelayMs": 5000,
  "executionMode": "cursorless",
  "defaultWindow": ""
}
```

| キー | 説明 | デフォルト |
|------|------|-----------|
| `watchDir` | .reiファイル監視ディレクトリ | `./scripts` |
| `logDir` | ログ出力先 | `./logs` |
| `logLevel` | ログレベル（debug/info/warn/error） | `info` |
| `healthPort` | ヘルスチェックHTTPポート | `19720` |
| `maxRetries` | タスク失敗時のリトライ回数 | `3` |
| `retryDelayMs` | リトライ間隔（ミリ秒） | `5000` |
| `executionMode` | 実行モード（cursor/cursorless） | `cursorless` |
| `defaultWindow` | カーソルなし時のデフォルトウィンドウ | (なし) |

---

## ヘルスAPI

デーモン起動中、HTTP `GET` でステータスを取得できます。

### `GET /health`

```json
{
  "ok": true,
  "version": "0.6.0-headless",
  "startedAt": 1708412400000,
  "activeTasks": 1,
  "completedTasks": 42,
  "errorTasks": 2,
  "pid": 12345,
  "memoryMB": 48.3
}
```

### `GET /tasks`

```json
{
  "tasks": [
    {
      "id": "c:/tasks/health-check.rei",
      "name": "health-check",
      "schedule": "every 30m",
      "running": false,
      "lastRun": "2026-02-20T10:30:00.000Z",
      "lastResult": "success",
      "runCount": 42,
      "errorCount": 0
    }
  ]
}
```

### `GET /stats`

統計情報のみ（`/health`のサブセット）。

---

## VPS 24時間稼働ガイド

### Windows VPSでの構築手順

1. **VPSにRei Automatorをデプロイ**
   ```bash
   git clone https://github.com/fc0web/rei-automator.git
   cd rei-automator
   npm install
   npm run build
   ```

2. **設定ファイルを配置**
   ```bash
   # rei-headless.json を編集
   # executionMode: "cursorless" を確認
   ```

3. **スクリプトを配置**
   ```bash
   mkdir scripts
   # .reiファイルをscripts/に配置
   ```

4. **サービスとして登録**
   ```bash
   # 管理者権限のコマンドプロンプトで
   rei-headless service install
   ```

5. **動作確認**
   ```bash
   rei-headless health
   rei-headless list
   ```

6. **RDPを切断** → サービスが自動で稼働を継続

### ポイント

- Phase 8の**カーソルなし実行**（SendMessage/PostMessage）がVPS稼働の鍵
  - RDP切断後もウィンドウオブジェクトは存在する
  - カーソル移動方式はRDP切断でウィンドウがなくなるため動作不可
- `executionMode: "cursorless"` を必ず設定
- ログは `./logs/` にローテーション保存

---

## ファイル構成

```
src/headless/
  cli.ts           — CLIエントリポイント
  daemon.ts        — デーモンプロセス（キュー・スケジューラ・ヘルスサーバー）
  service.ts       — Windowsサービス管理（node-windows）
  watcher.ts       — ファイル監視（fs.watch + ポーリング）
  health.ts        — ヘルスチェッククライアント
  index.ts         — バレルエクスポート
```

---

## 依存パッケージの追加

```bash
npm install node-windows
```

### package.json への追加

```json
{
  "scripts": {
    "headless": "ts-node src/headless/cli.ts",
    "headless:build": "tsc -p tsconfig.headless.json",
    "service:install": "node dist/headless/cli.js service install",
    "service:uninstall": "node dist/headless/cli.js service uninstall"
  }
}
```

### tsconfig.headless.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/headless"
  },
  "include": [
    "src/headless/**/*",
    "src/lib/**/*"
  ]
}
```

---

## Phase 9b への接続点

Phase 9aのヘルスHTTPサーバーは、Phase 9b（REST API/WebSocket）の土台:

| Phase 9a | Phase 9b |
|----------|----------|
| `/health` (GET) | REST API全般 |
| `/tasks` (GET) | タスクCRUD API |
| HTTPサーバー基盤 | WebSocketアップグレード |
| ローカル監視 | リモートタスク送信 |

Phase 9bでは、このHTTPサーバーを拡張して:
- `POST /tasks/run` — リモートからスクリプト実行
- `POST /tasks/schedule` — スケジュール登録
- `WebSocket /ws` — リアルタイムログ・ステータスストリーム
- 認証・APIキー

---

## コミットメッセージ案

```
feat: Phase 9a - headless daemon with Windows service support

- Add CLI entry point (run/daemon/service/health/list)
- Add daemon with task queue, scheduler, and file watcher
- Add @schedule directive for automatic periodic execution
- Add Windows service management via node-windows
- Add HTTP health endpoint on :19720
- Add sample scripts for VPS operation
```
