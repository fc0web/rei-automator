# Rei Automator

**軽量PC自動操作ツール - Powered by Rei Language**

## 概要

Rei Automatorは、Rei言語をベースとした直感的なPC自動操作ツールです。
日本語の自然言語入力から短いReiコードを生成し、ユーザーが確認した上で実行する三層構造を採用しています。

### 主な特徴

- 📷 **簡単キャプチャ**: 画面要素をドラッグで選択、自動保存
- 🎯 **座標指定**: クリック先をマウスで指定、座標自動記録
- 🇯🇵 **日本語対応**: 自然な日本語入力でコード生成
- 💻 **軽量**: Electronベースで高速起動
- 🔒 **安全**: ユーザーがコードを確認してから実行

## 開発状態

**現在のバージョン: v0.1.0 - Phase 1 (開発中)**

### Phase 1の実装範囲
- [x] Electronスキャフォールド
- [x] 基本UI
- [ ] マウス操作（クリック・移動・ドラッグ）
- [ ] キーボード操作（文字入力・キー送信）
- [ ] 色検出
- [ ] 待機・ループ
- [ ] Reiコード実行エンジン
- [ ] 停止機能（ESCキー）

### Phase 2以降の予定
- キャプチャモード
- 座標指定モード
- 画像マッチング（OpenCV）
- OCR（Tesseract.js）
- 日本語→Reiコード変換
- スクリプト保存・読み込み

## セットアップ

### 必要環境

- Node.js 18以上
- Windows 10/11（64bit）
- メモリ 4GB以上

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/fc0web/rei-automator.git
cd rei-automator

# 依存関係をインストール
npm install

# 開発モードで起動
npm run dev
```

### ビルド

```bash
# プロダクションビルド
npm run build

# Windows用インストーラーを作成
npm run package
```

## プロジェクト構造

```
rei-automator/
├── src/
│   ├── main/          # Electronメインプロセス
│   │   ├── main.ts
│   │   └── preload.ts
│   ├── renderer/      # Electronレンダラープロセス
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── renderer.ts
│   └── lib/           # コアライブラリ
│       ├── core/      # Reiエンジン
│       ├── auto/      # PC操作層
│       ├── nlp/       # 日本語変換
│       └── ui/        # UI層
├── assets/            # アセット（アイコン等）
├── captures/          # キャプチャ画像
├── scripts/           # ユーザースクリプト
└── package.json
```

## 使い方（Phase 1）

1. アプリケーションを起動
2. Reiコードエリアに直接コードを記述
3. 「実行」ボタンをクリック
4. 「停止」ボタンまたはESCキーで停止

### Reiコード例

```rei
// 座標をクリック
click(100, 200)

// 3秒待つ
wait(3s)

// 文字を入力
type("Hello World")

// 無限ループ
loop:
  click(500, 300)
  wait(2s)
```

## 開発

### 開発環境での実行

```bash
# 開発サーバー起動（ホットリロード付き）
npm run dev

# TypeScriptのコンパイルのみ
npm run build
```

### テスト

```bash
# テスト実行（Phase 1では未実装）
npm test
```

### コードフォーマット

```bash
# ESLintでコードチェック
npm run lint
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| UI | Electron |
| Reiランタイム | TypeScript（既存rei-langから流用予定） |
| マウス/KB | robotjs or nutjs（Windows実テストで決定） |
| 画面キャプチャ | screenshot-desktop |
| 画像マッチング | opencv4nodejs |
| OCR | tesseract.js |
| Win32 API | node-ffi-napi |

## 制約事項

- Windows 10/11のみサポート（Mac/Linuxは非対応）
- 管理者権限は不要
- 一部のアプリ（UAC保護下等）では動作しない場合があります

## ライセンス

MIT License

Copyright (c) 2024-2026 Nobuki Fujimoto

## 関連リンク

- [Rei Language Repository](https://github.com/fc0web/rei-lang)
- [設計ドキュメント](docs/rei-automator-spec.md)

## 著者

藤本 伸樹 (Nobuki Fujimoto)
- GitHub: [@fc0web](https://github.com/fc0web)
- Note: [note.com/fc0web](https://note.com/fc0web)

---

**Powered by Rei Language - 中心-周囲パターンで世界を記述する**
