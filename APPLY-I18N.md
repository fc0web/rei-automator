# Rei Automator i18n 適用ガイド

## 概要

既存のRei Automator（Phase 7）のメニュー・UI全体を9言語対応に書き換えるパッチです。

### 変更対象ファイル（5ファイル）

| ファイル | 変更内容 |
|---|---|
| `src/i18n.ts` | **新規** — メインプロセス用 i18n モジュール |
| `src/main/main.ts` | メニュー `t()` 化、言語切替メニュー追加、i18n IPC ハンドラー |
| `src/main/preload.ts` | `i18nAPI` ブリッジ追加（`t`, `getLanguage`, `setLanguage` 等） |
| `src/renderer/index.html` | 全静的テキストに `data-i18n` 属性追加 |
| `src/renderer/renderer.ts` | 全ハードコード日本語 → `t()` 関数呼び出し、DOM 翻訳適用 |

### 翻訳ファイル（9言語 × 225キー）

| 言語 | ファイル |
|---|---|
| 日本語 | `locales/ja.json` |
| 英語 | `locales/en.json` |
| 中国語（簡体字） | `locales/zh-CN.json` |
| 韓国語 | `locales/ko.json` |
| ドイツ語 | `locales/de.json` |
| スペイン語 | `locales/es.json` |
| フランス語 | `locales/fr.json` |
| ポルトガル語 | `locales/pt.json` |
| ロシア語 | `locales/ru.json` |

---

## 適用手順

### Step 1: バックアップ

```powershell
cd C:\Users\user\rei-automator
Copy-Item src -Destination src-backup-pre-i18n -Recurse
```

### Step 2: localesフォルダ配置

```powershell
# プロジェクトルートにlocalesフォルダをコピー
Copy-Item -Recurse locales C:\Users\user\rei-automator\locales
```

### Step 3: i18nモジュール配置

```powershell
Copy-Item src\i18n.ts C:\Users\user\rei-automator\src\i18n.ts
```

### Step 4: ソースファイル上書き

```powershell
Copy-Item src\main\main.ts C:\Users\user\rei-automator\src\main\main.ts -Force
Copy-Item src\main\preload.ts C:\Users\user\rei-automator\src\main\preload.ts -Force
Copy-Item src\renderer\index.html C:\Users\user\rei-automator\src\renderer\index.html -Force
Copy-Item src\renderer\renderer.ts C:\Users\user\rei-automator\src\renderer\renderer.ts -Force
```

### Step 5: tsconfig 更新（必要に応じて）

`tsconfig.main.json` の `include` に `src/i18n.ts` が含まれることを確認：

```json
{
  "include": ["src/main/**/*", "src/lib/**/*", "src/i18n.ts"]
}
```

### Step 6: electron-builder にlocalesを含める

`electron-builder.config.js` の `extraResources` に追加：

```js
extraResources: [
  { from: "locales", to: "locales", filter: ["*.json"] },
  // ... 既存のエントリー
]
```

### Step 7: ビルド & テスト

```powershell
npm run build
npm start
```

---

## 動作確認

1. **メニューバー** — ファイル、編集、表示、ツール、ウィンドウ、ヘルプ が翻訳される
2. **ツール > 言語** — 9言語を切り替え可能
3. **UI全体** — ボタン、パネル名、トースト、モーダル、エラーメッセージが切り替わる
4. **言語切替即時反映** — メニューとUIが再描画される

## アーキテクチャ

```
[Main Process]                    [Renderer Process]
  i18n.ts                           renderer.ts
    ├── t(key, params)                ├── t(key, params) via IPC
    ├── init() ← app.getLocale()     ├── applyI18nToDOM()
    ├── setLanguage(lang)             └── onLanguageChanged → re-render
    └── onLanguageChange → rebuild menu

  main.ts                           index.html
    ├── setupApplicationMenu()        └── data-i18n="key"
    │     └── t('menu.file') etc.         data-i18n-placeholder="key"
    └── IPC handlers:                     data-i18n-title="key"
          i18n-translate (sync)
          i18n-get-language (sync)
          i18n-set-language (async)
          i18n-get-languages (sync)
```

## 翻訳キーの追加方法

1. `locales/ja.json` に新キーを追加
2. 他の8言語ファイルにも同じキーで翻訳を追加
3. ソースコードで `t('新しいキー')` を使用
