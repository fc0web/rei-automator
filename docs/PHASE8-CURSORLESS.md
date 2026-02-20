# Phase 8: カーソルなし実行（Cursorless Execution）

**日付:** 2026年2月20日  
**バージョン:** v0.5.0 (Phase 8)  
**対象:** Rei Automator

---

## 概要

Phase 8では、Windows API（SendMessage / PostMessage）を使用した**カーソルなし実行**を実装しました。

### 従来のRei Automator（Phase 1〜7）

- `SetCursorPos` + `mouse_event` でマウスカーソルを物理的に移動
- `SendKeys` でキーボード入力を送信
- **問題:** カーソルが画面上を動くため、他の作業と干渉する
- **問題:** VPS（RDP切断後）ではデスクトップが描画されず動作しない

### Phase 8のカーソルなし実行

- `PostMessage` でウィンドウに直接メッセージを送信
- カーソルを一切動かさない
- **VPS対応:** RDP切断後もウィンドウオブジェクトは存在するため動作可能
- **並列実行の基盤:** 複数ウィンドウへの同時操作が可能

---

## 新しいコマンド

### 単発コマンド（`win_` プレフィックス）

| コマンド | 説明 | 構文 |
|---------|------|------|
| `win_click` | カーソルなしクリック | `win_click("タイトル", x, y)` |
| `win_dblclick` | カーソルなしダブルクリック | `win_dblclick("タイトル", x, y)` |
| `win_rightclick` | カーソルなし右クリック | `win_rightclick("タイトル", x, y)` |
| `win_type` | カーソルなしテキスト入力 | `win_type("タイトル", "テキスト")` |
| `win_key` | カーソルなしキー送信 | `win_key("タイトル", "Enter")` |
| `win_shortcut` | カーソルなしショートカット | `win_shortcut("タイトル", "Ctrl+S")` |
| `win_activate` | ウィンドウをアクティブ化 | `win_activate("タイトル")` |
| `win_close` | ウィンドウを閉じる | `win_close("タイトル")` |
| `win_minimize` | ウィンドウを最小化 | `win_minimize("タイトル")` |
| `win_maximize` | ウィンドウを最大化 | `win_maximize("タイトル")` |
| `win_restore` | ウィンドウを復元 | `win_restore("タイトル")` |
| `win_list` | ウィンドウ一覧を表示 | `win_list()` |

### ブロック構文（`window():`）

同一ウィンドウに対して複数操作を行う場合、`window()` ブロック構文が使えます。
ブロック内の `click`, `type`, `key`, `shortcut`, `wait` は自動的にカーソルなし実行になります。

```
window("メモ帳"):
  click(100, 200)
  type("Hello World")
  key("Enter")
  type("Reiから送信")
  shortcut("Ctrl+S")
```

---

## 使用例

### 例1: メモ帳にテキストを入力

```
// メモ帳を開いた状態で実行
win_type("メモ帳", "Hello from Rei Automator!")
win_key("メモ帳", "Enter")
win_type("メモ帳", "カーソルなし実行テスト")
win_shortcut("メモ帳", "Ctrl+S")
```

### 例2: ブロック構文でまとめて操作

```
// メモ帳に複数行入力
window("メモ帳"):
  type("1行目のテキスト")
  key("Enter")
  type("2行目のテキスト")
  key("Enter")
  type("3行目のテキスト")
  shortcut("Ctrl+A")
  shortcut("Ctrl+C")
```

### 例3: 複数ウィンドウの同時操作（逐次）

```
// ウィンドウAにデータ入力 → ウィンドウBに切り替え → 結果確認
win_type("Excel", "=SUM(A1:A10)")
win_key("Excel", "Enter")
wait(1s)
win_activate("メモ帳")
win_type("メモ帳", "計算完了")
```

### 例4: ウィンドウ一覧の確認

```
// 現在開いているウィンドウを一覧表示
win_list()
```

### 例5: ウィンドウ管理

```
// ウィンドウの最小化・復元
win_minimize("メモ帳")
wait(2s)
win_restore("メモ帳")
win_maximize("メモ帳")
```

### 例6: VPSでのバッチ処理（RDP切断後も動作）

```
// VPS上で24時間実行するスクリプト例
loop:
  // ブラウザの特定タブでデータ取得
  win_click("Chrome", 400, 300)
  wait(1s)
  win_shortcut("Chrome", "Ctrl+A")
  win_shortcut("Chrome", "Ctrl+C")
  wait(500ms)
  
  // Excelに貼り付け
  win_activate("Excel")
  win_shortcut("Excel", "Ctrl+V")
  win_key("Excel", "Enter")
  
  // 5分待機
  wait(300s)
```

---

## ウィンドウタイトルについて

- **部分一致**で検索されます。`"メモ帳"` で `"無題 - メモ帳"` にマッチします。
- 複数ウィンドウがマッチする場合、最初に見つかったウィンドウが対象になります。
- ウィンドウが見つからない場合はエラーになります。

---

## 技術的な注意事項

### 動作するケース
- 標準的なWindowsアプリケーション（メモ帳、Excel、ブラウザ等）
- WinForms / WPFアプリケーション
- ほとんどの業務用ソフトウェア

### 動作しない可能性があるケース
- DirectX/OpenGLを使用するゲーム（独自の入力処理を行うため）
- 管理者権限で動作するアプリケーション（Rei Automatorも管理者権限で実行する必要あり）
- 一部のセキュリティソフト（メッセージフックをブロックする場合）

### VPS利用時の注意
- RDP接続中にスクリプトを開始し、その後切断しても動作を継続します
- `win_list()` でウィンドウの存在を確認してからスクリプトを開始することを推奨
- スケジュール実行と組み合わせると、完全な自動化が実現できます

---

## アーキテクチャ

```
┌──────────────────────────────────────────────────────┐
│  Rei Script                                          │
│  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │ 従来コマンド    │  │ Phase 8 コマンド               │  │
│  │ click(x, y)   │  │ win_click("title", x, y)    │  │
│  │ type("text")  │  │ win_type("title", "text")   │  │
│  │ key("Enter")  │  │ window("title"):             │  │
│  └──────┬───────┘  └──────────┬───────────────────┘  │
│         │                     │                      │
│  ┌──────▼───────┐  ┌──────────▼───────────────────┐  │
│  │ WindowsBackend│  │ WinApiBackend                │  │
│  │ (カーソル移動) │  │ (カーソルなし・SendMessage)   │  │
│  │ SetCursorPos  │  │ PostMessage                  │  │
│  │ mouse_event   │  │ FindWindow                   │  │
│  │ SendKeys      │  │ EnumWindows                  │  │
│  └──────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 変更されたファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/auto/win-api-backend.ts` | **新規** — WinApiBackend本体（C# via PowerShell） |
| `src/lib/core/types.ts` | 新しいコマンド型追加（11種類） |
| `src/lib/core/parser.ts` | `win_` コマンドと `window():` ブロックのパース |
| `src/lib/core/runtime.ts` | 新コマンドの実行ロジック |
| `src/main/executor.ts` | WinApiBackendの注入 |

---

## 今後の拡張（Phase 8+）

- [ ] `win_find()` — ウィンドウ内での画像認識（カーソルなし版）
- [ ] `win_read()` — ウィンドウ内OCR（カーソルなし版）
- [ ] 並列実行エンジン（複数ウィンドウを同時操作）
- [ ] ウィンドウハンドルのキャッシュ（毎回検索しない）
- [ ] 子ウィンドウ / コントロール指定（ボタン・テキストボックス等）
