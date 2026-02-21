# Rei AIOS v0.5.0 — AIアシスタント統合ガイド

## 新規追加ファイル一覧

```
src/aios/                          ← 新規ディレクトリ
  ├── llm-adapter.ts               ← 共通インターフェース・型定義（104行）
  ├── claude-adapter.ts            ← Anthropic Claude API（95行）
  ├── openai-adapter.ts            ← OpenAI API（90行）
  ├── openai-compat-adapter.ts     ← OpenAI互換API（108行）
  ├── ollama-adapter.ts            ← Ollama ローカルLLM（97行）
  ├── llm-manager.ts               ← プロバイダー設定管理（215行）
  ├── axiom-brancher.ts            ← Rei公理3軸分岐エンジン（228行）
  ├── chat-store.ts                ← チャット履歴ローカル保存（200行）
  ├── aios-engine.ts               ← 統合エンジン（185行）
  ├── aios-routes.ts               ← REST APIルート（178行）
  └── index.ts                     ← バレルエクスポート（24行）

src/main/
  ├── preload-aios-additions.ts    ← Electron IPC ブリッジ（84行）
  └── main-aios-additions.ts       ← IPCハンドラー登録（75行）

src/renderer/
  └── assistant.html               ← AIチャットUI（500行）
```

**合計: 約2,200行の追加**（既存コード変更は最小限）

---

## 適用手順

### Step 1: ファイル配置

上記ファイルは全てzipに含まれています。そのまま配置してください。

### Step 2: tsconfig.main.json（★ 適用済み）

`src/aios/**/*` が include に追加されています。

### Step 3: package.json のバージョン更新

```json
"version": "0.5.0",
```

### Step 4: copy-assets スクリプトに assistant.html を追加

package.json の `copy-assets` を更新:

```json
"copy-assets": "node -e \"const fs=require('fs');const p=require('path');['index.html','styles.css','assistant.html'].forEach(f=>{const src=p.join('src','renderer',f);const dst=p.join('dist','renderer',f);if(fs.existsSync(src))fs.copyFileSync(src,dst)});console.log('Assets copied.')\""
```

### Step 5: main.ts に AIOS を登録

`src/main/main.ts` の冒頭に import を追加:

```typescript
import { AIOSEngine } from '../aios/aios-engine';
import { registerAIOSHandlers } from './main-aios-additions';
```

`createMainWindow()` 関数の中（executor 初期化付近）に追加:

```typescript
// AIOS Engine 初期化
const { app } = require('electron');
const aiosEngine = new AIOSEngine({
  dataDir: path.join(app.getPath('userData'), 'aios'),
});
registerAIOSHandlers(aiosEngine);
```

### Step 6: preload.ts に AIOS ブリッジを追加

`src/main/preload.ts` の末尾に以下を追加:

```typescript
// ── AIOS API ブリッジ ──
import './preload-aios-additions';
```

**注意:** preload-aios-additions.ts は独立した `contextBridge.exposeInMainWorld` 呼び出しを持っているため、
import するだけで自動的に `window.aiosAPI` が登録されます。

### Step 7: メニューまたはUIからアシスタントを開く

main.ts のメニュー構成に追加:

```typescript
{
  label: 'AI Assistant',
  click: () => {
    const assistantWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      title: 'Rei AIOS — AI Assistant',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });
    assistantWindow.loadFile(path.join(__dirname, '../renderer/assistant.html'));
  },
}
```

### Step 8: ヘッドレスデーモンとの統合（オプション）

`src/headless/daemon.ts` に AIOS エンジンを組み込む場合:

```typescript
import { AIOSEngine } from '../aios/aios-engine';
import { createAIOSRoutes } from '../aios/aios-routes';

// Daemon の start() メソッド内:
const aiosEngine = new AIOSEngine({
  dataDir: path.join(this.config.logDir, '..', 'aios'),
});

// API ルート登録時に追加:
const aiosRoutes = createAIOSRoutes(aiosEngine);
// → 既存の route matching ループに aiosRoutes を追加
```

---

## 対応プロバイダー一覧

| # | プロバイダー | タイプ | デフォルトモデル |
|---|------------|--------|----------------|
| 1 | Anthropic Claude | claude | claude-sonnet-4-20250514 |
| 2 | OpenAI | openai | gpt-4o |
| 3 | Google Gemini | openai-compat | gemini-2.0-flash |
| 4 | Mistral AI | openai-compat | mistral-large-latest |
| 5 | DeepSeek | openai-compat | deepseek-chat |
| 6 | Groq | openai-compat | llama-3.3-70b-versatile |
| 7 | Perplexity | openai-compat | sonar |
| 8 | Together AI | openai-compat | Meta-Llama-3.1-70B |
| 9 | Cohere | openai-compat | command-r-plus |
| 10 | Ollama (Local) | ollama | llama3 |

---

## アーキテクチャ

```
ユーザー入力
  │
  ▼
┌─────────────────────────────────────┐
│  AIOSEngine (統合クラス)              │
│                                     │
│  ┌─────────┐  ┌──────────────────┐  │
│  │LLMManager│  │  AxiomBrancher   │  │
│  │          │  │  (公理3軸分岐)    │  │
│  │ ┌──────┐ │  │                  │  │
│  │ │Claude│ │  │ ・論理的視点      │  │
│  │ │OpenAI│ │  │ ・実用的視点      │  │
│  │ │Gemini│ │  │ ・批判的視点      │  │
│  │ │Ollama│ │  │                  │  │
│  │ │ ...  │ │  └──────────────────┘  │
│  │ └──────┘ │                       │
│  └─────────┘  ┌──────────────────┐  │
│               │   ChatStore       │  │
│               │  (JSON永続化)      │  │
│               └──────────────────┘  │
└─────────────────────────────────────┘
  │
  ▼
IPC (Electron) / REST API (デーモン)
  │
  ▼
assistant.html (チャットUI)
```

---

## ビルド・テスト

```powershell
# ビルド
npm run build

# Electron起動（メインUI + AIアシスタント）
npm start

# ヘッドレスデーモン（REST API経由）
npm run start:headless
```

AIアシスタント画面は、メニューの「AI Assistant」から開くか、
ブラウザで `http://localhost:19720/api/aios/chat` にPOSTリクエストを送信します。
