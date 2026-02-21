# Phase A: Agent Loop (MVP) — 実装完了

**日付:** 2026-02-21
**コミット:** (pending)
**ステータス:** ✅ 完了

---

## 概要

Phase A は Rei-AIOS の最小動作版（MVP）。
自然言語の指示を受け取り、**Observe → Think → Act** ループで PC を操作する。

```
ユーザー: "メモ帳に挨拶を書いて"
  ↓
rei-ai → Observe(画面) → Think(LLM) → Act(Rei) → 繰り返し → 完了
```

---

## アーキテクチャ

```
src/aios/
  ├── agent-loop.ts        ← 中核: Observe → Think → Act サイクル
  ├── agent-prompts.ts     ← プロンプトテンプレート + レスポンスパーサー
  ├── screen-observer.ts   ← ヘッドレス対応スクリーンキャプチャ（PowerShell）
  ├── action-executor.ts   ← LLM出力 → Reiコマンド変換 + 安全性チェック
  ├── agent-cli.ts         ← CLI エントリポイント（rei-ai コマンド）
  ├── aios-engine.ts       ← (既存) チャット用エンジン
  ├── llm-manager.ts       ← (既存) マルチプロバイダLLM管理
  ├── claude-adapter.ts    ← (既存) Claude API アダプタ
  └── index.ts             ← (更新) Phase A エクスポート追加
```

### D-FUMT 中心-周囲パターン

| レイヤー | 中心 | 周囲 |
|---------|------|------|
| AgentLoop | ユーザーの目標 | Observe / Think / Act サイクル |
| Observe | 画面の現在状態 | UIツリー / ウィンドウ一覧 / OCR |
| Think | LLMの判断 | 履歴 / 観察結果 / Reiコマンド知識 |
| Act | 1つのReiコマンド | バリデーション / 安全性ルール |

---

## 使い方

### 1. セットアップ

```bash
# API キー設定（対話式）
npm run rei-ai -- --setup

# または環境変数
export ANTHROPIC_API_KEY=sk-ant-...
```

### 2. 単発実行

```bash
# 基本
npm run rei-ai -- "メモ帳を開いて Hello World と入力して"

# ドライラン（実行せず計画だけ表示）
npm run rei-ai -- --dry-run "Open Calculator"

# 詳細ログ
npm run rei-ai -- --verbose "ブラウザでGoogleを開いて"

# Vision モード（スクリーンショットをLLMに送信、Claude限定）
npm run rei-ai -- --vision "画面に表示されているエラーを修正して"
```

### 3. 対話モード

```bash
npm run rei-ai -- --interactive

rei-ai> メモ帳を開いて
  [✓] launch "notepad"
  [✓] wait 1000
✅ Result: Notepad opened successfully

rei-ai> Hello World と入力して
  [✓] type "Hello World"
✅ Result: Typed "Hello World" in Notepad

rei-ai> quit
```

### 4. 設定ファイル

`rei-aios.json`:
```json
{
  "providers": {
    "claude": {
      "apiKey": "sk-ant-...",
      "model": "claude-sonnet-4-20250514"
    },
    "openai": {
      "apiKey": "sk-...",
      "model": "gpt-4o"
    }
  },
  "activeProvider": "claude"
}
```

---

## 新規ファイル詳細

### agent-loop.ts (AgentLoop)

メインループ。EventEmitter ベースでイベントを発火。

| イベント | 引数 | 説明 |
|---------|------|------|
| `loop:start` | `{goal, maxSteps}` | ループ開始 |
| `step:start` | `{step, maxSteps}` | ステップ開始 |
| `step:complete` | `StepRecord` | ステップ完了 |
| `loop:complete` | `{summary, steps}` | ゴール達成 |
| `loop:timeout` | `{maxSteps}` | 最大ステップ到達 |
| `loop:error` | `{error}` | エラー発生 |
| `loop:abort` | — | ユーザーによる中断 |

```typescript
const agent = new AgentLoop({ dataDir: './data' });
agent.updateProvider('claude', { apiKey: '...' });

const result = await agent.run("メモ帳にHelloと入力して");
console.log(result.summary);
```

### screen-observer.ts (ScreenObserver)

PowerShell 経由でヘッドレス環境でもスクリーンキャプチャ可能。

- `observe()` → `ScreenObservation` (screenshot + windowList + activeWindow)
- `describeObservation()` → プロンプト用テキスト
- `buildVisionContent()` → Claude Vision API 用 content blocks

### action-executor.ts (ActionExecutor)

安全性チェック + Rei パーサー + ランタイム実行。

**ブロックされるパターン:**
- `format C:`, `del /s`, `rmdir /s` — ファイルシステム破壊
- `shutdown`, `taskkill /f` — システム操作
- `reg delete HKLM`, `net user /add` — 権限操作

**警告のみ:**
- `launch "...install..."` — インストーラ起動
- `hotkey alt+f4` — ウィンドウ閉鎖

### agent-prompts.ts

LLM へのシステムプロンプトとレスポンスパーサー。

- `buildAgentSystemPrompt()` — Agent ルール + Rei コマンドリファレンス
- `buildPlanPrompt()` — 初回: 計画立案
- `buildStepPrompt()` — 継続: ステップ実行
- `parseAgentResponse()` — JSON パース + フォールバック

### agent-cli.ts

CLI エントリポイント。3つのモード:
1. **単発実行** — `rei-ai "instruction"`
2. **対話モード** — `rei-ai --interactive`
3. **セットアップ** — `rei-ai --setup`

---

## CLI オプション一覧

| オプション | 短縮 | 説明 | デフォルト |
|-----------|------|------|-----------|
| `--goal` | `-g` | 目標指定 | — |
| `--provider` | `-p` | LLMプロバイダ | `claude` |
| `--model` | `-m` | モデル名 | プロバイダ既定 |
| `--max-steps` | — | 最大ステップ数 | `20` |
| `--step-delay` | — | ステップ間待機(ms) | `1000` |
| `--dry-run` | — | 実行せず計画のみ | `false` |
| `--vision` | — | スクリーンショットをLLMに送信 | `false` |
| `--verbose` | `-V` | 詳細ログ | `false` |
| `--interactive` | `-i` | 対話モード | `false` |
| `--setup` | — | API キー設定 | — |
| `--data-dir` | — | データ保存先 | `./data/rei-aios` |

---

## 次のフェーズ（Phase B 以降）

| Phase | 追加機能 | 依存 |
|-------|---------|------|
| **B: 画面理解強化** | UIAutomationツリー取得 + UITree+Screenshot複合認識 + リトライ | Phase A |
| **C: タスク計画** | TaskGraph生成 + 適応的計画 + マルチアプリ横断 | Phase B |
| **D: メモリと学習** | 操作パターン記録 + SQLite永続メモリ + パターンマッチ | Phase C |

---

## コミットメッセージ案

```
feat: Phase A - Agent Loop MVP (Observe → Think → Act)

- Add AgentLoop: core Observe-Think-Act cycle with LLM integration
- Add ScreenObserver: headless screen capture via PowerShell
- Add ActionExecutor: Rei command validation and safe execution
- Add agent prompt templates with JSON response parsing
- Add rei-ai CLI with single-run, interactive, and setup modes
- Support Claude/OpenAI/Ollama providers and Vision mode
- Add comprehensive safety rules for blocking dangerous commands
- Update AIOS index with Phase A exports
- Add npm script: rei-ai
```
