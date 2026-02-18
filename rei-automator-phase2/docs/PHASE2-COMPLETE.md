# Rei Automator Phase 2 引き継ぎドキュメント
**日付:** 2026年2月18日  
**Phase 2:** 日本語→Reiコード変換 実装完了

---

## Phase 2 で実装した内容

### ✅ 日本語→Reiコード変換エンジン

| 機能 | 状態 | 備考 |
|------|------|------|
| ルールベース変換 | ✅ 実装済 | APIキー不要、即座に動作 |
| Claude API変換 | ✅ 実装済 | 高精度、APIキー必要（UI未接続） |
| 日本語入力エリア有効化 | ✅ 実装済 | disabled解除、プレースホルダー更新 |
| コード生成ボタン | ✅ 実装済 | 変換結果をReiコードエリアに挿入 |
| ビルドスクリプト改善 | ✅ 実装済 | `npm run build` でHTML/CSS自動コピー |
| バージョンアップ | ✅ 実装済 | v0.1.0 → v0.2.0 |

### ✅ Phase 1で既に実装済みだったコマンド拡張

確認の結果、以下は全てPhase 1の時点で実装済みでした：

| ファイル | 対応コマンド |
|---------|-------------|
| types.ts | dblclick, rightclick, move, drag, key, shortcut |
| parser.ts | 全コマンドのパース対応済み |
| runtime.ts | 全コマンドの実行処理済み |
| windows-backend.ts | 全コマンドのWindows API実装済み |
| stub-backend.ts | 全コマンドのスタブ実装済み |

---

## 新規ファイル

### `src/lib/core/converter.ts`

日本語→Reiコード変換エンジン。2つのモードを提供：

**1. ルールベース変換 (`convertJapaneseToRei`)**
- 正規表現による日本語パターンマッチング
- 対応パターン:
  - クリック系: 「座標(500,400)をクリック」「ダブルクリック」「右クリック」
  - 移動・ドラッグ: 「(x,y)に移動」「(x1,y1)から(x2,y2)にドラッグ」
  - テキスト入力: 「"Hello"と入力」
  - キー操作: 「Enterキーを押す」「Tabを押す」
  - ショートカット: 「Ctrl+Cを押す」「コピー」「ペースト」「全選択」「保存」
  - 待機: 「3秒待つ」「500ミリ秒待機」「2分待つ」
  - ループ: 「5回繰り返す」「ずっと繰り返す」
  - 複合文: 「クリックして3秒待つ」（「して」「、次に」「→」で分割）

**2. Claude API変換 (`convertWithClaudeAPI`)**
- Anthropic APIを使った高精度変換
- APIキーが必要
- UI上のAPIキー設定は将来実装予定

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|----------|
| `src/lib/core/converter.ts` | **新規** - 変換エンジン |
| `src/main/main.ts` | converter import追加、IPC変換ハンドラー追加、バージョン更新 |
| `src/main/preload.ts` | convertJapanese/convertJapaneseAPI API公開、型定義追加 |
| `src/renderer/renderer.ts` | コード生成ボタンハンドラー実装、日本語入力監視追加 |
| `src/renderer/index.html` | 日本語入力エリアdisabled解除、プレースホルダー更新、v0.2.0 |
| `package.json` | v0.2.0、copy-assetsスクリプト追加 |

---

## ビルド手順（改善済み）

```powershell
cd C:\Users\user\rei-automator

# distを削除してクリーンビルド
Remove-Item -Recurse -Force dist

# ビルド（HTML/CSSも自動コピー）
npm run build

# 実行
npm start

# スタブモード（PC操作なし）
npm start -- --stub
```

**注意:** `npm run build` にHTML/CSS自動コピーを組み込んだため、手動の `Copy-Item` は不要になりました。

---

## 日本語変換の使い方

### UI上での操作

1. 「日本語入力」エリアに日本語の指示を入力
2. 「🔄 コード生成」ボタンをクリック
3. 変換されたReiコードが「Reiコード」エリアに挿入される
4. 「▶ 実行」で実行

### 対応する日本語パターン例

```
入力: 座標(500,400)をクリックして、3秒待って、"Hello"と入力
出力:
  click(500, 400)
  wait(3s)
  type("Hello")

入力: 100,200をクリックして500ミリ秒待つを5回繰り返す
出力:
  loop(5):
    click(100, 200)
    wait(500ms)

入力: Ctrl+Cを押して、1秒待って、Ctrl+Vを押す
出力:
  shortcut("Ctrl+C")
  wait(1s)
  shortcut("Ctrl+V")

入力: コピーして2秒待ってペースト
出力:
  shortcut("Ctrl+C")
  wait(2s)
  shortcut("Ctrl+V")
```

---

## Phase 3 以降の予定

| Phase | 内容 | 状態 |
|-------|------|------|
| 3 | 画面キャプチャ・座標指定UI | 未着手 |
| 4 | 画像認識（テンプレートマッチング） | 未着手 |
| 5 | OCR（文字・数字認識）+ 条件分岐 | 未着手 |
| 6 | 安定化・配布パッケージ化・GitHub公開 | 未着手 |

### Phase 3 で実施すべきこと

1. **画面キャプチャ機能**
   - `screenshot-desktop` パッケージ導入
   - キャプチャ画像の表示UI
   - キャプチャした画像上でのクリック座標指定

2. **Claude API設定UI**
   - APIキー入力・保存（electron-store使用）
   - ルールベース/API切り替え

3. **変換精度の改善**
   - ルールベースのパターン追加
   - 変換できなかった日本語のフィードバック表示

---

## GitHubコミット

```powershell
cd C:\Users\user\rei-automator
git add -A
git commit -m "Phase 2: Japanese to Rei code converter, build script improvements"
git push
```
