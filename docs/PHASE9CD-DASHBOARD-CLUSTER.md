# Phase 9c: ダッシュボード + Phase 9d: ノード間通信

## 概要

Phase 9c はブラウザベースの管理ダッシュボード、Phase 9d はノード間通信・タスク分配エンジンを実装する。

---

## Phase 9c: ダッシュボード

### ファイル

- `src/renderer/dashboard.html` — スタンドアロンHTMLダッシュボード（CDN版React + Recharts）

### 機能（6タブ）

| タブ | 機能 |
|------|------|
| 概要 | ステータスカード6種、実行履歴バーチャート、リソースエリアチャート、タスク状況パイチャート、最新ログ |
| タスク | 全タスク一覧、状態バッジ、展開で詳細表示、新規実行、停止 |
| ノード | ノード一覧・トポロジー表示・分配戦略選択（Phase 9d統合） |
| ログ | リアルタイムログビューワー、レベルフィルタ（info/warn/error/debug） |
| APIキー | 3段階権限のキー一覧・作成・削除 |
| 設定 | 接続先、デーモン情報、Rei-AIOS階層マップ |

### 接続先

- REST API: `http://localhost:19720`
- WebSocket: `ws://localhost:19720`
- `DEMO_MODE = true` でAPI未接続でもデモデータで動作確認可能

### 使用方法

```bash
# ブラウザで直接開く
start src/renderer/dashboard.html

# Electronアプリ内WebViewで表示（main.tsに組み込み）
mainWindow.loadFile('src/renderer/dashboard.html')

# デーモン接続時は DEMO_MODE を false に変更
```

### 依存（CDN読み込み）

- React 18.2.0
- ReactDOM 18.2.0
- Recharts 2.7.3
- Babel Standalone 7.23.9
- Google Fonts: Noto Sans JP, JetBrains Mono

---

## Phase 9d: ノード間通信・タスク分配エンジン

### ファイル

| ファイル | 説明 |
|---------|------|
| `src/headless/node-manager.ts` | ノードディスカバリ・ハートビート・リーダー選出 |
| `src/headless/task-dispatcher.ts` | タスク分配エンジン（3戦略） |
| `src/headless/cluster-routes.ts` | クラスタAPI 11エンドポイント |

### アーキテクチャ

```
┌─────────────┐     REST API      ┌─────────────┐
│  Node Alpha  │◄────────────────►│  Node Beta   │
│  (Leader)    │                   │  (Worker)    │
│  :19720      │     Heartbeat     │  :19720      │
└──────┬───────┘  ◄──── 10s ────► └──────┬───────┘
       │                                  │
       │         REST API                 │
       └──────────────────►┌──────────────┘
                           │
                    ┌──────┴───────┐
                    │  Node Gamma  │
                    │  (Worker)    │
                    │  :19720      │
                    └──────────────┘
```

### NodeManager

- **ディスカバリ**: シードノードに接続し、そのピアリストを取得して全ノードを発見
- **ハートビート**: 10秒ごとに全ピアに `POST /api/cluster/heartbeat` を送信
- **デッド検出**: 30秒応答なしで offline 判定
- **リーダー選出**: Bully Algorithm（ID辞書順最小のオンラインノードがリーダー）
- **イベント**: `node:joined`, `node:offline`, `node:left`, `leader:elected`

### TaskDispatcher（3つの分配戦略）

| 戦略 | 説明 | 用途 |
|------|------|------|
| Round Robin | 順番に均等分配 | デフォルト、均等負荷 |
| Least Load | CPU・タスク数からスコア算出、最小負荷ノードに分配 | 異種性能ノード混在時 |
| Affinity | 特定タスクパターン → 特定ノード固定 | 専用環境が必要なタスク |

スコア計算（Least Load）:
```
Score = (CPU% × 0.4) + (runningTasks × 10 × 0.4) + (queuedTasks × 5 × 0.2)
```

### クラスタAPI（11エンドポイント追加 → 合計25）

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | /api/cluster/info | — | ノード自身の情報 |
| GET | /api/cluster/nodes | read | 全ノード一覧 |
| GET | /api/cluster/leader | read | リーダーノード情報 |
| POST | /api/cluster/join | — | クラスタ参加 |
| POST | /api/cluster/leave | — | クラスタ離脱 |
| POST | /api/cluster/heartbeat | — | ハートビート |
| POST | /api/cluster/leader | — | リーダー通知 |
| POST | /api/dispatch | execute | タスク分配実行 |
| POST | /api/dispatch/broadcast | admin | 全ノードブロードキャスト |
| GET | /api/dispatch/history | read | 分配履歴 |
| GET | /api/dispatch/config | read | 分配設定 |

### 使用例

```bash
# タスク分配（デフォルト戦略: round-robin）
curl -X POST http://localhost:19720/api/dispatch \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"code": "クリック 500 300\n待機 1000"}'

# 特定ノードに分配
curl -X POST http://localhost:19720/api/dispatch \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"code": "スクリーンショット", "targetNodeId": "node-beta", "strategy": "affinity"}'

# 全ノードブロードキャスト
curl -X POST http://localhost:19720/api/dispatch/broadcast \
  -H "Authorization: Bearer <admin-key>" \
  -H "Content-Type: application/json" \
  -d '{"code": "// ヘルスチェック\nスクリーンショット"}'

# クラスタ状態確認
curl http://localhost:19720/api/cluster/nodes \
  -H "Authorization: Bearer <key>"
```

### daemon.ts への統合方法

```typescript
import { NodeManager } from "./node-manager";
import { TaskDispatcher } from "./task-dispatcher";
import { createClusterRoutes } from "./cluster-routes";

// daemon.ts の start() 内で:
const nodeManager = new NodeManager({
  nodeId: "node-alpha",
  nodeName: "Alpha (本機)",
  listenPort: 19720,
  seedNodes: ["192.168.1.10:19720", "vps.example.com:19720"],
});

const dispatcher = new TaskDispatcher(nodeManager);

// クラスタAPIルートを既存のルートに追加
const clusterRoutes = createClusterRoutes(nodeManager, dispatcher);
// → api-server.ts のルーティングに統合

await nodeManager.start();
```

---

## Rei-AIOS との対応

| Phase | 実装 | Rei-AIOS の役割 |
|-------|------|-----------------|
| 9c | ダッシュボード | エージェントの「管制塔」— 状態可視化・操作 |
| 9d | ノード間通信 | マルチエージェント協働の基盤 |
| 9d | タスク分配 | エージェント間タスクオーケストレーション |
| 9d | リーダー選出 | 自律的な意思決定階層の原型 |
