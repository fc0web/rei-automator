# Rei Automator Phase 7 完了パッチ - 統合ガイド

## 概要

このパッチには以下が含まれます：

1. **インストーラー作成** (electron-builder)
2. **UI全面改善** (新CSS + 新HTML + 新renderer.ts)

---

## 📦 1. インストーラー作成の手順

### 1-1. electron-builder のインストール

```bash
cd C:\Users\user\rei-automator
npm install --save-dev electron-builder
```

### 1-2. ファイル配置

| パッチファイル | 配置先 |
|---|---|
| `electron-builder.config.js` | `C:\Users\user\rei-automator\electron-builder.config.js` |
| `scripts/generate-icon.ps1` | `C:\Users\user\rei-automator\scripts\generate-icon.ps1` |

### 1-3. package.json にスクリプトを追加

既存の `package.json` の `scripts` セクションに以下を追加：

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.main.json && tsc -p tsconfig.renderer.json",
    "start": "electron build/main/main.js",
    "dev": "npm run build && npm start",
    "package": "npm run build && electron-builder --config electron-builder.config.js --win portable",
    "package:nsis": "npm run build && electron-builder --config electron-builder.config.js --win nsis",
    "package:dir": "npm run build && electron-builder --config electron-builder.config.js --dir",
    "package:all": "npm run build && electron-builder --config electron-builder.config.js --win",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

### 1-4. アイコン生成

```powershell
# assets/icon.ico がない場合、プレースホルダーを生成
cd C:\Users\user\rei-automator
powershell -ExecutionPolicy Bypass -File scripts\generate-icon.ps1
```

※ 本番用アイコンは `assets/icon.ico` (256x256 ICO) と `assets/icon.png` を差し替え

### 1-5. ビルド＆パッケージング

```bash
# テスト: アンパッケージ版で動作確認
npm run package:dir

# ポータブル版 (.exe 単体)
npm run package

# NSISインストーラー
npm run package:nsis

# 全ターゲット
npm run package:all
```

出力先: `dist/` フォルダ

### 1-6. .gitignore に追加

```
# electron-builder output
/dist
```

---

## 🎨 2. UI改善の統合手順

### 2-1. ファイル置換

| パッチファイル | 配置先 |
|---|---|
| `src/renderer/styles.css` | **置換** `src/renderer/styles.css` |
| `src/renderer/index.html` | **置換** `src/renderer/index.html` |
| `src/renderer/renderer.ts` | **統合** (下記参照) |

### 2-2. renderer.ts の統合方法

`renderer.ts` は完全置換ではなく、既存コードとの統合が必要です：

**既存コードから維持すべき部分：**
- `reiAPI` の実際の型定義（preload.ts で公開している API に合わせる）
- Phase 7b のスケジュール IPC 呼び出し（`schedule.create` 等の具体的な引数形式）
- エラーハンドラー設定の具体的な IPC 呼び出し

**新しいコードで追加される機能：**
- タブシステム（エディタ / スケジュール / スクリプト / 設定）
- Toast通知システム
- スプリッター（ログパネルのリサイズ）
- キーボードショートカット（F5実行、Esc停止、Ctrl+S保存）
- エディタ情報表示（行数・文字数・カーソル位置）
- 実行プログレスバー
- 設定タブ（エラーポリシー、リトライ回数、実行速度）
- スクリプト一覧タブ

### 2-3. preload.ts への追加（推奨）

UIの新機能をフルに使うには、以下のAPIを `preload.ts` に追加：

```typescript
// Window controls (既存のものがあれば不要)
minimizeWindow: () => ipcRenderer.send('window-minimize'),
maximizeWindow: () => ipcRenderer.send('window-maximize'),
closeWindow: () => ipcRenderer.send('window-close'),

// Script management
saveScript: (filename: string, content: string) =>
  ipcRenderer.invoke('save-script', filename, content),
loadScript: (filename: string) =>
  ipcRenderer.invoke('load-script', filename),
listScripts: () =>
  ipcRenderer.invoke('list-scripts'),
openScriptsFolder: () =>
  ipcRenderer.invoke('open-scripts-folder'),

// Error policy (Phase 7a で既に実装済みの場合は確認のみ)
setErrorPolicy: (policy: string, retryCount?: number) =>
  ipcRenderer.invoke('set-error-policy', policy, retryCount),
```

### 2-4. main.ts への追加（推奨）

```typescript
// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// Script management
ipcMain.handle('save-script', async (_event, filename, content) => {
  const scriptsDir = path.join(app.getPath('userData'), 'scripts');
  if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });
  fs.writeFileSync(path.join(scriptsDir, filename), content, 'utf-8');
});

ipcMain.handle('load-script', async (_event, filename) => {
  const scriptsDir = path.join(app.getPath('userData'), 'scripts');
  return fs.readFileSync(path.join(scriptsDir, filename), 'utf-8');
});

ipcMain.handle('list-scripts', async () => {
  const scriptsDir = path.join(app.getPath('userData'), 'scripts');
  if (!fs.existsSync(scriptsDir)) return [];
  return fs.readdirSync(scriptsDir).filter(f => f.endsWith('.rei'));
});

ipcMain.handle('open-scripts-folder', async () => {
  const scriptsDir = path.join(app.getPath('userData'), 'scripts');
  if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });
  shell.openPath(scriptsDir);
});
```

---

## ✅ 統合後の動作確認チェックリスト

- [ ] `npm run build` が成功する
- [ ] `npm start` でアプリが起動する
- [ ] タブ切り替え（エディタ / スケジュール / スクリプト / 設定）が動作する
- [ ] F5 で実行、Esc で停止が動作する
- [ ] Ctrl+S でスクリプト保存が動作する
- [ ] エラーポリシー変更が反映される
- [ ] スケジュール作成→自動実行が動作する
- [ ] ログパネルのスプリッターでリサイズできる
- [ ] Toast通知が表示される
- [ ] `npm run package:dir` でパッケージングが成功する
- [ ] `npm run package` でポータブル版 .exe が生成される
- [ ] `npm run package:nsis` でインストーラーが生成される

---

## 📁 パッチファイル一覧

```
rei-automator-phase7-completion/
├── electron-builder.config.js     ← ルートに配置
├── package-json-merge.json        ← 参照用（手動マージ）
├── scripts/
│   └── generate-icon.ps1          ← scripts/ に配置
└── src/
    └── renderer/
        ├── index.html             ← 置換
        ├── styles.css             ← 置換
        └── renderer.ts            ← 統合
```

## UI改善のハイライト

- **カラーテーマ**: ibushi-gin風ダークテーマ（CSS変数でカスタマイズ可能）
- **4タブ構成**: エディタ / スケジュール / スクリプト / 設定
- **ステータスバー**: 接続状態、アクティブスケジュール数、カーソル位置
- **実行プログレス**: コマンド進捗バー
- **Toast通知**: 成功/エラー/警告/情報の4種
- **スプリッター**: ログパネルの高さをドラッグ調整
- **キーボードショートカット**: F5, Esc, Ctrl+S, Ctrl+O
- **モーダル改善**: backdrop-filter + スライドアニメーション
