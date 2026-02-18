# Phase 1 実装タスク一覧

**目標:** MVP（最小機能プロダクト）の完成
**期間:** 1〜2ヶ月（チャット5〜8回想定）

## 完了済み ✅

- [x] プロジェクト雛形作成
  - [x] package.json
  - [x] TypeScript設定（tsconfig.json × 3）
  - [x] ディレクトリ構造
  - [x] .gitignore
  - [x] README.md
  - [x] ESLint設定

- [x] Electron基盤
  - [x] メインプロセス（main.ts）
  - [x] プリロードスクリプト（preload.ts）
  - [x] IPC通信の骨組み

- [x] 基本UI
  - [x] HTML構造（index.html）
  - [x] CSS スタイル（styles.css）
  - [x] レンダラープロセス（renderer.ts）
  - [x] イベントハンドリング

## 次のステップ 🚧

### 1. Reiコア基盤（優先度: 高）

**ファイル:** `src/lib/core/`

- [ ] `types.ts` - Rei言語の型定義
  - ReiValue型
  - ReiExpression型
  - ExecutionContext型

- [ ] `parser.ts` - Reiコードパーサー
  - 基本構文の解析（click, wait, type, loop）
  - ASTの生成
  - エラーハンドリング

- [ ] `runtime.ts` - 実行エンジン
  - ASTの実行
  - 非同期処理の管理
  - 停止シグナルの処理

**参考:** 既存のrei-langリポジトリから流用可能な部分を検討

### 2. PC操作層（優先度: 高）

**ファイル:** `src/lib/auto/`

#### 2.1 マウス操作

- [ ] `mouse.ts` - マウス操作
  - `click(x, y)` - クリック
  - `dblclick(x, y)` - ダブルクリック
  - `rightclick(x, y)` - 右クリック
  - `move(x, y)` - カーソル移動
  - `drag(x1, y1, x2, y2)` - ドラッグ

**技術選定:** robotjs vs nutjs
- まずrobotjsで実装
- Windowsでの動作確認後、必要に応じてnutjsに変更

#### 2.2 キーボード操作

- [ ] `keyboard.ts` - キーボード操作
  - `type(text)` - 文字列入力
  - `key(keyname)` - 特殊キー送信
  - `shortcut(combination)` - ショートカット

#### 2.3 画面認識（Phase 1では色検出のみ）

- [ ] `screen.ts` - 画面操作
  - `getPixelColor(x, y)` - ピクセル色取得
  - `capture(x, y, width, height)` - 画面キャプチャ（Phase 2用の準備）

**依存:** screenshot-desktop

### 3. フロー制御（優先度: 高）

**ファイル:** `src/lib/core/control.ts`

- [ ] `wait(duration)` - 待機
- [ ] `loop(callback, count?)` - ループ
- [ ] 停止フラグの管理
- [ ] ESCキー監視

### 4. 実行エンジン統合（優先度: 高）

**ファイル:** `src/main/executor.ts`

- [ ] Reiコードの実行管理
- [ ] 実行状態の通知（IPC経由）
- [ ] エラーハンドリング
- [ ] 強制停止機能

### 5. ファイル操作（優先度: 中）

**ファイル:** `src/main/file-manager.ts`

- [ ] スクリプト保存（.reiファイル）
- [ ] スクリプト読み込み
- [ ] ファイルダイアログの実装
- [ ] scripts/ディレクトリの管理

### 6. テスト（優先度: 低）

**ファイル:** `tests/`

- [ ] パーサーのユニットテスト
- [ ] 実行エンジンのユニットテスト
- [ ] マウス/キーボード操作のモックテスト

## 技術的な検討事項

### robotjs vs nutjs

**robotjs:**
- ✅ 実績あり、広く使われている
- ✅ シンプルなAPI
- ❌ メンテナンスが不定期
- ❌ Node.jsバージョン依存問題

**nutjs:**
- ✅ 活発に開発中
- ✅ TypeScript対応
- ✅ クロスプラットフォーム
- ❌ robotjsより新しい（実績少ない）

**結論:** まずrobotjsで実装、問題があればnutjsに切り替え

### Rei言語パーサーの実装方針

1. **最小実装（Phase 1）:**
   - click(x, y)
   - wait(秒s)
   - type("text")
   - loop: ... の基本構文のみ

2. **完全実装（Phase 2以降）:**
   - 既存rei-langのパーサーを流用
   - 条件分岐（->演算子）
   - 画像認識（screen.find）
   - OCR（screen.text）

## 開発の進め方

### Claudeの制約
- Linux環境（Ubuntu）のためWindows APIは実行できない
- Electronウィンドウは表示確認できない
- マウス/キーボード操作は実テスト不可

### 推奨フロー
1. Claude: コード生成（TypeScript）
2. Nobuki: Windows環境で動作確認
3. Nobuki: 問題をフィードバック
4. Claude: 修正
5. 繰り返し

### 次のチャットでやること

**オプションA: マウス/キーボード操作の実装**
- mouse.ts, keyboard.tsを実装
- robotjsのセットアップ
- Windows環境でテスト

**オプションB: Reiパーサー・実行エンジンの実装**
- parser.ts, runtime.tsを実装
- 基本構文（click, wait, type, loop）のサポート
- 実行エンジンとUIの統合

**オプションC: ファイル操作の完成**
- file-manager.tsを実装
- 保存/読み込みダイアログ
- .reiファイルの管理

**推奨:** オプションB（パーサー・実行エンジン）から開始
理由: マウス/キーボード操作は後からでも統合可能。まず「コードを解析→実行する」の流れを作る。

## 完成の定義（Phase 1）

以下が全て動作すること:

```rei
// クリックと待機
click(100, 200)
wait(3s)

// 文字入力
type("Hello World")

// ループ
loop(3):
  click(500, 300)
  wait(2s)

// 無限ループとESCキー停止
loop:
  click(500, 300)
  wait(1s)
```

## 見積もり

| タスク | 工数（チャット回数） |
|--------|---------------------|
| Reiパーサー | 1-2回 |
| 実行エンジン | 1-2回 |
| マウス/キーボード | 1-2回 |
| ファイル操作 | 1回 |
| テスト・修正 | 1-2回 |
| **合計** | **5-8回** |

## 参考リンク

- [robotjs](https://github.com/octalmage/robotjs)
- [nutjs](https://github.com/nut-tree/nut.js)
- [screenshot-desktop](https://github.com/bencevans/screenshot-desktop)
- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
