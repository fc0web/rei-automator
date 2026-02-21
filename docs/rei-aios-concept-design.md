# Rei AIOS 概念設計書

**バージョン:** 0.1.0（概念設計）
**日付:** 2026-02-21
**基盤:** Rei Automator Phase 9g（コミット 04df584）

---

## 1. ビジョン

Rei AIOSは「AIがWindowsデスクトップを自律的に操作するOS層」である。
ユーザーは自然言語で目的を伝えるだけで、AIが画面を見て判断し、
マウス・キーボード操作を実行し、結果を確認して次のアクションを決める。

**一言で表現:** 「人間の代わりにPCの前に座って仕事をするAI」

### 1.1 設計思想

```
┌─────────────────────────────────────────┐
│             ユーザーの意図               │
│       「Excelで売上レポートを作って」     │
└───────────────┬─────────────────────────┘
                ▼
┌─────────────────────────────────────────┐
│         🧠 Rei AIOS（本設計の範囲）      │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │タスク計画│→│AI判断   │→│フィード  │  │
│  │   層    │ │   層    │ │バック    │  │
│  └─────────┘ └────┬────┘ │ループ    │  │
│                   │      └─────┬────┘  │
│              ┌────▼────┐       │       │
│              │画面認識 │◄──────┘       │
│              │   層    │               │
│              └────┬────┘               │
└───────────────────┼─────────────────────┘
                    ▼
┌─────────────────────────────────────────┐
│    🦾 Rei Automator（既存・Phase 9g）    │
│                                         │
│  UIAutomation │ SendInput │ WM_CHAR     │
│  Click/Type/Key/Shortcut/Activate       │
│  REST API │ デーモン │ クラスタ          │
└─────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────┐
│          Windows デスクトップ             │
└─────────────────────────────────────────┘
```

### 1.2 既存資産との関係

| レイヤー | 状態 | 役割 |
|---------|------|------|
| Rei Automator | ✅ 完成（Phase 9g） | 手足：ウィンドウ操作の実行 |
| Rei AIOS | 🔧 本設計 | 脳：判断・計画・認識・学習 |
| Reiスクリプト (.rei) | ✅ 完成 | 筋肉記憶：定型操作の記述 |

---

## 2. アーキテクチャ全体像

```
┌──────────────────────────────────────────────────────┐
│                    Rei AIOS Core                     │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │              タスク計画層 (Planner)             │  │
│  │  自然言語 → タスクグラフ → ステップ分解         │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │                                │
│  ┌──────────────────▼─────────────────────────────┐  │
│  │              AI判断層 (Agent)                   │  │
│  │  LLM呼び出し → アクション決定 → .rei生成        │  │
│  │                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │ LLM API  │  │プロンプト│  │ アクション   │ │  │
│  │  │ アダプタ  │  │テンプレート│ │ バリデータ  │ │  │
│  │  └──────────┘  └──────────┘  └──────────────┘ │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │                                │
│  ┌──────────────────▼─────────────────────────────┐  │
│  │              画面認識層 (Vision)                │  │
│  │  スクリーンショット → 画面状態の構造化          │  │
│  │                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │キャプチャ │  │ OCR /    │  │ UI要素       │ │  │
│  │  │ エンジン │  │ VLM認識  │  │ マッピング   │ │  │
│  │  └──────────┘  └──────────┘  └──────────────┘ │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │                                │
│  ┌──────────────────▼─────────────────────────────┐  │
│  │           フィードバックループ (Loop)           │  │
│  │  実行結果の評価 → 成功/失敗判定 → 次の行動     │  │
│  │                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │ 状態比較 │  │ 成功判定 │  │ リトライ/    │ │  │
│  │  │ エンジン │  │ ロジック │  │ エスカレーション│ │  │
│  │  └──────────┘  └──────────┘  └──────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │              メモリ層 (Memory)                  │  │
│  │  操作履歴・学習済みパターン・ユーザー設定       │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
        │                              ▲
        ▼                              │
┌──────────────────────────────────────────────────────┐
│              Rei Automator (既存)                     │
│  WinApiBackend │ REST API │ Daemon │ Cluster         │
└──────────────────────────────────────────────────────┘
```

---

## 3. 各層の詳細設計

### 3.1 タスク計画層 (Planner)

**役割:** ユーザーの自然言語指示を実行可能なステップ列に分解する。

#### 入力と出力

```
入力: "Excelで今月の売上データをグラフにして、PDFで保存して"
  ↓
出力: TaskGraph
  ├── Step 1: Excelを起動する
  ├── Step 2: 売上データのファイルを開く
  ├── Step 3: データ範囲を選択する
  ├── Step 4: グラフを挿入する
  ├── Step 5: グラフの種類・デザインを設定する
  ├── Step 6: PDF形式でエクスポートする
  └── Step 7: 完了を確認する
```

#### データ構造

```typescript
interface TaskGraph {
  id: string;
  goal: string;                    // ユーザーの元の指示
  steps: TaskStep[];
  status: 'planning' | 'executing' | 'completed' | 'failed';
  context: TaskContext;
}

interface TaskStep {
  id: string;
  description: string;             // 人間可読な説明
  action: ActionSpec;              // 具体的な操作仕様
  preconditions: string[];         // 前提条件（前のステップのID等）
  expectedOutcome: string;         // 期待される結果の記述
  status: 'pending' | 'executing' | 'success' | 'failed' | 'skipped';
  retryCount: number;
  maxRetries: number;
}

interface ActionSpec {
  type: 'rei_script' | 'vision_check' | 'user_input' | 'wait' | 'decision';
  // rei_script: .reiコードを生成・実行
  reiCode?: string;
  // vision_check: 画面状態を確認
  visionQuery?: string;
  // user_input: ユーザーに質問
  question?: string;
  // decision: LLMに判断を委ねる
  decisionPrompt?: string;
}

interface TaskContext {
  openWindows: string[];           // 現在開いているウィンドウ
  activeWindow: string;            // アクティブなウィンドウ
  lastScreenState: ScreenState;    // 最新の画面状態
  variables: Record<string, any>;  // タスク実行中の変数
  history: ActionResult[];         // これまでの実行結果
}
```

#### 計画戦略

```
Level 1: 静的計画（Static Planning）
  - ユーザーの指示からLLMが事前に全ステップを生成
  - 単純で予測可能なタスク向き
  - 例: 「メモ帳を開いてHello Worldと入力」

Level 2: 適応的計画（Adaptive Planning）
  - 初期計画を立てつつ、各ステップの結果に応じて計画を修正
  - 中程度の複雑さのタスク向き
  - 例: 「Excelで売上レポートを作って」（ファイルの場所が不明等）

Level 3: 反応的計画（Reactive Planning）
  - 画面の状態を見て、次の1アクションだけを決める
  - 予測困難な状況や探索的タスク向き
  - 例: 「このアプリの設定を最適化して」
```

---

### 3.2 AI判断層 (Agent)

**役割:** 画面の状態と計画を受け取り、具体的な操作（.reiコード）を生成する。

#### LLMアダプタ設計

```typescript
interface LLMAdapter {
  /** テキストプロンプトで応答を取得 */
  complete(prompt: string, options?: LLMOptions): Promise<string>;

  /** 画像+テキストで応答を取得（マルチモーダル） */
  completeWithVision(
    prompt: string,
    images: Buffer[],
    options?: LLMOptions
  ): Promise<string>;
}

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

// 複数プロバイダ対応
class ClaudeAdapter implements LLMAdapter { /* Anthropic API */ }
class OpenAIAdapter implements LLMAdapter { /* OpenAI API */ }
class LocalAdapter implements LLMAdapter  { /* Ollama等 */ }
```

#### アクション決定フロー

```
┌─────────────┐
│ 現在の画面  │──→ 画面認識層でScreenStateに変換
│ キャプチャ  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│           プロンプト構築                  │
│                                          │
│  System: あなたはWindows操作AIです。     │
│          以下のReiコマンドが使えます...   │
│                                          │
│  Context:                                │
│    - 現在の画面状態: {ScreenState}        │
│    - タスクの目標: {goal}                │
│    - 現在のステップ: {currentStep}       │
│    - これまでの履歴: {history}           │
│                                          │
│  Question: 次に何をすべきですか？         │
│            .reiコードで回答してください   │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│         LLM API 呼び出し                 │
│  （Claude / GPT / Local）                │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│       アクションバリデータ               │
│                                          │
│  - .reiコードの構文チェック              │
│  - 危険な操作の検出（ファイル削除等）     │
│  - ユーザー確認が必要な操作の判定        │
│  - サンドボックス制約の適用              │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│    Rei Automator で実行                  │
│    runtime.execute(parsedCode)           │
└──────────────────────────────────────────┘
```

#### 使用可能コマンドの定義（LLMへの提供）

```typescript
const AVAILABLE_COMMANDS = `
## Rei Automator コマンド一覧

### ウィンドウ操作
- win_activate(title)         ウィンドウをアクティブ化
- win_type(title, text)       テキスト入力（UIAutomation方式）
- win_click(title, x, y)     クリック
- win_key(title, keyName)     キー送信（Enter, Tab, Escape等）
- win_shortcut(title, keys)   ショートカット（例: Ctrl+S）
- win_close(title)            ウィンドウを閉じる

### 待機・制御
- wait(seconds)               指定秒数待機
- wait_window(title)          ウィンドウが現れるまで待機

### 情報取得
- win_list()                  ウィンドウ一覧を取得
- win_rect(title)             ウィンドウの位置・サイズを取得
- screenshot(title)           スクリーンショットを取得 [*要実装]

### 条件分岐
- if_window(title, thenCode, elseCode)   ウィンドウ存在チェック
`;
```

#### 安全性設計

```typescript
interface SafetyPolicy {
  // 即座にブロックする操作
  blockedPatterns: string[];       // 例: 'format', 'del /s', 'rm -rf'

  // ユーザー確認を要求する操作
  confirmRequired: string[];       // 例: 'win_close', ファイル保存

  // 操作のスコープ制限
  allowedWindows?: string[];       // 操作可能なウィンドウのタイトル
  blockedWindows?: string[];       // 操作禁止のウィンドウ

  // 実行制限
  maxActionsPerTask: number;       // 1タスクあたりの最大操作数
  maxRetries: number;              // 最大リトライ回数
  timeoutSeconds: number;          // タスク全体のタイムアウト
}

const DEFAULT_POLICY: SafetyPolicy = {
  blockedPatterns: [
    'format', 'diskpart', 'del /s', 'rm -rf',
    'reg delete', 'shutdown', 'taskkill /f',
  ],
  confirmRequired: [
    'win_close',              // ウィンドウを閉じる前に確認
    'file_delete',            // ファイル削除
    'install',                // ソフトウェアインストール
  ],
  maxActionsPerTask: 100,
  maxRetries: 3,
  timeoutSeconds: 300,
};
```

---

### 3.3 画面認識層 (Vision)

**役割:** スクリーンショットを撮影し、画面の状態を構造化データに変換する。

#### 2つの認識方式

```
方式A: UIAutomation ツリー解析（高速・正確・テキスト限定）
  - UIAutomation APIでUI要素のツリーを取得
  - ボタン名、テキストフィールドの値、メニュー項目等を構造化
  - 座標情報も取得可能
  - WinUI3/Win32両対応
  - コスト: 無料（ローカルAPI）

方式B: VLM画面解析（汎用・高コスト）
  - スクリーンショットをLLMのVision APIに送信
  - 画面全体の意味的な理解が可能
  - アイコンの意味、レイアウトの理解、異常検出
  - コスト: API呼び出し毎に課金

最適戦略: AをデフォルトとしBで補完
  - UIAutomationでUI要素の構造を取得（0コスト）
  - 構造だけでは判断できない場合にVLMを使用
  - VLMの入力にUIAutomation情報を付加して精度向上
```

#### スクリーンキャプチャ

```typescript
// PowerShell経由でスクリーンショットを取得
const CAPTURE_SCRIPT = (outputPath: string, hwnd?: number): string => `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

${hwnd
  ? `# 特定ウィンドウのキャプチャ
     # GetWindowRect → Bitmap.CopyFromScreen`
  : `# デスクトップ全体のキャプチャ`
}

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save('${outputPath}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output 'CAPTURE_OK'
`;
```

#### UIAutomation ツリー取得

```typescript
// ウィンドウ内のUI要素をツリー構造で取得
const UIA_TREE_SCRIPT = (hwnd: number): string => `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$ae = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]${hwnd})
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker

function Get-UITree($element, $depth) {
    if ($depth -gt 5) { return }  # 深さ制限

    $name = $element.Current.Name
    $type = $element.Current.ControlType.ProgrammaticName
    $rect = $element.Current.BoundingRectangle
    $enabled = $element.Current.IsEnabled

    $info = @{
        name = $name
        type = $type
        x = [int]$rect.X
        y = [int]$rect.Y
        width = [int]$rect.Width
        height = [int]$rect.Height
        enabled = $enabled
        children = @()
    }

    $child = $walker.GetFirstChild($element)
    while ($child -ne $null) {
        $info.children += (Get-UITree $child ($depth + 1))
        $child = $walker.GetNextSibling($child)
    }
    return $info
}

$tree = Get-UITree $ae 0
ConvertTo-Json $tree -Depth 10 -Compress
`;
```

#### 画面状態の構造化

```typescript
interface ScreenState {
  timestamp: number;
  activeWindow: {
    title: string;
    hwnd: number;
    rect: { x: number; y: number; width: number; height: number };
  };
  uiTree: UIElement[];             // UIAutomationから取得
  screenshot?: Buffer;             // PNG画像データ
  ocrText?: string;                // OCR結果（VLMから）
  description?: string;            // VLMによる画面の説明
}

interface UIElement {
  name: string;                    // ボタンのテキスト等
  type: string;                    // Button, Edit, MenuItem等
  x: number;
  y: number;
  width: number;
  height: number;
  enabled: boolean;
  value?: string;                  // テキストフィールドの値
  children: UIElement[];
}
```

---

### 3.4 フィードバックループ (Loop)

**役割:** 操作の実行前後の画面状態を比較し、成功/失敗を判定して次の行動を決める。

#### ループ構造

```
┌──────────────────────────────────────────────┐
│                Agent Loop                    │
│                                              │
│  1. 画面を観察 (Observe)                     │
│     └─→ ScreenState を取得                   │
│                                              │
│  2. 判断する (Think)                          │
│     └─→ LLMに現状+目標+履歴を渡す           │
│     └─→ 次のアクションを決定                  │
│                                              │
│  3. 実行する (Act)                            │
│     └─→ .reiコードを実行                     │
│     └─→ 実行結果を記録                       │
│                                              │
│  4. 評価する (Evaluate)                       │
│     └─→ 実行後の画面を観察                   │
│     └─→ 期待結果と比較                       │
│     └─→ 成功/失敗/不明を判定                 │
│                                              │
│  5. 分岐                                     │
│     ├─ 成功 → 次のステップへ                  │
│     ├─ 失敗 → リトライ or 代替手段            │
│     ├─ 不明 → VLMで詳細分析                   │
│     └─ 行き詰まり → ユーザーに質問            │
│                                              │
│  ※ 1-5 を目標達成まで繰り返す                │
└──────────────────────────────────────────────┘
```

#### 状態比較ロジック

```typescript
interface ActionResult {
  stepId: string;
  action: ActionSpec;
  beforeState: ScreenState;
  afterState: ScreenState;
  reiOutput?: string;              // Reiスクリプトの出力
  error?: string;
  duration: number;
  evaluation: EvaluationResult;
}

interface EvaluationResult {
  status: 'success' | 'failure' | 'uncertain' | 'stuck';
  confidence: number;              // 0.0 - 1.0
  reason: string;
  suggestedAction?: 'proceed' | 'retry' | 'alternative' | 'escalate';
}

class FeedbackEvaluator {
  /**
   * UIAutomationベースの高速評価
   * コスト: 無料
   */
  evaluateByUITree(
    before: UIElement[],
    after: UIElement[],
    expected: string
  ): EvaluationResult {
    // 例: 「テキストフィールドに値が入ったか」
    // 例: 「新しいウィンドウが開いたか」
    // 例: 「ダイアログが消えたか」
  }

  /**
   * VLMベースの詳細評価（UITree評価が不確実な場合のみ）
   * コスト: API呼び出し
   */
  async evaluateByVLM(
    screenshot: Buffer,
    goal: string,
    history: ActionResult[]
  ): Promise<EvaluationResult> {
    // スクリーンショットをLLMに送り、目標に対する進捗を判定
  }
}
```

#### エスカレーション設計

```
自動リトライ（3回まで）
  ├─ 同一手順のリトライ
  ├─ 微修正リトライ（座標微調整、待機時間追加）
  └─ 代替手順の試行
       │
       ▼ それでも失敗
ユーザーエスカレーション
  ├─ 「〇〇の画面が見つかりません。手動で開いてください」
  ├─ 「パスワードが必要です。入力してください」
  └─ 「予期しないダイアログが出ました。どうしますか？」
       │
       ▼ ユーザー対応後
操作を再開
```

---

### 3.5 メモリ層 (Memory)

**役割:** 操作履歴と学習済みパターンを永続化し、同じタスクの効率的な再実行を可能にする。

```typescript
interface OperationMemory {
  /** 成功したタスクの操作パターンをキャッシュ */
  taskPatterns: TaskPattern[];

  /** アプリ固有の知識（ボタンの位置、メニュー構造等） */
  appKnowledge: Map<string, AppProfile>;

  /** ユーザーの好み・設定 */
  userPreferences: UserPreferences;
}

interface TaskPattern {
  goalHash: string;                // タスク目標のハッシュ
  goal: string;
  steps: RecordedStep[];
  successCount: number;
  lastUsed: number;
  averageDuration: number;
}

interface AppProfile {
  appName: string;                 // 例: "Microsoft Excel"
  windowPatterns: string[];        // タイトルのパターン
  knownElements: UIElementRef[];   // 既知のUI要素と座標
  menuStructure?: any;             // メニュー階層
  shortcuts: Record<string, string>; // 既知のショートカット
}

interface UserPreferences {
  language: string;
  confirmLevel: 'always' | 'destructive' | 'never';
  autoSave: boolean;
  verbosity: 'quiet' | 'normal' | 'verbose';
}
```

---

## 4. 実行フロー例

### 例: 「メモ帳に今日の日記を書いて保存して」

```
User: 「メモ帳に今日の日記を書いて保存して」

─── Planner ───
  目標を分析...
  TaskGraph:
    Step 1: メモ帳を起動 (type: rei_script)
    Step 2: 日記のテキストを生成 (type: decision)
    Step 3: テキストを入力 (type: rei_script)
    Step 4: ファイルを保存 (type: rei_script)
    Step 5: 保存を確認 (type: vision_check)

─── Agent Loop: Step 1 ───
  [Observe] 画面キャプチャ → メモ帳は開いていない
  [Think]   メモ帳を起動する必要がある
  [Act]     生成コード:
              win_activate('メモ帳')
            → エラー: ウィンドウが見つかりません
  [Act]     代替コード:
              run('notepad.exe')
              wait(2)
  [Evaluate] UIAutomation → 「無題 - メモ帳」ウィンドウ検出 → 成功

─── Agent Loop: Step 2 ───
  [Think]   LLMに日記テキストの生成を依頼
  [Act]     生成テキスト: "2026年2月21日（土）\n今日は..."

─── Agent Loop: Step 3 ───
  [Observe] メモ帳が開いている、テキストフィールドは空
  [Think]   UIAutomation ValuePattern でテキスト入力
  [Act]     生成コード:
              win_type('メモ帳', '2026年2月21日（土）\n今日は...')
  [Evaluate] UIAutomation → テキストフィールドに値あり → 成功

─── Agent Loop: Step 4 ───
  [Observe] テキスト入力済み
  [Think]   Ctrl+S で保存 → 名前を付けて保存ダイアログが出るはず
  [Act]     生成コード:
              win_shortcut('メモ帳', ['Ctrl', 'S'])
              wait(1)
  [Evaluate] 新しいダイアログ検出 → 「名前を付けて保存」
  [Act]     生成コード:
              win_type('名前を付けて保存', 'diary-2026-02-21.txt')
              win_key('名前を付けて保存', 'Enter')
              wait(1)
  [Evaluate] ダイアログ消失、タイトルバー変更 → 成功

─── Complete ───
  全ステップ成功。所要時間: 8秒。
  User: 「日記を保存しました: diary-2026-02-21.txt」
```

---

## 5. 技術スタック

| コンポーネント | 技術 | 理由 |
|--------------|------|------|
| AI判断層 (Agent) | Claude API (Anthropic) | マルチモーダル対応、日本語性能 |
| AI判断層 (ローカル代替) | Ollama + Llama | オフライン対応、コスト削減 |
| 画面認識 (構造) | UIAutomation API | 無料、高速、正確 |
| 画面認識 (視覚) | Claude Vision / GPT-4V | 画面全体の意味理解 |
| OCR (補助) | Tesseract / Windows OCR | ローカルOCR |
| タスク実行 | Rei Automator (既存) | UIAutomation + SendInput |
| メモリ | SQLite | 軽量、組み込み、単一ファイル |
| API/通信 | 既存REST API + WebSocket | リアルタイムフィードバック |
| 言語 | TypeScript | 既存コードベースとの一貫性 |

---

## 6. 開発ロードマップ

### Phase A: 最小動作版（MVP）— 目安 2-3 週間

**目標:** 自然言語 → メモ帳操作が動く最小構成

```
実装するもの:
  ├── LLMアダプタ（Claude API）
  ├── 基本プロンプトテンプレート
  ├── スクリーンキャプチャ
  ├── 単純なObserve-Think-Actループ
  └── CLIインターフェース（rei-ai "メモ帳に挨拶を書いて"）

実装しないもの:
  ├── タスク計画層（1ステップずつ手動で）
  ├── UIAutomationツリー解析
  ├── メモリ層
  └── 高度なフィードバック評価
```

### Phase B: 画面理解強化 — 目安 2-3 週間

```
追加するもの:
  ├── UIAutomationツリー取得
  ├── UITree + スクリーンショットの複合認識
  ├── フィードバックループ（成功/失敗判定）
  └── 基本的なリトライロジック
```

### Phase C: タスク計画 — 目安 2-3 週間

```
追加するもの:
  ├── TaskGraph生成（LLMによる計画）
  ├── 適応的計画（実行結果で計画修正）
  ├── ユーザーエスカレーション
  └── 複数アプリにまたがるタスク対応
```

### Phase D: メモリと学習 — 目安 2-3 週間

```
追加するもの:
  ├── 操作パターンの記録・再利用
  ├── アプリプロファイル自動構築
  ├── SQLiteベースの永続メモリ
  └── パターンマッチによる高速実行
```

### Phase E: VPS運用対応 — Phase D と並行可能

```
追加するもの:
  ├── Windowsサービス化
  ├── RDPセッション維持
  ├── HTTPS + 認証強化
  ├── リモート監視ダッシュボード
  └── ワンコマンドデプロイスクリプト
```

---

## 7. コスト概算

### LLM API コスト（1タスクあたり）

| 操作内容 | API呼び出し回数 | 概算コスト |
|---------|---------------|-----------|
| 単純な操作（メモ帳入力） | 3-5回 | $0.01-0.03 |
| 中程度の操作（Excel集計） | 10-20回 | $0.05-0.15 |
| 複雑な操作（複数アプリ連携） | 30-50回 | $0.15-0.50 |

**コスト最適化戦略:**
- UIAutomation（無料）を最大活用し、VLM呼び出しを最小化
- 成功パターンのキャッシュで同じ操作のAPI呼び出しを削減
- ローカルLLM（Ollama）で判断層の一部を賄う

---

## 8. 想定される課題とリスク

| 課題 | リスク度 | 対策 |
|------|---------|------|
| LLMの判断ミスによる誤操作 | 高 | SafetyPolicy + ユーザー確認 |
| 画面認識の誤り（座標ずれ等） | 中 | UIAutomation優先、VLMで補完 |
| アプリのUIが予期せず変化 | 中 | 反応的計画 + リトライ |
| API遅延による操作の遅さ | 中 | パターンキャッシュ、ローカルLLM |
| Windowsアップデートで動作不良 | 低 | UIAutomation APIは安定的 |
| セキュリティ（API キー漏洩等） | 高 | 暗号化保存、環境変数化 |

---

## 9. 次のアクション

Phase A（MVP）の着手に必要なもの:

1. **Anthropic API キーの準備**（Claude APIを使用する場合）
2. **`src/aios/` ディレクトリ構造の作成**
3. **LLMアダプタの実装**（最小限のClaude API呼び出し）
4. **スクリーンキャプチャの実装**（PowerShell経由）
5. **基本Agent Loopの実装**（Observe → Think → Act）
6. **CLIエントリポイント**（`rei-ai "指示"` コマンド）
