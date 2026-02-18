# Rei Automator - 開発環境セットアップガイド

## 前提条件

### 必須
- **Windows 10/11 (64bit)** - 本アプリはWindows専用です
- **Node.js 18以上** - https://nodejs.org/ からダウンロード
- **Git** - https://git-scm.com/ からダウンロード

### 推奨
- **Visual Studio Code** - https://code.visualstudio.com/
- **TypeScript拡張機能** - VS Code Marketplaceから

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/fc0web/rei-automator.git
cd rei-automator
```

### 2. 依存関係のインストール

```bash
npm install
```

**注意:** 初回のインストールは数分かかる場合があります。

### 3. TypeScriptのコンパイル

```bash
npm run build
```

これにより、`src/`内のTypeScriptファイルが`dist/`にコンパイルされます。

### 4. アプリケーションの起動

```bash
npm run dev
```

または

```bash
npm start
```

## 開発フロー

### 開発モード

```bash
npm run dev
```

このコマンドは以下を実行します:
1. TypeScriptファイルを監視（変更時に自動コンパイル）
2. Electronアプリケーションを起動

### ビルドのみ

```bash
npm run build
```

メインプロセスとレンダラープロセスの両方をコンパイルします。

### パッケージング（実行ファイル作成）

```bash
npm run package
```

`release/`ディレクトリにインストーラーが生成されます。

## トラブルシューティング

### Node.jsのバージョンエラー

```bash
node -v
```

v18以上であることを確認してください。古い場合は更新してください。

### npmインストールエラー

キャッシュをクリアして再試行:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Electronが起動しない

1. `dist/`ディレクトリの存在を確認
2. 再ビルド: `npm run build`
3. 管理者権限で実行してみる

### TypeScriptコンパイルエラー

```bash
npm run build:main
npm run build:renderer
```

個別にビルドしてエラーを特定してください。

## VS Code推奨設定

`.vscode/settings.json`を作成:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## デバッグ

VS Codeのデバッグ機能を使用する場合は、`.vscode/launch.json`を作成:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Electron: Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": ["."],
      "outputCapture": "std"
    }
  ]
}
```

## 次のステップ

Phase 1の実装が完了したら:
1. Windows環境で動作確認
2. robotjs/nutjsの実装とテスト
3. Reiコード実行エンジンの統合

## サポート

問題が発生した場合:
1. GitHubのIssuesで報告
2. ドキュメント: `docs/rei-automator-spec.md`を参照
3. Rei言語リポジトリ: https://github.com/fc0web/rei-lang
