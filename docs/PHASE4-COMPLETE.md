# Phase 4 完了: 画像認識（テンプレートマッチング）

## 新コマンド
```
find("template.png")             # テンプレート探索
find("template.png", 0.9)        # 閾値指定
click(found)                     # 探索結果クリック
click(found, 10, -5)             # オフセット付き
dblclick(found) / rightclick(found)
wait_find("dialog.png", 10000)   # 見つかるまで待機
find_click("ok-button.png")      # find + click ショートカット
```

## 技術
- jimp ベース SAD テンプレートマッチング
- 早期打ち切り最適化
- テンプレートキャッシュ
- キャプチャ画像上でのドラッグ選択→テンプレート切り出し

## ファイル
- `src/lib/auto/image-matcher.ts` — マッチングエンジン本体
- `docs/phase4-patches/` — 既存ファイルへの追記内容（統合参照用）

## 統合手順
1. `npm install jimp@0.22.12`
2. `docs/phase4-patches/` 内の各ファイルの内容を対応する既存ファイルに追記
3. `npm run build` でビルド確認

## 統合対象ファイル
| パッチファイル | 追記先 |
|---|---|
| 01-types-additions.ts | src/lib/core/types.ts |
| 02-parser-additions.ts | src/lib/core/parser.ts |
| 03-runtime-additions.ts | src/lib/core/runtime.ts |
| 04-main-additions.ts | src/main/main.ts |
| 05-preload-additions.ts | src/main/preload.ts |
| 06-global-dts-additions.ts | src/renderer/global.d.ts |
| 07-converter-additions.ts | src/lib/core/converter.ts |
| 08-index-html-additions.html | src/renderer/index.html |
| 09-styles-additions.css | src/renderer/styles.css |
| 10-renderer-additions.ts | src/renderer/renderer.ts |
