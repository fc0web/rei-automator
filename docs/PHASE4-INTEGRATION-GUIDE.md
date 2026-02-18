# Rei Automator Phase 4 実装ガイド
**Phase 4: 画像認識（テンプレートマッチング）**  
**日付:** 2026年2月18日  
**対象バージョン:** v0.3.0 → v0.4.0

---

## 概要

Phase 4ではスクリーンショット上で「この画像を探してクリック」を可能にします。

**新しいReiコマンド:**
```
find("ok-button.png")          # テンプレートを画面上で探す
click(found)                   # 見つかった位置をクリック
click(found, 10, -5)           # オフセット付き
dblclick(found)                # ダブルクリック
rightclick(found)              # 右クリック
wait_find("dialog.png", 10000) # 見つかるまで待機（タイムアウト10秒）
find_click("ok-button.png")    # find + click のショートカット
```

**技術選定:** jimp（純JS、ネイティブモジュール不要）  
**アルゴリズム:** SAD（Sum of Absolute Differences）+ 早期打ち切り最適化

---

## ファイル一覧

### 新規作成ファイル

| ファイル | 説明 |
|---------|------|
| `src/lib/auto/image-matcher.ts` | テンプレートマッチングエンジン本体（**そのまま配置**） |

### 変更が必要な既存ファイル

| ファイル | 変更内容 | 参照ファイル |
|---------|----------|-------------|
| `src/lib/core/types.ts` | コマンド型追加 | `types-phase4-additions.ts` |
| `src/lib/core/parser.ts` | パースルール追加 | `parser-phase4-additions.ts` |
| `src/lib/core/runtime.ts` | 実行処理追加 | `runtime-phase4-additions.ts` |
| `src/lib/core/converter.ts` | 日本語パターン追加 | `parser-phase4-additions.ts`内に記載 |
| `src/main/main.ts` | IPC ハンドラー追加 | `main-phase4-additions.ts` |
| `src/main/preload.ts` | API 公開追加 | `preload-phase4-additions.ts` |
| `src/renderer/global.d.ts` | 型定義追加 | `preload-phase4-additions.ts`内に記載 |
| `src/renderer/index.html` | UI要素追加 | `index-phase4-additions.html` |
| `src/renderer/styles.css` | スタイル追加 | `styles-phase4-additions.css` |
| `src/renderer/renderer.ts` | UI制御追加 | `renderer-phase4-additions.ts` |
| `package.json` | jimp依存追加、バージョン更新 | 下記参照 |

---

## 統合手順

### Step 1: 依存パッケージ追加

```powershell
cd C:\Users\user\rei-automator
npm install jimp@0.22.12
```

### Step 2: package.json 更新

```json
{
  "version": "0.4.0"
}
```

### Step 3: 新規ファイル配置

`image-matcher.ts` をそのまま `src/lib/auto/` に配置:
```
src/lib/auto/image-matcher.ts   ← 新規（本パッケージから直接コピー）
```

`templates/` ディレクトリを作成:
```powershell
mkdir templates
echo templates/ >> .gitignore   # テンプレート画像はgit管理外（ユーザー固有データ）
```

### Step 4: types.ts に型追加

`types-phase4-additions.ts` を参照して、以下を `types.ts` に追加：

1. `ReiCommandType` union に `'find' | 'click_found' | 'wait_find' | 'find_click'` を追加
2. `FindCommand`, `ClickFoundCommand`, `WaitFindCommand`, `FindClickCommand` インターフェースを追加
3. `FindState` インターフェースを追加
4. `ReiCommand` union に上記型を追加

### Step 5: parser.ts にパースルール追加

`parser-phase4-additions.ts` を参照して、`parseLine()` 内に4つの正規表現マッチを追加。
**配置位置:** 既存コマンドのパース後、エラー処理の前。

### Step 6: runtime.ts に実行処理追加

`runtime-phase4-additions.ts` を参照して：
1. `ImageMatcher` の import を追加
2. `findState`, `imageMatcher`, `captureFunc` フィールドを追加
3. `setImageMatcher()`, `setCaptureFunc()` メソッドを追加
4. `executeCommand()` の switch 文に4つの case を追加
5. `sleep()`, `getFindState()` ヘルパーを追加

### Step 7: main.ts にIPC追加

`main-phase4-additions.ts` を参照して：
1. `ImageMatcher` を import
2. `app.whenReady()` 内で `ImageMatcher` を初期化
3. 6つの `ipcMain.handle` を追加
4. runtime への注入コードを追加

### Step 8: preload.ts にAPI追加

`preload-phase4-additions.ts` を参照して：
1. `contextBridge.exposeInMainWorld` 内に6つのメソッドを追加

### Step 9: global.d.ts に型定義追加

`preload-phase4-additions.ts` 内の型定義セクションを参照して、
`ElectronAPI` インターフェースに6つのメソッド型を追加。

### Step 10: UI変更

1. `index-phase4-additions.html` の内容を `index.html` の適切な位置に追加
2. `styles-phase4-additions.css` の内容を `styles.css` の末尾に追記
3. `renderer-phase4-additions.ts` の内容を `renderer.ts` に統合

### Step 11: ビルド＆テスト

```powershell
Remove-Item -Recurse -Force dist
npm run build
npm start -- --stub   # まずスタブモードでUIテスト
npm start             # 実機テスト
```

---

## テスト手順

### 基本テスト

1. **テンプレート作成テスト**
   - 「画面キャプチャ」→「テンプレート作成」ボタンON
   - キャプチャ画像上でドラッグ選択
   - テンプレート名を入力して保存
   - テンプレート一覧に表示されることを確認

2. **マッチングテスト**
   - テンプレート一覧の🧪ボタン
   - 画面上にテンプレートが見つかればマッチ位置が表示される
   - 信頼度が適切な値か確認

3. **コード実行テスト**
   ```
   find("ok-button.png")
   click(found)
   ```
   - find結果のログ出力を確認
   - click(found) が正しい座標で実行されることを確認

4. **wait_find テスト**
   ```
   wait_find("dialog.png", 5000)
   click(found)
   ```
   - タイムアウト前にダイアログが出現すれば成功
   - 出現しなければタイムアウトログを確認

5. **find_click テスト**
   ```
   find_click("start-button.png")
   ```
   - 探索→クリックが一連の動作で完了することを確認

### エッジケースの確認

- テンプレートが見つからない場合のログ出力
- `click(found)` を `find()` 無しで実行した場合のエラー処理
- 非常に小さいテンプレート（5×5以下）の挙動
- DPIスケーリング150%環境での座標精度

---

## アーキテクチャ（Phase 4追加分）

```
[renderer.ts] ─── IPC ───> [main.ts]
  │ テンプレート選択UI           │
  │ ドラッグ→切り出し            │ ImageMatcher初期化
  │ テンプレート管理             │ IPC ハンドラー
  │ コード挿入                  │
                                ↓
                          [executor.ts]
                                │ ImageMatcher注入
                                ↓
                          [runtime.ts]
                                │ find/click_found/wait_find/find_click 実行
                                ├──→ [screen-capture.ts] キャプチャ取得
                                └──→ [image-matcher.ts]  テンプレートマッチング
                                      │ jimp による SAD マッチング
                                      │ テンプレート管理（CRUD）
                                      ↓
                                [controller.ts] → [windows-backend.ts]
                                                   クリック実行
```

---

## Phase 5 への伏線

Phase 4の `findState` 構造体は Phase 5 の条件分岐と自然に合流します：

```
find("ok-button.png")
if found:
  click(found)
else:
  wait(1000)
  find("ok-button.png")
```

`wait_find` の繰り返しキャプチャ→マッチングのパターンは、
Phase 5 の OCR（`tesseract.js`）でもそのまま流用可能です：

```
read(100, 200, 300, 50)   # → Phase 5で追加
if text == "完了":
  click(400, 300)
```

---

## 既知の制約

1. **SAD マッチングの限界**: 画面の明るさが大きく変わるとマッチ精度が下がる。同一PC上での使用を想定しているため実用上は問題ない
2. **大画面での速度**: 4K画面全体のフルスキャンは数秒かかる場合がある。`region` オプションで探索範囲を限定すれば高速化可能
3. **テンプレートキャッシュ**: `ImageMatcher` 内でテンプレート画像をキャッシュするが、メモリ使用量に注意（大量のテンプレート登録時）
