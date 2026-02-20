# Phase 9b: REST API & WebSocket サーバー

**バージョン:** v0.6.0
**前提:** Phase 9a（ヘッドレスモード）完了

---

## 概要

Phase 9bはRei Automatorに「耳と口」を与えます。
REST APIでリモートからタスク指示を受け取り、WebSocketでリアルタイムにログ・状態を配信します。

### アーキテクチャ

```
┌──────────────────┐      ┌──────────────────────────────────────┐
│  ローカルPC       │      │  VPS（Rei Automator Daemon）           │
│  ┌──────────┐    │      │  ┌──────────────────────────────┐    │
│  │ Dashboard │◄───┼──WS──┤  │  ApiServer (:19720)          │    │
│  │ (Phase9c) │    │      │  │  ├── REST API (/api/*)       │    │
│  └──────────┘    │      │  │  ├── WebSocket (/ws)          │    │
│  ┌──────────┐    │      │  │  └── Auth (API Key)           │    │
│  │ PS Client│────┼─REST──┤  └──────────┬───────────────────┘    │
│  └──────────┘    │      │              │                        │
│  ┌──────────┐    │      │  ┌───────────▼──────────────────┐    │
│  │ WS Monitor│◄──┼──WS──┤  │  Daemon                      │    │
│  └──────────┘    │      │  │  ├── TaskQueue                │    │
└──────────────────┘      │  │  ├── Scheduler                │    │
                          │  │  └── Watcher                  │    │
                          │  └──────────────────────────────┘    │
                          └──────────────────────────────────────┘
```

---

## REST API リファレンス

**ベースURL:** `http://<host>:19720`
**認証:** `Authorization: Bearer <api-key>` ヘッダー

### ヘルス（認証不要）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/stats` | 統計情報 |

### タスク管理（read権限）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/tasks` | タスク一覧 |
| GET | `/api/tasks/:id` | タスク詳細 |
| GET | `/api/logs` | 実行ログ（`?limit=100&level=error&task=xxx`） |
| GET | `/api/ws/clients` | WebSocket接続一覧 |

### タスク実行（execute権限）

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/tasks/run` | スクリプト即座実行 |
| POST | `/api/tasks/schedule` | スケジュール登録 |
| POST | `/api/tasks/:id/stop` | タスク停止 |

### 管理（admin権限）

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/keys` | APIキー生成 |
| GET | `/api/keys` | APIキー一覧 |
| DELETE | `/api/keys/:key` | APIキー削除 |
| POST | `/api/daemon/reload` | デーモンリロード |

---

## API使用例

### スクリプトを直接送信して実行

```bash
curl -X POST http://localhost:19720/api/tasks/run \
  -H "Authorization: Bearer rei_xxxx..." \
  -H "Content-Type: application/json" \
  -d '{"code": "click(100, 200)\nwait(1000)\nclick(300, 400)", "name": "test-task"}'
```

レスポンス:
```json
{
  "message": "Task queued",
  "taskId": "remote-1708412400000",
  "name": "test-task"
}
```

### watchDir内のファイルを実行

```bash
curl -X POST http://localhost:19720/api/tasks/run \
  -H "Authorization: Bearer rei_xxxx..." \
  -H "Content-Type: application/json" \
  -d '{"file": "my-task.rei"}'
```

### スケジュール登録

```bash
curl -X POST http://localhost:19720/api/tasks/schedule \
  -H "Authorization: Bearer rei_xxxx..." \
  -H "Content-Type: application/json" \
  -d '{"code": "log(\"hello\")", "name": "greeting", "schedule": "every 1h"}'
```

### PowerShellクライアント

```powershell
# タスク実行
.\samples\remote-client.ps1 -Action run -Code 'click(100, 200)'

# ファイル実行
.\samples\remote-client.ps1 -Action run -File "my-task.rei"

# ステータス確認
.\samples\remote-client.ps1 -Action status

# タスク一覧
.\samples\remote-client.ps1 -Action tasks

# ログ取得
.\samples\remote-client.ps1 -Action logs

# リモートVPSに送信
.\samples\remote-client.ps1 -Action run -Code 'click(100,200)' -Host "http://vps-ip:19720"
```

---

## WebSocket プロトコル

**接続:** `ws://<host>:19720/ws`

### クライアント → サーバー

```json
// チャネル購読
{ "type": "subscribe", "channels": ["logs", "tasks", "stats"] }

// クライアント識別
{ "type": "identify", "name": "my-dashboard" }

// Ping
{ "type": "ping" }
```

### サーバー → クライアント

```json
// ログ
{
  "type": "log",
  "channel": "logs",
  "data": { "level": "info", "message": "Executing: my-task", "taskId": "..." },
  "timestamp": "2026-02-20T10:30:00.000Z"
}

// タスクイベント
{
  "type": "task",
  "channel": "tasks",
  "data": { "event": "completed", "id": "...", "name": "my-task", "elapsed": 1234 },
  "timestamp": "2026-02-20T10:30:01.234Z"
}

// 統計（60秒ごと）
{
  "type": "stats",
  "channel": "stats",
  "data": { "activeTasks": 1, "completedTasks": 42, "memoryMB": 48.3 },
  "timestamp": "2026-02-20T10:31:00.000Z"
}
```

### WebSocketモニター

```bash
node samples/ws-monitor.js
node samples/ws-monitor.js ws://vps-address:19720/ws
```

---

## 認証

### APIキーの仕組み

- 初回デーモン起動時にadminキーが自動生成される
- キーは `rei-api-keys.json` に保存
- プレフィックス `rei_` + 48文字のランダム16進数
- 3段階の権限: `read` / `execute` / `admin`

### 権限マトリクス

| 操作 | read | execute | admin |
|------|------|---------|-------|
| GET /health, /stats | ✅ (認証不要) | ✅ | ✅ |
| GET /api/tasks, /api/logs | ✅ | ✅ | ✅ |
| POST /api/tasks/run | ❌ | ✅ | ✅ |
| POST /api/tasks/schedule | ❌ | ✅ | ✅ |
| POST /api/keys | ❌ | ❌ | ✅ |
| POST /api/daemon/reload | ❌ | ❌ | ✅ |

### キー管理

```bash
# 新しいキーを生成（execute権限）
curl -X POST http://localhost:19720/api/keys \
  -H "Authorization: Bearer rei_admin_key..." \
  -d '{"name": "vps-02", "permissions": ["read", "execute"]}'

# キー一覧
curl http://localhost:19720/api/keys \
  -H "Authorization: Bearer rei_admin_key..."

# キー削除
curl -X DELETE http://localhost:19720/api/keys/rei_xxxx... \
  -H "Authorization: Bearer rei_admin_key..."
```

---

## 設定ファイルの更新

`rei-headless.json` にAPI関連の設定を追加:

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
  "apiKeyFilePath": "./rei-api-keys.json"
}
```

---

## 依存パッケージの追加

```bash
npm install ws
npm install -D @types/ws
```

---

## ファイル構成（Phase 9b追加分）

```
src/headless/
  api-server.ts    — REST + WebSocket 統合サーバー（★新規）
  api-routes.ts    — REST APIルート定義（★新規）
  api-auth.ts      — APIキー認証（★新規）
  ws-manager.ts    — WebSocket接続管理（★新規）
  daemon.ts        — ★更新（API統合 + 公開メソッド追加）
  index.ts         — ★更新（新モジュールのexport追加）
  cli.ts           — （変更なし）
  service.ts       — （変更なし）
  watcher.ts       — （変更なし）
  health.ts        — （変更なし）
samples/
  remote-client.ps1  — PowerShellリモートクライアント（★新規）
  ws-monitor.js      — WebSocketモニター（★新規）
```

---

## Phase 9c への接続点

Phase 9bのAPIとWebSocketは、Phase 9c（ダッシュボード）のバックエンド:

| Phase 9b | Phase 9c |
|----------|----------|
| REST API | ダッシュボードのデータソース |
| WebSocket | リアルタイム更新 |
| APIキー認証 | ダッシュボードログイン |
| `/api/tasks` | タスク一覧画面 |
| `/api/logs` | ログビューワー |
| `/api/tasks/run` | タスク実行ボタン |

---

## コミットメッセージ案

```
feat: Phase 9b - REST API & WebSocket server for remote operation

- Add REST API with 14 endpoints for task management
- Add WebSocket real-time log and event streaming
- Add API key authentication with 3-tier permissions (read/execute/admin)
- Update daemon with public methods and event emission
- Add PowerShell remote client sample
- Add WebSocket monitor sample
- Integrate API server into daemon (replaces health-only server)
```
