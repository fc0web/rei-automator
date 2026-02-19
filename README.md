# Rei Automator

**軽量PC自動操作ツール - Powered by Rei Language**

## 概要

Rei Automatorは、Rei言語をベースとした直感的なPC自動操作ツールです。
日本語の自然言語入力から短いReiコードを生成し、ユーザーが確認した上で実行する三層構造を採用しています。

### 主な特徴

- 📷 **簡単キャプチャ**: 画面要素をドラッグで選択、自動保存
- 🎯 **座標指定**: クリック先をマウスで指定、座標自動記録
- 🖼️ **画像認識**: テンプレートマッチングによるアプリ横断の自動化
- 🌐 **多言語対応**: 日本語・英語・中国語・韓国語・ドイツ語・スペイン語・フランス語・ポルトガル語・ロシア語
- 💻 **軽量**: Electronベースで高速起動
- 🔒 **安全**: ユーザーがコードを確認してから実行

## 開発状態

**現在のバージョン: v0.4.0 (Phase 7 完了)**

### 実装済み機能
- [x] Electronスキャフォールド & 基本UI
- [x] マウス操作（クリック・移動・ドラッグ）
- [x] キーボード操作（文字入力・キー送信）
- [x] 色検出
- [x] 待機・ループ
- [x] Reiコード実行エンジン
- [x] 停止機能（ESCキー）
- [x] キャプチャモード
- [x] 座標指定モード
- [x] 画像マッチング（テンプレートマッチング）
- [x] OCR
- [x] スクリプト保存・読み込み
- [x] スケジュール実行
- [x] エラーハンドリング
- [x] i18n（9言語対応）
- [x] ポータブル版インストーラー

### 今後の予定
- [ ] NSISインストーラー
- [ ] マルチディスプレイ対応
- [ ] UIのさらなる改善
- [ ] 商用化・配布戦略

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
npm start
```

### ビルド

```bash
# TypeScriptコンパイル + アセットコピー
npm run build

# ポータブル版 .exe 作成
npm run package

# NSISインストーラー .exe 作成
npm run package:nsis

# 全ターゲット作成
npm run package:all
```

## プロジェクト構造

```
rei-automator/
├── src/
│   ├── i18n.ts        # メインプロセス用i18nモジュール
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
├── locales/           # 翻訳ファイル（9言語）
├── assets/            # アセット（アイコン等）
├── captures/          # キャプチャ画像
├── scripts/           # ユーザースクリプト
└── package.json
```

## 使い方

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

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| UI | Electron |
| Reiランタイム | TypeScript |
| マウス/KB | @nut-tree/nut-js |
| 画面キャプチャ | screenshot-desktop |
| 画像マッチング | テンプレートマッチング（独自実装） |
| OCR | tesseract.js |
| i18n | 独自実装（IPC + JSON） |

## 制約事項

- Windows 10/11のみサポート（Mac/Linuxは非対応）
- 管理者権限は不要
- 一部のアプリ（UAC保護下等）では動作しない場合があります

## License / ライセンス

Rei Automator is available under a **dual license**:

- ✅ **Free** — Personal use, non-profit organizations, education & research
- 💼 **Commercial license required** — For-profit companies and commercial use

For commercial licensing inquiries:
[GitHub Issues](https://github.com/fc0web/rei-automator/issues) ・ [note.com](https://note.com/nifty_godwit2635) ・ fc2webb@gmail.com

See [LICENSE](./LICENSE) for full details.

---

Rei Automator は**デュアルライセンス**で提供されています：

- ✅ **無料** — 個人利用、非営利団体、教育・研究目的
- 💼 **商用ライセンスが必要** — 営利企業での利用、商用目的での使用

商用ライセンスのお問い合わせ：
[GitHub Issues](https://github.com/fc0web/rei-automator/issues) ・ [note.com](https://note.com/nifty_godwit2635) ・ fc2webb@gmail.com

詳細は [LICENSE](./LICENSE) をご覧ください。

## 関連リンク

- [Rei Language Repository](https://github.com/fc0web/rei-lang)
- [設計ドキュメント](docs/rei-automator-spec.md)

## 著者

藤本 伸樹 (Nobuki Fujimoto)
- GitHub: [@fc0web](https://github.com/fc0web)
- Note: [note.com](https://note.com/nifty_godwit2635)

---

**Powered by Rei Language - 中心-周囲パターンで世界を記述する**
